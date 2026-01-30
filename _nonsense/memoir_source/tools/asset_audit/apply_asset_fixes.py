import os
import json
import shutil
import sys

ROOT_DIR = os.getcwd()
AUDIT_JSON = os.path.join(ROOT_DIR, 'asset-audit', 'asset_audit.json')

def update_references(refs, old_path_rel, new_path_rel):
    """
    Update references in code files.
    old_path_rel: relative path of asset from ROOT
    new_path_rel: relative path of asset from ROOT
    """
    for ref in refs:
        file_path = os.path.join(ROOT_DIR, ref['file'])
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Calculate what the import string LOOKS like currently
            # We need to find the relative path from the referencing file to the old asset
            
            ref_dir = os.path.dirname(os.path.abspath(file_path))
            old_abs = os.path.abspath(os.path.join(ROOT_DIR, old_path_rel))
            new_abs = os.path.abspath(os.path.join(ROOT_DIR, new_path_rel))
            
            rel_old = os.path.relpath(old_abs, ref_dir)
            rel_new = os.path.relpath(new_abs, ref_dir)
            
            # Normalize to POSIX style for JS/TS/CSS
            rel_old_str = rel_old.replace(os.sep, '/')
            rel_new_str = rel_new.replace(os.sep, '/')
            
            if not rel_old_str.startswith('.'):
                rel_old_str = './' + rel_old_str
            if not rel_new_str.startswith('.'):
                rel_new_str = './' + rel_new_str
                
            # Replace
            if rel_old_str in content:
                new_content = content.replace(rel_old_str, rel_new_str)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"  [UPDATED] {ref['file']}: {rel_old_str} -> {rel_new_str}")
            else:
                # Fallback: sometimes imports are slightly different (e.g. no ./ for peer dirs?)
                # Try raw filename if unique? No, unsafe.
                # Try without ./ prefix
                rel_old_raw = rel_old_str.lstrip('./')
                 # But valid imports usually require ./ or ../
                print(f"  [WARNING] Could not find import string '{rel_old_str}' in {ref['file']}")

        except Exception as e:
            print(f"  [ERROR] Failed to update {ref['file']}: {e}")

def apply_fixes():
    with open(AUDIT_JSON) as f:
        audit = json.load(f)
        
    for item in audit:
        action = item['action']
        curr = item['current_path']
        prop = item['proposed_path']
        
        if action == "REMOVE":
            full_path = os.path.join(ROOT_DIR, curr)
            if os.path.exists(full_path):
                os.remove(full_path)
                print(f"REMOVED: {curr}")
            else:
                print(f"SKIP: {curr} not found")
                
        elif action == "MOVE":
            src = os.path.join(ROOT_DIR, curr)
            dst = os.path.join(ROOT_DIR, prop)
            
            if not os.path.exists(src):
                print(f"SKIP: {curr} not found")
                continue
                
            if src == dst:
                continue

            print(f"MOVING: {curr} -> {prop}")
            
            # Create dst dir
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            
            # Update references
            if item['references']:
                update_references(item['references'], curr, prop)
            
            # Move file
            shutil.move(src, dst)

if __name__ == "__main__":
    if "--force" in sys.argv:
        apply_fixes()
    else:
        print("Dry run complete (implied). Use --force to execute.")
