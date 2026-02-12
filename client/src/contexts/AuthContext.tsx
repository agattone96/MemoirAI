import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  Permission,
  permissionsForRole,
  normalizeRole,
  normalizeTenantSlug,
  hasPermission,
  UserRole,
} from '@/lib/rbac';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  tenantSlug: string;
  role: UserRole;
  permissions: Permission[];
  mustResetPassword: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function mapSupabaseUser(user: User): AuthUser {
  const email = user.email ?? '';
  const username = user.user_metadata?.username || email.split('@')[0] || 'member';
  const tenantSlug = normalizeTenantSlug(
    (user.app_metadata?.tenant_slug as string | undefined) ||
      (user.user_metadata?.tenant_slug as string | undefined),
    email,
  );

  const role = normalizeRole(
    (user.app_metadata?.role as string | undefined) ||
      (user.user_metadata?.role as string | undefined),
  );
  const mustResetPassword = Boolean(
    user.app_metadata?.must_reset_password || user.user_metadata?.must_reset_password,
  );

  return {
    id: user.id,
    email,
    username,
    tenantSlug,
    role,
    permissions: permissionsForRole(role),
    mustResetPassword,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(mapSupabaseUser(session.user));
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session?.user) {
        setUser(mapSupabaseUser(session.user));
      }
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') &&
        session?.user
      ) {
        setUser(mapSupabaseUser(session.user));
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = (authUser: AuthUser) => {
    setUser(authUser);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const can = (permission: Permission) => {
    if (!user) return false;
    return hasPermission(user.permissions, permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
