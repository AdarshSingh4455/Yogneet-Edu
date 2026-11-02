/**
 * Yogneet Edu — Comprehensive Phase 2 Security & Authorization Audit Test Suite
 *
 * Validates:
 * 1. 128-bit CSPRNG temporary credential generation applied to Supabase Auth & login verification
 * 2. Invalidation of old password upon temporary credential issuance
 * 3. Atomic enrollment sequence generation with strict caller authorization and concurrency safety
 * 4. Boundary formatting of enrollment sequences at 999 -> 1000 -> 1001
 * 5. has_permission privacy boundary preventing arbitrary user authorization probing
 * 6. Granular RBAC enforcement on subjects and micro-lessons (no broad is_staff())
 * 7. Read-only student inspection summary granular authorization (students.view)
 * 8. Profile privileged fields trigger preventing self-privilege escalation or GUC tampering
 * 9. Content deletion guard preventing orphan content
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const KNOWN_PRODUCTION_HOST = 'acmhdklihpqzurzuthkw.supabase.co';

function loadStagingEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local is required to execute security audit against staging.');
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  }
  return env;
}

const env = loadStagingEnv();
assert.ok(env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL is required in .env.local');
assert.ok(env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY is required in .env.local');
assert.ok(!env.VITE_SUPABASE_URL.includes(KNOWN_PRODUCTION_HOST), 'SAFETY GUARD: Production host detected!');

const serviceRoleClient = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Dedicated Anonymous Client that never logs in
const anonClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const runId = crypto.randomUUID().slice(0, 8);
const testPassword = `Audit#Pass2026!_${runId}`;

// Disposable test identities
const adminEmail = `audit.admin.${runId}@yogneet.test`;
const studentEmail = `audit.student.${runId}@yogneet.test`;
const unprivilegedSubadminEmail = `audit.subadmin.noperm.${runId}@yogneet.test`;
const privilegedSubadminEmail = `audit.subadmin.perm.${runId}@yogneet.test`;
const candidateStudentEmail = `audit.candidate.${runId}@yogneet.test`;

let adminUser;
let studentUser;
let unprivilegedSubadminUser;
let privilegedSubadminUser;
let candidateStudentUser;

let adminUserClient;
let studentClient;
let unprivilegedSubadminClient;
let privilegedSubadminClient;

async function createIsolatedUserSessionClient(email, password) {
  const tempAuthClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await tempAuthClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

before(async () => {
  // 1. Create candidate student for upgrade testing
  const { data: candAuth, error: candErr } = await serviceRoleClient.auth.admin.createUser({
    email: candidateStudentEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { name: `Candidate Student ${runId}` },
  });
  assert.equal(candErr, null, candErr?.message);
  candidateStudentUser = candAuth.user;

  // 2. Create normal student
  const { data: studAuth, error: studErr } = await serviceRoleClient.auth.admin.createUser({
    email: studentEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { name: `Test Student ${runId}` },
  });
  assert.equal(studErr, null, studErr?.message);
  studentUser = studAuth.user;
  studentClient = await createIsolatedUserSessionClient(studentEmail, testPassword);

  // 3. Create unprivileged subadmin (role = subadmin, 0 permissions)
  const { data: unprivAuth, error: unprivErr } = await serviceRoleClient.auth.admin.createUser({
    email: unprivilegedSubadminEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { name: `Unpriv SubAdmin ${runId}` },
  });
  assert.equal(unprivErr, null, unprivErr?.message);
  unprivilegedSubadminUser = unprivAuth.user;

  await serviceRoleClient.from('profiles').update({ role: 'subadmin' }).eq('id', unprivilegedSubadminUser.id);
  unprivilegedSubadminClient = await createIsolatedUserSessionClient(unprivilegedSubadminEmail, testPassword);

  // 4. Create privileged subadmin (role = subadmin, has premium_students.manage, students.view, subjects.manage, micro_lessons.manage)
  const { data: privAuth, error: privErr } = await serviceRoleClient.auth.admin.createUser({
    email: privilegedSubadminEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { name: `Priv SubAdmin ${runId}` },
  });
  assert.equal(privErr, null, privErr?.message);
  privilegedSubadminUser = privAuth.user;

  await serviceRoleClient.from('profiles').update({ role: 'subadmin' }).eq('id', privilegedSubadminUser.id);
  await serviceRoleClient.from('user_permissions').insert([
    { user_id: privilegedSubadminUser.id, permission_key: 'premium_students.manage' },
    { user_id: privilegedSubadminUser.id, permission_key: 'students.view' },
    { user_id: privilegedSubadminUser.id, permission_key: 'subjects.manage' },
    { user_id: privilegedSubadminUser.id, permission_key: 'micro_lessons.manage' },
  ]);
  privilegedSubadminClient = await createIsolatedUserSessionClient(privilegedSubadminEmail, testPassword);

  // 5. Create admin user (role = admin, status = active)
  const { data: admAuth, error: admErr } = await serviceRoleClient.auth.admin.createUser({
    email: adminEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { name: `Audit Admin ${runId}` },
  });
  assert.equal(admErr, null, admErr?.message);
  adminUser = admAuth.user;

  await serviceRoleClient.from('profiles').update({ role: 'admin', status: 'active' }).eq('id', adminUser.id);
  adminUserClient = await createIsolatedUserSessionClient(adminEmail, testPassword);
});

after(async () => {
  // Teardown test accounts and clean up audit logs
  if (candidateStudentUser) await serviceRoleClient.auth.admin.deleteUser(candidateStudentUser.id);
  if (studentUser) await serviceRoleClient.auth.admin.deleteUser(studentUser.id);
  if (unprivilegedSubadminUser) await serviceRoleClient.auth.admin.deleteUser(unprivilegedSubadminUser.id);
  if (privilegedSubadminUser) await serviceRoleClient.auth.admin.deleteUser(privilegedSubadminUser.id);
  if (adminUser) await serviceRoleClient.auth.admin.deleteUser(adminUser.id);

  // Clean up any test sequence years (e.g. 2027)
  await serviceRoleClient.from('enrollment_sequences').delete().eq('year', 2027);
});

// -----------------------------------------------------------------------------
// Test Suite 1: Privileged Functions Authorization & Lifecycle Audit
// -----------------------------------------------------------------------------
describe('Security Audit 1: SECURITY DEFINER Function Authorization Enforcements', { concurrency: 1 }, () => {

  it('upgrade_student_to_premium: Rejects anonymous/unauthenticated caller', async () => {
    const { data, error } = await anonClient.rpc('upgrade_student_to_premium', {
      p_user_id: candidateStudentUser.id,
      p_year: 2026,
    });
    assert.ok(error !== null, 'Anonymous caller must be rejected');
    assert.ok(
      error.message.includes('Access Denied') || error.message.includes('permission denied'),
      `Expected Access Denied or permission denied, got: ${error?.message}`
    );
  });

  it('upgrade_student_to_premium: Rejects normal student caller', async () => {
    const { data, error } = await studentClient.rpc('upgrade_student_to_premium', {
      p_user_id: candidateStudentUser.id,
      p_year: 2026,
    });
    assert.ok(error !== null, 'Normal student caller must be rejected');
    assert.ok(error.message.includes('Access Denied'), `Expected Access Denied error, got: ${error?.message}`);
  });

  it('upgrade_student_to_premium: Rejects subadmin without premium_students.manage permission', async () => {
    const { data, error } = await unprivilegedSubadminClient.rpc('upgrade_student_to_premium', {
      p_user_id: candidateStudentUser.id,
      p_year: 2026,
    });
    assert.ok(error !== null, 'Unprivileged subadmin must be rejected');
    assert.ok(error.message.includes('Access Denied'), `Expected Access Denied error, got: ${error?.message}`);
  });

  it('upgrade_student_to_premium: Allows authorized subadmin with premium_students.manage', async () => {
    const { data, error } = await privilegedSubadminClient.rpc('upgrade_student_to_premium', {
      p_user_id: candidateStudentUser.id,
      p_year: 2026,
      p_phone: '+91 98888 77777',
      p_department: 'Computer Science',
    });
    assert.equal(error, null, error?.message);
    assert.ok(data !== null);
    assert.equal(data.user_id, candidateStudentUser.id, 'Original Auth UUID must be preserved');
    assert.equal(data.is_premium, true);
    assert.ok(data.enrollment_number.startsWith('2026'));
    assert.ok(data.yogneet_email.endsWith('@yogneet.edu'));
  });

  it('upgrade_student_to_premium: Prevents duplicate upgrade of already premium student', async () => {
    const { data, error } = await privilegedSubadminClient.rpc('upgrade_student_to_premium', {
      p_user_id: candidateStudentUser.id,
      p_year: 2026,
    });
    assert.ok(error !== null, 'Duplicate upgrade must be rejected');
    assert.ok(error.message.includes('already a registered Premium Student'), `Expected duplicate error, got: ${error?.message}`);
  });

  it('admin_generate_temporary_credential: Rejects anonymous, normal student, and unprivileged subadmin', async () => {
    const anonRes = await anonClient.rpc('admin_generate_temporary_credential', { p_user_id: studentUser.id });
    assert.ok(anonRes.error !== null);
    assert.ok(
      anonRes.error.message.includes('Access Denied') || anonRes.error.message.includes('permission denied'),
      `Expected Access Denied or permission denied, got: ${anonRes.error?.message}`
    );

    const studRes = await studentClient.rpc('admin_generate_temporary_credential', { p_user_id: candidateStudentUser.id });
    assert.ok(studRes.error !== null);
    assert.ok(studRes.error.message.includes('Access Denied'), `Expected Access Denied error, got: ${studRes.error?.message}`);

    const unprivRes = await unprivilegedSubadminClient.rpc('admin_generate_temporary_credential', { p_user_id: studentUser.id });
    assert.ok(unprivRes.error !== null);
    assert.ok(unprivRes.error.message.includes('Access Denied'), `Expected Access Denied error, got: ${unprivRes.error?.message}`);
  });

  it('admin_generate_temporary_credential: Generates 128-bit credential, applies to Supabase Auth, and validates login', async () => {
    const oldPassword = testPassword;
    const { data, error } = await adminUserClient.rpc('admin_generate_temporary_credential', {
      p_user_id: studentUser.id,
    });
    assert.equal(error, null, error?.message);
    assert.ok(data.temporary_credential, 'Must return temporary credential');
    assert.ok(data.temporary_credential.length >= 36, `Must be at least 36 characters (128-bit CSPRNG), got length: ${data.temporary_credential.length}`);
    assert.equal(data.entropy_bits, 128);
    assert.equal(data.must_change_password, true);

    const newTemporaryPassword = data.temporary_credential;

    // 1. Verify user can authenticate with issued temporary credential using isolated test client
    const loginTestClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const loginNew = await loginTestClient.auth.signInWithPassword({
      email: studentEmail,
      password: newTemporaryPassword,
    });
    assert.equal(loginNew.error, null, `New password login failed: ${loginNew.error?.message}`);
    assert.ok(loginNew.data.session !== null, 'Session must be returned for temporary credential login');

    // 2. Verify old password is fully invalidated and fails authentication
    const loginOldClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const loginOld = await loginOldClient.auth.signInWithPassword({
      email: studentEmail,
      password: oldPassword,
    });
    assert.ok(loginOld.error !== null, 'Old password must be rejected after credential reset');
    assert.ok(loginOld.error.message.includes('Invalid login credentials'));

    // 3. Verify profiles table: must_change_password set to true
    const { data: prof } = await serviceRoleClient.from('profiles').select('must_change_password').eq('id', studentUser.id).single();
    assert.equal(prof.must_change_password, true);

    // 4. Verify audit_logs: plaintext password is NEVER stored
    const { data: logs } = await serviceRoleClient
      .from('audit_logs')
      .select('*')
      .eq('resource_id', studentUser.id)
      .eq('action', 'USER_PASSWORD_RESET')
      .order('timestamp', { ascending: false })
      .limit(1);

    assert.ok(logs && logs.length > 0, 'Audit log entry must be present');
    const logEntry = logs[0];
    assert.ok(!logEntry.details.includes(newTemporaryPassword), 'CRITICAL: Plaintext password found in audit_logs.details');
    const changesStr = JSON.stringify(logEntry.changes || {});
    assert.ok(!changesStr.includes(newTemporaryPassword), 'CRITICAL: Plaintext password found in audit_logs.changes');
  });

  it('admin_generate_temporary_credential: Prevents staff from resetting admin or subadmin credentials', async () => {
    // 1. Privileged subadmin (has premium_students.manage) attempts to reset Admin account
    const { error: resetAdminErr } = await privilegedSubadminClient.rpc('admin_generate_temporary_credential', {
      p_user_id: adminUser.id,
    });
    assert.ok(resetAdminErr !== null, 'Subadmin must be blocked from resetting admin credentials');
    assert.ok(
      resetAdminErr.message.includes('Only administrators can reset administrator credentials'),
      `Expected admin reset blocked error, got: ${resetAdminErr?.message}`
    );

    // 2. Privileged subadmin (has premium_students.manage, but NOT subadmins.manage) attempts to reset Subadmin account
    const { error: resetSubadminErr } = await privilegedSubadminClient.rpc('admin_generate_temporary_credential', {
      p_user_id: unprivilegedSubadminUser.id,
    });
    assert.ok(resetSubadminErr !== null, 'Staff without subadmins.manage must be blocked from resetting subadmin credentials');
    assert.ok(
      resetSubadminErr.message.includes('Only administrators or staff with subadmins.manage can reset staff credentials'),
      `Expected subadmin reset blocked error, got: ${resetSubadminErr?.message}`
    );

    // 3. Admin successfully resets subadmin account
    const { data: adminResetData, error: adminResetErr } = await adminUserClient.rpc('admin_generate_temporary_credential', {
      p_user_id: unprivilegedSubadminUser.id,
    });
    assert.equal(adminResetErr, null, adminResetErr?.message);
    assert.ok(adminResetData.temporary_credential);
  });

  it('Credential Hash Isolation: temporary_password_hash is never exposed via public.profiles or PostgREST', async () => {
    // 1. Student querying their own profile
    const { data: ownProfile } = await studentClient.from('profiles').select('*').eq('id', studentUser.id).single();
    assert.equal(ownProfile.temporary_password_hash, undefined, 'temporary_password_hash must NOT be a column on public.profiles');
    assert.equal(ownProfile.temporary_credential_created_at, undefined, 'temporary_credential_created_at must NOT be a column on public.profiles');

    // 2. Direct attempt to select from private.user_temporary_credentials via PostgREST
    const { data: privData, error: privErr } = await studentClient.from('user_temporary_credentials').select('*');
    assert.ok(privErr !== null, 'Access to private.user_temporary_credentials via PostgREST must be blocked');
  });

  it('generate_next_enrollment_number: Enforces caller authorization and blocks sequence consumption', async () => {
    // 1. Anonymous caller rejected
    const anonRes = await anonClient.rpc('generate_next_enrollment_number', { p_year: 2026 });
    assert.ok(anonRes.error !== null, 'Anonymous sequence consumption must be rejected');
    assert.ok(
      anonRes.error.message.includes('Access Denied') || anonRes.error.message.includes('permission denied'),
      `Expected Access Denied or permission denied, got: ${anonRes.error?.message}`
    );

    // 2. Normal student caller rejected
    const studRes = await studentClient.rpc('generate_next_enrollment_number', { p_year: 2026 });
    assert.ok(studRes.error !== null, 'Normal student sequence consumption must be rejected');
    assert.ok(studRes.error.message.includes('Access Denied'), `Expected Access Denied, got: ${studRes.error?.message}`);

    // 3. Unprivileged subadmin rejected
    const unprivRes = await unprivilegedSubadminClient.rpc('generate_next_enrollment_number', { p_year: 2026 });
    assert.ok(unprivRes.error !== null, 'Unprivileged subadmin sequence consumption must be rejected');
    assert.ok(unprivRes.error.message.includes('Access Denied'), `Expected Access Denied, got: ${unprivRes.error?.message}`);

    // 4. Authorized staff succeeds
    const privRes = await privilegedSubadminClient.rpc('generate_next_enrollment_number', { p_year: 2027 });
    assert.equal(privRes.error, null, privRes.error?.message);
    assert.ok(privRes.data[0].enrollment_number.startsWith('2027'));
  });

  it('has_permission: Enforces privacy boundary preventing users from probing arbitrary user accounts', async () => {
    // 1. Normal student querying own permission: allowed
    const ownRes = await studentClient.rpc('has_permission', {
      p_user_id: studentUser.id,
      p_permission_key: 'videos.view',
    });
    assert.equal(ownRes.error, null);

    // 2. Normal student querying another student or admin permission: strictly rejected
    const otherRes = await studentClient.rpc('has_permission', {
      p_user_id: adminUser.id,
      p_permission_key: 'subadmins.manage',
    });
    assert.ok(otherRes.error !== null, 'Probing another user account permissions must be rejected');
    assert.ok(otherRes.error.message.includes('Access Denied: You cannot query authorization permissions for other user accounts.'));

    // 3. Privileged staff querying permission: allowed for RBAC checks
    const privRes = await privilegedSubadminClient.rpc('has_permission', {
      p_user_id: candidateStudentUser.id,
      p_permission_key: 'premium_students.manage',
    });
    assert.equal(privRes.error, null);
  });

  it('get_student_inspection_summary: Strictly enforces students.view or premium_students.view (no broad is_staff)', async () => {
    // 1. Normal student rejected
    const { error: studErr } = await studentClient.rpc('get_student_inspection_summary', {
      p_student_id: candidateStudentUser.id,
    });
    assert.ok(studErr !== null);
    assert.ok(studErr.message.includes('Access Denied'));

    // 2. Unprivileged sub-admin (role = subadmin, 0 permissions) rejected
    const { error: unprivErr } = await unprivilegedSubadminClient.rpc('get_student_inspection_summary', {
      p_student_id: candidateStudentUser.id,
    });
    assert.ok(unprivErr !== null, 'Unprivileged sub-admin must be rejected without students.view');
    assert.ok(unprivErr.message.includes('Access Denied: Requires students.view'));

    // 3. Authorized staff with students.view succeeds
    const { data: inspData, error: inspErr } = await privilegedSubadminClient.rpc('get_student_inspection_summary', {
      p_student_id: candidateStudentUser.id,
    });
    assert.equal(inspErr, null, inspErr?.message);
    assert.ok(inspData.student);
    assert.equal(inspData.student.id, candidateStudentUser.id);

    // 4. Privileged staff cannot inspect admin accounts
    const { error: inspectAdminErr } = await privilegedSubadminClient.rpc('get_student_inspection_summary', {
      p_student_id: adminUser.id,
    });
    assert.ok(inspectAdminErr !== null, 'Staff must not be able to inspect admin accounts');
    assert.ok(inspectAdminErr.message.includes('Staff members can only inspect student accounts'));
  });

  it('check_subject_deletion_guard: Prevents deletion of subject with active content', async () => {
    const { error } = await serviceRoleClient.from('subjects').delete().eq('id', 'subj_dsa');
    assert.ok(error !== null, 'Subject with active content must not be deleted');
    assert.ok(
      error.message.includes('Cannot delete subject "Data Structures & Algorithms"') ||
      error.message.includes('Cannot delete subject'),
      `Expected deletion guard message, got: ${error.message}`
    );
  });
});

// -----------------------------------------------------------------------------
// Test Suite 2: Granular RBAC RLS Policies on Subjects, Micro Topics & Sequences
// -----------------------------------------------------------------------------
describe('Security Audit 2: Granular RBAC & RLS Enforcement', { concurrency: 1 }, () => {

  it('public.subjects RLS: Anonymous user cannot read subjects', async () => {
    const { data, error } = await anonClient.from('subjects').select('*');
    assert.equal(error, null);
    assert.deepEqual(data, [], 'Anonymous users must be denied by RLS subjects_select (0 rows returned)');
  });

  it('public.subjects RLS: Normal student and unprivileged sub-admin cannot manage subjects', async () => {
    // Student blocked
    const studRes = await studentClient.from('subjects').insert({
      id: `subj_hacked_${runId}`,
      name: `Hacked Subject ${runId}`,
      slug: `hacked-${runId}`,
    });
    assert.ok(studRes.error !== null, 'Normal student insert must be rejected by RLS');

    // Unprivileged sub-admin blocked (no subjects.manage)
    const unprivRes = await unprivilegedSubadminClient.from('subjects').insert({
      id: `subj_unpriv_${runId}`,
      name: `Unpriv Subject ${runId}`,
      slug: `unpriv-${runId}`,
    });
    assert.ok(unprivRes.error !== null, 'Unprivileged sub-admin insert must be rejected by RLS');

    // Privileged sub-admin with subjects.manage allowed
    const privRes = await privilegedSubadminClient.from('subjects').insert({
      id: `subj_priv_${runId}`,
      name: `Privileged Subject ${runId}`,
      slug: `priv-${runId}`,
    });
    assert.equal(privRes.error, null, privRes.error?.message);

    // Teardown test subject
    await serviceRoleClient.from('subjects').delete().eq('id', `subj_priv_${runId}`);
  });

  it('public.micro_subjects & micro_lessons RLS: Unprivileged sub-admin blocked; privileged allowed', async () => {
    // Unprivileged subadmin blocked from micro_subjects
    const unprivTopic = await unprivilegedSubadminClient.from('micro_subjects').insert({
      id: `micro_unpriv_${runId}`,
      name: `Unpriv Topic ${runId}`,
      slug: `unpriv-topic-${runId}`,
    });
    assert.ok(unprivTopic.error !== null, 'Unprivileged sub-admin cannot insert micro subjects');

    // Unprivileged subadmin blocked from micro_lessons
    const unprivLesson = await unprivilegedSubadminClient.from('micro_lessons').insert({
      id: `les_unpriv_${runId}`,
      micro_subject_id: 'micro_py_tricks',
      title: 'Unpriv Lesson',
      youtube_shorts_url: 'https://youtube.com/shorts/dQw4w9WgXcQ',
      youtube_id: 'dQw4w9WgXcQ',
      status: 'published',
    });
    assert.ok(unprivLesson.error !== null, 'Unprivileged sub-admin cannot insert micro lessons');

    // Privileged subadmin allowed to insert micro_lesson
    const privLesson = await privilegedSubadminClient.from('micro_lessons').insert({
      id: `les_priv_${runId}`,
      micro_subject_id: 'micro_py_tricks',
      title: `Privileged Lesson ${runId}`,
      youtube_shorts_url: 'https://youtube.com/shorts/bM7SZ5SBzyY',
      youtube_id: 'bM7SZ5SBzyY',
      status: 'published',
    });
    assert.equal(privLesson.error, null, privLesson.error?.message);

    // Teardown
    await serviceRoleClient.from('micro_lessons').delete().eq('id', `les_priv_${runId}`);
  });

  it('public.enrollment_sequences RLS: Completely blocks client direct reads and writes', async () => {
    const { data: studRead } = await studentClient.from('enrollment_sequences').select('*');
    assert.deepEqual(studRead, [], 'Student direct sequence read must return 0 rows');

    const { error: studWrite } = await studentClient.from('enrollment_sequences').insert({ year: 2099, last_sequence: 1 });
    assert.ok(studWrite !== null, 'Student direct sequence write must be rejected');

    const { data: privRead } = await privilegedSubadminClient.from('enrollment_sequences').select('*');
    assert.deepEqual(privRead, [], 'Subadmin direct sequence read must return 0 rows');
  });

  it('public.profiles trigger: Normal student cannot tamper with premium entitlements or bypass via GUC', async () => {
    // Direct attempt to self-promote to premium
    const { error } = await studentClient.from('profiles').update({
      is_premium: true,
      enrollment_number: '2026999',
    }).eq('id', studentUser.id);

    assert.ok(error !== null, 'Student direct update to premium fields must be rejected by trigger');
    assert.ok(error.message.includes('Only administrators or staff with premium_students.manage can modify premium student entitlements'),
      `Expected trigger guard message, got: ${error.message}`);
  });
});

// -----------------------------------------------------------------------------
// Test Suite 3: Concurrency & Boundary Formatting
// -----------------------------------------------------------------------------
describe('Security Audit 3: Concurrency-Safe Sequence & Boundary Formatting', { concurrency: 1 }, () => {

  it('Executes 10 concurrent sequence generation calls without collision or duplicate', async () => {
    const testYear = 2028;
    // Clean up test year
    await serviceRoleClient.from('enrollment_sequences').delete().eq('year', testYear);

    const promises = Array.from({ length: 10 }, () =>
      privilegedSubadminClient.rpc('generate_next_enrollment_number', { p_year: testYear })
    );

    const results = await Promise.all(promises);
    for (const r of results) {
      assert.equal(r.error, null, r.error?.message);
    }

    const numbers = results.map(r => r.data[0].enrollment_number);
    const uniqueNumbers = new Set(numbers);
    assert.equal(uniqueNumbers.size, 10, 'All 10 generated numbers must be strictly distinct');

    const expectedNumbers = [
      '2028001', '2028002', '2028003', '2028004', '2028005',
      '2028006', '2028007', '2028008', '2028009', '2028010'
    ];
    assert.deepEqual(numbers.sort(), expectedNumbers.sort());

    await serviceRoleClient.from('enrollment_sequences').delete().eq('year', testYear);
  });

  it('Verifies exact sequence transition across 999, 1000, and 1001', async () => {
    const boundaryYear = 2030;
    await serviceRoleClient.from('enrollment_sequences').delete().eq('year', boundaryYear);

    // Pre-seed sequence at 998
    await serviceRoleClient.from('enrollment_sequences').insert({
      year: boundaryYear,
      last_sequence: 998,
    });

    // 1. Fetch 999 (should format as 2030999 with 3 digits)
    const { data: d999, error: e999 } = await privilegedSubadminClient.rpc('generate_next_enrollment_number', { p_year: boundaryYear });
    assert.equal(e999, null);
    assert.equal(d999[0].enrollment_number, '2030999');
    assert.equal(d999[0].seq_num, 999);

    // 2. Fetch 1000 (should format as 20301000 with 4 digits)
    const { data: d1000, error: e1000 } = await privilegedSubadminClient.rpc('generate_next_enrollment_number', { p_year: boundaryYear });
    assert.equal(e1000, null);
    assert.equal(d1000[0].enrollment_number, '20301000');
    assert.equal(d1000[0].seq_num, 1000);

    // 3. Fetch 1001 (should format as 20301001 with 4 digits)
    const { data: d1001, error: e1001 } = await privilegedSubadminClient.rpc('generate_next_enrollment_number', { p_year: boundaryYear });
    assert.equal(e1001, null);
    assert.equal(d1001[0].enrollment_number, '20301001');
    assert.equal(d1001[0].seq_num, 1001);

    await serviceRoleClient.from('enrollment_sequences').delete().eq('year', boundaryYear);
  });
});
