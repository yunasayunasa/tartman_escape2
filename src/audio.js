import { lineOfSight } from './zone.js';

const asset=name=>`${import.meta.env.BASE_URL}assets/audio/${name}.mp3`;
const DEFAULT_LEVELS=Object.freeze({master:.9,music:.08,effects:1.15,heart:1.5});
const clamp=value=>Math.max(0,Math.min(1.5,Number(value)));

export class ForestAudio {
  constructor(){
    this.muted=false;this.suspended=true;this.stepAt=0;this.enemyStep=0;
    try{this.levels={...DEFAULT_LEVELS,...JSON.parse(localStorage.getItem('tartman-audio-levels')||'{}')};}catch{this.levels={...DEFAULT_LEVELS};}
    const names=['footsteps','contact','heartbeat'];
    this.encoded=Promise.all(names.map(async name=>[name,await(await fetch(asset(name))).arrayBuffer()]));
    this.musicElement=new Audio(asset('night-bgm'));this.musicElement.loop=true;this.musicElement.preload='auto';this.musicElement.load();
  }
  async start(){
    if(!this.ctx){
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
      this.ctx=new Context();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);
      this.musicFilter=this.ctx.createBiquadFilter();this.musicFilter.type='lowpass';this.musicFilter.frequency.value=5200;
      this.musicGain=this.ctx.createGain();this.musicFilter.connect(this.musicGain);this.musicGain.connect(this.master);
      this.effects=this.ctx.createGain();this.effects.connect(this.master);
      this.heartBus=this.ctx.createGain();this.heartBus.connect(this.master);
      this.bgm=this.ctx.createMediaElementSource(this.musicElement);this.bgm.connect(this.musicFilter);
      this.heartGain=this.ctx.createGain();this.heartGain.gain.value=0;this.heartGain.connect(this.heartBus);
      this.applyLevels();
    }
    const resume=this.ctx.resume(),music=this.musicElement.play();
    if(!this.ready)this.ready=(async()=>{const encoded=await this.encoded,decoded=await Promise.all(encoded.map(([,data])=>this.ctx.decodeAudioData(data)));this.buffers=Object.fromEntries(encoded.map(([name],i)=>[name,decoded[i]]));this.heart=this.ctx.createBufferSource();this.heart.buffer=this.buffers.heartbeat;this.heart.loop=true;this.heart.connect(this.heartGain);this.heart.start();})();
    await Promise.all([resume,music,this.ready]);this.applyMaster(.08);
  }
  getLevels(){return {...this.levels};}
  setLevel(name,value){if(!(name in DEFAULT_LEVELS))return;this.levels[name]=clamp(value);try{localStorage.setItem('tartman-audio-levels',JSON.stringify(this.levels));}catch{}this.applyLevels();}
  applyLevels(){if(!this.ctx)return;const now=this.ctx.currentTime;this.musicGain.gain.setTargetAtTime(this.levels.music,now,.05);this.effects.gain.setTargetAtTime(this.levels.effects,now,.05);this.heartBus.gain.setTargetAtTime(this.levels.heart,now,.05);this.applyMaster(.05);}
  applyMaster(ramp=.18){if(!this.ctx)return;this.master.gain.setTargetAtTime(this.muted||this.suspended?0:.72*this.levels.master,this.ctx.currentTime,ramp);}
  setMuted(v){this.muted=v;this.applyMaster(.08);}
  suspend(v){this.suspended=v;this.applyMaster(.16);}
  sample(name,{volume=.5,rate=1,pan=0,offset=0,duration}={}){
    if(!this.ctx||this.muted||this.suspended||!this.buffers?.[name])return;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),stereo=this.ctx.createStereoPanner();source.buffer=this.buffers[name];source.playbackRate.value=rate;gain.gain.value=volume;stereo.pan.value=pan;source.connect(gain);gain.connect(stereo);stereo.connect(name==='heartbeat'?this.heartBus:this.effects);
    const available=Math.max(.04,source.buffer.duration-offset),length=Math.min(duration||available,available);source.start(0,Math.min(offset,source.buffer.duration-.04),length);source.onended=()=>{source.disconnect();gain.disconnect();stereo.disconnect();};
  }
  update(g,dt){
    if(!this.ctx)return;if(g.event==='lost')this.sample('contact',{volume:1.05,rate:.92,duration:1.2});if(g.state!=='playing')return;const now=this.ctx.currentTime,p=g.player,e=g.ghost,d=e.state==='absent'?99:Math.hypot(e.x-p.x,e.z-p.z),visible=e.state!=='absent'&&lineOfSight(g.world,e,p);
    this.stepAt-=dt;if(p.moving&&this.stepAt<=0){this.sample('footsteps',{volume:p.running?.72:.56,rate:p.running?1.12:.92,offset:.05+Math.random()*.35,duration:.24});this.stepAt=p.running?.27:.43;}
    this.enemyStep-=dt;if(e.state!=='absent'&&d<18&&this.enemyStep<=0){const occlusion=visible?1:.58;this.sample('footsteps',{volume:(1-d/20)*.72*occlusion,rate:.72,pan:Math.max(-1,Math.min(1,(e.x-p.x)/8)),offset:.45+Math.random()*.4,duration:.30});this.enemyStep=e.state==='chase'?.34:.62;}
    if(g.event==='key')this.sample('heartbeat',{volume:.72,rate:1.12,duration:.55});
    if(g.event==='arrival')this.sample('footsteps',{volume:.9,rate:.7,pan:.65,offset:.4,duration:.5});
    if(g.event==='pressure'){this.sample('footsteps',{volume:1.08,rate:.66,pan:Math.max(-1,Math.min(1,(e.x-p.x)/7)),offset:.35,duration:.65});this.sample('heartbeat',{volume:1.0,rate:1.18,duration:.65});}
    if(g.event==='chase')this.sample('heartbeat',{volume:1.35,rate:1.35,duration:.85});
    const threat=e.state==='chase'?1:e.state==='search'?.62:e.state==='patrol'?.2:0,proximity=Math.max(0,1-d/19),occlusion=visible?1:.76,heart=Math.min(1.5,threat*proximity*1.9*occlusion);
    this.heartGain.gain.setTargetAtTime(heart,now,.09);this.musicFilter.frequency.setTargetAtTime(5000-threat*proximity*3500,now,.16);this.musicGain.gain.setTargetAtTime(this.levels.music*(1-threat*proximity*.48),now,.16);
  }
  reset(){this.stepAt=0;this.enemyStep=0;if(this.ctx){this.heartGain.gain.setTargetAtTime(0,this.ctx.currentTime,.06);this.musicFilter.frequency.setTargetAtTime(5000,this.ctx.currentTime,.1);this.musicGain.gain.setTargetAtTime(this.levels.music,this.ctx.currentTime,.1);}}
}
