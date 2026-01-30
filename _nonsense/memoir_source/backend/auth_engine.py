"""
Authentication module for local user management.
Handles signup, login, session management with bcrypt password hashing.
"""

import bcrypt
import secrets
from datetime import datetime, timedelta
from db import get_db

class AuthEngine:
    def __init__(self):
        self.session_duration = timedelta(days=30)  # 30 days for "remember me"
        
    def create_user(self, full_name, email, password):
        """
        Create a new user account.
        Returns: (user_id, session_token) or raises exception
        """
        conn = get_db()
        
        # Check if email already exists
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email.lower(),)).fetchone()
        if existing:
            conn.close()
            raise ValueError("Email already registered")
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user
        user_id = f"USER_{secrets.token_hex(8)}"
        conn.execute("""
            INSERT INTO users (id, full_name, email, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, full_name, email.lower(), password_hash, datetime.utcnow().isoformat()))
        
        # Create session
        session_token = self._create_session(conn, user_id)
        
        conn.commit()
        conn.close()
        
        print(f"[Auth] Created user {user_id} ({email})")
        return user_id, session_token
    
    def login(self, email, password, remember=False):
        """
        Authenticate user and create session.
        Returns: (user_id, session_token) or raises exception
        """
        conn = get_db()
        
        # Find user
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
        if not user:
            conn.close()
            raise ValueError("Invalid email or password")
        
        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            conn.close()
            raise ValueError("Invalid email or password")
        
        # Create session
        session_token = self._create_session(conn, user['id'], remember)
        
        # Update last login
        conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?",
                    (datetime.utcnow().isoformat(), user['id']))
        
        conn.commit()
        conn.close()
        
        print(f"[Auth] User {user['id']} logged in")
        return user['id'], session_token
    
    def _create_session(self, conn, user_id, remember=False):
        """Create a new session token."""
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + (self.session_duration if remember else timedelta(days=7))
        
        conn.execute("""
            INSERT INTO sessions (token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
        """, (session_token, user_id, expires_at.isoformat(), datetime.utcnow().isoformat()))
        
        return session_token
    
    def verify_session(self, session_token):
        """
        Verify session token and return user_id.
        Returns: user_id or None if invalid
        """
        conn = get_db()
        
        session = conn.execute("""
            SELECT user_id, expires_at FROM sessions 
            WHERE token = ? AND expires_at > ?
        """, (session_token, datetime.utcnow().isoformat())).fetchone()
        
        conn.close()
        
        if session:
            return session['user_id']
        return None
    
    def logout(self, session_token):
        """Invalidate a session token."""
        conn = get_db()
        conn.execute("DELETE FROM sessions WHERE token = ?", (session_token,))
        conn.commit()
        conn.close()
        print(f"[Auth] Session terminated")
    
    def get_user(self, user_id):
        """Get user information."""
        conn = get_db()
        user = conn.execute("""
            SELECT id, full_name, email, created_at, last_login_at
            FROM users WHERE id = ?
        """, (user_id,)).fetchone()
        conn.close()
        
        return dict(user) if user else None


# Global instance
auth_engine = AuthEngine()
