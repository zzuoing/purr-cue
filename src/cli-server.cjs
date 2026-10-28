const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');

async function startCliServer(directory, handle) {
  const hash = createHash('sha256').update(path.resolve(directory)).digest('hex').slice(0, 24);
  const endpoint = process.platform === 'win32' ? `\\\\.\\pipe\\purrcue-${hash}` : path.join(os.tmpdir(), `purrcue-${process.getuid()}-${hash}.sock`);
  const file = path.join(directory, 'cli-connection.json');
  const token = randomBytes(32).toString('hex');
  if (process.platform !== 'win32' && fs.existsSync(endpoint)) {
    if (!fs.lstatSync(endpoint).isSocket()) throw Error('CLI endpoint is not a socket');
    fs.unlinkSync(endpoint);
  }
  const server = net.createServer(socket => {
    socket.setEncoding('utf8');
    socket.setTimeout(5000, () => socket.destroy());
    socket.on('error', () => {});
    let data = '', handled = false;
    socket.on('data', chunk => {
      if (handled) return;
      data += chunk.toString('utf8');
      if (Buffer.byteLength(data) > 32768) { socket.destroy(); return; }
      if (!data.includes('\n')) return;
      handled = true;
      try {
        const request = JSON.parse(data.slice(0, data.indexOf('\n')));
        const received = Buffer.from(typeof request.token === 'string' ? request.token : '');
        const expected = Buffer.from(token);
        if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw Error('Unauthorized CLI request');
        const value = handle(request.command, request.args);
        socket.end(JSON.stringify({ ok: true, value }) + '\n');
      } catch (error) { socket.end(JSON.stringify({ ok: false, error: { code: 'REQUEST_FAILED', message: error.message } }) + '\n'); }
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(endpoint, resolve); });
  try {
    if (process.platform !== 'win32') fs.chmodSync(endpoint, 0o600);
    const connection = { endpoint, token, protocol: 1 };
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(connection), { mode: 0o600 });
    if (process.platform !== 'win32') fs.chmodSync(file + '.tmp', 0o600);
    fs.renameSync(file + '.tmp', file);
  } catch (error) { server.close(); throw error; }
  return {
    close() {
      server.close();
      try { if (JSON.parse(fs.readFileSync(file, 'utf8')).token === token) fs.unlinkSync(file); } catch {}
    },
  };
}
module.exports = { startCliServer };
