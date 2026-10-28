import { currentLocale, t } from './i18n.js';
const pad = n => String(n).padStart(2, '0');
export function parsePickerValue(value, mode, today = new Date()) {
  const match = mode === 'once' ? /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(value) : /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = mode === 'once' ? match.slice(1).map(Number) : [today.getFullYear(), today.getMonth() + 1, today.getDate(), ...match.slice(1).map(Number)];
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute) return null;
  return date;
}
export function formatPickerValue(date, mode) {
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return mode === 'repeat' ? time : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`;
}
export function createDateTimePicker(input) {
  const $ = id => document.getElementById(id);
  const panel = $('date-time-picker');
  let mode = 'once', selectedDate = new Date();
  for (const [id, count] of [['picker-hour', 24], ['picker-minute', 60]]) {
    for (let n = 0; n < count; n++) { const option = document.createElement('option'); option.value = pad(n); option.textContent = pad(n); $(id).append(option); }
  }
  const calendar = window.flatpickr($('calendar-input'), {
    locale: currentLocale() === 'en' ? 'default' : currentLocale(), inline: true, appendTo: $('calendar-host'),
    dateFormat: 'Y-m-d', defaultDate: selectedDate, monthSelectorType: 'dropdown',
    onChange: dates => { if (dates[0]) selectedDate = dates[0]; },
  });
  function open() {
    if (panel.open) return;
    selectedDate = parsePickerValue(input.value.trim(), mode) || new Date(Date.now() + 5 * 60000);
    calendar.setDate(selectedDate, false);
    $('picker-hour').value = pad(selectedDate.getHours());
    $('picker-minute').value = pad(selectedDate.getMinutes());
    $('calendar-host').hidden = mode === 'repeat';
    $('picker-shortcuts').hidden = mode === 'repeat';
    panel.showModal();
    (mode === 'repeat' ? $('picker-hour') : calendar.calendarContainer.querySelector('.selected') || $('picker-hour')).focus();
  }
  $('open-picker').onclick = open;
  input.addEventListener('click', open);
  input.addEventListener('keydown', event => { if ((event.altKey && event.key === 'ArrowDown') || event.key === 'F4') { event.preventDefault(); open(); } });
  $('picker-cancel').onclick = () => panel.close();
  for (const [id, offset] of [['picker-today', 0], ['picker-tomorrow', 1]]) $(id).onclick = () => {
    const date = new Date(); date.setDate(date.getDate() + offset); selectedDate = date; calendar.setDate(date, false);
  };
  $('picker-confirm').onclick = () => {
    const date = new Date(selectedDate);
    date.setHours(Number($('picker-hour').value), Number($('picker-minute').value), 0, 0);
    input.value = formatPickerValue(date, mode);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    panel.close(); input.focus();
  };
  panel.addEventListener('click', event => {
    const r = panel.getBoundingClientRect();
    if (event.target === panel && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) panel.close();
  });
  return {
    setMode(next, value) {
      if (panel.open) panel.close(); mode = next; input.value = value;
      input.dataset.mode = mode; input.closest('.time-field').classList.toggle('time-only', mode === 'repeat');
      input.placeholder = mode === 'repeat' ? 'HH:mm' : 'YYYY-MM-DD HH:mm';
      $('open-picker').setAttribute('aria-label', t(mode === 'repeat' ? 'chooseTime' : 'chooseDateTime'));
      $('open-picker').title = t(mode === 'repeat' ? 'chooseTime' : 'chooseDateTime');
    },
    setLocale() {
      calendar.set('locale', currentLocale() === 'en' ? 'default' : currentLocale());
      $('open-picker').setAttribute('aria-label', t(mode === 'repeat' ? 'chooseTime' : 'chooseDateTime'));
      $('open-picker').title = t(mode === 'repeat' ? 'chooseTime' : 'chooseDateTime');
    },
    getDate: () => parsePickerValue(input.value.trim(), mode),
  };
}
