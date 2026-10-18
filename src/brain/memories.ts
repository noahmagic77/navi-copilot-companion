import {randomUUID} from 'node:crypto';

export interface Memory {id:string;kind:'preference'|'note'|'task'|'next';text:string;source:'user';confirmedAt:string}
export interface MemoryStorage {get<T>(key:string,defaultValue:T):T;update(key:string,value:unknown):Thenable<void>|Promise<void>}
const key='navi.companion.memories.v1';
export class MemoryStore {
  constructor(private readonly global:MemoryStorage,private readonly workspace:MemoryStorage){}
  list():Memory[]{return [...this.read(this.global),...this.read(this.workspace)];}
  private read(storage:MemoryStorage):Memory[]{
    const value=storage.get<unknown>(key,[]);
    if(!Array.isArray(value))return [];
    return value.filter((item):item is Memory=>!!item&&typeof item.id==='string'&&['preference','note','task','next'].includes(item.kind)&&typeof item.text==='string'&&Array.from(item.text).length<=500&&item.source==='user'&&typeof item.confirmedAt==='string'&&Number.isFinite(Date.parse(item.confirmedAt))).slice(0,100).map(item=>({...item}));
  }
  async save(kind:Memory['kind'],text:string,id?:string):Promise<void>{
    const clean=text.trim();
    if(!clean||Array.from(clean).length>500)throw new Error('Eine Erinnerung braucht 1 bis 500 Zeichen.');
    const storage=kind==='preference'?this.global:this.workspace;
    const entries=this.read(storage);
    const index=id?entries.findIndex(entry=>entry.id===id):-1;
    if(id&&index<0)throw new Error('Diese Erinnerung ist nicht mehr vorhanden.');
    if(index<0&&entries.length>=100)throw new Error('Maximal 100 Erinnerungen je Speicherbereich.');
    const entry:Memory={id:id??randomUUID(),kind,text:clean,source:'user',confirmedAt:new Date().toISOString()};
    if(index<0)entries.push(entry);else entries[index]=entry;
    await storage.update(key,entries);
  }
  async remove(id:string):Promise<void>{
    for(const storage of [this.global,this.workspace])await storage.update(key,this.read(storage).filter(entry=>entry.id!==id));
  }
  async clear(projectOnly=false):Promise<void>{
    await this.workspace.update(key,[]);
    if(!projectOnly)await this.global.update(key,[]);
  }
}
