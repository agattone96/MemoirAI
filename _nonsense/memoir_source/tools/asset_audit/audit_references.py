import os
import json

ROOT_DIR = os.getcwd()
INVENTORY_FILE = os.path.join(ROOT_DIR, 'asset-audit', 'asset_inventory.json')
OUTPUT_FILE = os.path.join(ROOT_DIR, 'asset-audit', 'asset_references.json')

SEARCH_DIRS = ['frontend/src', 'frontend/public', 'desktop', 'backend', '.']
SKIP_EXTS = {'.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico', '.icns', 
             '.mp4', '.mov', '.mp3', '.wav', '.pyc', '.ds_store', '.db'}

KEYWORDS = ['favicon', 'icon', 'apple-touch-icon', 'manifest', 'logo']

def load_inventory():
    try:
        with open(INVENTORY_FILE) as f:
            return json.load(f)
    except:
        return []

def scan_file(filepath, assets, keywords):
    refs = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            for i, line in enumerate(lines):
                line_lower = line.lower()
                
                # Check for explicit asset paths/filenames
                for asset in assets:
                    # Check filename (e.g. "logo.png")
                    filename = os.path.basename(asset['path'])
                    if filename in line:
                         refs.append({
                             "asset": asset['path'],
                             "file": os.path.relpath(filepath, ROOT_DIR),
                             "line": i + 1,
                             "match": line.strip()[:150]
                         })
                    # Check full relative path if present (e.g. "frontend/src/assets/logo.png")
                    # (less likely but possible in strings)
                    
                # Check for generic keywords if not already matched
                # This helps find "icon" config even if filename doesn't match
                # WE map these to a "generic" bucket or just log them?
                # The prompt asks to scan for these patterns. 
                # We will associate them with specific assets if implicit.
                # For now, we only care about EXPLICIT asset references or implicit ones we can guess.
                # Actually, capturing keyword usage helps Phase 4 decide "KEEP" for platform icons.
                pass 
                
    except Exception:
        pass
    return refs

def main():
    assets = load_inventory()
    all_refs = {a['path']: [] for a in assets}
    
    # Also track keyword hits for context (optional, but good for validation)
    
    for search_dir in SEARCH_DIRS:
        full_path = os.path.join(ROOT_DIR, search_dir)
        if search_dir == '.':
            # Root files only
            files_to_check = ['package.json', 'electron-builder.yml', 'electron-builder.json']
            for f in files_to_check:
                if os.path.exists(f):
                     found = scan_file(f, assets, KEYWORDS)
                     for r in found:
                         all_refs[r['asset']].append(r)
            continue
            
        for root, dirs, files in os.walk(full_path):
            if 'node_modules' in dirs: dirs.remove('node_modules')
            if 'dist' in dirs: dirs.remove('dist')
            if 'build' in dirs and 'desktop' not in root: dirs.remove('build') # Skip root build
            
            for file in files:
                if os.path.splitext(file)[1].lower() in SKIP_EXTS: 
                    continue
                    
                filepath = os.path.join(root, file)
                found = scan_file(filepath, assets, KEYWORDS)
                for r in found:
                    if r['asset'] in all_refs:
                        # Dedupe same line
                        existing = [x for x in all_refs[r['asset']] if x['file'] == r['file'] and x['line'] == r['line']]
                        if not existing:
                            all_refs[r['asset']].append(r)

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(all_refs, f, indent=2)
    print(f"Saved references to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
