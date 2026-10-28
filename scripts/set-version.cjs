const fs = require('node:fs');
const path = require('node:path');
function versionFromTag(tag) {
  const match = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)$/.exec(tag);
  if (!match || match[2]?.split('.').some(part => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) throw new Error('Expected a semantic version tag such as v1.0.1 or v1.0.1-beta.1');
  return match[1];
}
function setVersion(root, tag) {
  const version = versionFromTag(tag);
  const packageFile = path.join(root, 'package.json'), lockFile = path.join(root, 'package-lock.json');
  const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  pkg.version = version; lock.version = version;
  if (lock.packages?.['']) lock.packages[''].version = version;
  fs.writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + '\n');
  fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2) + '\n');
  return version;
}
if (require.main === module) {
  const root = path.join(__dirname, '..');
  const tag = process.env.RELEASE_TAG || process.argv[2];
  const version = tag ? setVersion(root, tag) : require('../package.json').version;
  console.log(`Build version: ${version}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
}
module.exports = { versionFromTag, setVersion };
