import os
import json
import hashlib

ROOT_DIR = os.getcwd()
OUTPUT_FILE = os.path.join(ROOT_DIR, 'asset-audit', 'asset_inventory.json')

# Strict scope - only these types
IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif'}
ICON_EXTS = {'.ico', '.icns'}
MEDIA_EXTS = {'.mp4', '.mov', '.webm', '.mp3', '.wav', '.m4a', '.aac', '.ogg'}

ALL_EXTS = IMAGE_EXTS | ICON_EXTS | MEDIA_EXTS

EXCLUDE_DIRS = {
    'node_modules', '.git', 'dist', 'venv', '__pycache__', '.gemini', 'archive',
    'temp_uploads', '.DS_Store', 'coverage', 'dist_electron', 'release', 'build'
}

# Special rule: allow 'desktop/build' but exclude root 'build' or other builds
# We will inspect path strictly.

def get_file_hash(filepath):
    hasher = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            while chunk := f.read(8192):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as e:
        return f"ERROR: {e}"

def is_excluded(path_parts):
    # Strict exclusion of directories
    for part in path_parts:
        if part in EXCLUDE_DIRS:
            # Exception: if part is 'build' but parent is 'desktop', allow
            if part == 'build':
                # Reconstruct path check
                # Find index of 'build'
                # If preceding part is 'desktop', then it's OK.
                # However, this loop checks parts individually.
                pass
            else:
               return True
    
    # Check full relative path for exceptions
    rel_path_str = os.path.join(*path_parts)
    if 'desktop/build' in rel_path_str:
        return False
        
    # If build is present and NOT desktop/build, exclude
    if 'build' in path_parts:
        return True
        
    return False

def scan_assets():
    inventory = []
    
    for root, dirs, files in os.walk(ROOT_DIR):
        # Modify dirs in-place to skip obvious exclusions for performance
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS or d == 'build']
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in ALL_EXTS:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, ROOT_DIR)
                
                parts = rel_path.split(os.sep)
                if is_excluded(parts):
                    # One last check for desktop/build
                    if not rel_path.startswith('desktop/build'):
                         continue

                size = os.path.getsize(full_path)
                file_hash = get_file_hash(full_path)
                
                inventory.append({
                    "path": rel_path,
                    "ext": ext,
                    "size": size,
                    "hash": file_hash,
                    "mtime": os.path.getmtime(full_path)
                })
    
    return inventory

if __name__ == "__main__":
    print(f"Scanning {ROOT_DIR} for Images/Icons/Media...")
    assets = scan_assets()
    print(f"Found {len(assets)} assets.")
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(assets, f, indent=2)
    print(f"Saved to {OUTPUT_FILE}")
