const { test } = require('node:test');
const assert = require('node:assert/strict');
test('picker validates local dates and preserves once/repeat times without UTC conversion', async () => {
  const { parsePickerValue, formatPickerValue } = await import('../src/date-time-picker.js');
  const date = parsePickerValue('2028-02-29 13:27', 'once');
  assert.equal(formatPickerValue(date, 'once'), '2028-02-29 13:27');
  assert.equal(formatPickerValue(date, 'repeat'), '13:27');
  for (const invalid of ['2027-02-29 13:27','2028-02-30 13:27','2028-13-01 12:00','2028-02-29 24:00','2028-02-29 23:60','tomorrow','']) assert.equal(parsePickerValue(invalid, 'once'), null);
  const today = new Date(2026, 9, 28, 3, 0);
  const repeat = parsePickerValue('17:45', 'repeat', today);
  assert.equal(repeat.getDate(), 28); assert.equal(repeat.getHours(), 17); assert.equal(repeat.getMinutes(), 45);
  assert.equal(parsePickerValue('25:00', 'repeat'), null);
});
