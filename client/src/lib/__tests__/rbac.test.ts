import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRole, permissionsForRole, hasPermission, normalizeTenantSlug } from '../rbac.ts';

test('normalizeRole maps unknown roles to member', () => {
  assert.equal(normalizeRole('unknown'), 'member');
  assert.equal(normalizeRole('super_admin'), 'super_admin');
});

test('super_admin includes platform:manage permission', () => {
  const permissions = permissionsForRole('super_admin');
  assert.equal(hasPermission(permissions, 'platform:manage'), true);
});

test('normalizeTenantSlug sanitizes values', () => {
  assert.equal(normalizeTenantSlug('My Team! 42'), 'my-team--42');
  assert.equal(normalizeTenantSlug(undefined, 'person@example.com'), 'example-com');
});
