import json
import os
from path_manager import path_manager

class SettingsEngine:
    def __init__(self):
        self.settings_path = path_manager.settings_file
        self._ensure_file()
        
    def _ensure_file(self):
        if not os.path.exists(self.settings_path):
            with open(self.settings_path, 'w') as f:
                json.dump({}, f)
            os.chmod(self.settings_path, 0o600)
                
    def _read(self):
        try:
            with open(self.settings_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}
            
    def _write(self, data):
        with open(self.settings_path, 'w') as f:
            json.dump(data, f, indent=2)
        os.chmod(self.settings_path, 0o600)

    def get(self, key, default=None):
        data = self._read()
        return data.get(key, default)
        
    def set(self, key, value):
        data = self._read()
        data[key] = value
        self._write(data)

    def set_all(self, updates: dict):
        data = self._read()
        data.update(updates)
        self._write(data)

    def get_all(self):
        return self._read()

    def reset_database(self, db_path):
        """
        Danger Zone: Deletes the SQLite database file to reset application state.
        The caller is responsible for re-initializing the schema if needed.
        """
        if os.path.exists(db_path):
            os.remove(db_path)
            # Also remove WAL/SHM files if they exist
            if os.path.exists(db_path + '-wal'):
                os.remove(db_path + '-wal')
            if os.path.exists(db_path + '-shm'):
                os.remove(db_path + '-shm')
        return True

    def export_data(self, base_dir, output_path=None):
        """
        Creates a ZIP archive of the entire application data directory (DB + Media).
        Returns the path to the zip file.
        """
        import shutil
        import datetime
        
        if not output_path:
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"memoir_backup_{timestamp}"
            # Save to temporary location or downloads? 
            # Ideally we stream it, but for simplicity let's zip to a temp folder then serve.
            # actually shutil.make_archive creates the file.
            
            # Let's put the zip in the parent of base_dir or a exports folder to avoid recursive zipping if inside.
            # Ensure exports directory exists
            exports_dir = os.path.join(base_dir, 'exports')
            os.makedirs(exports_dir, exist_ok=True)
            
            output_path = os.path.join(exports_dir, output_filename)

        # Create zip
        # root_dir is the directory to be zipped (base_dir)
        # We need to exclude the 'exports' folder itself to prevent loops if it's inside base_dir!
        # shutil.make_archive doesn't easily exclude. 
        # Better approach: Zip specific subfolders (media) and the .db file.
        
        # However, for Phase 1 MVP, assuming base_dir = ~/Library/Application Support/MemoirAI
        # We want to export that.
        # Safe bet: Write zip to /tmp/ then move or serve.
        
        import tempfile
        temp_dir = tempfile.gettempdir()
        archive_name = os.path.join(temp_dir, f"memoir_export_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}")
        
        shutil.make_archive(archive_name, 'zip', base_dir)
        return archive_name + '.zip'

