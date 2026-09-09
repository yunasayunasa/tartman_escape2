import './style.css';
import { createZone, update, interact, nearestInteractable, areaAt, AREAS, BALANCE, CONFIG } from './zone.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { ForestAudio } from './audio.js';

const $=s=>document.querySelector(s),app=$('#app'),audio=new ForestAudio();
const querySeed=new URLSearchParams(location.search).get('seed');
let zone=createZone(querySeed!==null&&Number.isFinite(Number(querySeed))?Number(querySeed):Date.now()),view,controls,modalAction,previousState='',last=performance.now(),lowQuality=false;
function show(label,title,text,button,action,{settings=false,map=false}={}){
  $('#modal-label').textContent=label;$('#modal-title').textContent=title;$('#modal-text').textContent=text;$('#modal-action').textContent=button;modalAction=action;$('#settings').hidden=!settings;$('#map').hidden=!map;$('#modal').hidden=false;controls?.reset();audio.suspend(true);$('#modal-action').focus({preventScroll:true});
}
function resume(){if(!view||['lost','won','error'].includes(zone.state))return;zone.state='playing';controls.reset();$('#modal').hidden=true;audio.suspend(false);last=performance.now();}
function restart(){zone=createZone(querySeed!==null&&Number.isFinite(Number(querySeed))?Number(querySeed):Date.now());view.reset(zone);audio.reset();previousState='';resume();}
function mapContent(){const current=areaAt(zone.player);$('#map-grid').replaceChildren(...[2,3,0,1].map(index=>{const a=AREAS[index],el=document.createElement('div'),keys=zone.keys.filter(k=>k.area===index);el.className='map-area';el.classList.toggle('current',a.id===current.id);el.dataset.area=a.id;const name=document.createElement('b'),count=document.createElement('span');name.textContent=a.name;count.textContent=`${a.id===current.id?'現在地 · ':''}鍵 ${keys.filter(k=>k.taken).length} / ${keys.length}${index===0?' · 入口':''}`;el.append(name,count);return el;}));}
function pause(){if(zone.state==='paused'||zone.state==='reading'){resume();return;}if(zone.state!=='playing')return;zone.state='paused';mapContent();show('ひと休み','森は、待っている。','消灯すると見つかりにくくなります。\n走る足音には、気をつけて。','森へ戻る',resume,{settings:true,map:true});}
controls=createInput(app,{playing:()=>zone.state==='playing',lock:()=>{if(zone.state==='playing')zone.player.locked=!zone.player.locked;},pause,autoPause:()=>{if(zone.state==='playing')pause();},interact:()=>interact(zone)});
for(const input of document.querySelectorAll('.volume-settings input')){const channel=input.dataset.channel,value=$(`#${channel}-value`),level=audio.getLevels()[channel];input.value=String(Math.round(level*100));value.textContent=input.value;input.addEventListener('input',()=>{audio.setLevel(channel,Number(input.value)/100);value.textContent=input.value;});}
$('#pause').onclick=pause;$('#map-button').onclick=pause;$('#modal-action').onclick=()=>{if(!audio.muted)audio.start().then(()=>{app.dataset.audio='ready';}).catch(()=>{audio.setMuted(true);app.dataset.audio='unavailable';$('#mute').textContent='音 OFF';$('#mute').setAttribute('aria-pressed','true');});modalAction?.();};
$('#light').onclick=()=>{if(zone.state==='playing')zone.light=!zone.light;};
$('#mute').onclick=async()=>{try{await audio.start();audio.setMuted(!audio.muted);audio.suspend(zone.state!=='playing');}catch{audio.setMuted(true);}$('#mute').textContent=`音 ${audio.muted?'OFF':'ON'}`;$('#mute').setAttribute('aria-pressed',String(audio.muted));};
$('#quality').onclick=()=>{lowQuality=!lowQuality;view?.setQuality(lowQuality);$('#quality').textContent=`画質 ${lowQuality?'軽量':'標準'}`;$('#quality').setAttribute('aria-pressed',String(lowQuality));};
$('#credits').onclick=()=>show('制作メモ','素材と操作','移動：左スティック / WASD / 矢印\n走行：長押し / Shift　向き固定：F\n調べる：E / Space　休む：Esc\n\n森林タイル：zeropachame / Vomdrache（CC0）\n樹木：Bleed（CC BY 3.0）\n和風小物：OpenAI ImageGen\n少女・鬼：ご提供画像\n詳しい出典は下のリンクをご覧ください。','設定へ戻る',()=>{zone.state='playing';pause();});
function refresh(){
  app.dataset.state=zone.state;app.dataset.x=zone.player.x.toFixed(3);app.dataset.z=zone.player.z.toFixed(3);app.dataset.area=areaAt(zone.player).id;app.dataset.collected=String(zone.collected);app.dataset.enemy=zone.ghost.state;app.dataset.seed=String(zone.seed);
  if(zone.state===previousState)return;previousState=zone.state;
  if(zone.state!=='playing'){controls.reset();zone.player.moving=false;zone.player.running=false;audio.suspend(true);}
  if(zone.state==='reading')show('森の記録',zone.reading.title,zone.reading.text,'手帳を閉じる',resume);
  if(zone.state==='lost')show('夜はまだ明けない','足音が、止まった。','木立で視線を切り、別の道へ。\n走る力を使い切る前に、距離を取ろう。','もう一度、森へ',restart);
  if(zone.state==='won')show('夜明けの手前','鳥居の向こうへ。',`五つの錠前が、静かに外れた。\n振り返ると、森には何も見えなかった。\n\n探索 ${Math.floor(zone.time/60)}分${Math.floor(zone.time%60)}秒\n手帳 ${zone.notes.filter(n=>n.read).length} / ${zone.notes.length}`,'もう一度、森へ',restart);
}
try{view=await createRenderer($('#scene'),zone.world);app.dataset.atlas='8x8';app.dataset.enemyAtlas='8x7';app.dataset.presentation='perspective-hybrid';$('#modal-action').disabled=false;show('四つの場所、五つの鍵','灯りを、たよりに。','森に散らばる五つの鍵を集め、入口の鳥居へ。\n最初の鍵を拾うと、遠い足音が動き出します。\n\n左のスティックで歩き、右のボタンで調べる。\n道に迷ったら、左下の「道案内」を。','森へ入る',resume);}catch(error){console.error(error);zone.state='error';$('#modal-action').disabled=false;show('読み込みエラー','森を読み込めませんでした。',error.message,'再読み込み',()=>location.reload());}
function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;update(zone,controls.input,dt);audio.update(zone,dt);zone.event=null;refresh();view?.draw(zone,dt);
  const p=zone.player,a=areaAt(p),near=zone.state==='playing'?nearestInteractable(zone):null;
  $('#key-count').textContent=Array.from({length:CONFIG.keys},(_,i)=>i<zone.collected?'◆':'◇').join(' ');$('#key-count').setAttribute('aria-label',`鍵 ${zone.collected} / ${CONFIG.keys}`);
  $('#area-number').textContent=['一ノ景','二ノ景','三ノ景','四ノ景'][AREAS.indexOf(a)];$('#area-name').textContent=a.name;$('#objective').textContent=zone.collected===CONFIG.keys?'五つの鍵が揃った。入口の鳥居へ。':a.subtitle;
  $('#phase').textContent=BALANCE[zone.collected].label;$('#caption').textContent=zone.time<zone.noticeUntil?zone.notice:'';
  $('#stamina-fill').style.width=`${p.stamina}%`;$('#breath').textContent=p.exhausted?'息を整えて…':p.locked?'向きを固定しています':'息づかい';$('#lock').setAttribute('aria-pressed',String(p.locked));$('#lock').textContent=p.locked?'固定中':'向き固定';$('#run').disabled=p.locked||zone.state!=='playing';
  $('#light').textContent=`灯り ${zone.light?'ON':'OFF'}`;$('#light').setAttribute('aria-pressed',String(zone.light));$('#interact').disabled=!near;$('#interact').textContent=near?near.kind==='key'?'鍵を拾う':near.kind==='note'?'手帳を読む':zone.collected===CONFIG.keys?'鳥居を開ける':'入口の鳥居':'調べる';
  app.classList.toggle('pursued',zone.ghost.state==='chase'&&zone.state==='playing');app.classList.toggle('caught',zone.state==='lost');requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
