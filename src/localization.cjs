const locales = require('./locales.json');
const fs = require('node:fs');
const path = require('node:path');
const quickIds = ['WorkStart', 'Window', 'Water', 'Eating', 'Stretch', 'Walking', 'Toilet', 'PackUp'];
function detectLocale(value = '') { const code = value.toLowerCase().split(/[-_]/)[0]; return locales[code] ? code : 'en'; }
function translate(locale, key, variables = {}) {
  const get = data => key.split('.').reduce((value, part) => value?.[part], data);
  let value = get(locales[locale]) ?? get(locales.en) ?? key;
  if (typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (_, name) => String(variables[name] ?? `{${name}}`));
}
const errorKeys = Object.fromEntries(Object.entries(locales.zh.errors).map(([key, value]) => [value, `errors.${key}`]));
class LanguageSettings {
  constructor(directory, systemLocale) { this.file = path.join(directory, 'settings.json'); this.locale = detectLocale(systemLocale); }
  load() {
    try { const value = JSON.parse(fs.readFileSync(this.file, 'utf8')); if (locales[value.locale]) this.locale = value.locale; }
    catch (error) {
      if (error.code !== 'ENOENT') {
        fs.copyFileSync(this.file, `${this.file}.broken-${Date.now()}`);
        console.warn('Invalid language settings backed up:', error.message);
      }
    }
    return this.locale;
  }
  set(locale) {
    if (!Object.hasOwn(locales, locale)) throw new Error(translate(this.locale, 'errors.language'));
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file + '.tmp', JSON.stringify({ locale }, null, 2));
    fs.renameSync(this.file + '.tmp', this.file); this.locale = locale;
  }
}
module.exports = { locales, quickIds, detectLocale, translate, errorKeys, LanguageSettings };
