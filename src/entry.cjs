// CLI mode must bypass GUI startup and the single-instance application lock.
const cliIndex = process.argv.indexOf('--cli');
if (cliIndex !== -1) {
  const { app } = require('electron');
  const path = require('node:path');
  const file = app.isPackaged ? path.join(process.resourcesPath, 'cli/purrcue.cjs') : path.join(__dirname, '../bin/purrcue.cjs');
  require(file).main(process.argv.slice(cliIndex + 1)).then(() => app.exit(process.exitCode || 0)).catch(error => { console.error(error.message); app.exit(1); });
} else require('./main.cjs');
