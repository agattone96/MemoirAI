import os
import json
import csv

ROOT_DIR = os.getcwd()
INVENTORY_FILE = os.path.join(ROOT_DIR, 'asset-audit', 'asset_inventory.json')
REFERENCES_FILE = os.path.join(ROOT_DIR, 'asset-audit', 'asset_references.json')
OUTPUT_JSON = os.path.join(ROOT_DIR, 'asset-audit', 'asset_audit.json')
OUTPUT_CSV = os.path.join(ROOT_DIR, 'asset-audit', 'asset_moves.csv')

# Canonical Rules
SRC_ASSETS_ROOT = "frontend/src/assets"
PUBLIC_ROOT = "frontend/public"

CANONICAL_DIRS = {
    'images': f"{SRC_ASSETS_ROOT}/images",
    'icons': f"{SRC_ASSETS_ROOT}/icons",
    'media': f"{SRC_ASSETS_ROOT}/media"
}

# Extension map
TYPE_MAP = {
    '.png': 'images', '.jpg': 'images', '.jpeg': 'images', '.webp': 'images', '.gif': 'images', '.avif': 'images',
    '.svg': 'icons', '.ico': 'icons', '.icns': 'icons',
    '.mp4': 'media', '.mov': 'media', '.webm': 'media', '.mp3': 'media', '.wav': 'media'
}

# Platform Critical (Do not move)
CRITICAL_PATHS = {
    'frontend/public/favicon.ico',
    'frontend/public/manifest.json',
    'desktop/build/icon.icns',
    'desktop/build/icon.ico',
    'desktop/icon.png',
    'desktop/build/icon.png',
    'frontend/public/logo192.png',
    'frontend/public/logo512.png' 
    # ^ We know these are used by manifest, so treat as critical if references found or default
}

def analyze():
    with open(INVENTORY_FILE) as f:
        inventory = json.load(f)
    with open(REFERENCES_FILE) as f:
        references = json.load(f)

    audit_results = []
    moves = []

    for item in inventory:
        path = item['path']
        ext = item['ext']
        refs = references.get(path, [])
        
        action = "KEEP"
        proposed = path
        reason = "Correct location"
        risk = "LOW"
        
        # 1. Unused?
        if not refs:
            # Check implicit criticals
            if path in CRITICAL_PATHS or any(c in path for c in ['favicon', 'manifest', 'desktop/build']):
                 action = "KEEP"
                 reason = "Platform critical (implicit)"
                 risk = "HIGH"
            else:
                action = "REMOVE"
                proposed = None
                reason = "No references found"
        
        # 2. Misplaced?
        elif action == "KEEP":
            # Is it in desktop?
            if path.startswith("desktop/"):
                # Desktop assets stay in desktop
                pass
            
            # Is it in public?
            elif path.startswith("frontend/public/"):
                # If referenced by Source Code (src imports), it's misplaced (Conceptual rule)
                # But if referenced by index.html or manifest, it is web-static.
                
                src_refs = [r for r in refs if r['file'].startswith('frontend/src')]
                static_refs = [r for r in refs if not r['file'].startswith('frontend/src')]
                
                if src_refs and not static_refs:
                    # Purely imported -> Move to src/assets
                    asset_type = TYPE_MAP.get(ext, 'images')
                    proposed = f"{CANONICAL_DIRS[asset_type]}/{os.path.basename(path)}"
                    action = "MOVE"
                    reason = "Imported asset should be in src/assets"
                    
            # Is it in src/assets?
            elif path.startswith("frontend/src/assets/"):
                # Check subdirectory
                asset_type = TYPE_MAP.get(ext, 'images')
                canonical = CANONICAL_DIRS[asset_type]
                
                # Check generic "brand" folder exception? 
                # The user "canonical rules" say: src/assets/images, src/assets/icons
                # Current repo has 'brand', 'illustrations', 'onboarding', 'placeholders'.
                # Strict rule says: src/assets/images or src/assets/icons.
                # Use strict rule.
                
                if not path.startswith(canonical):
                    proposed = f"{canonical}/{os.path.basename(path)}"
                    action = "MOVE"
                    reason = f"Normalize to strict category: {asset_type}"

            # Is it elsewhere in src?
            elif path.startswith("frontend/src/"):
                asset_type = TYPE_MAP.get(ext, 'images')
                proposed = f"{CANONICAL_DIRS[asset_type]}/{os.path.basename(path)}"
                action = "MOVE"
                reason = "Asset scatter in src"

        item_out = {
            "asset": path,
            "current_path": path,
            "proposed_path": proposed,
            "action": action,
            "references": refs,
            "rationale": reason,
            "risk_level": risk,
            "bytes": item['size'],
            "hash": item['hash']
        }
        
        audit_results.append(item_out)
        if action in ["MOVE", "REMOVE"]:
            moves.append([action, path, proposed, len(refs), risk, reason])

    with open(OUTPUT_JSON, 'w') as f:
        json.dump(audit_results, f, indent=2)
        
    with open(OUTPUT_CSV, 'w') as f:
        writer = csv.writer(f)
        writer.writerow(['action', 'current_path', 'proposed_path', 'ref_count', 'risk', 'reason'])
        writer.writerows(moves)
        
    print(f"Decision matrix complete. See {OUTPUT_CSV}")

if __name__ == "__main__":
    analyze()
