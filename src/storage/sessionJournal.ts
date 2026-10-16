import { appendFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { HintCode } from '../core/promptAnalyzer';

/** Events intentionally exclude prompt texts, responses, code snippets and filesystem paths. */
export interface SanitizedEvent {
  schemaVersion: 1;
  id: string;
  at: string;
  sessionId: string;
  workspaceId: string;
  type: 'hint' | 'token_metrics';
  code?: HintCode;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
}
export interface IndexStatus { mode: 'sqlite' | 'jsonl-only'; eventCount: number; sessionCount: number; }

export class SessionJournal {
  private queue: Promise<void> = Promise.resolve();
  private initialized = false;
  private workspaceSalt = '';
  private readonly seenEvents = new Set<string>();
  private index: { add(e:SanitizedEvent):void; clear():void; status():IndexStatus; close():void }|undefined;
  private readonly root: string;
  constructor(storagePath: string) { this.root=storagePath; }
  private get sessionRoot():string { return join(this.root,'sessions'); }
  async initialize(): Promise<void> {
    if(this.initialized)return;
    await mkdir(this.sessionRoot,{recursive:true});
    const saltPath=join(this.root,'workspace-salt');
    try { this.workspaceSalt=(await readFile(saltPath,'utf8')).trim(); }
    catch(e) { if(!isMissing(e)) throw e;
      const proposed=randomBytes(24).toString('hex');
      try {await writeFile(saltPath,proposed,{flag:'wx',mode:0o600});}catch(err){if(!isExists(err))throw err;}
      this.workspaceSalt=(await readFile(saltPath,'utf8')).trim();
    }
    this.initialized=true;
  }
  workspaceKey(workspaceUri:string):string {
    if(!this.initialized)throw Error('SessionJournal must be initialized');
    return createHash('sha256').update(this.workspaceSalt+'\0'+workspaceUri).digest('hex').slice(0,24);
  }
  private getPath(workspaceId:string,sessionId:string):string {
    if(!/^[0-9a-f]{24}$/.test(workspaceId)|| !/^[a-zA-Z0-9-]{8,80}$/.test(sessionId))throw Error('Invalid journal identifier');
    return join(this.sessionRoot,workspaceId,sessionId+'.jsonl');
  }
  newSessionId():string {return randomUUID();}
  async record(partial: Omit<SanitizedEvent,'schemaVersion'|'id'|'at'>):Promise<SanitizedEvent> {
    if(partial.type==='hint' && !partial.code)throw Error('Missing hint code');
    if(partial.type==='token_metrics' && !validMetrics(partial))throw Error('Invalid metrics');
    const event:SanitizedEvent={schemaVersion:1,id:randomUUID(),at:new Date().toISOString(),...partial};
    const job=async()=>{
      await this.initialize();
      const path=this.getPath(event.workspaceId,event.sessionId);
      await mkdir(join(this.sessionRoot,event.workspaceId),{recursive:true});
      await appendFile(path,JSON.stringify(event)+'\n',{encoding:'utf8',mode:0o600});
      // Index is a cache; journal is authoritative. Failed index writes may be repaired.
      try {this.ensureIndex()?.add(event);}catch{this.index=undefined;}
    };
    await this.enqueue(job);
    return event;
  }
  async rebuild():Promise<IndexStatus> {
    return this.enqueue(async()=>{
      await this.initialize();
      this.seenEvents.clear();
      this.ensureIndex()?.clear();
      let eventCount=0;const sessions=new Set<string>();
      for(const workspace of await readdir(this.sessionRoot,{withFileTypes:true})){
        if(!workspace.isDirectory() || !/^[0-9a-f]{24}$/.test(workspace.name))continue;
        const directory=join(this.sessionRoot,workspace.name);
        for(const file of await readdir(directory,{withFileTypes:true})){
          if(!file.isFile()||!file.name.endsWith('.jsonl'))continue;
          const name=file.name.slice(0,-6);
          let content:string;
          try {content=await readFile(join(directory,file.name),'utf8');}catch{continue;}
          for(const line of content.split('\n')){
            if(!line.trim())continue;
            let e:SanitizedEvent;
            try {e=JSON.parse(line) as SanitizedEvent;}catch{continue;}
            if(!safeEvent(e)||e.workspaceId!==workspace.name||e.sessionId!==name||this.seenEvents.has(e.id))continue;
            this.seenEvents.add(e.id);eventCount++;sessions.add(e.sessionId);
            try{this.ensureIndex()?.add(e);}catch{this.index=undefined;}
          }
        }
      }
      return {mode:this.index?'sqlite':'jsonl-only',eventCount,sessionCount:sessions.size};
    });
  }
  /** Only sanitized derived signals are included in this export. */
  async exportJsonl():Promise<string> {
    return this.enqueue(async()=>{
      await this.initialize();let result='';
      for(const dir of await readdir(this.sessionRoot,{withFileTypes:true})){
        if(!dir.isDirectory()||!/^[0-9a-f]{24}$/.test(dir.name))continue;
        for(const file of await readdir(join(this.sessionRoot,dir.name),{withFileTypes:true})){
          if(!file.isFile()||!file.name.endsWith('.jsonl'))continue;
          const data=await readFile(join(this.sessionRoot,dir.name,file.name),'utf8');
          for(const line of data.split('\n')){try{const e=JSON.parse(line);if(safeEvent(e)&&e.workspaceId===dir.name)result+=JSON.stringify(e)+'\n';}catch{ /*skip*/ }}
        }
      }
      return result;
    });
  }
  async clear():Promise<void> {
    await this.enqueue(async()=>{
      await rm(this.sessionRoot,{recursive:true,force:true});await mkdir(this.sessionRoot,{recursive:true});
      this.index?.clear();this.seenEvents.clear();
    });
  }
  close():void {this.index?.close();this.index=undefined;}
  private ensureIndex(): SessionJournal['index'] {
    if(this.index)return this.index;
    // node:sqlite availability is runtime-dependent. JSONL remains fully functional otherwise.
    try {
      // Avoid loading native extensions/binaries and avoid unsupported Node runtimes.
      const {DatabaseSync}=require('node:sqlite') as {DatabaseSync:new(path:string)=>any};
      const db=new DatabaseSync(join(this.root,'navi-index.sqlite'));
      db.exec('PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, at TEXT NOT NULL, session_id TEXT NOT NULL, workspace_id TEXT NOT NULL, type TEXT NOT NULL, code TEXT, input_tokens INTEGER, output_tokens INTEGER, cached_input_tokens INTEGER); CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id,at);');
      const insert=db.prepare('INSERT OR IGNORE INTO events(id,at,session_id,workspace_id,type,code,input_tokens,output_tokens,cached_input_tokens) VALUES(?,?,?,?,?,?,?,?,?)');
      this.index={add(e){insert.run(e.id,e.at,e.sessionId,e.workspaceId,e.type,e.code??null,e.inputTokens??null,e.outputTokens??null,e.cachedInputTokens??null);},clear(){db.exec('DELETE FROM events');},status(){const r=db.prepare('SELECT COUNT(*) AS n,COUNT(DISTINCT session_id) AS s FROM events').get() as {n:number;s:number};return {mode:'sqlite',eventCount:r.n,sessionCount:r.s};},close(){db.close();}};
    }catch{this.index=undefined;}
    return this.index;
  }
  private enqueue<T>(fn:()=>Promise<T>):Promise<T> {
    const p=this.queue.then(fn);this.queue=p.then(()=>undefined,()=>undefined);return p;
  }
}
function validMetrics(e:Partial<SanitizedEvent>):boolean {return [e.inputTokens,e.outputTokens,e.cachedInputTokens].every(x=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0);}
function safeEvent(e:unknown):e is SanitizedEvent {
  if(!e||typeof e!=='object')return false;
  const x=e as Record<string,unknown>;
  if(x.schemaVersion!==1||typeof x.id!=='string'||!/^[-\da-f]{36}$/.test(x.id)||typeof x.at!=='string'||typeof x.sessionId!=='string'||typeof x.workspaceId!=='string'||!['hint','token_metrics'].includes(String(x.type)))return false;
  const allowed=new Set(['schemaVersion','id','at','sessionId','workspaceId','type','code','inputTokens','outputTokens','cachedInputTokens']);
  if(Object.keys(x).some(k=>!allowed.has(k)))return false;
  const codes=['UNCLEAR_GOAL','MISSING_SCOPE','MISSING_DONE_CRITERIA','TOPIC_CHANGE','OVERSIZED_PROMPT'];
  return x.type==='hint' ? codes.includes(String(x.code)) : validMetrics(x);
}
function isMissing(e:unknown):boolean{return typeof e==='object'&&e!==null&&(e as NodeJS.ErrnoException).code==='ENOENT';}
function isExists(e:unknown):boolean{return typeof e==='object'&&e!==null&&(e as NodeJS.ErrnoException).code==='EEXIST';}
