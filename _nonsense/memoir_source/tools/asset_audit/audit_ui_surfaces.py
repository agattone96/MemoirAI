import os
import json
import re

ROOT_DIR = os.getcwd()
APP_TSX = os.path.join(ROOT_DIR, 'frontend/src/App.tsx')
PAGES_DIR = os.path.join(ROOT_DIR, 'frontend/src/pages')
COMPONENTS_DIR = os.path.join(ROOT_DIR, 'frontend/src/components')
OUTPUT_FILE = os.path.join(ROOT_DIR, 'asset-audit', 'ui_surface_map.json')

def scan_routes():
    routes = []
    try:
        with open(APP_TSX, 'r') as f:
            content = f.read()
            # Simple regex for Route path
            matches = re.findall(r'<Route\s+path="([^"]+)"\s+element=\{<([^/]+)\s*/>\}', content)
            for path, element in matches:
                routes.append({
                    "path": path,
                    "component": element.strip(),
                    "type": "Screen"
                })
    except:
        pass
    return routes

def scan_dir(directory, type_name):
    items = []
    if os.path.exists(directory):
        for f in os.listdir(directory):
            if f.endswith('.tsx') or f.endswith('.jsx'):
                items.append({
                    "name": f.split('.')[0],
                    "path": os.path.relpath(os.path.join(directory, f), ROOT_DIR),
                    "type": type_name
                })
    return items

def main():
    surfaces = {
        "routes": scan_routes(),
        "pages": scan_dir(PAGES_DIR, "Page"),
        "components": scan_dir(COMPONENTS_DIR, "Component")
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(surfaces, f, indent=2)
    print(f"Saved UI map to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
