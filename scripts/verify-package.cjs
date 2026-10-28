// Node driver for an actual packaged executable. Debugging is localhost/test-only.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const exe = process.env.PACKAGED_EXE || path.join(root, 'release/win-unpacked/PurrCue.exe');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function connect(url) {
  const ws = new WebSocket(url); let id = 0; const requests = new Map();
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => { const response = JSON.parse(event.data); const pending = requests.get(response.id); if (pending) { requests.delete(response.id); response.error ? pending.reject(new Error(response.error.message)) : pending.resolve(response.result); } };
  return { ws, call(method, params = {}) { const key = ++id; return new Promise((resolve, reject) => { requests.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); }); } };
}
async function verify(preview, port) {
  const profile = path.join(root, 'work', `package-profile-${port}`);
  const log = fs.openSync(path.join(root, 'work', `package-${port}.log`), 'w');
  const child = spawn(exe, [`--data-dir=${profile}`, `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-gpu'] : []), ...(preview ? ['--preview', '拉伸'] : [])], { cwd: root, windowsHide: true, stdio: ['ignore', log, log] });
  let exited = false, browser, page;
  child.on('exit', () => { exited = true; });
  try {
    let targets;
    for (let i = 0; i < 2400; i++) {
      if (exited) throw new Error('Packaged app exited before verification');
      try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.some(t => t.type === 'page' && t.url.includes(preview ? 'overlay.html' : 'index.html'))) break; } catch {}
      await sleep(50);
    }
    const target = targets?.find(t => t.type === 'page' && t.url.includes(preview ? 'overlay.html' : 'index.html'));
    assert.ok(target, 'Packaged page is missing');
    page = await connect(target.webSocketDebuggerUrl);
    const evaluate = async expression => {
      const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    for (let i = 0; i < 200; i++) {
      if (await evaluate(`document.readyState === 'complete' && !!document.getElementById('${preview ? 'stretch' : 'quick'}') && !!window.desktopReminder`)) break;
      await sleep(50);
    }
    if (preview) {
      const gif = await evaluate('(async()=>{const i=document.getElementById("stretch");await i.decode();await new Promise(r=>setTimeout(r,200));return {width:i.naturalWidth,height:i.naturalHeight,visible:!i.hidden,scene:new URLSearchParams(location.search).get("scene")}})()');
      assert.deepEqual(gif, { width: 480, height: 280, visible: true, scene: 'Stretch' });
      await page.call('Page.bringToFront');
      const a = await page.call('Page.captureScreenshot', { format: 'png' });
      await sleep(1600);
      const b = await page.call('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(root, 'work', 'packaged-stretch-a.png'), Buffer.from(a.data, 'base64'));
      fs.writeFileSync(path.join(root, 'work', 'packaged-stretch-b.png'), Buffer.from(b.data, 'base64'));
      assert.equal(a.data !== b.data, true, 'GIF screenshot did not advance');
      // A live DevTools connection can affect shutdown; detach before lifecycle check.
      page.ws.close(); page = null;
      for (let i = 0; i < 300 && !exited; i++) await sleep(50);
      assert.equal(exited, true, 'Preview did not close naturally');
    } else {
      await evaluate('window.desktopReminder.language("zh")');
      const result = await evaluate('window.desktopReminder.state()');
      assert.equal(result.ok, true); assert.deepEqual(result.value.reminders, []);
      assert.equal(result.value.version, require('../package.json').version);
      assert.match(await evaluate('document.getElementById("version").textContent'), new RegExp(result.value.version.replaceAll('.', '\\.')));
      assert.equal(await evaluate('document.title'), 'PurrCue');
      assert.equal(await evaluate('!!document.getElementById("calendar-input")._flatpickr'), true, 'Packaged date component did not load');
      await evaluate('document.getElementById("open-picker").click()');
      assert.equal(await evaluate('document.getElementById("date-time-picker").open'), true);
      await evaluate('document.getElementById("picker-cancel").click()');
      const image = await page.call('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(root, 'work', 'packaged-main.png'), Buffer.from(image.data, 'base64'));
      const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      browser = await connect(version.webSocketDebuggerUrl);
      // Chromium may close the socket before acknowledging Browser.close.
      await Promise.race([browser.call('Browser.close'), sleep(1000)]);
    }
  } finally {
    page?.ws.close(); browser?.ws.close();
    if (!exited) child.kill(); fs.closeSync(log);
  }
}
(async () => {
  await verify(false, 9347); console.log('Packaged app: real UI, preload and state passed');
  await verify(true, 9348); console.log('Packaged stretch: original GIF advances and preview closes naturally');
})().catch(error => { console.error(error); process.exitCode = 1; });
