const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Example: send 'ping' to main process
    ping: () => ipcRenderer.invoke('ping'),
    // Expose version info
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    }
});
