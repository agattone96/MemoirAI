import os
import sys
from pathlib import Path

class PathManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PathManager, cls).__new__(cls)
            cls._instance._init_paths()
        return cls._instance

    def _init_paths(self):
        # Determine User Data Directory
        # macOS: ~/Library/Application Support/MemoirAI
        # others: ~/.memoirai (fallback)
        
        home = Path.home()
        if sys.platform == "darwin":
            self.base_dir = home / "Library" / "Application Support" / "MemoirAI"
        else:
            self.base_dir = home / ".memoirai"
            
        # Vault Directory (User Data Store)
        self.vault_dir = self.base_dir / "Vault"
            
        # Define Subdirectories within Vault
        self.db_path = self.vault_dir / "memoir.db"  # Renamed from autobiography.db to match typical conventions or keep as is? Manifesto says memoir.db in architecture diagram. Code had autobiography.db. Manifesto Schema section says 'memoir.db'. I will switch to memoir.db to match Manifesto.
        self.media_dir = self.vault_dir / "media"
        self.chroma_dir = self.vault_dir / "chroma_db"
        
        # System/Temp dirs (keep outside Vault if purely internal? Manifesto says "File Storage: Vault/ directory structure". Let's put everything in Vault for simplicity and sovereignty)
        self.upload_dir = self.base_dir / "uploads" # Uploads are temporary
        self.dlq_path = self.base_dir / "dlq.jsonl" # Logs/System
        self.settings_path = self.base_dir / "settings.json" # Config
        
        # Ensure directories exist
        for p in [self.base_dir, self.vault_dir, self.upload_dir, self.media_dir, self.chroma_dir]:
            p.mkdir(parents=True, exist_ok=True)
            
        self._migrate_legacy_layout()

    def _migrate_legacy_layout(self):
        """Migrate files from v1 layout (root) to v2 layout (Vault)."""
        import shutil
        
        # 1. Database: autobiography.db -> Vault/memoir.db
        old_db = self.base_dir / "autobiography.db"
        if old_db.exists() and not self.db_path.exists():
            try:
                print(f"Migrating DB: {old_db} -> {self.db_path}")
                os.rename(old_db, self.db_path)
            except Exception as e:
                print(f"DB Migration Failed: {e}")

        # 2. Media: media/ -> Vault/media/
        old_media = self.base_dir / "media"
        if old_media.exists() and old_media.is_dir():
            # If new media dir is empty, move old one's content or the dir itself?
            # self.media_dir already created by mkdir above.
            # Let's move content.
            try:
                for item in old_media.iterdir():
                    target = self.media_dir / item.name
                    if not target.exists():
                        shutil.move(str(item), str(target))
                # Cleanup old dir if empty
                try:
                    old_media.rmdir()
                except:
                    pass
            except Exception as e:
                print(f"Media Migration Failed: {e}")

        # 3. Chroma: chroma_db/ -> Vault/chroma_db/
        old_chroma = self.base_dir / "chroma_db"
        if old_chroma.exists() and old_chroma.is_dir():
             try:
                # If new dir exists (created by mkdir), we might need to be careful.
                # Simplest: if new dir is empty, rmdir it and move old one.
                if not any(self.chroma_dir.iterdir()):
                    self.chroma_dir.rmdir()
                    shutil.move(str(old_chroma), str(self.chroma_dir))
                else:
                    # Merge? No, too risky. Just move contents if target not conflict.
                    for item in old_chroma.iterdir():
                        target = self.chroma_dir / item.name
                        if not target.exists():
                            shutil.move(str(item), str(target))
                    try:
                        old_chroma.rmdir()
                    except:
                        pass
             except Exception as e:
                print(f"Chroma Migration Failed: {e}")

            
    @property
    def database_path(self):
        return str(self.db_path)
    
    @property
    def vault_path(self):
        return str(self.vault_dir)

    @property
    def uploads_path(self):
        return str(self.upload_dir)

    @property
    def media_path(self):
        return str(self.media_dir)

    @property
    def chroma_path(self):
        return str(self.chroma_dir)

    @property
    def dlq_file(self):
        return str(self.dlq_path)
        
    @property
    def settings_file(self):
        return str(self.settings_path)

# Global Instance
path_manager = PathManager()
