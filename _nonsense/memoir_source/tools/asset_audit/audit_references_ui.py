import os
import json

ROOT_DIR = os.getcwd()
INVENTORY_FILE = os.path.join(ROOT_DIR, 'asset-audit', 'media_icon_inventory.json')
OUTPUT_FILE = os.path.join(ROOT_DIR, 'asset-audit', 'media_icon_usage_map.json')

SEARCH_DIRS = ['frontend/src', 'frontend/public', 'desktop']

def get_ui_context(filepath):
    # Infer UI surface from filepath
    path = filepath.lower()
    if 'pages/' in path:
        # e.g. frontend/src/pages/LoginPage.tsx -> LoginPage
        parts = path.split('pages/')
        if len(parts) > 1:
            return parts[1].split('.')[0] + " Screen"
    if 'components/' in path:
        parts = path.split('components/')
        if len(parts) > 1:
            return parts[1].split('.')[0] + " Component"
    if 'desktop/' in path:
        return "Desktop/System Tray"
    if 'index.html' in path:
        return "App Entry / Global"
    if 'manifest.json' in path:
        return "PWA Manifest"
    if 'app.tsx' in path:
        return "App Router / Layout"
    return "Unknown Context"

def scan_references():
    with open(INVENTORY_FILE) as f:
        inventory = json.load(f)
        
    usage_map = {}
    
    # Init map
    for item in inventory:
        usage_map[item['path']] = {
            "references": [],
            "used_in_ui": set()
        }

    for search_dir in SEARCH_DIRS:
        full_path = os.path.join(ROOT_DIR, search_dir)
        if not os.path.exists(full_path): continue
        
        for root, dirs, files in os.walk(full_path):
            if 'node_modules' in dirs: dirs.remove('node_modules')
            
            for file in files:
                filepath = os.path.join(root, file)
                rel_path = os.path.relpath(filepath, ROOT_DIR)
                
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                        
                    for i, line in enumerate(lines):
                        for item in inventory:
                            asset_path = item['path']
                            basename = os.path.basename(asset_path)
                            
                            # Heuristic matching
                            # 1. Exact path match
                            # 2. Basename match (common in imports like "import logo from ...")
                            # But be careful of false positives.
                            
                            match = False
                            if asset_path in line:
                                match = True
                            elif basename in line:
                                # Start verification
                                # If it's code, look for import ... from '...basename...'
                                if 'import' in line or 'require' in line or 'url(' in line:
                                    match = True
                                elif '"' in line or "'" in line: # string literal
                                    match = True
                            
                            if match:
                                context = get_ui_context(rel_path)
                                usage_map[asset_path]['references'].append({
                                    "file": rel_path,
                                    "line": i+1,
                                    "snippet": line.strip()[:100],
                                    "context_guess": context
                                })
                                usage_map[asset_path]['used_in_ui'].add(context)
                                
                except Exception as e:
                    pass

    # Convert sets to lists
    for k, v in usage_map.items():
        v['used_in_ui'] = list(v['used_in_ui'])
        
    return usage_map

if __name__ == "__main__":
    print("Scanning references...")
    data = scan_references()
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Saved usage map to {OUTPUT_FILE}")
