import './style.css';
import { createZone, update, interact, resolveChoice, nearestInteractable, areaAt, AREAS, BALANCE, CONFIG, ENDINGS } from './zone.js';
import { loadNights, rememberCapture, rememberEscape, tonight, clock, shareResultCard } from './night.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { ForestAudio } from './audio.js';

const $=s=>document.querySelector(s),app=$('#app'),audio=new ForestAudio();
const querySeed=new URLSearchParams(location.search).get('seed');
const fixedSeed=querySeed!==null&&Number.isFinite(Number(querySeed))?Number(querySeed):null,night=tonight(),nights=loadNights();
// Explicit ?seed runs stay reproducible, so they neither read nor write the forest's memory.
let mode=fixedSeed===null?'random':'fixed';
const newZone=()=>createZone(mode==='fixed'?fixedSeed:mode==='daily'?night.seed:Date.now(),{memory:mode==='fixed'?[]:nights.memory});
let zone=newZone(),view,controls,modalAction,modalAlt,previousState='',last=performance.now(),lowQuality=false;
function show(label,title,text,button,action,{settings=false,map=false,alt=null}={}){
  $('#modal-alt').hidden=!alt;modalAlt=alt?.[1];if(alt)$('#modal-alt').textContent=alt[0];$('#modal-label').textContent=label;$('#modal-title').textContent=title;$('#modal-text').textContent=text;$('#modal-action').textContent=button;modalAction=action;$('#settings').hidden=!settings;$('#map').hidden=!map;$('#modal').hidden=false;controls?.reset();audio.suspend(true);$('#modal-action').focus({preventScroll:true});
}
function resume(){if(!view||['lost','won','error','choice'].includes(zone.state))return;zone.state='playing';controls.reset();$('#modal').hidden=true;audio.suspend(false);last=performance.now();}
function restart(){zone=newZone();view.reset(zone);audio.reset();previousState='';resume();}
function mapContent(){const current=areaAt(zone.player);$('#map-grid').replaceChildren(...[2,3,0,1].map(index=>{const a=AREAS[index],el=document.createElement('div'),keys=zone.keys.filter(k=>k.area===index);el.className='map-area';el.classList.toggle('current',a.id===current.id);el.dataset.area=a.id;const name=document.createElement('b'),count=document.createElement('span');name.textContent=a.name;count.textContent=`${a.id===current.id?'現在地 · ':''}鍵 ${keys.filter(k=>k.taken).length} / ${keys.length}${index===0?' · 入口':''}`;el.append(name,count);return el;}));}
function pause(){if(zone.state==='paused'||zone.state==='reading'){resume();return;}if(zone.state!=='playing')return;zone.state='paused';mapContent();show('ひと休み','森は、待っている。','消灯すると見つかりにくくなります。\n走る足音には、気をつけて。','森へ戻る',resume,{settings:true,map:true});}
controls=createInput(app,{playing:()=>zone.state==='playing',lock:()=>{if(zone.state==='playing')zone.player.locked=!zone.player.locked;},pause,autoPause:()=>{if(zone.state==='playing')pause();},interact:()=>interact(zone)});
for(const input of document.querySelectorAll('.volume-settings input')){const channel=input.dataset.channel,value=$(`#${channel}-value`),level=audio.getLevels()[channel];input.value=String(Math.round(level*100));value.textContent=input.value;input.addEventListener('input',()=>{audio.setLevel(channel,Number(input.value)/100);value.textContent=input.value;});}
$('#pause').onclick=pause;$('#map-button').onclick=pause;function startAudio(){if(!audio.muted)audio.start().then(()=>{app.dataset.audio='ready';}).catch(()=>{audio.setMuted(true);app.dataset.audio='unavailable';$('#mute').textContent='音 OFF';$('#mute').setAttribute('aria-pressed','true');});}
$('#modal-action').onclick=()=>{startAudio();modalAction?.();};$('#modal-alt').onclick=()=>{startAudio();modalAlt?.();};
$('#light').onclick=()=>{if(zone.state==='playing')zone.light=!zone.light;};
$('#mute').onclick=async()=>{try{await audio.start();audio.setMuted(!audio.muted);audio.suspend(zone.state!=='playing');}catch{audio.setMuted(true);}$('#mute').textContent=`音 ${audio.muted?'OFF':'ON'}`;$('#mute').setAttribute('aria-pressed',String(audio.muted));};
$('#quality').onclick=()=>{lowQuality=!lowQuality;view?.setQuality(lowQuality);$('#quality').textContent=`画質 ${lowQuality?'軽量':'標準'}`;$('#quality').setAttribute('aria-pressed',String(lowQuality));};
$('#credits').onclick=()=>show('制作メモ','素材と操作','移動：左スティック / WASD / 矢印\n走行：長押し / Shift　向き固定：F\n調べる：E / Space　休む：Esc\n\n森林タイル：zeropachame / Vomdrache（CC0）\n樹木：Bleed（CC BY 3.0）\n和風小物：OpenAI ImageGen\n少女・鬼：ご提供画像\n詳しい出典は下のリンクをご覧ください。','設定へ戻る',()=>{zone.state='playing';pause();});
const modeLabel=()=>mode==='daily'?`今夜の森 ${night.label}`:'濡食の森';
const notesRead=()=>zone.notes.filter(n=>n.read).length;
const LOST_HINTS=['','木立で視線を切り、別の道へ。\n灯りを消すと、遠くからは見つかりにくい。','木立で視線を切り、別の道へ。\n灯りを消すと、遠くからは見つかりにくい。','長く隠れていると、あれは近くの道へ回り込む。\n走る力を使い切る前に、角を曲がろう。','長く隠れていると、あれは近くの道へ回り込む。\n走る力を使い切る前に、角を曲がろう。','帰り道では、あれの方を見なければ気づかれにくい。\n「向き固定」なら、背を向けたまま歩ける。'];
function showLost(){
  const area=areaAt(zone.player),looking=zone.caughtLooking;
  if(mode!=='fixed')rememberCapture(nights,zone.player);
  const text=`${area.name}で、つかまった。\n口もとに、甘くて冷たいものが押しつけられる。\n\n${looking?'あれは、ずっと振り返ってほしかった。\n五つの鍵を持ったら、進む方だけを見て。':LOST_HINTS[zone.collected]||LOST_HINTS[1]}${mode!=='fixed'?'\n\n森は、この場所を覚えた。':''}`;
  const card={mode:modeLabel(),title:'夜はまだ明けない',lost:true,lines:[`${area.name}で、つかまった`,`鍵 ${zone.collected} / ${CONFIG.keys}`,`手帳 ${notesRead()} / ${zone.notes.length}`,`探索 ${clock(zone.time)}`]};
  show('夜はまだ明けない',looking?'目が、合ってしまった。':'足音が、止まった。',text,'もう一度、森へ',restart,{alt:['結果カード',()=>shareResultCard(card)]});
}
function showWon(){
  const trueEnd=zone.ending==='true';
  if(mode!=='fixed')rememberEscape(nights,zone,mode==='daily'?night:null);
  const story=trueEnd?'振り返ると、それは鳥居の手前で立ち止まっていた。\n差し出された手の上に、焼きたてのひと切れ。\n\nひと口かじって「おいしい」と言うと、\nそれは嬉しそうに、ほろほろと崩れていった。\n\n森に、朝が来た。':'五つの錠前が、静かに外れた。\n振り返らずに、鳥居をくぐった。\n背中のほうで、何かがほろりと崩れる音がした。';
  const extras=[!zone.darkened&&'一度も灯りを消さなかった。\n帰り道を、誰かが見守っていた気がする。',!trueEnd&&notesRead()<zone.notes.length&&'森には、まだ読まれていない記録がある。'].filter(Boolean);
  const record=mode==='daily'?`\n今夜の森 ${night.label} 最速 ${clock(nights.daily[night.key])}`:mode==='random'&&nights.best!==null?`\n自己最速 ${clock(nights.best)}`:'';
  const seen=Object.keys(ENDINGS).filter(k=>nights.endings[k]).length;
  const text=`${story}\n\n${extras.length?extras.join('\n\n')+'\n\n':''}探索 ${clock(zone.time)}\n手帳 ${notesRead()} / ${zone.notes.length}${record}\n結末 ${seen} / ${Object.keys(ENDINGS).length}`;
  const card={mode:modeLabel(),title:ENDINGS[zone.ending],lost:false,lines:[`探索 ${clock(zone.time)}`,`手帳 ${notesRead()} / ${zone.notes.length}`,trueEnd?'振り返って、ひと口。':'振り返らずに、鳥居の向こうへ',...(!zone.darkened?['灯りを絶やさなかった']:[])]};
  show(trueEnd?'夜明け':'夜明けの手前',`${ENDINGS[zone.ending]}。`,text,'もう一度、森へ',restart,{alt:['結果カード',()=>shareResultCard(card)]});
}
function refresh(){
  app.dataset.state=zone.state;app.dataset.x=zone.player.x.toFixed(3);app.dataset.z=zone.player.z.toFixed(3);app.dataset.area=areaAt(zone.player).id;app.dataset.collected=String(zone.collected);app.dataset.enemy=zone.ghost.state;app.dataset.seed=String(zone.seed);app.dataset.mode=mode;app.dataset.ending=zone.ending||'';
  if(zone.state===previousState)return;previousState=zone.state;
  if(zone.state!=='playing'){controls.reset();zone.player.moving=false;zone.player.running=false;audio.suspend(true);}
  if(zone.state==='reading')show('森の記録',zone.reading.title,zone.reading.text,'手帳を閉じる',resume);
  if(zone.state==='choice')show('鳥居の前','背後で、足音が止まった。','五つの錠前が、静かに外れた。\n背中のすぐ後ろで、何かが立ち止まっている。\n\n手帳の言葉が、頭の中でほどけていく。\n——あれは、ただ、食べてほしかっただけ。','振り返らずに、くぐる',()=>resolveChoice(zone,false),{alt:['振り返る',()=>resolveChoice(zone,true)]});
  if(zone.state==='lost')showLost();
  if(zone.state==='won')showWon();
}
try{view=await createRenderer($('#scene'),zone.world);app.dataset.atlas='8x8';app.dataset.enemyAtlas='8x7';app.dataset.presentation='perspective-hybrid';$('#modal-action').disabled=false;show('四つの場所、五つの鍵','灯りを、たよりに。','森に散らばる五つの鍵を集め、入口の鳥居へ。\n最初の鍵を拾うと、遠い足音が動き出します。\n\n左のスティックで歩き、右のボタンで調べる。\n道に迷ったら、左下の「道案内」を。\n\n「今夜の森」は、今日だけ全員が同じ配置です。'+(nights.best!==null?`\n自己最速 ${clock(nights.best)}`:''),'森へ入る',resume,{alt:mode==='fixed'?null:[`今夜の森（${night.label}）`,()=>{mode='daily';zone=newZone();view.reset(zone);previousState='';resume();}]});}catch(error){console.error(error);zone.state='error';$('#modal-action').disabled=false;show('読み込みエラー','森を読み込めませんでした。',error.message,'再読み込み',()=>location.reload());}
function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;update(zone,controls.input,dt);audio.update(zone,dt);zone.event=null;refresh();view?.draw(zone,dt);
  const p=zone.player,a=areaAt(p),near=zone.state==='playing'?nearestInteractable(zone):null;
  $('#key-count').textContent=Array.from({length:CONFIG.keys},(_,i)=>i<zone.collected?'◆':'◇').join(' ');$('#key-count').setAttribute('aria-label',`鍵 ${zone.collected} / ${CONFIG.keys}`);
  $('#area-number').textContent=['一ノ景','二ノ景','三ノ景','四ノ景'][AREAS.indexOf(a)];$('#area-name').textContent=a.name;$('#objective').textContent=zone.collected===CONFIG.keys?'振り返らずに、入口の鳥居へ。':a.subtitle;
  $('#phase').textContent=BALANCE[zone.collected].label;$('#caption').textContent=zone.time<zone.noticeUntil?zone.notice:'';
  $('#stamina-fill').style.width=`${p.stamina}%`;$('#breath').textContent=p.exhausted?'息を整えて…':p.locked?'向きを固定しています':'息づかい';$('#lock').setAttribute('aria-pressed',String(p.locked));$('#lock').textContent=p.locked?'固定中':'向き固定';$('#run').disabled=p.locked||zone.state!=='playing';
  $('#light').textContent=`灯り ${zone.light?'ON':'OFF'}`;$('#light').setAttribute('aria-pressed',String(zone.light));$('#interact').disabled=!near;$('#interact').textContent=near?near.kind==='key'?'鍵を拾う':near.kind==='note'?'手帳を読む':zone.collected===CONFIG.keys?'鳥居を開ける':'入口の鳥居':'調べる';
  app.style.setProperty('--gaze',zone.gaze.toFixed(2));app.classList.toggle('pursued',zone.ghost.state==='chase'&&zone.state==='playing');app.classList.toggle('caught',zone.state==='lost');requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
