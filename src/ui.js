import { createDateTimePicker, formatPickerValue } from './date-time-picker.js';
import { setTranslations, currentLocale, t, translateElements } from './i18n.js';
const api = window.desktopReminder;
const $ = id => document.getElementById(id);
const initialResult = await api.state();
if (!initialResult.ok) throw new Error(initialResult.error);
setTranslations(initialResult.value);
let mode = 'once', days = new Set();
const pad = v => String(v).padStart(2, '0');
let onceValue = formatPickerValue(new Date(Date.now() + 5 * 60000), 'once'), repeatValue = '16:00';
const picker = createDateTimePicker($('when'));
$('message').value = t('defaultMessage');
function notice(message) { $('notice-text').textContent = message; if (!$('notice').open) $('notice').showModal(); }
$('notice-ok').onclick = () => $('notice').close();
for (const id of ['message', 'when']) {
  $(id).addEventListener('invalid', () => $(id).setCustomValidity(t(id === 'message' ? 'errors.empty' : 'errors.time')));
  $(id).addEventListener('input', () => $(id).setCustomValidity(''));
  $(id).addEventListener('change', () => $(id).setCustomValidity(''));
}
function render(state) {
  const changedLanguage = currentLocale() !== state.locale;
  setTranslations(state); translateElements();
  const labels = { h1: 'settings', '#once': 'once', '#repeat': 'repeat', 'label[for="when"]': 'when', '#repeat-days > span': 'repeatDays', '.quick-group > span': 'quickStates', '.message-label': 'message', '.save': 'save', h2: 'list', '#delete': 'delete', '.background-hint': 'backgroundHint', '#notice-ok': 'ok', '#picker-title': 'pickerTitle', 'label[for="picker-hour"]': 'time', '#picker-today': 'today', '#picker-tomorrow': 'tomorrow', '#picker-cancel': 'cancel', '#picker-confirm': 'ok' };
  for (const [selector, key] of Object.entries(labels)) document.querySelector(selector).textContent = t(key);
  document.querySelectorAll('.days button').forEach(button => { button.textContent = t('dayShort')[Number(button.dataset.day)]; button.title = t('weekdays')[Number(button.dataset.day)]; });
  document.querySelectorAll('#quick button').forEach(button => { button.textContent = t(`quick.${button.dataset.scene}`); });
  const units = document.querySelectorAll('.picker-time > span'); units[0].textContent = t('hourUnit'); units[1].textContent = t('minuteUnit');
  for (const [id, key] of [['picker-hour','hour'],['picker-minute','minute'],['reminders','list'],['language','language'],['quick','quickStates']]) $(id).setAttribute('aria-label', t(key));
  document.querySelector('.days').setAttribute('aria-label', t('repeatDays'));
  document.querySelector('.editor-side').setAttribute('aria-label', t('settings'));
  document.querySelector('.list-side').setAttribute('aria-label', t('list'));
  document.querySelector('.modes').setAttribute('aria-label', t('settings'));
  $('language').value = state.locale; $('version').textContent = t('version', { version: state.version });
  if (changedLanguage) picker.setLocale();
  if (changedLanguage) for (const id of ['message', 'when']) $(id).setCustomValidity('');
  const selected = $('reminders').value;
  $('reminders').replaceChildren();
  for (const item of [...state.reminders].sort((a, b) => new Date(a.When) - new Date(b.When))) {
    const date = new Date(item.When), time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    const weekdays = item.RepeatDays;
    const workday = weekdays.length === 5 && [1, 2, 3, 4, 5].every(d => weekdays.includes(d));
    const prefix = weekdays.length ? `${time}  ${workday ? t('workdays') : [1, 2, 3, 4, 5, 6, 0].filter(d => weekdays.includes(d)).map(d => t('weekdays')[d]).join(' ')}` : `${pad(date.getMonth() + 1)}-${pad(date.getDate())}  ${time}`;
    const suffix = !item.Enabled ? t('completed') : !weekdays.length && date < new Date() ? t('expired') : '';
    const option = document.createElement('option'); option.value = item.Id; option.textContent = `${prefix}    ${item.Message}${suffix}`;
    $('reminders').append(option);
  }
  $('reminders').value = selected;
  $('auto-start').checked = state.autoStart;
  $('auto-start').disabled = !state.autoStartSupported;
  $('auto-start').title = state.autoStartSupported ? '' : t('autoStartUnsupported');
}
async function apply(promise) { try { const result = await promise; if (!result.ok) throw new Error(result.error); render(result.value); return result.value; } catch (error) { notice(error.message); return null; } }
function setMode(next) {
  if (mode === 'once') onceValue = $('when').value; else repeatValue = $('when').value;
  mode = next;
  picker.setMode(mode, mode === 'once' ? onceValue : repeatValue);
  $('repeat-days').hidden = mode !== 'repeat';
  for (const id of ['once', 'repeat']) { $(id).classList.toggle('selected', id === mode); $(id).setAttribute('aria-pressed', String(id === mode)); }
}
picker.setMode('once', onceValue);
$('once').onclick = () => setMode('once'); $('repeat').onclick = () => setMode('repeat');
for (const day of [1, 2, 3, 4, 5, 6, 0]) {
  const b = document.createElement('button'); b.type = 'button'; b.dataset.day = day; b.textContent = t('dayShort')[day]; b.setAttribute('aria-pressed', 'false');
  b.onclick = () => { if (days.has(day)) days.delete(day); else days.add(day); b.classList.toggle('selected', days.has(day)); b.setAttribute('aria-pressed', String(days.has(day))); };
  document.querySelector('.days').append(b);
}
for (const scene of ['WorkStart', 'Window', 'Water', 'Eating', 'Stretch', 'Walking', 'Toilet', 'PackUp']) {
  const b = document.createElement('button'); b.type = 'button'; b.dataset.scene = scene; b.textContent = t(`quick.${scene}`);
  b.onclick = async () => {
    const label = t(`quick.${scene}`);
    $('message').value = label; $('message').focus(); $('message').setSelectionRange(label.length, label.length);
    try { const result = await api.playQuick(scene); if (!result.ok) notice(result.error); }
    catch (error) { notice(error.message); }
  };
  $('quick').append(b);
}
$('editor').onsubmit = async event => {
  event.preventDefault();
  const when = picker.getDate();
  if (!when) { notice(t(mode === 'once' ? 'errors.onceInput' : 'errors.repeatInput')); return; }
  if (await apply(api.add({ mode, when: when.toISOString(), days: [...days], message: $('message').value }))) $('message').select();
};
$('delete').onclick = () => { if ($('reminders').value) apply(api.remove($('reminders').value)); };
$('auto-start').onchange = async () => { if (!await apply(api.autoStart($('auto-start').checked))) await apply(api.state()); };
api.onState(render);
$('language').onchange = async () => { if (!await apply(api.language($('language').value))) await apply(api.state()); };
const initial = initialResult.value;
render(initial);
if (initial?.warning) notice(initial.warning);
