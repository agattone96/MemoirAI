export type UserRole = 'member' | 'tenant_admin' | 'super_admin';

export type Permission =
  | 'timeline:read'
  | 'timeline:write'
  | 'contacts:read'
  | 'contacts:analyze'
  | 'ai:generate'
  | 'ingestion:run'
  | 'tenant:manage'
  | 'users:create'
  | 'users:manage_roles'
  | 'users:force_password_reset'
  | 'platform:manage';

const rolePermissions: Record<UserRole, Permission[]> = {
  member: ['timeline:read', 'timeline:write', 'contacts:read', 'contacts:analyze', 'ai:generate', 'ingestion:run'],
  tenant_admin: [
    'timeline:read',
    'timeline:write',
    'contacts:read',
    'contacts:analyze',
    'ai:generate',
    'ingestion:run',
    'tenant:manage',
    'users:create',
    'users:manage_roles',
    'users:force_password_reset',
  ],
  super_admin: [
    'timeline:read',
    'timeline:write',
    'contacts:read',
    'contacts:analyze',
    'ai:generate',
    'ingestion:run',
    'tenant:manage',
    'users:create',
    'users:manage_roles',
    'users:force_password_reset',
    'platform:manage',
  ],
};

export function normalizeRole(role: string | undefined): UserRole {
  if (role === 'super_admin' || role === 'tenant_admin') {
    return role;
  }
  return 'member';
}

export function permissionsForRole(role: UserRole): Permission[] {
  return rolePermissions[role] ?? rolePermissions.member;
}

export function hasPermission(permissions: Permission[], permission: Permission): boolean {
  return permissions.includes(permission);
}

export function normalizeTenantSlug(value: string | undefined, email?: string): string {
  const fallback = email?.split('@')[1] ?? 'personal';
  const cleaned = (value || fallback || 'personal').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return cleaned || 'personal';
}
