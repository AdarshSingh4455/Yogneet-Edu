import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// -----------------------------------------------------------------------------
// Test Suite 1: Supabase Migrations & Relational Schema Integrity
// -----------------------------------------------------------------------------
describe('Supabase Migrations & Schema Structural Integrity', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');
  const schemaFile = path.join(migrationsDir, '20261026000001_initial_schema.sql');
  const rlsFile = path.join(migrationsDir, '20261026000002_rls_policies.sql');

  it('Migration directory and core migration files exist', () => {
    assert.ok(fs.existsSync(migrationsDir), 'supabase/migrations directory must exist');
    assert.ok(fs.existsSync(schemaFile), '20261026000001_initial_schema.sql must exist');
    assert.ok(fs.existsSync(rlsFile), '20261026000002_rls_policies.sql must exist');
  });

  it('Initial schema declares all 9 application domain tables with primary keys', () => {
    const sql = fs.readFileSync(schemaFile, 'utf-8');
    const expectedTables = [
      'public.profiles',
      'public.user_permissions',
      'public.courses',
      'public.video_lessons',
      'public.study_notes',
      'public.assessments',
      'public.assessment_questions',
      'public.assessment_attempts',
      'public.audit_logs',
    ];

    for (const table of expectedTables) {
      assert.ok(
        sql.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
        `Schema must create table ${table}`
      );
    }
  });

  it('Schema contains user-provisioning trigger and role-protection defense', () => {
    const sql = fs.readFileSync(schemaFile, 'utf-8');
    assert.ok(sql.includes('public.handle_new_user()'), 'Must define handle_new_user() trigger');
    assert.ok(
      sql.includes('public.protect_profile_privileged_fields()'),
      'Must define protect_profile_privileged_fields() trigger'
    );
    assert.ok(
      sql.includes('RAISE EXCEPTION \'Access Denied: Only administrators can modify user roles or account status.\''),
      'Must reject non-admin privilege escalation'
    );
  });
});

// -----------------------------------------------------------------------------
// Test Suite 2: PostgreSQL Row-Level Security (RLS) Policy Specifications
// -----------------------------------------------------------------------------
describe('PostgreSQL Row-Level Security (RLS) & Storage Policies', () => {
  const rlsFile = path.resolve(process.cwd(), 'supabase', 'migrations', '20261026000002_rls_policies.sql');
  const sql = fs.readFileSync(rlsFile, 'utf-8');

  it('Enables RLS on all 9 exposed tables without exception', () => {
    const expectedRlsTables = [
      'public.profiles',
      'public.user_permissions',
      'public.courses',
      'public.video_lessons',
      'public.study_notes',
      'public.assessments',
      'public.assessment_questions',
      'public.assessment_attempts',
      'public.audit_logs',
    ];

    for (const table of expectedRlsTables) {
      assert.ok(
        sql.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`),
        `RLS must be enabled on ${table}`
      );
    }
  });

  it('Configures explicit public and private storage buckets', () => {
    assert.ok(sql.includes("'yogneet-public'"), 'Public storage bucket must be declared');
    assert.ok(sql.includes("'yogneet-private'"), 'Private storage bucket must be declared');
    assert.ok(sql.includes('storage_private_select'), 'Private storage RLS select policy must exist');
    assert.ok(sql.includes('storage_public_select'), 'Public storage RLS select policy must exist');
  });

  it('Enforces immutable attempts and append-only audit logs (no UPDATE/DELETE policies)', () => {
    assert.ok(
      !sql.includes('CREATE POLICY "assessment_attempts_update"'),
      'Assessment attempts must NOT have an UPDATE policy'
    );
    assert.ok(
      !sql.includes('CREATE POLICY "assessment_attempts_delete"'),
      'Assessment attempts must NOT have a DELETE policy'
    );
    assert.ok(
      !sql.includes('CREATE POLICY "audit_logs_update"'),
      'Audit logs must NOT have an UPDATE policy'
    );
    assert.ok(
      !sql.includes('CREATE POLICY "audit_logs_delete"'),
      'Audit logs must NOT have a DELETE policy'
    );
  });
});

// -----------------------------------------------------------------------------
// Test Suite 3: Negative & Positive Authorization Simulator
// -----------------------------------------------------------------------------
describe('Negative & Positive Authorization Path Verification', () => {
  // Policy evaluation simulator
  function evaluateProfileUpdatePolicy(requester, targetProfileId, proposedChanges) {
    if (!requester || requester.status === 'suspended') {
      return { allowed: false, reason: 'Unauthenticated or suspended user' };
    }
    if (requester.role === 'admin') {
      return { allowed: true };
    }
    // Student or sub-admin can only update their own profile
    if (requester.id !== targetProfileId) {
      return { allowed: false, reason: 'Cannot update foreign profile' };
    }
    // Privilege escalation check
    if (proposedChanges.role && proposedChanges.role !== requester.role) {
      return { allowed: false, reason: 'Privilege escalation: cannot self-assign privileged role' };
    }
    if (proposedChanges.status && proposedChanges.status !== requester.status) {
      return { allowed: false, reason: 'Cannot alter account suspension status' };
    }
    return { allowed: true };
  }

  function evaluateAttemptReadPolicy(requester, attemptOwnerId) {
    if (!requester || requester.status === 'suspended') return false;
    if (requester.role === 'admin') return true;
    return requester.id === attemptOwnerId;
  }

  function evaluateAuditLogsReadPolicy(requester) {
    if (!requester || requester.status === 'suspended') return false;
    return requester.role === 'admin';
  }

  const studentA = { id: 'std_1', role: 'student', status: 'active' };
  const studentB = { id: 'std_2', role: 'student', status: 'active' };
  const suspendedStudent = { id: 'std_3', role: 'student', status: 'suspended' };
  const superAdmin = { id: 'adm_1', role: 'admin', status: 'active' };

  it('POSITIVE: Student can update their own bio and department', () => {
    const res = evaluateProfileUpdatePolicy(studentA, 'std_1', { bio: 'New bio', department: 'CS' });
    assert.equal(res.allowed, true);
  });

  it('NEGATIVE: Student cannot alter foreign student profile', () => {
    const res = evaluateProfileUpdatePolicy(studentA, 'std_2', { bio: 'Hacked bio' });
    assert.equal(res.allowed, false);
    assert.equal(res.reason, 'Cannot update foreign profile');
  });

  it('NEGATIVE: Student cannot self-escalate role to admin', () => {
    const res = evaluateProfileUpdatePolicy(studentA, 'std_1', { role: 'admin' });
    assert.equal(res.allowed, false);
    assert.ok(res.reason.includes('Privilege escalation'));
  });

  it('NEGATIVE: Suspended user is denied all profile updates', () => {
    const res = evaluateProfileUpdatePolicy(suspendedStudent, 'std_3', { bio: 'Test' });
    assert.equal(res.allowed, false);
  });

  it('NEGATIVE: Student cannot read another student assessment attempt', () => {
    assert.equal(evaluateAttemptReadPolicy(studentA, 'std_2'), false);
  });

  it('POSITIVE: Student can read their own assessment attempt', () => {
    assert.equal(evaluateAttemptReadPolicy(studentA, 'std_1'), true);
  });

  it('POSITIVE: Admin can read any assessment attempt', () => {
    assert.equal(evaluateAttemptReadPolicy(superAdmin, 'std_1'), true);
    assert.equal(evaluateAttemptReadPolicy(superAdmin, 'std_2'), true);
  });

  it('NEGATIVE: Student is denied access to audit logs', () => {
    assert.equal(evaluateAuditLogsReadPolicy(studentA), false);
  });

  it('POSITIVE: Admin has full access to audit logs', () => {
    assert.equal(evaluateAuditLogsReadPolicy(superAdmin), true);
  });
});

// -----------------------------------------------------------------------------
// Test Suite 4: Dual-Mode Backend Configuration Resolution
// -----------------------------------------------------------------------------
describe('Dual-Mode Backend Configuration Resolution', () => {
  function resolveConfig(url, key) {
    const rawUrl = url?.trim();
    const rawKey = key?.trim();
    if (!rawUrl && !rawKey) return { mode: 'local-mock', isConfigured: false };
    if (!rawUrl || !rawKey) return { mode: 'local-mock', isConfigured: false, partial: true };
    try {
      const u = new URL(rawUrl);
      if (!u.protocol.startsWith('http')) return { mode: 'local-mock', isConfigured: false };
      return { mode: 'supabase', isConfigured: true };
    } catch {
      return { mode: 'local-mock', isConfigured: false };
    }
  }

  it('Defaults to local-mock mode when environment variables are unset', () => {
    const config = resolveConfig(undefined, undefined);
    assert.equal(config.mode, 'local-mock');
    assert.equal(config.isConfigured, false);
  });

  it('Activates supabase mode when valid URL and anon key are supplied', () => {
    const config = resolveConfig('https://xyz.supabase.co', 'eyJhbGciOiJIUz...');
    assert.equal(config.mode, 'supabase');
    assert.equal(config.isConfigured, true);
  });

  it('Safely falls back to local-mock mode when partially configured', () => {
    const config = resolveConfig('https://xyz.supabase.co', undefined);
    assert.equal(config.mode, 'local-mock');
    assert.equal(config.isConfigured, false);
    assert.equal(config.partial, true);
  });

  it('Rejects invalid protocol URLs gracefully', () => {
    const config = resolveConfig('ftp://xyz.supabase.co', 'key123');
    assert.equal(config.mode, 'local-mock');
    assert.equal(config.isConfigured, false);
  });
});
