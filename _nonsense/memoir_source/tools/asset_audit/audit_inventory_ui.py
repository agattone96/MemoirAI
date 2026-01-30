import os
import json
import hashlib

ROOT_DIR = os.getcwd()
OUTPUT_FILE = os.path.join(ROOT_DIR, 'asset-audit', 'media_icon_inventory.json')

SCOPED_EXTS = {
    'images': {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif'},
    'icons': {'.ico', '.icns'},
    'media': {'.mp4', '.mov', '.webm', '.mp3', '.wav', '.m4a', '.aac', '.ogg'}
}
ALL_EXTS = set().union(*SCOPED_EXTS.values())

EXCLUDE_DIRS = {
    'node_modules', '.git', 'dist', 'venv', '__pycache__', '.gemini', 'archive',
    'temp_uploads', '.DS_Store', 'coverage', 'dist_electron', 'release', 'build'
}

def get_file_hash(filepath):
    hasher = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            while chunk := f.read(8192):
                hasher.update(chunk)
        return hasher.hexdigest()
    except:
        return ""

def guess_role(path, ext):
    name = os.path.basename(path).lower()
    path_lower = path.lower()
    
    if ext in SCOPED_EXTS['icons'] or 'icon' in name or 'favicon' in name:
        return 'icon'
    if 'logo' in name or 'wordmark' in name:
        return 'logo'
    if 'hero' in name or 'cover' in name:
        return 'hero'
    if 'background' in name or 'bg-' in name:
        return 'background'
    if 'avatar' in name or 'user' in name:
        return 'avatar'
    if 'onboarding' in path_lower or 'welcome' in name:
        return 'onboarding_art'
    if 'empty' in name or 'placeholder' in name:
        return 'empty_state'
    if ext in SCOPED_EXTS['media']:
        return 'media'
    
    return 'ui_image'

def scan_assets():
    inventory = []
    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in ALL_EXTS:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, ROOT_DIR)
                
                # Exclude hidden files or dot-files if strict
                if file.startswith('.'): continue

                ftype = "image"
                if ext in SCOPED_EXTS['icons']: ftype = "icon"
                if ext in SCOPED_EXTS['media']: ftype = "media"

                size = os.path.getsize(full_path)
                file_hash = get_file_hash(full_path)
                role = guess_role(rel_path, ext)
                
                inventory.append({
                    "path": rel_path,
                    "type": ftype,
                    "bytes": size,
                    "hash": file_hash,
                    "suspected_role": role,
                    "notes": ""
                })
    return inventory

if __name__ == "__main__":
    print("Scanning inventory...")
    data = scan_assets()
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Saved {len(data)} items to {OUTPUT_FILE}")
