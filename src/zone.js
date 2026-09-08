// Rendering-independent rules. Four regions form a connected forest with alternate routes.
export const CONFIG = Object.freeze({ size: 65, keys: 5, walk: 2.35, run: 3.95, locked: 1.8, drain: 20, recover: 20, recoveryDelay: .65, spawnDelay: 12, interact: 1.5, capture: .56 });
export const START = Object.freeze({ x: 18, z: 53 });
export const AREAS = Object.freeze([
  { id: 'lantern', name: '灯籠の小径', subtitle: '帰り道の灯りを、覚えておこう。', x: 18, z: 46, color: '#69867a' },
  { id: 'pond', name: '水鏡の池', subtitle: '水面の向こうにも、足音がある。', x: 46, z: 46, color: '#496e7a' },
  { id: 'cedar', name: '杉影の参道', subtitle: '木立を回れば、視線は途切れる。', x: 18, z: 18, color: '#5b7478' },
  { id: 'shrine', name: '奥社', subtitle: '五つの鍵を、入口の鳥居へ。', x: 46, z: 18, color: '#7e7765' },
]);
export const POINTS = Object.freeze([
  { area: 0, x: 21, z: 43, name: '小径の石灯籠' }, { area: 0, x: 13, z: 46, name: '苔むした供物台' }, { area: 0, x: 22, z: 50, name: '入口の小祠' },
  { area: 1, x: 49, z: 43, name: '池のほとり' }, { area: 1, x: 46, z: 51, name: '水守の灯籠' }, { area: 1, x: 51, z: 48, name: '濡れた石段' },
  { area: 2, x: 13, z: 18, name: '杉の根元' }, { area: 2, x: 21, z: 22, name: '参道の灯籠' }, { area: 2, x: 18, z: 12, name: '古い道標' },
  { area: 3, x: 50, z: 15, name: '奥社の脇' }, { area: 3, x: 42, z: 21, name: '奥社の石燈' }, { area: 3, x: 50, z: 22, name: '結び石' },
]);
export const STORIES = Object.freeze([
  { x: 17, z: 50, title: '濡れた手帳', text: '「錠前は五つ。鍵は、四つの場所に散らした。\n帰るときは、入口の鳥居へ。」\n\n甘い匂いがしても、ついていかないで。' },
  { x: 48, z: 50, title: '水守の覚え書き', text: '明かりを消せば、遠くからは見つかりにくい。\nけれど、走る足音までは消せない。\n\n木立の向こうへ逃げ、息を整えること。' },
  { x: 15, z: 22, title: '破れた帰路図', text: '小径、池、参道、奥社。\n四つの道は、輪のようにつながっている。\n\n追われたら、別の道へ。\n走る力を使い切る前に、角を曲がること。' },
  { x: 50, z: 19, title: '宛名のない手紙', text: '「今夜も、灯りをひとつ残しておきます。\nあなたが道を忘れても、森が覚えているように。」\n\n紙の端に、乾いた泥がついている。' },
  { x: 44, z: 43, title: '水染みの便箋', text: '「池には顔を映さないで。\n水の底から見返すものは、あなたより先に笑うから。」\n\n最後の一行だけ、何度も消されている。' },
  { x: 21, z: 16, title: '折り畳まれた手紙', text: '「足音が二つ聞こえたら、走らないで。\n三つ聞こえたら、もう振り返らないで。」\n\n差出人の名は、黒く塗り潰されている。' },
]);
export const BALANCE = Object.freeze([
  { label: '静寂', sight: 0, chase: 0, reaction: 0, search: 0, hearing: 0, pressure: Infinity },
  { label: '気配', sight: 7.0, chase: 2.48, reaction: .85, search: 3.4, hearing: 4.6, pressure: Infinity },
  { label: '足音', sight: 7.5, chase: 2.62, reaction: .75, search: 3.8, hearing: 5.0, pressure: Infinity },
  { label: '接近', sight: 8.0, chase: 2.76, reaction: .65, search: 4.2, hearing: 5.4, pressure: 30 },
  { label: '追慕', sight: 8.5, chase: 2.90, reaction: .55, search: 4.6, hearing: 5.8, pressure: 24 },
  { label: '帰路', sight: 9.0, chase: 3.04, reaction: .48, search: 5.0, hearing: 6.2, pressure: 20 },
]);
export const random = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const areaAt = p => AREAS.reduce((a, b) => distance(a, p) <= distance(b, p) ? a : b);
export function inPond(x, z, radius = 0) { return ((x - 42) / (2.7 + radius)) ** 2 + ((z - 46) / (3.8 + radius)) ** 2 < 1; }
export function makeWorld() {
  const size = CONFIG.size, cells = new Uint8Array(size * size);
  const segments = [[AREAS[0], AREAS[1]], [AREAS[0], AREAS[2]], [AREAS[1], AREAS[3]], [AREAS[2], AREAS[3]], [AREAS[0], AREAS[3]], [AREAS[1], AREAS[2]]];
  const islands = [{ x: 17, z: 44, r: 1.65 }, { x: 18, z: 17, r: 2.0 }, { x: 46, z: 17, r: 2.1 }, { x: 31, z: 32, r: 1.1 }];
  function disc(x, z, r) { for (let iz = Math.max(1, Math.floor(z-r)); iz <= Math.min(size-2, z+r); iz++) for (let ix = Math.max(1, Math.floor(x-r)); ix <= Math.min(size-2, x+r); ix++) if (Math.hypot(ix-x,iz-z)<r) cells[iz*size+ix]=1; }
  for (const a of AREAS) disc(a.x,a.z,9.2);
  for (const [a,b] of segments) { const n=Math.ceil(distance(a,b)*3); for(let i=0;i<=n;i++)disc(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,2.2); }
  for(let z=1;z<size-1;z++)for(let x=1;x<size-1;x++)if(inPond(x,z)||islands.some(o=>distance(o,{x,z})<o.r))cells[z*size+x]=0;
  return { size, cells, segments, islands };
}
export function walkable(w,x,z,r=.27) {
  for(const [dx,dz] of [[0,0],[r,r],[-r,r],[r,-r],[-r,-r]]){const cx=Math.round(x+dx),cz=Math.round(z+dz);if(cx<0||cz<0||cx>=w.size||cz>=w.size||!w.cells[cz*w.size+cx])return false;}
  return true;
}
export const canMove = (g,x,z) => walkable(g.world,x,z);
export function lineOfSight(w,a,b) {
  const n=Math.max(1,Math.ceil(distance(a,b)*5));
  for(let i=1;i<=n;i++)if(!walkable(w,a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,0))return false;
  return true;
}
export function pathfind(w,start,goal) {
  const n=w.size,sx=Math.round(start.x),sz=Math.round(start.z),gx=Math.round(goal.x),gz=Math.round(goal.z);
  if(!walkable(w,sx,sz)||!walkable(w,gx,gz))return [];
  const si=sz*n+sx,gi=gz*n+gx,prev=new Int32Array(n*n).fill(-1),queue=[si];prev[si]=si;
  for(let at=0;at<queue.length&&prev[gi]===-1;at++){const cur=queue[at],x=cur%n,z=Math.floor(cur/n);for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0]]){const nx=x+dx,nz=z+dz,ni=nz*n+nx;if(nx>=0&&nz>=0&&nx<n&&nz<n&&prev[ni]===-1&&walkable(w,nx,nz)){prev[ni]=cur;queue.push(ni);}}}
  if(prev[gi]===-1)return [];
  const path=[];for(let at=gi;at!==si;at=prev[at])path.push({x:at%n,z:Math.floor(at/n)});return path.reverse();
}
export function createZone(seed=Date.now()) {
  const rng=random(seed),keys=[];
  for(let area=0;area<AREAS.length;area++){const candidates=POINTS.filter(p=>p.area===area);keys.push({...candidates[Math.floor(rng()*candidates.length)],taken:false});}
  const extras=POINTS.filter(p=>p.area!==0&&!keys.some(k=>k.x===p.x&&k.z===p.z));keys.push({...extras[Math.floor(rng()*extras.length)],taken:false});
  return { world:makeWorld(),seed,rng,state:'ready',time:0,player:{...START,facing:Math.PI,stamina:100,locked:false,exhausted:false,moving:false,running:false,recovery:0},keys,collected:0,notes:STORIES.map(n=>({...n,read:false})),light:true,spawnAt:null,ghost:{x:0,z:0,state:'absent',facing:0,path:[],target:null,repath:0,memory:0,awareness:0,chaseTime:0,cooldown:0,hearAt:0,unseen:0,moving:false},event:null,notice:'鍵を五つ集め、入口の鳥居へ。',noticeUntil:7 };
}
export function say(g,text,seconds=5){g.notice=text;g.noticeUntil=g.time+seconds;}
export function nearestInteractable(g){
  const items=[...g.keys.filter(k=>!k.taken).map(item=>({kind:'key',item})),...g.notes.map(item=>({kind:'note',item})),{kind:'gate',item:START}];
  return items.filter(o=>distance(o.item,g.player)<CONFIG.interact).sort((a,b)=>distance(a.item,g.player)-distance(b.item,g.player))[0]||null;
}
export function interact(g){
  if(g.state!=='playing')return;const o=nearestInteractable(g);if(!o)return;
  if(o.kind==='key'){o.item.taken=true;g.collected++;g.event='key';if(g.collected===1){g.spawnAt=g.time+CONFIG.spawnDelay;say(g,'遠くで枝が折れた。まだ、少し猶予がある。',7);}else if(g.collected===CONFIG.keys)say(g,'五つの鍵が揃った。入口の鳥居へ戻ろう。',8);else say(g,`鍵 ${g.collected} / ${CONFIG.keys} — 足音が、少し速くなった。`);}
  else if(o.kind==='note'){o.item.read=true;g.reading=o.item;g.state='reading';}
  else if(g.collected===CONFIG.keys){g.state='won';g.event='won';}else say(g,`入口の錠前は、あと${CONFIG.keys-g.collected}つ。`);
}
function move(w,e,dx,dz){if(walkable(w,e.x+dx,e.z))e.x+=dx;if(walkable(w,e.x,e.z+dz))e.z+=dz;}
function target(e,p){e.target={x:p.x,z:p.z};e.repath=0;}
export function updateEnemy(g,dt){
  const e=g.ghost,p=g.player,b=BALANCE[g.collected];e.moving=false;
  if(e.state==='absent'){
    if(g.spawnAt===null||g.time<g.spawnAt)return;
    const safe=POINTS.filter(q=>distance(q,p)>16&&!lineOfSight(g.world,p,q));
    if(!safe.length){g.spawnAt=g.time+1;return;}
    const spawn=safe[Math.floor(g.rng()*safe.length)];e.x=spawn.x;e.z=spawn.z;e.state='patrol';e.target=null;e.unseen=0;g.event='arrival';say(g,'遠い足音が、森を歩き始めた。',6);
  }
  e.cooldown=Math.max(0,e.cooldown-dt);
  let d=distance(e,p),visible=lineOfSight(g.world,e,p);e.unseen=e.state==='chase'?0:e.unseen+dt;
  // At high key counts, prolonged calm moves the threat to the nearest fair, off-screen route.
  if(e.state!=='chase'&&e.unseen>=b.pressure&&d>14){
    const candidates=[];for(let z=2;z<g.world.size-2;z++)for(let x=2;x<g.world.size-2;x++){const q={x,z},range=distance(q,p);if(range>=10&&range<=14&&walkable(g.world,x,z)&&!lineOfSight(g.world,p,q))candidates.push(q);}
    candidates.sort((a,c)=>distance(a,p)-distance(c,p));const q=candidates[0];if(q){e.x=q.x;e.z=q.z;e.state='search';e.memory=b.search+2;e.path=[];e.repath=0;e.awareness=0;e.cooldown=0;e.unseen=0;target(e,p);g.event='pressure';say(g,'近くで、湿った枝が折れた。',4);d=distance(e,p);visible=false;}
  }
  const range=g.light?b.sight:b.sight*.66;
  const sees=d<range&&visible&&(e.cooldown===0||d<1.8);
  e.awareness=sees?Math.min(1,e.awareness+dt/Math.max(.1,b.reaction)):Math.max(0,e.awareness-dt*1.8);
  if(sees&&(e.awareness>=1||d<1.4)){
    if(e.state!=='chase'){g.event='chase';e.chaseTime=0;}e.unseen=0;
    e.state='chase';e.target={x:p.x,z:p.z};e.memory=b.search;
  }else if(e.state==='chase'){e.state='search';e.memory=b.search;e.repath=0;}
  // Hearing records the noise location, never a hidden player's ongoing position.
  if(e.state!=='chase'&&p.running&&d<b.hearing*1.22&&g.time>=e.hearAt&&e.cooldown===0){const route=pathfind(g.world,e,p);if(route.length&&route.length<b.hearing*1.75){e.state='search';e.memory=b.search+1.1;target(e,p);}e.hearAt=g.time+1.15;}
  if(e.state==='chase'){e.chaseTime+=dt;if(e.chaseTime>=12){e.state='search';e.memory=2.4;e.cooldown=5;e.awareness=0;target(e,p);}}
  if(e.state==='search'){e.memory-=dt;if(e.memory<=0){e.state='patrol';e.target=null;e.awareness=0;e.cooldown=Math.max(e.cooldown,2.5);}}
  if(e.state==='patrol'&&(!e.target||distance(e,e.target)<.65)){const choices=POINTS.filter(q=>distance(q,e)>6);target(e,choices[Math.floor(g.rng()*choices.length)]);}
  e.repath-=dt;if(e.target&&e.repath<=0){e.path=pathfind(g.world,e,e.target);e.repath=.65;}
  const next=e.path[0]||(e.target&&visible&&e.state==='chase'?e.target:null);
  if(next){const stepDistance=distance(e,next),speed=e.state==='chase'?b.chase:e.state==='search'?1.85:1.5;if(stepDistance<.13)e.path.shift();else{e.facing=Math.atan2(next.x-e.x,next.z-e.z);const step=Math.min(stepDistance,speed*dt);move(g.world,e,(next.x-e.x)/stepDistance*step,(next.z-e.z)/stepDistance*step);e.moving=true;}}
  if(distance(p,e)<CONFIG.capture&&lineOfSight(g.world,e,p)){g.state='lost';g.event='lost';}
}
export function update(g,input,dt){
  if(g.state!=='playing')return;dt=Math.min(.05,Math.max(0,dt));g.time+=dt;const p=g.player;
  p.moving=Math.hypot(input.x,input.z)>.18;p.running=p.moving&&!!input.run&&!p.locked&&!p.exhausted;
  if(p.running){p.stamina=Math.max(0,p.stamina-CONFIG.drain*dt);p.recovery=CONFIG.recoveryDelay;if(p.stamina===0){p.exhausted=true;p.running=false;}}
  else{p.recovery=Math.max(0,p.recovery-dt);if(p.recovery===0)p.stamina=Math.min(100,p.stamina+CONFIG.recover*dt);if(p.stamina>=25)p.exhausted=false;}
  if(p.moving){const a=Math.round(Math.atan2(input.x,input.z)/(Math.PI/4))*Math.PI/4;if(!p.locked)p.facing=a;const speed=p.running?CONFIG.run:p.locked?CONFIG.locked:CONFIG.walk;move(g.world,p,Math.sin(a)*speed*dt,Math.cos(a)*speed*dt);}
  updateEnemy(g,dt);
}
