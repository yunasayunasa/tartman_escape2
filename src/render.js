import * as THREE from 'three';
import { load, tex, crop, makeCanvas, girlAtlas, enemyAtlas, alphaRects, FOREST } from './assets.js';
import { random, inPond, START, AREAS, POINTS, STORIES, distance, walkable } from './zone.js';

export async function createRenderer(host, world) {
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x10252c);host.append(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x21404a,24,48);
  const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,85),cameraOffset=new THREE.Vector3(0,14,20),focus=new THREE.Vector3(START.x,0,START.z-2);
  camera.position.copy(focus).add(cameraOffset);camera.lookAt(focus);
  scene.add(new THREE.HemisphereLight(0xa6ccd7,0x334437,1.85));
  const moon=new THREE.DirectionalLight(0x90b1d6,1.35);moon.position.set(-10,30,-8);scene.add(moon);
  const images=await Promise.all(['forest-tilemap.png','japanese-props.png','tree-broad.png','tree-tall.png','girl-source.jpg','tartman.png'].map(load));
  const [tiles,props,broad,tall,girl,tart]=images,atlas=girlAtlas(girl),enemy=enemyAtlas(tart),rects=alphaRects(props),rng=random(931);
  if(rects.length!==3)throw Error(`小物の分離数が不正: ${rects.length}`);
  const scenery=[],trees=[],items=[],ripples=[],lanterns=[];
  const plane=new THREE.PlaneGeometry(1,1);plane.translate(0,.5,0);
  function billboard(map,x,z,w,h,color=0xffffff,y=0){const mat=new THREE.MeshLambertMaterial({map,color,alphaTest:.14,transparent:true,side:THREE.DoubleSide});const m=new THREE.Mesh(plane,mat);m.scale.set(w,h,1);m.quaternion.copy(camera.quaternion);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=false;scene.add(m);return m;}
  const tileMaps=Object.fromEntries(Object.entries(FOREST).map(([k,r])=>[k,crop(tiles,r)]));
  const broadMap=crop(broad,[0,0,broad.width,625],true),tallMap=crop(tall,[0,0,tall.width,670],true),propMaps=rects.map(r=>crop(props,r,true));
  // A single detailed ground texture; grass and stones retain a fine scale across the whole forest.
  const res=3120,ground=makeCanvas(res,res),ctx=ground.getContext('2d'),scale=res/world.size;ctx.imageSmoothingEnabled=false;
  for(let y=0;y<res;y+=18)for(let x=0;x<res;x+=18){const r=FOREST[['grass','grass2','grass3'][Math.floor(rng()*3)]];ctx.drawImage(tiles,...r,x,y,18,18);}
  ctx.fillStyle='#08262480';ctx.fillRect(0,0,res,res);
  const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);};
  for(let i=0;i<33000;i++){const x=rng()*world.size,z=rng()*world.size;if(!walkable(world,x,z,0))continue;const ring=AREAS.some(a=>Math.abs(distance(a,{x,z})-4.8)<1.2),road=world.segments.some(([a,b])=>segmentDistance({x,z},a,b)<1.1);if(!ring&&!road&&rng()>.12)continue;ctx.fillStyle=['#55696a','#687775','#475e61','#7d8174'][Math.floor(rng()*4)];ctx.beginPath();ctx.ellipse((x+.5)*scale,(z+.5)*scale,2+rng()*7,2+rng()*5,rng(),0,Math.PI*2);ctx.fill();}
  for(const a of AREAS){const grad=ctx.createRadialGradient((a.x+.5)*scale,(a.z+.5)*scale,0,(a.x+.5)*scale,(a.z+.5)*scale,10*scale);grad.addColorStop(0,a.color+'35');grad.addColorStop(1,a.color+'00');ctx.fillStyle=grad;ctx.fillRect((a.x-10)*scale,(a.z-10)*scale,21*scale,21*scale);}
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(world.size,world.size),new THREE.MeshLambertMaterial({map:tex(ground,true),color:0x81948a}));floor.rotation.x=-Math.PI/2;floor.position.set(32,-.02,32);floor.receiveShadow=true;scene.add(floor);
  function radial(color){const c=makeCanvas(128,128),x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,color);g.addColorStop(1,'transparent');x.fillStyle=g;x.fillRect(0,0,128,128);return tex(c,true);}
  const shadowMap=radial('#020a10'),warmMap=radial('#edb75f'),fogMap=radial('rgba(117,161,161,.3)');
  function disk(map,x,z,w,h,opacity,y=.015){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,transparent:true,opacity,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);scene.add(m);return m;}
  function box(x,z,w,h,d,color,y=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);scenery.push(m);return m;}
  // Real volumes give the shrine, stairs and rocks thickness and projected shadows.
  for(const [x,z,r] of [[17,44,1.6],[46,17,2]]){const base=box(x,z,r*2,.35,r*2,0x738079);base.material.map=tileMaps.rocks;for(let i=0;i<3;i++)box(x,z+r+.3+i*.28,r*1.5,.10*(3-i),.33,0x738079);const m=billboard(propMaps[1],x,z+r+.08,r*2.5,r*2.5*rects[1][3]/rects[1][2],0xb3b9aa,.36);scenery.push(m);}
  const gate=billboard(propMaps[0],START.x,START.z-1.7,5.3,5.3*rects[0][3]/rects[0][2],0xb3b4a6);scenery.push(gate);
  for(const a of AREAS){for(const side of [-1,1]){const x=a.x+side*3.8,z=a.z+3.5,m=billboard(propMaps[2],x,z,.95,.95*rects[2][3]/rects[2][2],0xc4be9c);scenery.push(m);const pool=disk(warmMap,x,z,3.6,3.6,.30);scenery.push(pool);const glow=billboard(warmMap,x,z,.52,.52,0xffd98c,.95);glow.material=new THREE.MeshBasicMaterial({map:warmMap,color:0xffd397,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});glow.castShadow=false;scenery.push(glow);lanterns.push(glow);}}
  const water=new THREE.Mesh(new THREE.CircleGeometry(1,80),new THREE.MeshPhongMaterial({color:0x234752,shininess:70,specular:0x597c87}));water.rotation.x=-Math.PI/2;water.scale.set(2.7,3.8,1);water.position.set(42,.015,46);scene.add(water);
  for(let i=0;i<64;i++){const a=i/64*Math.PI*2,x=42+Math.cos(a)*2.8,z=46+Math.sin(a)*3.9;const m=billboard(tileMaps.rocks,x,z,.45+rng()*.3,.35+rng()*.25,0x95aaa0);scenery.push(m);}
  for(let i=0;i<25;i++){const x=42+(rng()-.5)*4.5,z=46+(rng()-.5)*6;if(!inPond(x,z))continue;const m=new THREE.Mesh(new THREE.PlaneGeometry(.2+rng()*.65,.02),new THREE.MeshBasicMaterial({color:0x8bb6bc,transparent:true,opacity:.3}));m.rotation.x=-Math.PI/2;m.position.set(x,.024,z);m.userData.phase=rng()*6;scene.add(m);ripples.push(m);}
  // Trees occupy impassable ground; this same footprint blocks AI vision.
  for(let z=3;z<62;z+=1.65)for(let x=3;x<62;x+=1.65){if(walkable(world,x,z,.55)||inPond(x,z)||rng()<.27)continue;if((distance({x,z},{x:17,z:44})<2.8)||(distance({x,z},{x:46,z:17})<3))continue;const cedar=distance({x,z},AREAS[2])<12||rng()<.3,h=4.4+rng()*2.6;const m=billboard(cedar?tallMap:broadMap,x+(rng()-.5)*.3,z+(rng()-.5)*.3,h*(cedar?.53:1.01),h,new THREE.Color().setHSL(.46,.16,.42+rng()*.15));trees.push(m);scenery.push(m);}
  for(let i=0;i<550;i++){const x=5+rng()*55,z=5+rng()*55;if(inPond(x,z)||POINTS.some(p=>distance(p,{x,z})<1.1)||distance(START,{x,z})<2)continue;const edge=walkable(world,x,z,0)&&!walkable(world,x,z,1.2);if(!edge&&rng()<.8)continue;const kind=['fern','bush','shrub','stone','log'][Math.floor(rng()*5)],r=FOREST[kind],w=.35+rng()*.65;scenery.push(billboard(tileMaps[kind],x,z,w,w*r[3]/r[2],0x8fa394));}
  for(const a of [AREAS[2],{x:31,z:32}])for(let i=0;i<6;i++){const ang=i/6*Math.PI*2;box(a.x+Math.sin(ang)*1.4,a.z+Math.cos(ang)*1.4,.5,.35+rng()*.6,.55,0x5b716a);}
  function icon(kind){const c=makeCanvas(64,80),x=c.getContext('2d');x.strokeStyle='#f6d99b';x.fillStyle='#e1cd9e';x.lineWidth=5;if(kind==='key'){x.beginPath();x.arc(32,23,11,0,Math.PI*2);x.moveTo(32,35);x.lineTo(32,65);x.lineTo(43,65);x.moveTo(32,54);x.lineTo(40,54);x.stroke();}else{x.fillRect(14,28,35,37);x.fillStyle='#7c775c';for(let i=0;i<4;i++)x.fillRect(21,36+i*6,21,2);}return tex(c,true);}
  const keyMap=icon('key'),noteMap=icon('note');
  for(const p of POINTS){const m=billboard(keyMap,p.x,p.z,.46,.6,0xffedc0,.18);m.material.emissive.set(0x8a6737);m.castShadow=false;items.push({kind:'key',p,m});}
  for(const p of STORIES){const m=billboard(noteMap,p.x,p.z,.48,.6,0xe0d8ba,.08);m.castShadow=false;items.push({kind:'note',p,m});}
  const actor=billboard(atlas.map,START.x,START.z,1.35*atlas.width/atlas.height,1.35,0xe4edf0,.06);actor.material.dispose();actor.material=new THREE.MeshBasicMaterial({map:atlas.map,color:0xc9dce3,transparent:true,alphaTest:.14,side:THREE.DoubleSide});atlas.map.repeat.set(1/8,1/8);
  const ghost=billboard(enemy.map,0,0,1.8*enemy.width/enemy.height,1.8,0xd8ccba,.06);ghost.material.emissive.set(0x242324);enemy.map.repeat.set(1/7,1/8);ghost.visible=false;
  const playerShadow=disk(shadowMap,START.x,START.z,.8,.5,.8,.025),ghostShadow=disk(shadowMap,0,0,1,.6,.8,.025);
  const flashlight=new THREE.SpotLight(0xffe6b8,15,10,.43,.7,1.3);flashlight.castShadow=true;flashlight.shadow.mapSize.set(512,512);flashlight.shadow.bias=-.0008;flashlight.shadow.normalBias=.035;scene.add(flashlight,flashlight.target);
  // A ground cone clipped by the exact same wall cells as movement and sight.
  const coneGeo=new THREE.BufferGeometry(),conePos=new Float32Array(32*9),coneColors=new Float32Array(32*9);for(let i=0;i<32;i++)coneColors.set([.6,.64,.5,0,0,0,0,0,0],i*9);coneGeo.setAttribute('position',new THREE.BufferAttribute(conePos,3));coneGeo.setAttribute('color',new THREE.BufferAttribute(coneColors,3));const cone=new THREE.Mesh(coneGeo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.15,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));cone.frustumCulled=false;scene.add(cone);
  const fog=[];for(let i=0;i<10;i++){const m=billboard(fogMap,0,0,10+rng()*8,3+rng()*3,0xa9c5c6,.3);m.material=new THREE.MeshBasicMaterial({map:fogMap,transparent:true,opacity:.15,depthWrite:false,fog:false});m.castShadow=false;m.userData={x:(rng()-.5)*26,z:(rng()-.5)*28,phase:rng()*6};fog.push(m);}
  // Nine-tap depth-of-field uses the real scene depth, preserving sprite alpha cutouts.
  const target=new THREE.WebGLRenderTarget(1,1,{depthTexture:new THREE.DepthTexture(1,1)}),postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const post=new THREE.ShaderMaterial({uniforms:{tColor:{value:target.texture},tDepth:{value:target.depthTexture},resolution:{value:new THREE.Vector2(1,1)},focus:{value:cameraOffset.length()},near:{value:camera.near},far:{value:camera.far}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`varying vec2 vUv; uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 resolution; uniform float focus,near,far;
    void main(){float depth=mix(near,far,texture2D(tDepth,vUv).x);float radius=smoothstep(3.5,15.,abs(depth-focus))*2.2;vec2 stepUV=radius/resolution;vec4 color=texture2D(tColor,vUv)*.28;
    color+=texture2D(tColor,vUv+vec2(stepUV.x,0.))*.12;color+=texture2D(tColor,vUv-vec2(stepUV.x,0.))*.12;color+=texture2D(tColor,vUv+vec2(0.,stepUV.y))*.12;color+=texture2D(tColor,vUv-vec2(0.,stepUV.y))*.12;
    color+=texture2D(tColor,vUv+stepUV)*.06;color+=texture2D(tColor,vUv-stepUV)*.06;color+=texture2D(tColor,vUv+vec2(stepUV.x,-stepUV.y))*.06;color+=texture2D(tColor,vUv+vec2(-stepUV.x,stepUV.y))*.06;gl_FragColor=color;
    #include <colorspace_fragment>
    }`});postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),post));
  let lightQuality=false;
  function resize(){const w=host.clientWidth,h=host.clientHeight,half=9.5;camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h);const pr=renderer.getPixelRatio();target.setSize(Math.round(w*pr),Math.round(h*pr));post.uniforms.resolution.value.set(w*pr,h*pr);}
  new ResizeObserver(resize).observe(host);resize();
  const screen=new THREE.Vector3();
  return {atlas,enemy,rects,setQuality(low){lightQuality=low;renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=!low;resize();},reset(g){focus.set(g.player.x,0,g.player.z-2);},draw(g,dt){
    const p=g.player,e=g.ghost;focus.lerp(new THREE.Vector3(p.x,0,p.z-2),1-Math.exp(-dt*5));camera.position.copy(focus).add(cameraOffset);camera.lookAt(focus);
    const dir=((Math.round(p.facing/(Math.PI/4))%8)+8)%8,row=atlas.directionRows[dir],frame=p.moving?Math.floor(g.time*(p.running?12:8))%8:0;atlas.map.offset.set(frame/8,1-(row+1)/8);actor.position.set(p.x,.06,p.z);playerShadow.position.set(p.x,.025,p.z);
    ghost.visible=e.state!=='absent'&&distance(e,p)<21;ghostShadow.visible=ghost.visible;if(ghost.visible){const er=((Math.round(e.facing/(Math.PI/4))%8)+8)%8,ef=e.moving?Math.floor(g.time*(e.state==='chase'?10:6))%7:0;enemy.map.offset.set(ef/7,1-(er+1)/8);ghost.position.set(e.x,.06,e.z);ghostShadow.position.set(e.x,.025,e.z);}
    for(const m of scenery)m.visible=Math.abs(m.position.x-focus.x)<camera.right+8&&Math.abs(m.position.z-focus.z)<23;
    screen.set(p.x,.7,p.z).project(camera);
    for(const m of trees){if(!m.visible)continue;m.updateMatrixWorld();const bottom=new THREE.Vector3(-.5,0,0).applyMatrix4(m.matrixWorld).project(camera),top=new THREE.Vector3(.5,1,0).applyMatrix4(m.matrixWorld).project(camera);const obscures=m.position.z>p.z&&screen.x>bottom.x-.05&&screen.x<top.x+.05&&screen.y>bottom.y-.08&&screen.y<top.y+.08;m.material.opacity=obscures?.065:1;m.material.depthWrite=!obscures;}
    gate.material.opacity=p.z<START.z-1.2&&Math.abs(p.x-START.x)<2.5?.4:1;
    items.forEach(({kind,p:point,m})=>{m.visible=distance(point,p)<18&&(kind!=='key'||g.keys.some(k=>k.x===point.x&&k.z===point.z&&!k.taken));if(kind==='key')m.position.y=.2+Math.sin(g.time*2+point.x)*.07;});
    flashlight.visible=g.light;flashlight.position.set(p.x,1.0,p.z);flashlight.target.position.set(p.x+Math.sin(p.facing)*6,.0,p.z+Math.cos(p.facing)*6);cone.visible=g.light;
    if(g.light){const ends=[];for(let i=0;i<=32;i++){const a=p.facing-.43+i/32*.86;let r=.3;while(r<7&&walkable(world,p.x+Math.sin(a)*r,p.z+Math.cos(a)*r,0))r+=.16;ends.push([p.x+Math.sin(a)*r,.028,p.z+Math.cos(a)*r]);}for(let i=0;i<32;i++)conePos.set([p.x,.028,p.z,...ends[i],...ends[i+1]],i*9);coneGeo.attributes.position.needsUpdate=true;}
    fog.forEach(m=>m.position.set(focus.x+m.userData.x+Math.sin(g.time*.08+m.userData.phase)*2,.5,focus.z+m.userData.z));ripples.forEach(m=>m.material.opacity=.15+Math.sin(g.time*.6+m.userData.phase)*.10);lanterns.forEach((m,i)=>m.material.opacity=.65+Math.sin(g.time*3+i)*.05);
    if(lightQuality){renderer.setRenderTarget(null);renderer.render(scene,camera);}else{post.uniforms.focus.value=cameraOffset.length();renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}
    return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  }};
}
