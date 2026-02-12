#!/usr/bin/env node

/**
 * Provisions Supabase auth users through Admin API.
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Example:
 *   SUPABASE_URL=https://xyz.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/provision-user.mjs \
 *   --email allisongattone@gmail.com \
 *   --password 123ChangeThis \
 *   --username "Allison Gattone" \
 *   --tenant memoir-ai \
 *   --role super_admin \
 *   --force-reset true
 */

const args = process.argv.slice(2);

function getArg(name, defaultValue = undefined) {
  const flag = `--${name}`;
  const index = args.indexOf(flag);
  if (index === -1) return defaultValue;
  return args[index + 1] ?? defaultValue;
}

function normalizeTenantSlug(value, email) {
  const fallback = email?.split('@')[1] ?? 'personal';
  return (value || fallback).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

const email = getArg('email');
const password = getArg('password');
const username = getArg('username', email?.split('@')[0] ?? 'member');
const role = getArg('role', 'member');
const tenantSlug = normalizeTenantSlug(getArg('tenant', 'personal'), email);
const forceReset = String(getArg('force-reset', 'false')).toLowerCase() === 'true';

const baseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password) {
  console.error('Missing required args: --email and --password');
  process.exit(1);
}

if (!baseUrl || !serviceRoleKey) {
  console.error('Missing env vars: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const endpoint = `${baseUrl.replace(/\/$/, '')}/auth/v1/admin/users`;

const payload = {
  email,
  password,
  email_confirm: true,
  app_metadata: {
    role,
    tenant_slug: tenantSlug,
    must_reset_password: forceReset,
  },
  user_metadata: {
    username,
    tenant_slug: tenantSlug,
    role,
    must_reset_password: forceReset,
  },
};

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  },
  body: JSON.stringify(payload),
});

const body = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error('User provisioning failed:', response.status, body);
  process.exit(1);
}

console.log('User provisioned successfully.');
console.log(JSON.stringify({ id: body.id, email: body.email, role, tenantSlug, forceReset }, null, 2));
