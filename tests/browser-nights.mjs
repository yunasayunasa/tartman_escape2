import assert from 'node:assert/strict';
import {createZone,START,pathfind,distance} from '../src/zone.js';

// Tonight's forest, the remembered capture spot and the result card, driven by live input with the enemy enabled.
export default {name:'forest-nights',viewport:{width:390,height:844},async run({page,baseUrl,check,screenshot}){
  const d=new Date(),seed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(),model=createZone(seed);
  await page.goto(baseUrl);await page.locator('#modal-action:enabled').waitFor({timeout:30000});
  await check('the start screen offers tonight\'s shared forest',async()=>{assert.match(await page.locator('#modal-alt').textContent(),/今夜の森（\d+月\d+日）/);assert.equal(await page.locator('#modal-alt').isVisible(),true);await screenshot('start');});
  await check('choosing tonight\'s forest uses the date seed',async()=>{await page.locator('#modal-alt').click();await page.waitForTimeout(150);assert.equal(await page.locator('#app').getAttribute('data-state'),'playing');assert.equal(await page.locator('#app').getAttribute('data-mode'),'daily');assert.equal(await page.locator('#app').getAttribute('data-seed'),String(seed));assert.equal(await page.locator('#modal-alt').isVisible(),false);});
  const state=()=>page.locator('#app').getAttribute('data-state');
  const position=()=>page.locator('#app').evaluate(el=>({x:Number(el.dataset.x),z:Number(el.dataset.z)}));
  async function walkTo(goal){const route=pathfind(model.world,await position(),goal);let held=new Set();try{for(let step=0;step<1500;step++){if(await state()!=='playing')return false;const p=await position();if(distance(p,goal)<.38)return true;while(route.length&&distance(p,route[0])<.32)route.shift();const next=route[0]||goal,dx=next.x-p.x,dz=next.z-p.z,want=new Set();if(Math.abs(dx)>.16)want.add(dx>0?'KeyD':'KeyA');if(Math.abs(dz)>.16)want.add(dz>0?'KeyS':'KeyW');for(const k of held)if(!want.has(k))await page.keyboard.up(k);for(const k of want)if(!held.has(k))await page.keyboard.down(k);held=want;await page.waitForTimeout(65);}return false;}finally{for(const k of held)await page.keyboard.up(k);}}
  await check('a night ends in a result with a shareable card',async()=>{
    const remaining=[...model.keys];
    while(await state()==='playing'){const p=await position();remaining.sort((a,b)=>pathfind(model.world,p,a).length-pathfind(model.world,p,b).length);const goal=remaining.shift()||START;if(await walkTo(goal))await page.locator('#interact').click();await page.waitForTimeout(100);}
    const end=await state();assert.ok(['lost','won'].includes(end),end);await screenshot(`result-${end}`);
    assert.equal(await page.locator('#modal-alt').textContent(),'結果カード');
    if(end==='lost'){assert.match(await page.locator('#modal-text').textContent(),/森は、この場所を覚えた。/);const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tartman-nights')));assert.equal(saved.memory.length,1);assert.equal(saved.caught,1);}
    else assert.equal(await page.locator('#app').getAttribute('data-ending'),'escape');
    const [download]=await Promise.all([page.waitForEvent('download',{timeout:10000}),page.locator('#modal-alt').click()]);assert.equal(download.suggestedFilename(),'tartman-night.png');
  });
  await check('retrying keeps tonight\'s layout',async()=>{await page.locator('#modal-action').click();await page.waitForTimeout(150);assert.equal(await state(),'playing');assert.equal(await page.locator('#app').getAttribute('data-mode'),'daily');assert.equal(await page.locator('#app').getAttribute('data-seed'),String(seed));});
  await check('a fixed seed hides tonight\'s forest and keeps no memory',async()=>{await page.goto(`${baseUrl}?seed=1`);await page.locator('#modal-action:enabled').waitFor({timeout:30000});assert.equal(await page.locator('#modal-alt').isVisible(),false);await page.locator('#modal-action').click();assert.equal(await page.locator('#app').getAttribute('data-mode'),'fixed');});
}};
