const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseDate, normalize, dueAt, createReminder, localDate, ReminderStore } = require('../src/reminders.cjs');
const { selectScene, lastFrame } = require('../src/animation/scenes-config.cjs');
const now = new Date(2026, 9, 27, 16, 0, 0);
function item(when = now, days = []) { return normalize([{ When: when.toISOString(), Message: '喝水', RepeatDays: days }])[0]; }
function temporaryDirectory() { const root = path.resolve('work'); fs.mkdirSync(root, { recursive: true }); return fs.mkdtempSync(path.join(root, 'test-')); }
test('legacy .NET dates retain their absolute timestamp and missing fields get defaults', () => {
  assert.equal(parseDate('/Date(1793088000000+0800)/').getTime(), 1793088000000);
  assert.equal(parseDate('/Date(-1000)/').getTime(), -1000);
  const result = normalize([{ When: '/Date(1793088000000)/', Message: '旧提醒' }])[0];
  assert.equal(result.Enabled, true); assert.deepEqual(result.RepeatDays, []); assert.ok(result.Id);
});
test('one-time catch-up window is [scheduled, scheduled + 24h)', () => {
  const value = item();
  assert.equal(dueAt(value, new Date(+now - 1)), null);
  assert.ok(dueAt(value, now)); assert.ok(dueAt(value, new Date(+now + 86400000 - 1)));
  assert.equal(dueAt(value, new Date(+now + 86400000)), null);
  value.Enabled = false; assert.equal(dueAt(value, now), null);
});
test('repeat uses local clock, selected weekdays, six-hour catch-up and daily deduplication', () => {
  const value = item(new Date(2026, 9, 1, 16, 0), [now.getDay()]);
  assert.ok(dueAt(value, now)); assert.equal(dueAt(value, new Date(2026, 9, 27, 15, 59)), null);
  assert.ok(dueAt(value, new Date(2026, 9, 27, 21, 59))); assert.equal(dueAt(value, new Date(2026, 9, 27, 22, 0)), null);
  value.LastTriggeredDate = localDate(now); assert.equal(dueAt(value, now), null);
  value.LastTriggeredDate = null; value.RepeatDays = [(now.getDay() + 1) % 7]; assert.equal(dueAt(value, now), null);
});
test('saving rejects missing text, elapsed dates and invalid repeat days', () => {
  const input = { mode: 'once', when: new Date(+now + 60000).toISOString(), message: '喝水', days: [] };
  assert.ok(createReminder(input, now).Id);
  assert.throws(() => createReminder({ ...input, message: '  ' }, now));
  assert.throws(() => createReminder({ ...input, when: now.toISOString() }, now));
  assert.throws(() => createReminder({ ...input, mode: 'repeat' }, now));
  assert.throws(() => createReminder({ ...input, mode: 'repeat', days: [9] }, now));
});
test('scene keyword precedence and original ending frames are preserved', () => {
  const expected = { 如厕: 'Toilet', 下班: 'PackUp', 上班: 'WorkStart', 散步: 'Walking', 拉伸: 'Stretch', 吃饭: 'Eating', 喝水: 'Water', 透气: 'Window', 其他: 'General' };
  for (const [message, scene] of Object.entries(expected)) assert.equal(selectScene(message), scene);
  assert.equal(selectScene('喝水然后出去走走'), 'Walking'); assert.equal(selectScene('下班回家上厕所'), 'Toilet');
  assert.equal(lastFrame('Toilet', 1920), 285); assert.equal(lastFrame('WorkStart', 1920), 330);
  assert.equal(lastFrame('PackUp', 1920), 290); assert.equal(lastFrame('General', 1920), 360);
  assert.equal(lastFrame('Walking', 1920), 712);
});
test('store imports without modifying legacy data, reloads and backs up corrupted files', t => {
  const dir = temporaryDirectory();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const legacy = path.join(dir, 'old.json'); const original = JSON.stringify([item()]); fs.writeFileSync(legacy, original);
  const store = new ReminderStore(path.join(dir, 'new'), legacy); store.load();
  assert.equal(store.items.length, 1); assert.equal(fs.readFileSync(legacy, 'utf8'), original);
  store.transaction(items => items.push(item(new Date(+now + 60000))));
  assert.equal(new ReminderStore(store.directory).load().length, 2);
  fs.writeFileSync(store.file, 'broken'); const broken = new ReminderStore(store.directory); broken.load();
  assert.equal(broken.items.length, 0); assert.match(broken.warning, /备份/);
  assert.ok(fs.readdirSync(store.directory).some(name => name.includes('.broken-')));
});
test('failed persistence rolls back the in-memory edit', t => {
  const dir = temporaryDirectory();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = new ReminderStore(dir); store.load(); store.items = [item()]; store.save();
  store.file = path.join(dir, 'missing', 'data.json');
  assert.throws(() => store.transaction(items => items.splice(0, 1)));
  assert.equal(store.items.length, 1);
});
