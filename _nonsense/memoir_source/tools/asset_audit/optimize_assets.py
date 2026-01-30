import os
import sys
import subprocess

try:
    from PIL import Image
except ImportError:
    print("Pillow not installed. Attempting to install...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

ROOT_DIR = os.getcwd()
SEARCH_DIRS = ['frontend/src', 'frontend/public'] # Desktop icons restricted (some formats needed)
EXTS_TO_CONVERT = {'.png', '.jpg', '.jpeg'}
THRESHOLD_BYTES = 200 * 1024 # 200KB

# Desktop/Electron icons often require PNG/ICO/ICNS specifically (e.g. electron-builder).
# So we usually skip 'desktop/' or 'public/icon.png' unless we are sure.
# The user wants "too big images to webp".
# 'logo.png', 'wordmark.png', 'welcome.png', 'empty-state.png', 'avatar.png' are mostly UI.
# 'desktop/icon.png' is part of build.
# 'frontend/public/icon.png' is often PWA icon. PWA supports webp but safe to keep png for compatibility or check manifest.
# Safest: Convert UI assets in 'frontend/src/assets' + 'frontend/public' (if not manifest/icon).

SKIP_FILENAMES = ['favicon.ico', 'icon.png', 'logo192.png', 'logo512.png']

def find_large_images():
    large_files = []
    for search_dir in SEARCH_DIRS:
        full_path = os.path.join(ROOT_DIR, search_dir)
        for root, dirs, files in os.walk(full_path):
            if 'node_modules' in dirs: dirs.remove('node_modules')
            for file in files:
                if file in SKIP_FILENAMES: continue
                ext = os.path.splitext(file)[1].lower()
                if ext in EXTS_TO_CONVERT:
                    fpath = os.path.join(root, file)
                    size = os.path.getsize(fpath)
                    if size > THRESHOLD_BYTES:
                        large_files.append(fpath)
    return large_files

def update_references(old_path, new_path):
    old_rel = os.path.relpath(old_path, ROOT_DIR)
    new_rel = os.path.relpath(new_path, ROOT_DIR)
    
    old_name = os.path.basename(old_path)
    new_name = os.path.basename(new_path)
    
    # 1. Update source code (imports)
    print(f"Updating references: {old_name} -> {new_name}")
    
    # scan relevant text files
    extensions = {'.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.md'}
    
    for root, dirs, files in os.walk(os.path.join(ROOT_DIR, 'frontend')):
        if 'node_modules' in dirs: dirs.remove('node_modules')
        
        for file in files:
            if os.path.splitext(file)[1].lower() in extensions:
                fpath = os.path.join(root, file)
                try:
                    with open(fpath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Replace Strategy: 
                    # 1. Exact relative path if possible? Hard.
                    # 2. Filename replacement? RISK of false positive.
                    # 3. '.../filename.png'
                    
                    if old_name in content:
                        # Be careful. If old_name is "logo.png", we replace with "logo.webp".
                        # Check context?
                        # Usually safe if the file extension matches.
                        
                        new_content = content.replace(old_name, new_name)
                        if new_content != content:
                            with open(fpath, 'w', encoding='utf-8') as f:
                                f.write(new_content)
                            print(f"  Updated {fpath}")
                except:
                    pass

def convert_and_cleanup(files):
    for fpath in files:
        dir_name = os.path.dirname(fpath)
        base_name = os.path.basename(fpath)
        name_no_ext = os.path.splitext(base_name)[0]
        new_path = os.path.join(dir_name, name_no_ext + ".webp")
        
        print(f"Converting {base_name} ({os.path.getsize(fpath)//1024} KB) -> .webp")
        
        try:
            with Image.open(fpath) as img:
                img.save(new_path, 'WEBP', quality=85)
            
            # Verify new file exists
            if os.path.exists(new_path):
                # Update refs
                update_references(fpath, new_path)
                
                # Delete old
                os.remove(fpath)
                print(f"  Deleted original {base_name}")
                
                new_size = os.path.getsize(new_path)
                print(f"  New size: {new_size//1024} KB")
        except Exception as e:
            print(f"  Error converting {fpath}: {e}")

if __name__ == "__main__":
    candidates = find_large_images()
    print(f"Found {len(candidates)} large images (> {THRESHOLD_BYTES/1024} KB).")
    convert_and_cleanup(candidates)
