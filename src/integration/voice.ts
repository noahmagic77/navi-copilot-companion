export type VoiceIntent={action:'aside'|'return'|'problem'|'stop'|'stopListening'}|{action:'openFile';name:string};
export function parseVoiceCommand(text:string):VoiceIntent|null {
  const clean=text.trim().replace(/[.!?]+$/u,'').trim();
  const normalized=clean.toLocaleLowerCase('de');
  const commands:Record<string,VoiceIntent['action']>={'zur seite':'aside','komm zurück':'return','zeig das nächste problem':'problem','stopp':'stop','stop':'stop','nicht mehr zuhören':'stopListening'};
  const action=Object.hasOwn(commands,normalized)?commands[normalized]:undefined;
  if(action)return {action} as VoiceIntent;
  const match=/^öffne datei\s+(.+)$/iu.exec(clean);
  return match&&match[1].length<=300?{action:'openFile',name:match[1]}:null;
}
export interface VoiceMetadata {name:string;device:string;processing:'local-cpu'|'local-gpu'|'remote'|'server'|'unknown';dataPath:string;continuous:true}
/** Providers must already exist in the host and deliver final transcripts only. */
export interface VoiceProvider {
  metadata:VoiceMetadata;
  start(handlers:{transcript:(text:string)=>void;error:(error:Error)=>void}):Promise<void>;
  stop():Promise<void>;
}
export class VoiceController {
  private provider:VoiceProvider|undefined;
  private generation=0;
  private listening=false;
  private starting=false;
  private pendingStop:Promise<void>=Promise.resolve();
  private failedStop:VoiceProvider|undefined;
  constructor(private readonly execute:(intent:VoiceIntent)=>Promise<void>,private readonly changed:(listening:boolean,reason:string)=>void){}
  get metadata():VoiceMetadata|undefined{return this.provider?{...this.provider.metadata}:undefined;}
  register(provider:VoiceProvider):{dispose():void}{
    if(this.provider)throw new Error('Ein Sprachanbieter ist bereits registriert.');
    const metadata=provider.metadata;
    if(!metadata||metadata.continuous!==true||!metadata.name?.trim()||!metadata.device?.trim()||!metadata.dataPath?.trim()||!['local-cpu','local-gpu','remote','server','unknown'].includes(metadata.processing)||typeof provider.start!=='function'||typeof provider.stop!=='function')throw new Error('Ungültiger Sprachanbieter.');
    this.provider=provider;this.changed(false,'Vorhandener Sprachanbieter registriert.');
    return {dispose:()=>{if(this.provider===provider){void this.stop('Sprachanbieter wurde getrennt.');this.provider=undefined;}}};
  }
  async start():Promise<void>{
    if(this.listening||this.starting)return;
    if(this.failedStop){this.changed(true,'Mikrofon-Stopp noch nicht bestätigt. Bitte zuerst erneut stoppen.');return;}
    const provider=this.provider;
    if(!provider){this.changed(false,'Kein unterstützter Anbieter für Mikrofon und Transkription registriert. Ein Textmodell genügt nicht.');return;}
    const generation=++this.generation;this.starting=true;
    this.changed(true,'Mikrofon wird aktiviert.');
    try{
      await this.pendingStop;
      if(generation!==this.generation)return;
      this.listening=true;
      await provider.start({
        transcript:text=>{
          if(generation!==this.generation||!this.listening||typeof text!=='string'||text.length>1000)return;
          const intent=parseVoiceCommand(text);
          if(intent?.action==='stopListening')void this.stop('Zuhörmodus beendet.');
          else if(intent)void this.execute(intent).catch(()=>this.stop('Sprachaktion fehlgeschlagen.'));
        },
        error:()=>{if(generation===this.generation)void this.stop('Spracherkennung fehlgeschlagen.');}
      });
      if(generation!==this.generation){
        try{await provider.stop();}catch{this.failedStop=provider;this.changed(true,'Mikrofon-Stopp fehlgeschlagen; Aufnahme möglicherweise aktiv. Erneut stoppen.');}
      }
      else this.changed(true,'Mikrofon aktiv — zum Beenden klicken.');
    }catch{if(generation===this.generation)await this.stop('Mikrofon konnte nicht gestartet werden.');}
    finally{this.starting=false;}
  }
  async stop(reason='Zuhörmodus beendet.'):Promise<void>{
    ++this.generation;const wasActive=this.listening||this.starting;this.listening=false;
    this.changed(false,reason);
    const provider=this.failedStop??this.provider;
    if((wasActive||this.failedStop)&&provider)this.pendingStop=this.pendingStop.then(async()=>{
      await provider.stop();this.failedStop=undefined;
    }).catch(()=>{this.failedStop=provider;this.changed(true,'Mikrofon-Stopp fehlgeschlagen; Aufnahme möglicherweise aktiv. Erneut stoppen.');});
    await this.pendingStop;
  }
}
