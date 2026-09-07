import { lineOfSight } from './zone.js';

const asset = name => `${import.meta.env.BASE_URL}assets/audio/${name}.mp3`;

export class ForestAudio {
  constructor() { this.muted=false;this.suspended=true;this.stepAt=0;this.enemyStep=0; }
  async start() {
    if (!this.ctx) {
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
      this.ctx=new Context();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);
      this.musicFilter=this.ctx.createBiquadFilter();this.musicFilter.type='lowpass';this.musicFilter.frequency.value=5400;
      this.musicGain=this.ctx.createGain();this.musicGain.gain.value=.46;this.musicFilter.connect(this.musicGain);this.musicGain.connect(this.master);
      this.effects=this.ctx.createGain();this.effects.gain.value=.72;this.effects.connect(this.master);
      const names=['footsteps','night-bgm','contact','heartbeat'];
      const decoded=await Promise.all(names.map(async name=>this.ctx.decodeAudioData(await (await fetch(asset(name))).arrayBuffer())));
      this.buffers=Object.fromEntries(names.map((name,i)=>[name,decoded[i]]));
      this.bgm=this.ctx.createBufferSource();this.bgm.buffer=this.buffers['night-bgm'];this.bgm.loop=true;this.bgm.connect(this.musicFilter);this.bgm.start();
      this.heart=this.ctx.createBufferSource();this.heart.buffer=this.buffers.heartbeat;this.heart.loop=true;this.heartGain=this.ctx.createGain();this.heartGain.gain.value=0;this.heart.connect(this.heartGain);this.heartGain.connect(this.effects);this.heart.start();
    }
    await this.ctx.resume();this.applyMaster(.08);
  }
  applyMaster(ramp=.18){if(!this.ctx)return;this.master.gain.setTargetAtTime(this.muted||this.suspended?0:.68,this.ctx.currentTime,ramp);}
  setMuted(v){this.muted=v;this.applyMaster(.08);}
  suspend(v){this.suspended=v;this.applyMaster(.16);}
  sample(name,{volume=.5,rate=1,pan=0,offset=0,duration}={}){
    if(!this.ctx||this.muted||this.suspended||!this.buffers?.[name])return;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),stereo=this.ctx.createStereoPanner();source.buffer=this.buffers[name];source.playbackRate.value=rate;gain.gain.value=volume;stereo.pan.value=pan;source.connect(gain);gain.connect(stereo);stereo.connect(this.effects);
    const available=Math.max(.04,source.buffer.duration-offset),length=Math.min(duration||available,available);source.start(0,Math.min(offset,source.buffer.duration-.04),length);source.onended=()=>{source.disconnect();gain.disconnect();stereo.disconnect();};
  }
  update(g,dt){
    if(!this.ctx)return;if(g.event==='lost')this.sample('contact',{volume:.95,rate:.92,duration:1.2});if(g.state!=='playing')return;const now=this.ctx.currentTime,p=g.player,e=g.ghost,d=e.state==='absent'?99:Math.hypot(e.x-p.x,e.z-p.z),visible=e.state!=='absent'&&lineOfSight(g.world,e,p);
    this.stepAt-=dt;if(p.moving&&this.stepAt<=0){this.sample('footsteps',{volume:p.running?.56:.40,rate:p.running?1.12:.92,offset:.05+Math.random()*.35,duration:.24});this.stepAt=p.running?.27:.43;}
    this.enemyStep-=dt;if(e.state!=='absent'&&d<16&&this.enemyStep<=0){const occlusion=visible?1:.48;this.sample('footsteps',{volume:(1-d/18)*.48*occlusion,rate:.72,pan:Math.max(-1,Math.min(1,(e.x-p.x)/8)),offset:.45+Math.random()*.4,duration:.30});this.enemyStep=e.state==='chase'?.34:.62;}
    if(g.event==='key')this.sample('heartbeat',{volume:.22,rate:1.12,duration:.42});
    const threat=e.state==='chase'?1:e.state==='search'?.58:e.state==='patrol'?.24:0,proximity=Math.max(0,1-d/15),occlusion=visible?1:.62,heart=Math.min(.7,threat*proximity*occlusion);
    this.heartGain.gain.setTargetAtTime(heart,now,.16);this.musicFilter.frequency.setTargetAtTime(5400-threat*proximity*2300,now,.35);this.musicGain.gain.setTargetAtTime(.46-threat*proximity*.08,now,.4);
  }
  reset(){this.stepAt=0;this.enemyStep=0;if(this.ctx){this.heartGain.gain.setTargetAtTime(0,this.ctx.currentTime,.06);this.musicFilter.frequency.setTargetAtTime(5400,this.ctx.currentTime,.1);}}
}
