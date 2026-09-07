import { createZone, START, pathfind, distance, update, interact } from '../src/zone.js';

// Reproducible navigation probes, not a prediction of human completion rates.
export function runTrial(seed, policy='cautious', enemyEnabled=true) {
  const g=createZone(seed);g.state='playing';let target=null,route=[],stuck=0,last={...g.player},keysBefore=0,chases=0,lastEnemy='absent';
  for(let frame=0;frame<12000&&g.state==='playing';frame++){
    if(!enemyEnabled)g.spawnAt=null;
    if(!target||g.collected!==keysBefore){keysBefore=g.collected;const goals=g.keys.filter(k=>!k.taken);if(!goals.length)goals.push(START);target=goals.map(p=>({p,path:pathfind(g.world,g.player,p)})).sort((a,b)=>a.path.length-b.path.length)[0].p;route=pathfind(g.world,g.player,target);}
    if(distance(g.player,target)<.45){interact(g);target=null;continue;}
    while(route.length&&distance(g.player,route[0])<.22)route.shift();
    const next=route[0]||target,dx=next.x-g.player.x,dz=next.z-g.player.z;
    const active=g.ghost.state!=='absent',near=active&&distance(g.player,g.ghost)<8;
    g.light=policy==='cautious'?!near:true;
    const run=policy==='sprint'||(policy==='cautious'&&near&&g.player.stamina>5);
    const input={x:Math.abs(dx)>.14?Math.sign(dx):0,z:Math.abs(dz)>.14?Math.sign(dz):0,run};
    update(g,input,.05);
    if(g.ghost.state==='chase'&&lastEnemy!=='chase')chases++;lastEnemy=g.ghost.state;
    stuck=distance(last,g.player)<.001?stuck+.05:0;last={...g.player};
    if(stuck>3){return {seed,policy,state:'stuck',keys:g.collected,time:Math.round(g.time),chases,at:{x:g.player.x,z:g.player.z},next};}
    if(g.state==='reading')g.state='playing';
  }
  return {seed,policy,state:g.state,keys:g.collected,time:Math.round(g.time),chases};
}
if(process.argv[1]?.endsWith('balance-simulation.mjs')){
  const rows=[];for(const policy of ['walk','sprint','cautious'])for(let seed=0;seed<30;seed++)rows.push(runTrial(seed,policy));
  const summary=['walk','sprint','cautious'].map(policy=>{const set=rows.filter(r=>r.policy===policy),won=set.filter(r=>r.state==='won');return {policy,runs:set.length,won:won.length,lost:set.filter(r=>r.state==='lost').length,stuck:set.filter(r=>r.state==='stuck').length,timeout:set.filter(r=>r.state==='playing').length,meanKeys:Number((set.reduce((n,r)=>n+r.keys,0)/set.length).toFixed(2)),meanWinSeconds:won.length?Math.round(won.reduce((n,r)=>n+r.time,0)/won.length):null};});
  for(const r of summary)console.log(`Balance ${r.policy}: runs=${r.runs} won=${r.won} lost=${r.lost} stuck=${r.stuck} timeout=${r.timeout} meanKeys=${r.meanKeys} meanWinSeconds=${r.meanWinSeconds}`);
  const issues=rows.filter(r=>!['won','lost'].includes(r.state));if(issues.length)console.error(JSON.stringify(issues,null,2));
  if(rows.some(r=>!['won','lost'].includes(r.state)))process.exitCode=1;
}
