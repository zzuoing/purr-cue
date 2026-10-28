const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktopReminder', {
  state: () => ipcRenderer.invoke('state'),
  language: locale => ipcRenderer.invoke('language', locale),
  add: input => ipcRenderer.invoke('add', input),
  remove: id => ipcRenderer.invoke('remove', id),
  autoStart: enabled => ipcRenderer.invoke('auto-start', enabled),
  playQuick: label => ipcRenderer.invoke('quick-play', label),
  closeAnimation: () => ipcRenderer.send('animation-close'),
  animationReady: () => ipcRenderer.send('animation-ready'),
  animationHit: hit => ipcRenderer.send('animation-hit', hit),
  onState: callback => { const handler = (_, value) => callback(value); ipcRenderer.on('state-changed', handler); return () => ipcRenderer.removeListener('state-changed', handler); },
});
