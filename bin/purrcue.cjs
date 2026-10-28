#!/usr/bin/env node
// Dependency-free CLI: works with Node.js or the bundled Electron Node runtime.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const help = `PurrCue — reminders for people and AI assistants

  purrcue add --in 20m --message "Take a break" [--json]
  purrcue add --at "2026-12-01 14:30" --message "Meeting" [--json]
  purrcue add --time 09:00 --days mon,tue,wed,thu,fri --message "Start work"
  purrcue list [--json]
  purrcue remove <id> [--json]
  purrcue status [--json]

Times without an offset use local time. --at also accepts ISO 8601 with an offset.
--in accepts a positive number followed by s, m, h, or d.
--days accepts sun,mon,tue,wed,thu,fri,sat (or 0–6, Sunday=0).
--data-dir <folder> selects an isolated app profile; --no-launch disables auto-start.
JSON output is one object with ok and value, or ok and error. Errors exit with 1.
The app must remain running for reminders to fire. No cloud connection is used.
`;
function parse(argv, now = new Date()) {
  const command = argv[0];
  if (!command || command === '--help' || command === '-h' || command === 'help' || argv.includes('--help')) return { help: true };
  if (!['add', 'list', 'remove', 'status'].includes(command)) throw Error('Unknown command. Run purrcue --help.');
  const options = {}, positional = [];
  const values = new Set(['--in', '--at', '--time', '--days', '--message', '--data-dir']);
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json' || arg === '--no-launch') { options[arg] = true; continue; }
    if (values.has(arg)) {
      if (Object.hasOwn(options, arg) || argv[i + 1] === undefined || argv[i + 1].startsWith('--')) throw Error(`Missing or repeated option: ${arg}`);
      options[arg] = argv[++i];
    } else if (arg.startsWith('-')) throw Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  const allowed = new Set(['--json', '--no-launch', '--data-dir', ...(command === 'add' ? values : [])]);
  for (const key of Object.keys(options)) if (!allowed.has(key)) throw Error(`${key} is only valid for add`);
  if (command === 'remove' ? positional.length !== 1 : positional.length !== 0) throw Error('Unexpected or missing positional argument');
  let input;
  if (command === 'add') {
    const message = options['--message'];
    if (!message?.trim() || message.length > 2000) throw Error('--message must contain 1–2000 characters');
    if (['--in', '--at', '--time'].filter(k => options[k] !== undefined).length !== 1) throw Error('Choose exactly one of --in, --at, or --time');
    let date, days = [];
    if (options['--in']) {
      const match = /^(\d+(?:\.\d+)?)(s|m|h|d)$/.exec(options['--in']);
      if (!match || Number(match[1]) <= 0) throw Error('Invalid --in duration');
      date = new Date(now.getTime() + Number(match[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]]);
    } else if (options['--time']) {
      const match = /^(\d{2}):(\d{2})$/.exec(options['--time']);
      if (!match || +match[1] > 23 || +match[2] > 59 || !options['--days']) throw Error('Use --time HH:mm with --days');
      const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      days = options['--days'].toLowerCase().split(',').map(v => /^\d$/.test(v.trim()) ? Number(v.trim()) : names.indexOf(v.trim()));
      if (days.some(d => d < 0 || d > 6)) throw Error('Invalid weekday');
      date = new Date(now); date.setHours(+match[1], +match[2], 0, 0);
    } else {
      const local = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(options['--at']);
      if (local) {
        const [, y, m, d, h, minute] = local.map(Number);
        date = new Date(y, m - 1, d, h, minute);
        if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d || date.getHours() !== h || date.getMinutes() !== minute) throw Error('Invalid local date/time');
      } else {
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(options['--at'])) throw Error('Use YYYY-MM-DD HH:mm or ISO 8601 with a timezone offset');
        // Reject calendar rollover before converting an explicit-offset timestamp.
        const day = options['--at'].slice(0, 10);
        if (new Date(day + 'T00:00:00Z').toISOString().slice(0, 10) !== day) throw Error('Invalid calendar date');
        date = new Date(options['--at']);
      }
    }
    if (options['--days'] && !options['--time']) throw Error('--days requires --time');
    if (!Number.isFinite(date.getTime()) || (!days.length && date <= now)) throw Error('One-time reminder must be in the future');
    input = { mode: days.length ? 'repeat' : 'once', when: date.toISOString(), message, days: [...new Set(days)] };
  }
  return { command, args: command === 'remove' ? { id: positional[0] } : input, options };
}
function dataDirectory() {
  const base = process.platform === 'win32' ? process.env.APPDATA : process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Application Support') : process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  if (!base) throw Error('User data directory is unavailable');
  return path.join(base, '桌面提醒');
}
function request(connection, command, args) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(connection.endpoint);
    socket.setEncoding('utf8');
    let data = '';
    socket.setTimeout(5000, () => socket.destroy(Error('PurrCue did not respond')));
    socket.on('error', reject);
    socket.on('connect', () => socket.write(JSON.stringify({ token: connection.token, command, args }) + '\n'));
    socket.on('data', chunk => { data += chunk.toString('utf8'); if (Buffer.byteLength(data) > 8388608) socket.destroy(Error('Response too large')); });
    socket.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(Error('Invalid PurrCue response')); } });
  });
}
function launch(directory) {
  const development = path.resolve(__dirname, '..');
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  let executable, args = [];
  if (fs.existsSync(path.join(development, 'src/main.cjs'))) {
    executable = require(path.join(development, 'node_modules/electron'));
    args.push(development);
  } else {
    executable = process.env.PURRCUE_EXECUTABLE || (process.platform === 'linux' && process.env.APPIMAGE) || process.execPath;
    if (!process.versions.electron && !process.env.PURRCUE_EXECUTABLE) throw Error('Start PurrCue first, or use the bundled purrcue launcher');
  }
  args.push('--background', `--data-dir=${directory}`);
  if (process.env.PURRCUE_TEST_FLAGS === '1' && process.platform === 'linux') args.push('--no-sandbox', '--disable-gpu');
  const child = spawn(executable, args, { detached: true, stdio: 'ignore', windowsHide: true, env });
  child.on('error', () => {}); child.unref();
}
async function main(argv) {
  let result;
  try {
    const parsed = parse(argv);
    if (parsed.help) { process.stdout.write(help); return; }
    const directory = path.resolve(parsed.options['--data-dir'] || process.env.PURRCUE_DATA_DIR || dataDirectory());
    const read = () => JSON.parse(fs.readFileSync(path.join(directory, 'cli-connection.json'), 'utf8'));
    let connection;
    try { connection = read(); } catch {}
    // Authenticate a read-only probe before performing a mutation. Never retry a
    // mutation after an unknown outcome, which could otherwise duplicate reminders.
    try { if (!connection || !(await request(connection, 'status')).ok) throw Error('Not running'); }
    catch {
      if (parsed.options['--no-launch']) throw Error('PurrCue is not running. Start the app first.');
      launch(directory);
      connection = null;
      for (let i = 0; i < 100; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        try { const candidate = read(); if ((await request(candidate, 'status')).ok) { connection = candidate; break; } } catch {}
      }
      if (!connection) throw Error('Could not start PurrCue. Start the app manually and retry.');
    }
    result = await request(connection, parsed.command, parsed.args);
  } catch (error) { result = { ok: false, error: { code: 'CLI_ERROR', message: error.message } }; }
  if (argv.includes('--json')) process.stdout.write(JSON.stringify(result) + '\n');
  else if (!result.ok) process.stderr.write(result.error.message + '\n');
  else process.stdout.write(JSON.stringify(result.value, null, 2) + '\n');
  if (!result.ok) process.exitCode = 1;
}
if (require.main === module) main(process.argv.slice(2));
module.exports = { parse, request, dataDirectory, main };
