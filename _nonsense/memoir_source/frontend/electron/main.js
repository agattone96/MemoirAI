const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Keep global references to prevent garbage collection
let mainWindow;
let pythonProcess;
let apiPort = 5000; // Default, will be dynamic later if needed

const IS_DEV = process.env.NODE_ENV === 'development';
// In production, 'backend' folder is copied to Resources/backend
// Inside 'backend', we have the contents of dist/memoir (binary + _internal)
const BACKEND_DIST_PATH = path.join(process.resourcesPath, 'backend', 'memoir');

function log(msg) {
    console.log(`[ElectronMain] ${msg}`);
}

async function startPythonBackend() {
    if (IS_DEV) {
        log('Dev mode: Skipping Python spawn (assuming manual start)');
        return;
    }

    log(`Spawning Python Backend from: ${BACKEND_DIST_PATH}`);

    pythonProcess = spawn(BACKEND_DIST_PATH, [], {
        detached: false,
        stdio: 'inherit' // Pipe output to Electron console
    });

    pythonProcess.on('error', (err) => {
        log(`Failed to spawn backend: ${err.message}`);
    });

    pythonProcess.on('exit', (code, signal) => {
        log(`Backend exited with code ${code} and signal ${signal}`);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "Memoir.ai",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'), // Optional implementation
        },
        icon: path.join(__dirname, '../../desktop/icons/icon.png')
    });

    const startUrl = IS_DEV
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, '../dist/index.html')}`;

    log(`Loading URL: ${startUrl}`);
    mainWindow.loadURL(startUrl);

    if (IS_DEV) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function checkBackendHealth(retries = 10) {
    return new Promise((resolve, reject) => {
        if (IS_DEV) return resolve(true);

        const tryConnect = (attempt) => {
            log(`Checking backend health (Attempt ${attempt})...`);
            const req = http.get(`http://localhost:${apiPort}/health`, (res) => {
                if (res.statusCode === 200) {
                    log('Backend is Ready!');
                    resolve(true);
                } else {
                    retry(attempt);
                }
            });

            req.on('error', () => retry(attempt));
            req.end();
        };

        const retry = (attempt) => {
            if (attempt >= retries) {
                log('Backend failed to start.');
                // Proceed anyway, maybe show error page in UI
                resolve(false);
            } else {
                setTimeout(() => tryConnect(attempt + 1), 1000);
            }
        };

        tryConnect(1);
    });
}

app.whenReady().then(async () => {
    await startPythonBackend();
    // Wait a bit for python to boot? or poll health?
    // Ideally poll health.
    await checkBackendHealth();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (pythonProcess) {
        log('Params: Killing Python subprocess...');
        pythonProcess.kill();
    }
});
