const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function parseDate(value) {
  if (typeof value === 'string' && /^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/.test(value)) {
    return new Date(Number(value.match(/-?\d+/)[0]));
  }
  return new Date(value);
}
function normalize(items) {
  if (!Array.isArray(items)) throw new Error('提醒数据必须为数组');
  return items.map(item => {
    if (!item || typeof item !== 'object') throw new Error('提醒数据格式错误');
    const when = parseDate(item.When);
    if (!Number.isFinite(when.getTime()) || typeof item.Message !== 'string') throw new Error('提醒数据格式错误');
    const repeatDays = item.RepeatDays ?? [];
    if (!Array.isArray(repeatDays) || repeatDays.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error('重复日期格式错误');
    return { Id: item.Id || randomUUID(), When: when.toISOString(), Message: item.Message,
      RepeatDays: [...new Set(repeatDays)], Enabled: item.Enabled !== false, LastTriggeredDate: item.LastTriggeredDate || null };
  });
}
function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function dueAt(item, now) {
  if (!item.Enabled) return null;
  let scheduled = new Date(item.When);
  let windowHours = 24;
  if (item.RepeatDays.length) {
    if (!item.RepeatDays.includes(now.getDay()) || item.LastTriggeredDate === localDate(now)) return null;
    scheduled = new Date(now); const time = new Date(item.When);
    scheduled.setHours(time.getHours(), time.getMinutes(), 0, 0); windowHours = 6;
  }
  return now >= scheduled && now.getTime() < scheduled.getTime() + windowHours * 3600000 ? scheduled : null;
}
function createReminder(input, now = new Date()) {
  if (!input || typeof input.message !== 'string' || !input.message.trim()) throw new Error('请填写提醒内容。');
  if (input.message.length > 2000) throw new Error('提醒内容不能超过 2000 字。');
  if (!['once', 'repeat'].includes(input.mode)) throw new Error('提醒类型无效。');
  const when = parseDate(input.when);
  if (!Number.isFinite(when.getTime())) throw new Error('请选择有效时间。');
  if (input.mode === 'once' && when <= now) throw new Error('一次提醒的时间必须晚于现在。');
  if (input.mode === 'repeat' && (!Array.isArray(input.days) || !input.days.length)) throw new Error('请至少选择一个重复日期。');
  return normalize([{ Id: randomUUID(), When: when.toISOString(), Message: input.message.trim(), RepeatDays: input.mode === 'repeat' ? input.days : [], Enabled: true }])[0];
}
class ReminderStore {
  constructor(directory, legacyFile) {
    this.directory = directory; this.file = path.join(directory, 'reminders-v2.json');
    this.legacyFile = legacyFile; this.warning = null; this.items = [];
  }
  load() {
    fs.mkdirSync(this.directory, { recursive: true });
    const input = fs.existsSync(this.file) ? this.file : this.legacyFile;
    if (!input || !fs.existsSync(input)) return this.items;
    try {
      this.items = normalize(JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '')));
      if (input !== this.file) this.save();
    } catch (error) {
      // Preserve unreadable source; a failed backup must not silently discard data.
      const backup = `${input}.broken-${Date.now()}`;
      fs.copyFileSync(input, backup);
      this.warning = `提醒数据读取失败，已备份到 ${backup}。${error.message}`;
      this.warningDetails = { backup, message: error.message };
      this.items = [];
    }
    return this.items;
  }
  save() {
    const temp = this.file + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(this.items, null, 2), 'utf8');
    fs.renameSync(temp, this.file);
  }
  transaction(change) {
    const before = structuredClone(this.items);
    try { const result = change(this.items); this.save(); return result; }
    catch (error) { this.items = before; throw error; }
  }
}
module.exports = { parseDate, normalize, localDate, dueAt, createReminder, ReminderStore };
