import { drawScene } from './animation/player.js';
const query = new URLSearchParams(location.search);
document.documentElement.lang = query.get('locale') || 'en';
document.title = query.get('title') || 'Cat reminder';
document.getElementById('stretch').alt = query.get('stretchAlt') || 'Stretching cat';
const scene = query.get('scene'), lastFrame = Number(query.get('lastFrame'));
const canvas = document.getElementById('scene');
const dpr = window.devicePixelRatio || 1;
canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(250 * dpr);
canvas.getContext('2d').scale(dpr, dpr);
const when = new Date(query.get('scheduled'));
document.getElementById('message').textContent = `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}  ${query.get('message')}`;
const stretch = document.getElementById('stretch');
let frame = 0, timer;
function close() { clearInterval(timer); window.desktopReminder.closeAnimation(); }
if (scene === 'Stretch') {
  await new Promise(resolve => { if (stretch.complete) resolve(); else { stretch.onload = resolve; stretch.onerror = resolve; } });
  if (stretch.naturalWidth) stretch.hidden = false;
}
function render() { if (scene !== 'Stretch' || !stretch.naturalWidth) drawScene(canvas, scene, frame, innerWidth); }
render();
window.desktopReminder.animationReady();
timer = setInterval(() => { frame++; if (frame > lastFrame) close(); else render(); }, 33);
document.addEventListener('click', close);
document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
let wasHit = false;
document.addEventListener('mousemove', event => {
  const { clientX: x, clientY: y } = event;
  const inside = element => { const r = element.getBoundingClientRect(); return x >= r.left && x < r.right && y >= r.top && y < r.bottom; };
  const hit = inside(document.getElementById('bubble')) || (!stretch.hidden && inside(stretch)) || (x >= 0 && y >= 0 && x < innerWidth && y < 250 && canvas.getContext('2d').getImageData(Math.floor(x * dpr), Math.floor(y * dpr), 1, 1).data[3] > 0);
  if (hit !== wasHit) { wasHit = hit; window.desktopReminder.animationHit(hit); }
});
