// Per-device records of earlier nights: remembered capture spots, best times, seen endings and the shareable result card.
const STORE='tartman-nights';
const empty=()=>({memory:[],best:null,daily:{},endings:{},caught:0});

export function loadNights(){
  try{
    const v=JSON.parse(localStorage.getItem(STORE)||'{}'),n=empty();
    if(Array.isArray(v.memory))n.memory=v.memory.filter(q=>Number.isFinite(q?.x)&&Number.isFinite(q?.z)).slice(-4);
    if(Number.isFinite(v.best))n.best=v.best;
    if(v.daily&&typeof v.daily==='object')n.daily=v.daily;
    if(v.endings&&typeof v.endings==='object')n.endings=v.endings;
    n.caught=Number(v.caught)||0;return n;
  }catch{return empty();}
}
export function saveNights(n){try{localStorage.setItem(STORE,JSON.stringify(n));}catch{}}
export function rememberCapture(n,p){n.caught++;n.memory=[...n.memory,{x:Math.round(p.x*10)/10,z:Math.round(p.z*10)/10}].slice(-4);saveNights(n);}
export function rememberEscape(n,g,night){
  n.endings[g.ending]=true;n.best=n.best===null?g.time:Math.min(n.best,g.time);
  if(night){const prev=n.daily[night.key];n.daily={[night.key]:Number.isFinite(prev)?Math.min(prev,g.time):g.time};}
  saveNights(n);
}

// "Tonight's forest": every player gets the same key layout for the local calendar day.
export function tonight(d=new Date()){
  const y=d.getFullYear(),m=d.getMonth()+1,day=d.getDate();
  return {key:`${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`,seed:y*10000+m*100+day,label:`${m}月${day}日`};
}
export const clock=s=>`${Math.floor(s/60)}分${String(Math.floor(s%60)).padStart(2,'0')}秒`;

const SERIF='"Yu Mincho","Hiragino Mincho ProN","Noto Serif JP",serif';
function loadImage(src){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;});}

export async function drawResultCard({mode,title,lines,lost}){
  const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');
  const bg=x.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,lost?'#2a0d12':'#15303a');bg.addColorStop(1,'#050b10');x.fillStyle=bg;x.fillRect(0,0,1080,1350);
  for(let i=0;i<900;i++){x.fillStyle=`rgba(220,214,190,${Math.random()*.05})`;x.fillRect(Math.random()*1080,Math.random()*1350,2,2);}
  x.strokeStyle='#adb29a66';x.lineWidth=2;x.strokeRect(54,54,972,1242);
  // One camera-facing frame (80x85) from the generated tart man atlas, enlarged without smoothing.
  const tart=await loadImage(`${import.meta.env.BASE_URL}assets/generated/enemy-atlas.png`);
  if(tart){x.imageSmoothingEnabled=false;x.globalAlpha=lost?.9:.7;x.drawImage(tart,0,0,80,85,540-160,820,320,340);x.globalAlpha=1;}
  x.textAlign='center';x.fillStyle='#c4ad86';x.font=`30px ${SERIF}`;x.fillText('おいしいたると2 〜 濡食の森 〜',540,160);
  x.font=`26px ${SERIF}`;x.fillStyle='#8ea9a1';x.fillText(mode,540,214);
  x.fillStyle='#e0ded0';x.font=`76px ${SERIF}`;x.fillText(title,540,380);
  x.font=`38px ${SERIF}`;x.fillStyle='#b5c3c0';lines.forEach((line,i)=>x.fillText(line,540,500+i*70));
  x.font='24px sans-serif';x.fillStyle='#8ea9a1';x.fillText('yunasayunasa.github.io/tartman_escape2',540,1250);
  return new Promise(resolve=>c.toBlob(resolve,'image/png'));
}

export async function shareResultCard(card){
  const blob=await drawResultCard(card);if(!blob)return;
  const file=new File([blob],'tartman-night.png',{type:'image/png'});
  if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'おいしいたると2',text:`${card.title} — おいしいたると2〜濡食の森〜`});return;}catch(error){if(error?.name==='AbortError')return;}}
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
