import './style.css';
import { createZone, update, interact, resolveChoice, nearestInteractable, areaIn, mirrorGuide, inSanctuary, weatherFor, BALANCE, CONFIG, ENDINGS } from './zone.js';
import { loadNights, rememberCapture, rememberEscape, tonight, clock, shareResultCard } from './night.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { ForestAudio } from './audio.js';

const $=s=>document.querySelector(s),app=$('#app'),audio=new ForestAudio();
const query=new URLSearchParams(location.search),querySeed=query.get('seed'),queryWeather=['rain','clear'].includes(query.get('weather'))?query.get('weather'):null;
const fixedSeed=querySeed!==null&&Number.isFinite(Number(querySeed))?Number(querySeed):null,night=tonight(),nights=loadNights();
// Explicit ?seed runs stay reproducible: clear weather unless ?weather= is given, and no forest memory is read or written.
let mode=fixedSeed===null?'random':'fixed';
function newZone(){
  const seed=mode==='fixed'?fixedSeed:mode==='daily'?night.seed:Date.now();
  return createZone(seed,{memory:mode==='fixed'?[]:nights.memory,ura:mode==='ura',weather:queryWeather||(mode==='fixed'?'clear':weatherFor(seed))});
}
let zone=newZone(),view,controls,modalAction,modalAlt,modalAlt2,previousState='',last=performance.now(),lowQuality=false;
function show(label,title,text,button,action,{settings=false,map=false,alt=null,alt2=null}={}){
  $('#modal-alt').hidden=!alt;modalAlt=alt?.[1];if(alt)$('#modal-alt').textContent=alt[0];
  $('#modal-alt2').hidden=!alt2;modalAlt2=alt2?.[1];if(alt2)$('#modal-alt2').textContent=alt2[0];
  $('#modal-label').textContent=label;$('#modal-title').textContent=title;$('#modal-text').textContent=text;$('#modal-action').textContent=button;modalAction=action;$('#settings').hidden=!settings;$('#map').hidden=!map;$('#modal').hidden=false;controls?.reset();audio.suspend(true);$('#modal-action').focus({preventScroll:true});
}
function resume(){if(!view||['lost','won','error','choice'].includes(zone.state))return;zone.state='playing';controls.reset();$('#modal').hidden=true;audio.suspend(false);last=performance.now();}
// The Ura night carves a different world, so switching into or out of it rebuilds the renderer.
async function prepareView(){
  if(view&&view.ura===zone.world.ura){view.reset(zone);return;}
  view?.dispose();view=null;show('水鏡の夜','森を、裏返しています。','少しだけ、お待ちください。','読み込み中…',null);$('#modal-action').disabled=true;
  view=await createRenderer($('#scene'),zone);view.setQuality(lowQuality);$('#modal-action').disabled=false;
}
async function startNight(nextMode){if(nextMode)mode=nextMode;zone=newZone();await prepareView();audio.reset();previousState='';resume();}
const restart=()=>startNight();
function mapContent(){
  const current=areaIn(zone),guide=mirrorGuide(zone),order=zone.ura?[3,2,1,0,4]:[2,3,0,1];
  $('#map-grid').replaceChildren(...order.map(index=>{const a=zone.areas[index],el=document.createElement('div'),keys=zone.keys.filter(k=>k.area===index);el.className='map-area';el.classList.toggle('wide',a.id==='ura');el.classList.toggle('current',a.id===current.id);el.dataset.area=a.id;const name=document.createElement('b'),count=document.createElement('span');name.textContent=a.name;count.textContent=`${a.id===current.id?'現在地 · ':''}鍵 ${keys.filter(k=>k.taken).length} / ${keys.length}${index===0?' · 入口':''}${guide?.area.id===a.id?` · 水鏡：${guide.goal.name}`:''}`;el.append(name,count);return el;}));
}
function pause(){if(zone.state==='paused'||zone.state==='reading'){resume();return;}if(zone.state!=='playing')return;zone.state='paused';mapContent();show('ひと休み','森は、待っている。',`消灯すると見つかりにくくなります。\n走る足音には、気をつけて。${zone.weather==='rain'?'\n今夜は雨。足音は、互いに聞こえにくい。':''}${zone.ura?'\n水鏡の夜は、右と左が入れ替わっています。':''}`,'森へ戻る',resume,{settings:true,map:true});}
controls=createInput(app,{playing:()=>zone.state==='playing',lock:()=>{if(zone.state==='playing')zone.player.locked=!zone.player.locked;},pause,autoPause:()=>{if(zone.state==='playing')pause();},interact:()=>interact(zone)});
for(const input of document.querySelectorAll('.volume-settings input')){const channel=input.dataset.channel,value=$(`#${channel}-value`),level=audio.getLevels()[channel];input.value=String(Math.round(level*100));value.textContent=input.value;input.addEventListener('input',()=>{audio.setLevel(channel,Number(input.value)/100);value.textContent=input.value;});}
$('#pause').onclick=pause;$('#map-button').onclick=pause;function startAudio(){if(!audio.muted)audio.start().then(()=>{app.dataset.audio='ready';}).catch(()=>{audio.setMuted(true);app.dataset.audio='unavailable';$('#mute').textContent='音 OFF';$('#mute').setAttribute('aria-pressed','true');});}
$('#modal-action').onclick=()=>{startAudio();modalAction?.();};$('#modal-alt').onclick=()=>{startAudio();modalAlt?.();};$('#modal-alt2').onclick=()=>{startAudio();modalAlt2?.();};
$('#light').onclick=()=>{if(zone.state==='playing')zone.light=!zone.light;};
$('#mute').onclick=async()=>{try{await audio.start();audio.setMuted(!audio.muted);audio.suspend(zone.state!=='playing');}catch{audio.setMuted(true);}$('#mute').textContent=`音 ${audio.muted?'OFF':'ON'}`;$('#mute').setAttribute('aria-pressed',String(audio.muted));};
$('#quality').onclick=()=>{lowQuality=!lowQuality;view?.setQuality(lowQuality);$('#quality').textContent=`画質 ${lowQuality?'軽量':'標準'}`;$('#quality').setAttribute('aria-pressed',String(lowQuality));};
$('#credits').onclick=()=>show('制作メモ','素材と操作','移動：左スティック / WASD / 矢印\n走行：長押し / Shift　向き固定：F\n調べる：E / Space　休む：Esc\n\n森林タイル：zeropachame / Vomdrache（CC0）\n樹木：Bleed（CC BY 3.0）\n和風小物：OpenAI ImageGen\n少女・鬼：ご提供画像\n詳しい出典は下のリンクをご覧ください。','設定へ戻る',()=>{zone.state='playing';pause();});
const modeLabel=()=>`${mode==='daily'?`今夜の森 ${night.label}`:mode==='ura'?'水鏡の夜':'濡食の森'}${zone.weather==='rain'?' · 雨':''}`;
const notesRead=()=>zone.notes.filter(n=>n.read).length;
const EARLY_HINT='木立で視線を切り、別の道へ。\n消えた灯籠に火を入れれば、しばらくその灯りの中は安全。',MIDDLE_HINT='長く隠れていると、あれは近くの道へ回り込む。\n走る力を使い切る前に、角を曲がろう。';
const LOST_HINTS=['',EARLY_HINT,EARLY_HINT,MIDDLE_HINT,MIDDLE_HINT,'帰り道では、あれの方を見なければ気づかれにくい。\n「向き固定」なら、背を向けたまま歩ける。'];
function showLost(){
  const area=areaIn(zone),looking=zone.caughtLooking;
  if(mode!=='fixed')rememberCapture(nights,zone.player);
  const text=`${area.name}で、つかまった。\n口もとに、甘くて冷たいものが押しつけられる。\n\n${looking?'あれは、ずっと振り返ってほしかった。\n五つの鍵を持ったら、進む方だけを見て。':LOST_HINTS[zone.collected]||LOST_HINTS[1]}${mode!=='fixed'?'\n\n森は、この場所を覚えた。':''}`;
  const card={mode:modeLabel(),title:'夜はまだ明けない',lost:true,lines:[`${area.name}で、つかまった`,`鍵 ${zone.collected} / ${CONFIG.keys}`,`手帳 ${notesRead()} / ${zone.notes.length}`,`探索 ${clock(zone.time)}`]};
  show('夜はまだ明けない',looking?'目が、合ってしまった。':'足音が、止まった。',text,'もう一度、森へ',restart,{alt:['結果カード',()=>shareResultCard(card)]});
}
const STORY={
  escape:'五つの錠前が、静かに外れた。\n振り返らずに、鳥居をくぐった。\n背中のほうで、何かがほろりと崩れる音がした。',
  true:'振り返ると、それは鳥居の手前で立ち止まっていた。\n差し出された手の上に、焼きたてのひと切れ。\n\nひと口かじって「おいしい」と言うと、\nそれは嬉しそうに、ほろほろと崩れていった。\n\n森に、朝が来た。',
  home:'振り返ると、タルトマンが立っていた。\n——ずっと、この帰り道で待っていたのだ。\n\nひと口かじると、杏の味がした。\n「ただいま」と言うと、\n森の奥で、灯りがひとつ消えた。',
};
const CARD_LINE={escape:'振り返らずに、鳥居の向こうへ',true:'振り返って、ひと口。',home:'杏の味がした。'};
function showWon(){
  const ending=zone.ending,turned=ending!=='escape',firstUra=ending==='true'&&!nights.endings.true;
  if(mode!=='fixed')rememberEscape(nights,zone,mode==='daily'?night:null);
  const extras=[!zone.darkened&&'一度も灯りを消さなかった。\n帰り道を、誰かが見守っていた気がする。',!turned&&notesRead()<zone.notes.length&&'森には、まだ読まれていない記録がある。',firstUra&&mode!=='fixed'&&'池の水面が、裏返った。\n——「水鏡の夜」が、開始画面に現れた。'].filter(Boolean);
  const record=mode==='daily'?`\n今夜の森 ${night.label} 最速 ${clock(nights.daily[night.key])}`:mode==='random'&&nights.best!==null?`\n自己最速 ${clock(nights.best)}`:'';
  const seen=Object.keys(ENDINGS).filter(k=>nights.endings[k]).length;
  const text=`${STORY[ending]}\n\n${extras.length?extras.join('\n\n')+'\n\n':''}探索 ${clock(zone.time)}\n手帳 ${notesRead()} / ${zone.notes.length}${record}\n結末 ${seen} / ${Object.keys(ENDINGS).length}`;
  const card={mode:modeLabel(),title:ENDINGS[ending],lost:false,lines:[`探索 ${clock(zone.time)}`,`手帳 ${notesRead()} / ${zone.notes.length}`,CARD_LINE[ending],...(!zone.darkened?['灯りを絶やさなかった']:[])]};
  show(ending==='home'?'帰り道の果て':turned?'夜明け':'夜明けの手前',`${ENDINGS[ending]}。`,text,'もう一度、森へ',restart,{alt:['結果カード',()=>shareResultCard(card)]});
}
function showChoice(){
  const text=zone.ura?'五つの錠前が、静かに外れた。\n背中のすぐ後ろで、杏の甘い匂いがする。\n\n手帳の言葉が、頭の中でほどけていく。\n——あれが待っていたのは、あなただった。':'五つの錠前が、静かに外れた。\n背中のすぐ後ろで、何かが立ち止まっている。\n\n手帳の言葉が、頭の中でほどけていく。\n——あれは、ただ、食べてほしかっただけ。';
  show('鳥居の前','背後で、足音が止まった。',text,'振り返らずに、くぐる',()=>resolveChoice(zone,false),{alt:['振り返る',()=>resolveChoice(zone,true)]});
}
function refresh(){
  app.dataset.state=zone.state;app.dataset.x=zone.player.x.toFixed(3);app.dataset.z=zone.player.z.toFixed(3);app.dataset.area=areaIn(zone).id;app.dataset.collected=String(zone.collected);app.dataset.enemy=zone.ghost.state;app.dataset.seed=String(zone.seed);app.dataset.mode=mode;app.dataset.ending=zone.ending||'';app.dataset.weather=zone.weather;
  if(zone.state===previousState)return;previousState=zone.state;
  if(zone.state!=='playing'){controls.reset();zone.player.moving=false;zone.player.running=false;audio.suspend(true);}
  if(zone.state==='reading')show('森の記録',zone.reading.title,zone.reading.text,'手帳を閉じる',resume);
  if(zone.state==='choice')showChoice();
  if(zone.state==='lost')showLost();
  if(zone.state==='won')showWon();
}
function showStart(){
  const uraOpen=mode!=='fixed'&&nights.endings.true;
  show('四つの場所、五つの鍵','灯りを、たよりに。','森に散らばる五つの鍵を集め、入口の鳥居へ。\n最初の鍵を拾うと、遠い足音が動き出します。\n\n左のスティックで歩き、右のボタンで調べる。\n消えた灯籠と、池の見晴らしも調べられます。\n道に迷ったら、左下の「道案内」を。\n\n「今夜の森」は、今日だけ全員が同じ配置です。'+(nights.best!==null?`\n自己最速 ${clock(nights.best)}`:''),'森へ入る',resume,{alt:mode==='fixed'?null:[`今夜の森（${night.label}）`,()=>startNight('daily')],alt2:uraOpen?['水鏡の夜',()=>startNight('ura')]:null});
}
try{view=await createRenderer($('#scene'),zone);app.dataset.atlas='8x8';app.dataset.enemyAtlas='8x7';app.dataset.presentation='perspective-hybrid';$('#modal-action').disabled=false;showStart();}catch(error){console.error(error);zone.state='error';$('#modal-action').disabled=false;show('読み込みエラー','森を読み込めませんでした。',error.message,'再読み込み',()=>location.reload());}
const INTERACT_LABEL={key:'鍵を拾う',note:'手帳を読む',lantern:'灯籠に火を',mirror:'水面を覗く'};
function frame(now){
  // On the Ura night the picture is mirrored, so screen-right input walks toward world-left.
  const dt=Math.min(.05,Math.max(0,(now-last)/1000)),input=zone.ura?{...controls.input,x:-controls.input.x}:controls.input;last=now;update(zone,input,dt);audio.update(zone,dt);zone.event=null;refresh();if(view)view.draw(zone,dt);
  const p=zone.player,a=areaIn(zone),near=zone.state==='playing'?nearestInteractable(zone):null,guide=mirrorGuide(zone),sheltered=inSanctuary(zone,p);
  $('#key-count').textContent=Array.from({length:CONFIG.keys},(_,i)=>i<zone.collected?'◆':'◇').join(' ');$('#key-count').setAttribute('aria-label',`鍵 ${zone.collected} / ${CONFIG.keys}`);
  $('#area-number').textContent=['一ノ景','二ノ景','三ノ景','四ノ景','裏ノ景'][zone.areas.indexOf(a)];$('#area-name').textContent=a.name;$('#objective').textContent=guide?`水鏡の導き ${guide.arrow} ${guide.goal.name}`:zone.collected===CONFIG.keys?'振り返らずに、入口の鳥居へ。':a.subtitle;
  $('#phase').textContent=BALANCE[zone.collected].label;$('#caption').textContent=zone.time<zone.noticeUntil?zone.notice:'';
  $('#stamina-fill').style.width=`${p.stamina}%`;$('#breath').textContent=p.exhausted?'息を整えて…':sheltered?'灯りに守られている':p.locked?'向きを固定しています':'息づかい';$('#lock').setAttribute('aria-pressed',String(p.locked));$('#lock').textContent=p.locked?'固定中':'向き固定';$('#run').disabled=p.locked||zone.state!=='playing';
  $('#light').textContent=`灯り ${zone.light?'ON':'OFF'}`;$('#light').setAttribute('aria-pressed',String(zone.light));$('#interact').disabled=!near;$('#interact').textContent=near?INTERACT_LABEL[near.kind]||(zone.collected===CONFIG.keys?'鳥居を開ける':'入口の鳥居'):'調べる';
  app.style.setProperty('--gaze',zone.gaze.toFixed(2));app.classList.toggle('ura',zone.ura);app.classList.toggle('rain',zone.weather==='rain');app.classList.toggle('sheltered',sheltered&&zone.state==='playing');app.classList.toggle('pursued',zone.ghost.state==='chase'&&zone.state==='playing');app.classList.toggle('caught',zone.state==='lost');requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
