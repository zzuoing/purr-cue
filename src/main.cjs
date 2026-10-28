const { app, BrowserWindow, Menu, Tray, ipcMain, screen, dialog, powerMonitor, nativeImage, globalShortcut } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ReminderStore, dueAt, createReminder, localDate } = require('./reminders.cjs');
const { selectScene, lastFrame, interval } = require('./animation/scenes-config.cjs');
const { locales, quickIds, translate, errorKeys, LanguageSettings } = require('./localization.cjs');
const appVersion = require('../package.json').version;

const args = process.argv.slice(1);
const previewIndex = args.indexOf('--preview');
const isPreview = previewIndex !== -1;
const smoke = args.includes('--smoke-test');
const profile = args.find(v => v.startsWith('--data-dir='));
if (profile) app.setPath('userData', path.resolve(profile.slice(11)));
app.setName('桌面提醒');
let mainWindow, animationWindow, tray, store, timer, language, quitting = false;
const t = (key, variables) => translate(language?.locale || 'zh', key, variables);
const icon = path.join(__dirname, '../assets/cat-head.png');
const preload = path.join(__dirname, 'preload.cjs');
const uiUrl = pathToFileURL(path.join(__dirname, 'index.html')).href;
const overlayUrl = pathToFileURL(path.join(__dirname, 'overlay.html')).href;
const webPreferences = { preload, contextIsolation: true, nodeIntegration: false, sandbox: true };

function secureWindow(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });
  win.webContents.on('render-process-gone', (_, details) => {
    console.error('Renderer exited:', details.reason);
    if (win === animationWindow) win.destroy();
  });
}
function state() {
  const warning = store.warningDetails ? t('errors.backup', { path: store.warningDetails.backup, error: errorMessage({ message: store.warningDetails.message }) }) : store.warning;
  return { reminders: store.items, autoStart: getAutoStart(), autoStartSupported: process.platform !== 'linux', warning, locale: language.locale, strings: locales[language.locale], version: appVersion };
}
function notify() { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('state-changed', state()); }
function getAutoStart() {
  if (process.platform === 'linux') return false;
  return app.getLoginItemSettings({ path: process.execPath, args: app.isPackaged ? [] : [app.getAppPath()] }).openAtLogin;
}
function showMain() {
  if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.restore(); mainWindow.focus(); return; }
  mainWindow = new BrowserWindow({ width: 736, height: 430, useContentSize: true, resizable: false,
    title: t('appName'), icon, show: false, backgroundColor: '#f9f7f3', webPreferences });
  secureWindow(mainWindow);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  // Destroy the UI when closed; the main process owns the timer and tray.
  mainWindow.on('closed', () => { mainWindow = null; });
}
function showAnimation(message, scheduled, itemId = null, preview = false, forcedScene = null) {
  const area = screen.getPrimaryDisplay().workArea;
  const scene = forcedScene || selectScene(message);
  const win = new BrowserWindow({ x: area.x, y: area.y + area.height - 250, width: area.width, height: 250,
    transparent: true, frame: false, hasShadow: false, resizable: false, movable: false,
    alwaysOnTop: true, skipTaskbar: true, show: false, backgroundColor: '#00000000',
    webPreferences: { ...webPreferences, backgroundThrottling: false } });
  animationWindow = win;
  secureWindow(win);
  win.setAlwaysOnTop(true, 'floating');
  if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Transparent pixels pass through; the renderer enables clicks over visible pixels.
  win.setIgnoreMouseEvents(true, { forward: true });
  const escapeRegistered = globalShortcut.register('Escape', () => { if (!win.isDestroyed()) win.close(); });
  let watchdog;
  win.once('closed', () => {
    if (escapeRegistered) globalShortcut.unregister('Escape');
    clearTimeout(watchdog); if (animationWindow === win) animationWindow = null;
    if (itemId && store) {
      try { store.transaction(items => { const i = items.findIndex(v => v.Id === itemId); if (i >= 0) items.splice(i, 1); }); notify(); }
      catch (error) { showError(error); }
    }
    if (preview) app.quit();
  });
  win.loadFile(path.join(__dirname, 'overlay.html'), { query: { scene, message, scheduled: scheduled.toISOString(), lastFrame: String(lastFrame(scene, area.width)), locale: language?.locale || 'en', title: t('animationTitle'), stretchAlt: t('stretchAlt') } })
    .catch(error => { if (!win.isDestroyed()) { showError(error); win.close(); } });
  watchdog = setTimeout(() => { if (!win.isDestroyed()) win.close(); }, (lastFrame(scene, area.width) + 1) * interval + 15000);
  win.webContents.on('did-fail-load', () => { if (!win.isDestroyed()) win.close(); });
}
function checkDue() {
  if (animationWindow || !store || quitting) return;
  const now = new Date();
  for (const item of store.items) {
    const scheduled = dueAt(item, now);
    if (!scheduled) continue;
    try {
      store.transaction(() => { if (item.RepeatDays.length) item.LastTriggeredDate = localDate(now); else item.Enabled = false; });
      showAnimation(item.Message, scheduled, item.RepeatDays.length ? null : item.Id); notify();
    } catch (error) { showError(error); }
    break;
  }
}
function errorMessage(error) { return errorKeys[error.message] ? t(errorKeys[error.message]) : error.message; }
function showError(error) { console.error(error); dialog.showErrorBox(t('appName'), errorMessage(error)); }
function updateNativeLanguage() {
  app.setAboutPanelOptions({ applicationName: t('appName'), applicationVersion: appVersion });
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(t('appName'));
  if (tray) {
    tray.setToolTip(t('appName'));
    tray.setContextMenu(Menu.buildFromTemplate([{ label: t('open'), click: showMain }, { label: t('quit'), click: () => app.quit() }]));
  }
  if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: t('appName'), submenu: [{ role: 'about', label: t('about') }, { type: 'separator' }, { role: 'quit', label: t('quit') }] },
    { label: t('edit'), submenu: ['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll'].map(role => ({ role, label: t(role) })) },
  ]));
}
function mainSender(event) { return mainWindow && event.sender === mainWindow.webContents && event.senderFrame?.url === uiUrl; }
function overlaySender(event) { return animationWindow && event.sender === animationWindow.webContents && event.senderFrame?.url.startsWith(overlayUrl + '?'); }
function registerIpc() {
  const handle = (channel, action) => ipcMain.handle(channel, (event, ...input) => {
    if (!mainSender(event)) throw new Error(t('errors.window'));
    try { return { ok: true, value: action(...input) }; } catch (error) { return { ok: false, error: errorMessage(error) }; }
  });
  handle('state', state);
  handle('language', locale => { language.set(locale); updateNativeLanguage(); notify(); return state(); });
  handle('quick-play', label => {
    if (!quickIds.includes(label)) throw new Error(t('errors.quick'));
    // Destroy synchronously so rapid clicks also replace windows still loading.
    // The existing closed handler retains normal reminder cleanup semantics.
    if (animationWindow && !animationWindow.isDestroyed()) animationWindow.destroy();
    showAnimation(t(`quick.${label}`), new Date(), null, false, label);
  });
  handle('add', input => { const item = createReminder(input); store.transaction(items => items.push(item)); notify(); return state(); });
  handle('remove', id => { if (typeof id !== 'string') throw new Error(t('errors.reminder')); store.transaction(items => { const i = items.findIndex(v => v.Id === id); if (i >= 0) items.splice(i, 1); }); notify(); return state(); });
  handle('auto-start', enabled => {
    if (typeof enabled !== 'boolean' || process.platform === 'linux') throw new Error(t('autoStartUnsupported'));
    app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath, args: app.isPackaged ? [] : [app.getAppPath()] });
    notify(); return state();
  });
  ipcMain.on('animation-ready', event => { if (overlaySender(event)) animationWindow.showInactive(); });
  ipcMain.on('animation-close', event => { if (overlaySender(event)) animationWindow.close(); });
  ipcMain.on('animation-hit', (event, hit) => { if (overlaySender(event) && typeof hit === 'boolean') animationWindow.setIgnoreMouseEvents(!hit, { forward: true }); });
}
if (!isPreview && !smoke && !app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (store) showMain(); });
  app.whenReady().then(async () => {
    language = new LanguageSettings(app.getPath('userData'), app.getLocale());
    if (!isPreview) language.load();
    updateNativeLanguage();
    registerIpc();
    if (isPreview) { showAnimation(args[previewIndex + 1] || '透气', new Date(), null, true); return; }
    const legacy = process.platform === 'win32' && process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'DesktopReminder/reminders-v2.json') : null;
    store = new ReminderStore(app.getPath('userData'), profile ? null : legacy); store.load();
    tray = new Tray(process.platform === 'darwin' ? nativeImage.createFromPath(icon).resize({ width: 20, height: 20 }) : icon);
    updateNativeLanguage();
    tray.on('double-click', showMain); tray.on('click', showMain);
    showMain();
    timer = setInterval(checkDue, 15000); powerMonitor.on('resume', checkDue);
    checkDue();
  }).catch(error => { showError(error); app.exit(1); });
}
app.on('activate', () => { if (store) showMain(); });
app.on('window-all-closed', () => {});
app.on('before-quit', () => { quitting = true; clearInterval(timer); tray?.destroy(); });
