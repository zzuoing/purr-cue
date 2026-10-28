// Verify the shipped CLI without requiring Node inside the installed app.
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const exe = process.env.PACKAGED_EXE || path.join(root, 'release/win-unpacked/PurrCue.exe');
const profile = path.join(root, 'work', 'packaged-cli-' + Date.now());
const client = path.join(path.dirname(exe), 'resources/cli/purrcue.cjs');
async function cli(...args) {
  const env = { ...process.env };
  let command;
  if (process.platform === 'win32') { env.ELECTRON_RUN_AS_NODE = '1'; command = [client, ...args]; }
  else { delete env.ELECTRON_RUN_AS_NODE; command = ['--no-sandbox', '--disable-gpu', '--cli', ...args]; }
  // Test-only Linux child launch also needs these flags inside Xvfb/root WSL.
  if (process.platform === 'linux') env.PURRCUE_TEST_FLAGS = '1';
  const result = await execute(exe, [...command, '--data-dir', profile, '--json'], { env, windowsHide: true, timeout: 30000 });
  // The AppImage extract-and-run runtime lists extracted paths before starting
  // our process. The CLI itself still emits a single JSON object.
  if (process.platform === 'linux') {
    // This outer runtime may flush its path listing around the CLI's write,
    // including in the middle of a line. Extract the single protocol record.
    const records = result.stdout.match(/\{"ok":(?:true|false),[^\r\n]*\}/g) || [];
    assert.equal(records.length, 1, 'Expected one CLI JSON response');
    return JSON.parse(records[0]);
  }
  return JSON.parse(result.stdout);
}
(async () => {
  let pid;
  try {
    const status = await cli('status'); assert.equal(status.ok, true); pid = status.value.pid;
    assert.equal(status.value.name, 'PurrCue'); assert.equal(status.value.version, require('../package.json').version);
    const once = await cli('add', '--in', '1h', '--message', 'CLI 包装测试・테스트');
    assert.equal(once.ok, true); assert.equal(once.value.Message, 'CLI 包装测试・테스트');
    const repeat = await cli('add', '--time', '09:30', '--days', 'mon,wed,fri', '--message', 'Stretch');
    assert.equal(repeat.ok, true); assert.deepEqual(repeat.value.RepeatDays, [1,3,5]);
    const list = await cli('list'); assert.equal(list.value.length, 2);
    assert.equal((await cli('remove', once.value.Id)).value.removed, true);
    assert.equal((await cli('remove', repeat.value.Id)).value.removed, true);
    assert.deepEqual((await cli('list')).value, []);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(profile, 'reminders-v2.json'), 'utf8')), []);
    console.log('Packaged CLI: bundled runtime, background auto-start, version, Unicode, one-time/weekday reminders, list and remove passed');
  } finally { if (pid) try { process.kill(pid); } catch {} }
})().catch(error => { console.error(error); process.exitCode = 1; });
