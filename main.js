const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
    const win = new BrowserWindow({
        width: 800,
        height: 1000,
        minWidth: 800,
        minHeight: 1000,
        maxWidth: 800,
        maxHeight: 1000,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    win.loadFile('index.html');
}
app.whenReady().then(createWindow);

// On macOS, re-open window when icon is clicked in the dock:
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
});
