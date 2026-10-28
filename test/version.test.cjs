const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { versionFromTag, setVersion } = require('../scripts/set-version.cjs');
test('tag versions are validated and update package + lock metadata together', t => {
  assert.equal(versionFromTag('v1.0.1'), '1.0.1');
  assert.equal(versionFromTag('v1.0.1-beta.1'), '1.0.1-beta.1');
  for (const tag of ['main','1.0.1','v01.0.1','v1.0','v1.0.1-beta.01','v1.0.1;echo unsafe']) assert.throws(() => versionFromTag(tag));
  fs.mkdirSync('work', { recursive: true }); const root = fs.mkdtempSync(path.resolve('work/version-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'test', version: '2.0.0' }));
  fs.writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({ version: '2.0.0', packages: { '': { version: '2.0.0' }, other: { version: '9.0.0' } } }));
  assert.equal(setVersion(root, 'v1.0.1'), '1.0.1');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))), lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
  assert.equal(pkg.version, '1.0.1'); assert.equal(lock.version, '1.0.1'); assert.equal(lock.packages[''].version, '1.0.1'); assert.equal(lock.packages.other.version, '9.0.0');
});
