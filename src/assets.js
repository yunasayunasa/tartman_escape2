import * as THREE from 'three';
export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function tex(image, smooth = false) { const t = image instanceof HTMLCanvasElement ? new THREE.CanvasTexture(image) : new THREE.Texture(image); t.needsUpdate = true; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }
export async function load(url) { const im = new Image(); im.src = `${import.meta.env.BASE_URL}assets/${url}`; await im.decode(); return im; }
export function crop(im, [x, y, w, h], smooth = false) { const t = tex(im, smooth); t.repeat.set(w / im.width, h / im.height); t.offset.set(x / im.width, 1 - (y + h) / im.height); return t; }
export function bands(values, gap = 8) {
  const out = []; let first = -1, last = -1;
  for (let i = 0; i < values.length; i++) if (values[i]) { if (first === -1) first = i; else if (i - last > gap) { out.push([first, last + 1]); first = i; } last = i; }
  if (first !== -1) out.push([first, last + 1]); return out;
}
export function alphaRects(image, threshold = 40) {
  const c = makeCanvas(image.width, image.height), ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0); const d = ctx.getImageData(0, 0, c.width, c.height).data, xs = new Uint8Array(c.width);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > threshold) xs[x] = 1;
  return bands(xs, 12).map(([x0, x1]) => { let top = c.height, bottom = 0; for (let y = 0; y < c.height; y++) for (let x = x0; x < x1; x++) if (d[(y * c.width + x) * 4 + 3] > threshold) { top = Math.min(top, y); bottom = Math.max(bottom, y + 1); } return [x0, top, x1 - x0, bottom - top]; });
}
export function girlAtlas(image) {
  const c = makeCanvas(image.width, image.height), ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height), d = data.data, n = c.width * c.height;
  // Rendering mask, not a rewrite of the supplied JPEG. Only background-connected near-white pixels qualify.
  const outside = new Uint8Array(n), q = new Int32Array(n); let length = 0;
  const white = i => Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) >= 238;
  const push = i => { if (!outside[i] && white(i)) { outside[i] = 1; q[length++] = i; } };
  for (let x = 0; x < c.width; x++) { push(x); push((c.height - 1) * c.width + x); }
  for (let y = 0; y < c.height; y++) { push(y * c.width); push(y * c.width + c.width - 1); }
  for (let at = 0; at < length; at++) { const i = q[at], x = i % c.width; if (x) push(i - 1); if (x < c.width - 1) push(i + 1); if (i >= c.width) push(i - c.width); if (i < n - c.width) push(i + c.width); }
  for (let i = 0; i < n; i++) if (outside[i]) d[i * 4 + 3] = 0;
  // The white fringe on background-facing edges gets partial alpha; the opaque interior is preserved.
  for (let y = 1; y < c.height - 1; y++) for (let x = 1; x < c.width - 1; x++) {
    const i = y * c.width + x; if (outside[i]) continue;
    if (!(outside[i - 1] || outside[i + 1] || outside[i - c.width] || outside[i + c.width])) continue;
    const min = Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]); if (min > 180) d[i * 4 + 3] = Math.round(255 * (255 - min) / 75);
  }
  ctx.putImageData(data, 0, 0);
  const ys = new Uint8Array(c.height); for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 70) ys[y] = 1;
  const rows = bands(ys, 14), frames = [];
  for (const [y0, y1] of rows) {
    const xs = new Uint8Array(c.width); for (let x = 0; x < c.width; x++) for (let y = y0; y < y1; y++) if (d[(y * c.width + x) * 4 + 3] > 70) xs[x] = 1;
    const cols = bands(xs, 14); const row = [];
    for (const [x0, x1] of cols) { let top = y1, bottom = y0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (d[(y * c.width + x) * 4 + 3] > 70) { top = Math.min(top, y); bottom = Math.max(bottom, y + 1); }
      row.push({ x: x0, y: top, w: x1 - x0, h: bottom - top }); }
    frames.push(row);
  }
  if (frames.length !== 8 || frames.some(row => row.length !== 8)) throw new Error(`少女シートの解析失敗: ${frames.map(r => r.length).join(',')}`);
  const width = Math.max(...frames.flat().map(f => f.w)) + 8, height = Math.max(...frames.flat().map(f => f.h)) + 8;
  const sheet = makeCanvas(width * 8, height * 8), s = sheet.getContext('2d'); s.imageSmoothingEnabled = false;
  frames.forEach((row, iy) => row.forEach((f, ix) => s.drawImage(c, f.x, f.y, f.w, f.h, ix * width + Math.floor((width - f.w) / 2), (iy + 1) * height - f.h - 3, f.w, f.h)));
  // The supplied rows rotate S, SW, W, NW, N, NE, E, SE.
  return { map: tex(sheet, true), rows: 8, cols: 8, width, height, frames, directionRows: [0, 7, 6, 5, 4, 3, 2, 1], sourceWidth: image.width, sourceHeight: image.height };
}
export const FOREST = Object.freeze({
  pine: [144, 54, 36, 72], grove: [216, 108, 162, 72], groveDark: [216, 180, 162, 72],
  trunk: [216, 252, 36, 18], log: [252, 252, 36, 18], stone: [288, 252, 18, 18],
  rocks: [234, 270, 36, 36], boulder: [270, 270, 36, 36],
  grass: [0, 54, 18, 18], grass2: [18, 54, 18, 18], grass3: [36, 54, 18, 18],
  fern: [306, 270, 18, 18], bush: [324, 270, 18, 18], shrub: [342, 270, 36, 18],
});
export function enemyAtlas(image) {
  const c=makeCanvas(image.width,image.height),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const d=ctx.getImageData(0,0,c.width,c.height).data,ys=new Uint8Array(c.height);
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>32)ys[y]=1;
  const frames=bands(ys,20).map(([top,bottom])=>{const xs=new Uint8Array(c.width);for(let x=0;x<c.width;x++)for(let y=top;y<bottom;y++)if(d[(y*c.width+x)*4+3]>32)xs[x]=1;return bands(xs,20).map(([left,right])=>{let y0=bottom,y1=top;for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(d[(y*c.width+x)*4+3]>32){y0=Math.min(y0,y);y1=Math.max(y1,y+1);}return {x:left,y:y0,w:right-left,h:y1-y0};});});
  if(frames.length!==8||frames.some(r=>r.length!==7))throw Error('鬼のシートを8方向×7コマとして分離できません');
  const width=Math.max(...frames.flat().map(f=>f.w))+4,height=Math.max(...frames.flat().map(f=>f.h))+4,sheet=makeCanvas(width*7,height*8),s=sheet.getContext('2d');
  frames.forEach((row,iy)=>row.forEach((f,ix)=>s.drawImage(image,f.x,f.y,f.w,f.h,ix*width+Math.round((width-f.w)/2),(iy+1)*height-f.h-2,f.w,f.h)));
  return {map:tex(sheet,true),width,height,frames,directionRows:[0,1,2,3,4,5,6,7]};
}
