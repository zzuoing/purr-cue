// Run with: electron scripts/verify-animation.cjs
// Uses the shipped Chromium renderer; no external browser/network is involved.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const output = path.join(root, 'work', 'canvas');
app.setPath('userData', path.join(root, 'work', 'animation-profile'));
app.whenReady().then(async () => {
  fs.mkdirSync(output, { recursive: true });
  const html = path.join(root, 'work', 'verify.html');
  fs.writeFileSync(html, '<!doctype html><html><body style="margin:0;background:transparent"><canvas id="scene"></canvas></body></html>');
  const win = new BrowserWindow({ show: false, width: 1920, height: 250, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  await win.loadFile(html);
  const errors = [];
  win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message); });
  const result = await win.webContents.executeJavaScript(`(async () => {
    const { drawScene } = await import('../src/animation/player.js');
    const { trace } = await import('../scripts/trace-animation.js');
    const canvas = document.getElementById('scene');
    const samples = [0,1,28,44,62,110,138,169,194,210,242,265,285,290,304,330,360];
    const scenes = ['General','Walking','Window','Water','Eating','WorkStart','PackUp','Toilet'];
    const images = [], traces = []; let checked = 0;
    for (const width of [1280,1920]) {
      canvas.width = width; canvas.height = 250;
      for (const scene of scenes) {
        for (const frame of samples) traces.push({ scene, width, frame, calls: trace(scene,width,frame) });
        const end = scene === 'Walking' ? Math.floor((width+360)/3.2) : ({Toilet:285,WorkStart:330,Eating:330,PackUp:290}[scene] || 360);
        for(let frame=0;frame<=end;frame++) {
          drawScene(canvas,scene,frame,width); checked++;
          if(samples.includes(frame)) images.push({ name: scene+'-'+width+'-'+frame+'.png', data:canvas.toDataURL('image/png').split(',')[1] });
        }
        // Preserve original out-of-duration samples to compare every reference file.
        for(const frame of samples.filter(f=>f>end)) {drawScene(canvas,scene,frame,width); images.push({name:scene+'-'+width+'-'+frame+'.png',data:canvas.toDataURL('image/png').split(',')[1]});}
      }
    }
    return { checked, images, traces };
  })()`);
  for (const image of result.images) fs.writeFileSync(path.join(output, image.name), Buffer.from(image.data, 'base64'));
  fs.writeFileSync(path.join(root, 'work', 'canvas-traces.json'), JSON.stringify(result.traces));
  fs.writeFileSync(path.join(root, 'work', 'animation-result.json'), JSON.stringify({ checked: result.checked, samples: result.images.length, errors }, null, 2));
  console.log(JSON.stringify({ checked: result.checked, samples: result.images.length, errors }));
  if (errors.length) throw new Error('Renderer errors');
  win.destroy(); app.quit();
}).catch(error => { console.error(error); app.exit(1); });
