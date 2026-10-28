const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const destination = path.join(root, 'src', 'vendor');
fs.mkdirSync(destination, { recursive: true });
for (const [source, target] of [
  ['dist/flatpickr.min.js', 'flatpickr.min.js'],
  ['dist/flatpickr.min.css', 'flatpickr.min.css'],
  ['dist/l10n/zh.js', 'flatpickr-zh.js'],
  ['dist/l10n/ja.js', 'flatpickr-ja.js'],
  ['dist/l10n/ko.js', 'flatpickr-ko.js'],
  ['LICENSE.md', 'flatpickr-LICENSE.md'],
]) fs.copyFileSync(path.join(root, 'node_modules', 'flatpickr', source), path.join(destination, target));
