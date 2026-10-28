// Format/size conversion only: all variants come from the approved bitmap.
const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
app.whenReady().then(() => {
  const image = nativeImage.createFromPath(path.join(root, 'design/purrcue-icon-approved.png'));
  assert.ok(!image.isEmpty(), 'Approved icon is missing');
  assert.equal(image.getSize().width, image.getSize().height, 'Icon must be square');
  const bitmap = image.toBitmap();
  assert.equal(bitmap[3], 0, 'Icon background must remain transparent');
  const png = size => image.resize({ width: size, height: size, quality: 'best' }).toPNG();
  fs.writeFileSync(path.join(root, 'assets/cat-head.png'), png(256));
  fs.writeFileSync(path.join(root, 'assets/app-icon.png'), png(1024));
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const frames = sizes.map(png);
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, index) => {
    const position = 6 + index * 16;
    header[position] = size === 256 ? 0 : size;
    header[position + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, position + 4);
    header.writeUInt16LE(32, position + 6);
    header.writeUInt32LE(frames[index].length, position + 8);
    header.writeUInt32LE(offset, position + 12);
    offset += frames[index].length;
  });
  fs.writeFileSync(path.join(root, 'assets/cat-head.ico'), Buffer.concat([header, ...frames]));
  console.log('Approved icon converted: transparent 256/1024 PNG and seven-size Windows ICO');
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
