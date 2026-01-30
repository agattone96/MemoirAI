const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const keytar = require('keytar');

// Force App Name immediately (Highest confidence for macOS dev name)
app.setName('Memoir');
app.name = 'Memoir';

const { spawn } = require('child_process');
const path = require('path');
const Store = require('electron-store');

let mainWindow;
let backendProcess;
let tray;
const store = new Store();

// Configuration
const BACKEND_PORT = 5001;
const FRONTEND_PORT = 5173;
const IS_DEV = !app.isPackaged;
const BACKEND_START_TIMEOUT = 10000; // 10 seconds

// Paths
const BACKEND_DIR = IS_DEV
    ? path.join(__dirname, '..', 'backend')
    : path.join(process.resourcesPath, 'backend');

const PYTHON_EXECUTABLE = IS_DEV
    ? 'python3'
    : path.join(process.resourcesPath, 'backend', 'memoir');

// Backend Process Management
// --- Key Management ---
async function getOrGenerateDbKey() {
    const SERVICE = 'Memoir';
    const ACCOUNT = 'default';

    try {
        let key = await keytar.getPassword(SERVICE, ACCOUNT);
        if (!key) {
            console.log('[KeyManager] No existing key found. Generating new secure key...');
            key = crypto.randomBytes(32).toString('hex');
            await keytar.setPassword(SERVICE, ACCOUNT, key);
            console.log('[KeyManager] New key generated and stored in Keychain.');
        } else {
            console.log('[KeyManager] Existing key retrieved from Keychain.');
        }
        return key;
    } catch (err) {
        console.error('[KeyManager] Failed to access Keychain:', err);
        // Fallback for dev/testing only if Keychain fails completely
        if (IS_DEV) return 'dev_key_fallback_error';
        throw err;
    }
}

// --- Backend Management ---

async function startBackend() {
    const dbKey = await getOrGenerateDbKey();

    return new Promise((resolve, reject) => {
        console.log('[Electron] Starting backend...');
        console.log('[Electron] Backend dir:', BACKEND_DIR);
        console.log('[Electron] Executable:', PYTHON_EXECUTABLE);

        const args = IS_DEV ? [path.join(BACKEND_DIR, 'app.py')] : [];
        const env = {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            FLASK_ENV: IS_DEV ? 'development' : 'production',
            MEMOIR_DB_KEY: dbKey
        };

        backendProcess = spawn(PYTHON_EXECUTABLE, args, {
            cwd: BACKEND_DIR,
            env: env
        });

        let startupTimer;
        let backendReady = false;

        backendProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[Backend] ${output}`);

            // Check if Flask has started
            if (output.includes('Running on') || output.includes('WARNING: This is a development server')) {
                backendReady = true;
                clearTimeout(startupTimer);
                resolve();
            }
        });

        backendProcess.stderr.on('data', (data) => {
            console.error(`[Backend Error] ${data}`);
        });

        backendProcess.on('error', (error) => {
            console.error('[Backend] Failed to start:', error);
            reject(error);
        });

        backendProcess.on('exit', (code) => {
            console.log(`[Backend] Exited with code ${code}`);
            if (!backendReady && code !== 0) {
                reject(new Error(`Backend exited with code ${code}`));
            }
        });

        // Timeout fallback
        startupTimer = setTimeout(() => {
            if (!backendReady) {
                console.log('[Backend] Startup timeout - proceeding anyway');
                resolve(); // Proceed even if we didn't detect the startup message
            }
        }, BACKEND_START_TIMEOUT);
    });
}

function stopBackend() {
    if (backendProcess) {
        console.log('[Electron] Stopping backend...');
        backendProcess.kill('SIGTERM');

        // Force kill after 5 seconds if not stopped
        setTimeout(() => {
            if (backendProcess && !backendProcess.killed) {
                console.log('[Electron] Force killing backend');
                backendProcess.kill('SIGKILL');
            }
        }, 5000);
    }
}

// Window Management
function createWindow() {
    mainWindow = new BrowserWindow({
        width: store.get('windowWidth', 1400),
        height: store.get('windowHeight', 900),
        minWidth: 1000,
        minHeight: 700,
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        backgroundColor: '#f9fafb',
        icon: path.join(__dirname, 'icons', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true
        },
        show: false // Wait for ready-to-show
    });

    // Load frontend
    const frontendUrl = IS_DEV
        ? `http://localhost:${FRONTEND_PORT}`
        : `file://${path.join(__dirname, '..', 'dist', 'index.html')}`;

    mainWindow.loadURL(frontendUrl);

    // Show when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (IS_DEV) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Save window size on close
    mainWindow.on('close', () => {
        const { width, height } = mainWindow.getBounds();
        store.set('windowWidth', width);
        store.set('windowHeight', height);
    });

    // Minimize to tray instead of closing
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

// System Tray
function createTray() {
    const iconPath = path.join(__dirname, 'icon.png');
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Memoir.ai',
            click: () => {
                mainWindow.show();
                mainWindow.focus();
            }
        },
        { type: 'separator' },
        {
            label: 'Preferences',
            click: () => {
                mainWindow.show();
                mainWindow.webContents.send('navigate', '/settings');
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Memoir.ai');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

// App Lifecycle
app.whenReady().then(async () => {
    // Set App Name + Icon for macOS Dev
    if (process.platform === 'darwin') {
        app.setName('Memoir');
        if (IS_DEV) {
            const devIconPath = path.join(__dirname, 'icons', 'icon.png');
            app.dock.setIcon(devIconPath);
        }
    }

    try {
        // Start backend first
        await startBackend();
        console.log('[Electron] Backend started successfully');

        // Wait a bit for backend to be fully ready
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create window and tray
        createWindow();
        createTray();

        console.log('[Electron] App ready');
    } catch (error) {
        console.error('[Electron] Startup failed:', error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    // On macOS, apps typically stay open even when windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
    stopBackend();
});

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-app-path', () => app.getPath('userData'));
