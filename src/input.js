export function createInput(app, actions) {
  const input = { x: 0, z: 0, run: false }, keys = new Set(); let stickId = null, runId = null, joyX = 0, joyZ = 0;
  const stick = app.querySelector('#stick'), knob = app.querySelector('#knob'), run = app.querySelector('#run');
  function sync() { input.x = joyX || Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')); input.z = joyZ || Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')); input.run = runId !== null || keys.has('ShiftLeft') || keys.has('ShiftRight'); run.classList.toggle('held', input.run); }
  function locate(e) { const r = stick.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dz = e.clientY - r.top - r.height / 2, max = r.width * .32, m = Math.hypot(dx, dz), factor = Math.min(1, max / Math.max(m, .001)); joyX = dx * factor / max; joyZ = dz * factor / max; knob.style.transform = `translate(${dx * factor}px, ${dz * factor}px)`; sync(); }
  stick.addEventListener('pointerdown', e => { if (stickId !== null || !actions.playing()) return; e.preventDefault(); stickId = e.pointerId; stick.setPointerCapture(stickId); locate(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) locate(e); });
  const releaseStick = e => { if (e.pointerId !== stickId) return; stickId = null; joyX = joyZ = 0; knob.style.transform = ''; sync(); };
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(event, releaseStick);
  run.addEventListener('pointerdown', e => { if (runId !== null || !actions.playing()) return; e.preventDefault(); runId = e.pointerId; run.setPointerCapture(runId); sync(); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) run.addEventListener(event, e => { if (runId === e.pointerId) { runId = null; sync(); } });
  app.querySelector('#lock').addEventListener('click', actions.lock); app.querySelector('#interact').addEventListener('click', actions.interact);
  const handled = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyF', 'KeyE', 'Space', 'Escape'];
  window.addEventListener('keydown', e => { if (!handled.includes(e.code) || e.target.matches('input,textarea')) return; if (e.code === 'Escape') { if (!e.repeat) actions.pause(); return; } if (!actions.playing()) return; e.preventDefault(); keys.add(e.code); if (!e.repeat) { if (e.code === 'KeyF') actions.lock(); if (e.code === 'KeyE' || e.code === 'Space') actions.interact(); } sync(); });
  window.addEventListener('keyup', e => { keys.delete(e.code); sync(); });
  const reset = () => { keys.clear(); stickId = runId = null; joyX = joyZ = 0; knob.style.transform = ''; sync(); };
  window.addEventListener('blur', () => { reset(); actions.autoPause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { reset(); actions.autoPause(); } });
  return { input, reset };
}
