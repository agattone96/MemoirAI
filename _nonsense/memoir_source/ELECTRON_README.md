# Memoir.ai Desktop App

## Running in Development

### Prerequisites
- Python 3.10+ installed
- Node.js 18+ installed

### Start the App
```bash
# In terminal 1 - Start frontend dev server
cd frontend
npm install
npm run dev

# In terminal 2 - Run Electron
cd ..
npm install
npm run electron:dev
```

The app will:
1. Auto-start the Flask backend on port 5001
2. Open Electron window loading frontend from localhost:5173
3. Create system tray icon

### Development Features
- Hot reload for frontend changes
- DevTools automatically opened
- Backend logs visible in terminal

---

## Building for Production

### macOS
```bash
# Build frontend
npm run build:frontend

# Build desktop app
npm run electron:build:mac
```

Output: `dist-electron/Memoir.ai-2.0.0.dmg`

### Windows
```bash
npm run build:frontend
npm run electron:build:win
```

Output: `dist-electron/Memoir.ai Setup 2.0.0.exe`

### Linux
```bash
npm run build:frontend
npm run electron:build:linux
```

Output: `dist-electron/Memoir.ai-2.0.0.AppImage`

---

## System Tray

- **macOS/Linux**: Click icon to show/hide window
- **Right-click**: Context menu with Preferences and Quit
- **Closing window**: Minimizes to tray (doesn't quit)
- **Quit**: Fully stops backend and exits

---

## Data Storage

- **Development**: `Vault/memoir.db` in project root
- **Production**: 
  - macOS: `~/Library/Application Support/memoir-ai/`
  - Windows: `%APPDATA%/memoir-ai/`
  - Linux: `~/.config/memoir-ai/`

---

## Troubleshooting

### Backend doesn't start
- Check Python is installed: `python3 --version`
- Install requirements: `pip install -r backend/requirements.txt`
- Check port 5001 is not in use: `lsof -i :5001`

### Frontend blank screen
- Ensure frontend built: `cd frontend && npm run build`
- Check console for errors: DevTools → Console

### App won't open on macOS
- Right-click app → Open (bypass Gatekeeper)
- Or: System Preferences → Security & Privacy → Allow

---

For more help, see the full documentation in `docs/`.
