const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parse, request } = require('../bin/purrcue.cjs');
const { startCliServer } = require('../src/cli-server.cjs');
const { ReminderStore, createReminder } = require('../src/reminders.cjs');
const now = new Date(2026, 9, 28, 12);
test('CLI supports relative, local, explicit-offset and weekday reminders without accepting invalid dates', () => {
  const relative = parse(['add','--in','20m','--message','喝水','--json'], now);
  assert.equal(new Date(relative.args.when) - now, 1200000);
  const local = parse(['add','--at','2026-12-01 14:30','--message','Meeting'], now);
  assert.equal(new Date(local.args.when).getHours(), 14);
  assert.equal(parse(['add','--at','2026-12-01T14:30:00+09:00','--message','회의'], now).args.when, '2026-12-01T05:30:00.000Z');
  const repeat = parse(['add','--time','09:00','--days','mon,tue,wed,thu,fri,mon','--message','仕事'], now).args;
  assert.deepEqual(repeat.days, [1,2,3,4,5]); assert.equal(repeat.mode, 'repeat');
  for (const args of [
    ['--in','0m'], ['--in','-1h'], ['--at','2026-02-30 12:00'], ['--at','2026-12-01 24:00'],
    ['--at','2027-02-30T12:00:00Z'], ['--time','25:00','--days','mon'], ['--time','09:00','--days','nope'],
    ['--time','09:00'], ['--in','1h','--days','mon'], ['--in','1h','--at','2026-12-01 14:30'],
  ]) assert.throws(() => parse(['add', ...args, '--message','test'], now));
  assert.throws(() => parse(['add','--in','1h','--message','']));
  assert.throws(() => parse(['list','--message','test']));
  assert.throws(() => parse(['remove']));
});
test('CLI local transport authenticates requests and persists through the shared reminder store', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'purrcue-cli-test-'));
  const store = new ReminderStore(directory); store.load();
  const server = await startCliServer(directory, (command, input) => {
    if (command === 'list') return store.items;
    if (command === 'add') { const item = createReminder(input); store.transaction(items => items.push(item)); return item; }
    throw Error('Unknown command');
  });
  try {
    const connection = JSON.parse(fs.readFileSync(path.join(directory,'cli-connection.json'),'utf8'));
    assert.equal((await request({ ...connection, token: 'incorrect' }, 'list')).ok, false);
    assert.equal((await request(connection, 'unknown')).ok, false);
    const input = parse(['add','--in','1h','--message','喝水・물・水']).args;
    const added = await request(connection, 'add', input); assert.equal(added.ok, true);
    const list = await request(connection, 'list');
    assert.equal(list.value.length, 1); assert.equal(list.value[0].Message, input.message);
    const reloaded = new ReminderStore(directory); reloaded.load(); assert.deepEqual(reloaded.items, list.value);
    if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(directory,'cli-connection.json')).mode & 0o777, 0o600);
  } finally { server.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
