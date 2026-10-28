let locale = 'zh', strings = {};
export function setTranslations(state) { locale = state.locale; strings = state.strings; document.documentElement.lang = locale; }
export function currentLocale() { return locale; }
export function t(key, variables = {}) {
  const value = key.split('.').reduce((result, part) => result?.[part], strings);
  return typeof value === 'string' ? value.replace(/\{(\w+)\}/g, (_, name) => String(variables[name] ?? `{${name}}`)) : value ?? key;
}
export function translateElements() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.title = t('appName');
}
