import { User } from '@supabase/supabase-js';
import { mapSupabaseUser, AuthUser } from '@/contexts/AuthContext';
import { normalizeTenantSlug } from '@/lib/rbac';
import { supabase } from './supabase';

class AuthService {
  mapUser(user: User): AuthUser {
    return mapSupabaseUser(user);
  }

  async sendOtp(email: string, tenantSlug: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          tenant_slug: normalizeTenantSlug(tenantSlug, email),
          role: 'member',
          must_reset_password: false,
        },
      },
    });

    if (error) throw error;
  }

  async verifyOtpAndSetPassword(
    email: string,
    token: string,
    password: string,
    username?: string,
    tenantSlug?: string,
  ) {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) throw error;

    const finalUsername = username || email.split('@')[0];
    const finalTenantSlug = normalizeTenantSlug(tenantSlug, email);

    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password,
      data: {
        username: finalUsername,
        tenant_slug: finalTenantSlug,
        role: 'member',
        must_reset_password: false,
      },
    });

    if (updateError) throw updateError;
    return updateData.user;
  }

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  }

  async completeForcedPasswordReset(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
      data: {
        must_reset_password: false,
        password_changed_at: new Date().toISOString(),
      },
    });

    if (error) throw error;
    return data.user;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}

export const authService = new AuthService();
