const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { locales, quickIds, detectLocale, translate, LanguageSettings } = require('../src/localization.cjs');
const { selectScene } = require('../src/animation/scenes-config.cjs');
function keys(data, prefix = '') { return Object.entries(data).flatMap(([key, value]) => typeof value === 'object' && !Array.isArray(value) ? keys(value, prefix + key + '.') : [prefix + key]); }
test('all four dictionaries cover the same keys, placeholders and quick animations', () => {
  const expected = keys(locales.zh).sort();
  for (const [locale, data] of Object.entries(locales)) {
    assert.deepEqual(keys(data).sort(), expected);
    for (const key of expected) {
      const value = translate(locale, key);
      assert.ok(value?.length);
      if (typeof value === 'string') assert.deepEqual(value.match(/\{\w+\}/g)?.sort() || [], translate('zh', key).match(/\{\w+\}/g)?.sort() || []);
    }
    assert.equal(data.weekdays.length, 7); assert.equal(data.dayShort.length, 7);
    for (const id of quickIds) assert.equal(selectScene(data.quick[id]), id, `${locale}: ${id}`);
    assert.match(translate(locale, 'version', { version: '1.0.1' }), /1\.0\.1/);
  }
  assert.equal(selectScene('Do homework'), 'General');
  assert.equal(selectScene('Time to drink water'), 'Water');
  assert.equal(selectScene('仕事終了して水分補給'), 'PackUp');
});
test('language follows the system initially, persists and rejects unsupported values', t => {
  fs.mkdirSync('work', { recursive: true });
  const root = fs.mkdtempSync(path.resolve('work/language-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(detectLocale('ja-JP'), 'ja'); assert.equal(detectLocale('ko_KR'), 'ko'); assert.equal(detectLocale('zh-TW'), 'zh'); assert.equal(detectLocale('fr-FR'), 'en');
  const settings = new LanguageSettings(root, 'ja-JP'); assert.equal(settings.load(), 'ja');
  settings.set('ko'); assert.equal(new LanguageSettings(root, 'en-US').load(), 'ko');
  assert.throws(() => settings.set('../unsafe')); assert.equal(settings.locale, 'ko');
});
