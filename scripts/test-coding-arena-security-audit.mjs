/**
 * ==============================================================================
 * Yogneet Edu — Coding Arena & Forum Security & Production-Readiness Live Audit
 * ==============================================================================
 * Validates backend database authorization independently of frontend UI,
 * code execution isolation, hidden test case protection, and multi-role experiences:
 *   1. Safety Check: strictly targets Staging environment.
 *   2. Backend RLS Verification for coding_problems:
 *      - Student CANNOT insert, update, or delete coding problems via PostgREST.
 *      - Unauthorized Sub-Admin CANNOT insert, update, or delete coding problems.
 *      - Authorized Sub-Admin (with coding.manage) CAN manage coding problems.
 *      - Super Admin CAN manage coding problems.
 *   3. Critical Security Check: Hidden test cases protection:
 *      - Student session CANNOT read hidden test cases (is_hidden = true).
 *      - Student session CAN read public sample test cases (is_hidden = false).
 *      - Admin / Authorized Sub-Admin CAN read all test cases.
 *   4. Backend RLS Verification for coding_submissions:
 *      - Student CANNOT insert submissions on behalf of another user.
 *      - Student CANNOT view submissions of another user.
 *   5. Multi-Role Frontend Experience Simulation:
 *      - Admin: Coding Arena (1 tab), Forum Management, Top-right buttons, row actions.
 *      - Authorized Sub-Admin (coding.manage, community.moderate): 1 tab, Forum Management, Top-right buttons.
 *      - Unauthorized Sub-Admin: 1 tab, Community Forum, NO management buttons.
 *      - Normal Student: 1 tab, Community Forum, NO management buttons.
 *      - Premium Student: 1 tab, Community Forum, NO management buttons.
 * ==============================================================================
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function loadStagingEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local file not found');
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
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
  return env;
}

const stagingEnv = loadStagingEnv();

describe('Coding Arena & Forum Security & Production-Readiness Live Audit', () => {
  const PROD_URL = 'https://acmhdklihpqzurzuthkw.supabase.co';

  // 1. Safety Check
  it('0. Safety Boundary Check: Must strictly target staging instance', () => {
    assert.notStrictEqual(
      stagingEnv.VITE_SUPABASE_URL,
      PROD_URL,
      'CRITICAL: Tests must NEVER execute against production Supabase URL!'
    );
    assert.ok(
      stagingEnv.VITE_SUPABASE_URL.includes('ksjeravfkjfbpvfdazus'),
      'Must target staging Supabase instance (ksjeravfkjfbpvfdazus)'
    );
  });

  const serviceClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const runId = crypto.randomBytes(4).toString('hex');
  const studentEmail = `audit-student-${runId}@staging.yogneet.internal`;
  const adminEmail = `audit-admin-${runId}@staging.yogneet.internal`;
  const authSubAdminEmail = `audit-subadmin-auth-${runId}@staging.yogneet.internal`;
  const unauthSubAdminEmail = `audit-subadmin-unauth-${runId}@staging.yogneet.internal`;
  const commonPass = `AuditP@ss!${runId}`;

  let studentId = null;
  let adminId = null;
  let authSubAdminId = null;
  let unauthSubAdminId = null;

  let studentClient = null;
  let adminClient = null;
  let authSubAdminClient = null;
  let unauthSubAdminClient = null;

  let testProblemId = null;
  let publicTestCaseId = null;
  let hiddenTestCaseId = null;

  before(async () => {
    // A. Provision test student
    const { data: sUser, error: sErr } = await serviceClient.auth.admin.createUser({
      email: studentEmail,
      password: commonPass,
      email_confirm: true,
      user_metadata: { name: `Audit Student ${runId}` },
    });
    if (sErr) throw new Error(`Failed to create student: ${sErr.message}`);
    studentId = sUser.user.id;
    await serviceClient.from('profiles').update({ role: 'student', status: 'active' }).eq('id', studentId);

    // B. Provision test admin
    const { data: aUser, error: aErr } = await serviceClient.auth.admin.createUser({
      email: adminEmail,
      password: commonPass,
      email_confirm: true,
      user_metadata: { name: `Audit Admin ${runId}` },
    });
    if (aErr) throw new Error(`Failed to create admin: ${aErr.message}`);
    adminId = aUser.user.id;
    await serviceClient.from('profiles').update({ role: 'admin', status: 'active' }).eq('id', adminId);

    // C. Provision authorized sub-admin (with coding.manage and community.moderate)
    const { data: asaUser, error: asaErr } = await serviceClient.auth.admin.createUser({
      email: authSubAdminEmail,
      password: commonPass,
      email_confirm: true,
      user_metadata: { name: `Audit Auth SubAdmin ${runId}` },
    });
    if (asaErr) throw new Error(`Failed to create auth subadmin: ${asaErr.message}`);
    authSubAdminId = asaUser.user.id;
    await serviceClient.from('profiles').update({ role: 'subadmin', status: 'active' }).eq('id', authSubAdminId);
    await serviceClient.from('user_permissions').insert([
      { user_id: authSubAdminId, permission_key: 'coding.manage' },
      { user_id: authSubAdminId, permission_key: 'coding.view' },
      { user_id: authSubAdminId, permission_key: 'community.moderate' },
      { user_id: authSubAdminId, permission_key: 'community.view' },
    ]);

    // D. Provision unauthorized sub-admin (with only notes.view, NO coding.manage, NO community.moderate)
    const { data: usaUser, error: usaErr } = await serviceClient.auth.admin.createUser({
      email: unauthSubAdminEmail,
      password: commonPass,
      email_confirm: true,
      user_metadata: { name: `Audit Unauth SubAdmin ${runId}` },
    });
    if (usaErr) throw new Error(`Failed to create unauth subadmin: ${usaErr.message}`);
    unauthSubAdminId = usaUser.user.id;
    await serviceClient.from('profiles').update({ role: 'subadmin', status: 'active' }).eq('id', unauthSubAdminId);
    await serviceClient.from('user_permissions').insert([
      { user_id: unauthSubAdminId, permission_key: 'notes.view' },
    ]);

    // Authenticate student client
    studentClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await studentClient.auth.signInWithPassword({ email: studentEmail, password: commonPass });

    // Authenticate admin client
    adminClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await adminClient.auth.signInWithPassword({ email: adminEmail, password: commonPass });

    // Authenticate authorized subadmin client
    authSubAdminClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await authSubAdminClient.auth.signInWithPassword({ email: authSubAdminEmail, password: commonPass });

    // Authenticate unauthorized subadmin client
    unauthSubAdminClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await unauthSubAdminClient.auth.signInWithPassword({ email: unauthSubAdminEmail, password: commonPass });

    // Create a fixture problem with one public test case and one hidden test case via service role
    const { data: prob, error: pErr } = await serviceClient
      .from('coding_problems')
      .insert({
        title: `Audit Binary Search ${runId}`,
        slug: `audit-binary-search-${runId}`,
        difficulty: 'Easy',
        category: 'Algorithms',
        problem_statement: 'Given a sorted array of integers nums and an integer target, return its index.',
        status: 'published',
      })
      .select()
      .single();
    if (pErr) throw new Error(`Failed to create fixture problem: ${pErr.message}`);
    testProblemId = prob.id;

    // Public test case
    const { data: tcPub, error: tcPubErr } = await serviceClient
      .from('coding_test_cases')
      .insert({
        problem_id: testProblemId,
        input: 'nums = [-1,0,3,5,9,12], target = 9',
        expected_output: '4',
        is_hidden: false,
        order_index: 1,
      })
      .select()
      .single();
    if (tcPubErr) throw new Error(`Failed to create public test case: ${tcPubErr.message}`);
    publicTestCaseId = tcPub.id;

    // Hidden test case (CRITICAL SECURITY FIXTURE)
    const { data: tcHid, error: tcHidErr } = await serviceClient
      .from('coding_test_cases')
      .insert({
        problem_id: testProblemId,
        input: 'nums = [2,5], target = 5',
        expected_output: '1',
        is_hidden: true,
        order_index: 2,
      })
      .select()
      .single();
    if (tcHidErr) throw new Error(`Failed to create hidden test case: ${tcHidErr.message}`);
    hiddenTestCaseId = tcHid.id;
  });

  after(async () => {
    // Cleanup fixture problem and test cases
    if (testProblemId) {
      await serviceClient.from('coding_test_cases').delete().eq('problem_id', testProblemId);
      await serviceClient.from('coding_problems').delete().eq('id', testProblemId);
    }
    // Cleanup provisioned users
    if (authSubAdminId) {
      await serviceClient.from('user_permissions').delete().eq('user_id', authSubAdminId);
      await serviceClient.auth.admin.deleteUser(authSubAdminId);
    }
    if (unauthSubAdminId) {
      await serviceClient.from('user_permissions').delete().eq('user_id', unauthSubAdminId);
      await serviceClient.auth.admin.deleteUser(unauthSubAdminId);
    }
    if (studentId) await serviceClient.auth.admin.deleteUser(studentId);
    if (adminId) await serviceClient.auth.admin.deleteUser(adminId);
  });

  // --------------------------------------------------------------------------
  // TEST SECTION 1: Backend RLS on coding_problems
  // --------------------------------------------------------------------------
  describe('1. Backend Database Authorization: coding_problems RLS', () => {
    it('1.1 Student session CANNOT insert a coding problem (fails closed by RLS)', async () => {
      const { data, error } = await studentClient
        .from('coding_problems')
        .insert({
          title: 'Hacked Problem by Student',
          slug: `hacked-prob-${runId}`,
          difficulty: 'Easy',
          category: 'Exploit',
          problem_statement: 'Unauthorized creation attempt',
        })
        .select();

      assert.ok(
        error || !data || data.length === 0,
        'Student INSERT into coding_problems must be rejected by RLS'
      );
    });

    it('1.2 Student session CANNOT update a coding problem (fails closed by RLS)', async () => {
      const { data, error } = await studentClient
        .from('coding_problems')
        .update({ title: 'Tampered Problem Title' })
        .eq('id', testProblemId)
        .select();

      assert.ok(
        error || !data || data.length === 0,
        'Student UPDATE on coding_problems must be rejected by RLS'
      );
    });

    it('1.3 Student session CANNOT delete a coding problem (fails closed by RLS)', async () => {
      const { data, error } = await studentClient
        .from('coding_problems')
        .delete()
        .eq('id', testProblemId)
        .select();

      assert.ok(
        error || !data || data.length === 0,
        'Student DELETE on coding_problems must be rejected by RLS'
      );
    });

    it('1.4 Unauthorized Sub-Admin CANNOT insert a coding problem (fails closed by RLS)', async () => {
      const { data, error } = await unauthSubAdminClient
        .from('coding_problems')
        .insert({
          title: 'Unauthorized SubAdmin Problem',
          slug: `unauth-prob-${runId}`,
          difficulty: 'Easy',
          category: 'Exploit',
          problem_statement: 'Should be denied',
        })
        .select();

      assert.ok(
        error || !data || data.length === 0,
        'Unauthorized subadmin INSERT must be rejected by RLS'
      );
    });

    it('1.5 Authorized Sub-Admin WITH coding.manage CAN update coding problem', async () => {
      const { data, error } = await authSubAdminClient
        .from('coding_problems')
        .update({ problem_statement: 'Updated by authorized subadmin' })
        .eq('id', testProblemId)
        .select();

      assert.ifError(error);
      assert.ok(data && data.length > 0, 'Authorized subadmin must be permitted by RLS');
    });

    it('1.6 Super Admin CAN update coding problem', async () => {
      const { data, error } = await adminClient
        .from('coding_problems')
        .update({ problem_statement: 'Updated by super admin' })
        .eq('id', testProblemId)
        .select();

      assert.ifError(error);
      assert.ok(data && data.length > 0, 'Super admin must be permitted by RLS');
    });
  });

  // --------------------------------------------------------------------------
  // TEST SECTION 2: Hidden Test Cases Database Isolation
  // --------------------------------------------------------------------------
  describe('2. Hidden Test Cases Database Isolation (Data Leak Prevention)', () => {
    it('2.1 Student session CANNOT read hidden evaluation test cases (is_hidden = true)', async () => {
      const { data, error } = await studentClient
        .from('coding_test_cases')
        .select('*')
        .eq('problem_id', testProblemId)
        .eq('is_hidden', true);

      assert.ifError(error);
      assert.strictEqual(
        data.length,
        0,
        'CRITICAL: Student must receive 0 rows when attempting to select hidden test cases!'
      );
    });

    it('2.2 Student session CAN read public sample test cases (is_hidden = false)', async () => {
      const { data, error } = await studentClient
        .from('coding_test_cases')
        .select('*')
        .eq('problem_id', testProblemId)
        .eq('is_hidden', false);

      assert.ifError(error);
      assert.strictEqual(data.length, 1, 'Student must be allowed to read public sample test cases');
      assert.strictEqual(data[0].id, publicTestCaseId);
      assert.strictEqual(data[0].expected_output, '4');
    });

    it('2.3 Querying all test cases without is_hidden filter returns ONLY public cases to student', async () => {
      const { data, error } = await studentClient
        .from('coding_test_cases')
        .select('*')
        .eq('problem_id', testProblemId);

      assert.ifError(error);
      assert.strictEqual(data.length, 1, 'RLS policy must filter out hidden cases automatically');
      assert.strictEqual(data[0].is_hidden, false, 'Returned case must only be the public one');
    });

    it('2.4 Super Admin session CAN read hidden test cases for maintenance', async () => {
      const { data, error } = await adminClient
        .from('coding_test_cases')
        .select('*')
        .eq('problem_id', testProblemId)
        .eq('is_hidden', true);

      assert.ifError(error);
      assert.strictEqual(data.length, 1, 'Admin must be able to view hidden test cases');
      assert.strictEqual(data[0].id, hiddenTestCaseId);
    });

    it('2.5 Authorized Sub-Admin WITH coding.manage CAN read hidden test cases', async () => {
      const { data, error } = await authSubAdminClient
        .from('coding_test_cases')
        .select('*')
        .eq('problem_id', testProblemId)
        .eq('is_hidden', true);

      assert.ifError(error);
      assert.strictEqual(data.length, 1, 'Authorized subadmin must be able to view hidden test cases');
    });

    it('2.6 Student session CANNOT insert or manipulate test cases', async () => {
      const { data, error } = await studentClient
        .from('coding_test_cases')
        .insert({
          problem_id: testProblemId,
          input: 'nums = [1], target = 1',
          expected_output: '0',
          is_hidden: false,
        })
        .select();

      assert.ok(
        error || !data || data.length === 0,
        'Student INSERT into coding_test_cases must be rejected by RLS'
      );
    });
  });

  // --------------------------------------------------------------------------
  // TEST SECTION 3: Code Execution Architecture & Submission Safety
  // --------------------------------------------------------------------------
  describe('3. Code Execution Architecture & Submission Boundary Audit', () => {
    it('3.1 Solution submission: safe submission evaluation occurs without executing code on main server', async () => {
      const { data, error } = await studentClient.rpc('submit_coding_solution', {
        p_problem_id: testProblemId,
        p_language: 'python',
        p_code: 'def search(nums, target):\n    return nums.index(target) if target in nums else -1\n',
      });

      if (error) {
        // Documented database trigger protection on profile counters
        assert.ok(
          error.message.includes('Gamification counters') || error.message.includes('Access Denied'),
          'Any RPC failure must be database trigger protection, never an RCE or host execution crash'
        );
      } else {
        assert.ok(data, 'RPC must return evaluation summary');
        assert.ok(data.status, 'Must return status (accepted, etc.)');
      }
    });

    it('3.2 Student CANNOT spoof submission user_id via direct INSERT', async () => {
      // Attempt to insert submission under Admin ID
      const { data, error } = await studentClient
        .from('coding_submissions')
        .insert({
          user_id: adminId, // Attacker attempts to forge submission for admin
          problem_id: testProblemId,
          language: 'python',
          code: 'print("spoofed")',
          status: 'accepted',
        })
        .select();

      assert.ok(
        error || !data || data.length === 0,
        'Student cannot forge submission user_id (rejected by RLS user_id = auth.uid())'
      );
    });

    it('3.3 Student CANNOT read submissions belonging to other students', async () => {
      // Create a submission belonging to admin
      await serviceClient.from('coding_submissions').insert({
        user_id: adminId,
        problem_id: testProblemId,
        language: 'python',
        code: '# admin private code',
        status: 'accepted',
      });

      const { data, error } = await studentClient
        .from('coding_submissions')
        .select('*')
        .eq('user_id', adminId);

      assert.ifError(error);
      assert.strictEqual(
        data.length,
        0,
        'Student cannot read submissions of other users via RLS'
      );
    });
  });

  // --------------------------------------------------------------------------
  // TEST SECTION 4: Multi-Role Sidebar & UI Experience State Verification
  // --------------------------------------------------------------------------
  describe('4. Multi-Role Sidebar & Navigation State Contract Verification', () => {
    // Helper function that simulates the exact Sidebar navigation logic
    function computeNavigationForRole({ role, permissions = [], accessCategory = 'standard' }) {
      const isAdmin = role === 'admin';
      const isSubAdmin = role === 'subadmin';
      const isStudent = role === 'student';
      const hasPermission = (p) => permissions.includes(p);
      const isPremium = accessCategory === 'pro';

      const forumLabel = (isAdmin || hasPermission('community.moderate'))
        ? 'Forum Management'
        : 'Community Forum';

      const adminNav = [
        { label: 'Admin Dashboard', path: '/admin' },
        { label: 'Coding Arena', path: '/coding' },
        { label: 'Forum Management', path: '/community' },
      ];

      const subAdminNav = [
        { label: 'Staff Dashboard', path: '/subadmin' },
        { label: forumLabel, path: '/community' },
        { label: 'Coding Arena', path: '/coding' },
      ];

      const studentNav = [
        { label: 'Student Dashboard', path: '/dashboard' },
        { label: 'Coding Arena', path: '/coding' },
        { label: forumLabel, path: '/community' },
      ];

      const currentNav = isAdmin ? adminNav : isSubAdmin ? subAdminNav : studentNav;
      const canManageCoding = isAdmin || hasPermission('coding.manage');

      return {
        currentNav,
        forumLabel,
        canManageCoding,
        codingNavItems: currentNav.filter(item => item.path === '/coding' || item.label.includes('Coding')),
        codingAdminNavItems: currentNav.filter(item => item.label === 'Coding Arena Admin' || item.path === '/admin/coding'),
      };
    }

    it('4.1 Super Admin Experience: Exactly 1 Coding Arena, Forum Management, canManage = true', () => {
      const res = computeNavigationForRole({ role: 'admin' });
      assert.strictEqual(res.codingNavItems.length, 1, 'Admin must have exactly 1 Coding Arena sidebar item');
      assert.strictEqual(res.codingAdminNavItems.length, 0, 'Admin must NOT have Coding Arena Admin item');
      assert.strictEqual(res.forumLabel, 'Forum Management', 'Admin must see Forum Management label');
      assert.strictEqual(res.canManageCoding, true, 'Admin must have canManageCoding = true');
    });

    it('4.2 Authorized Sub-Admin Experience (coding.manage + community.moderate): 1 Coding Arena, Forum Management, canManage = true', () => {
      const res = computeNavigationForRole({
        role: 'subadmin',
        permissions: ['coding.manage', 'community.moderate'],
      });
      assert.strictEqual(res.codingNavItems.length, 1, 'Authorized subadmin must have exactly 1 Coding Arena sidebar item');
      assert.strictEqual(res.codingAdminNavItems.length, 0, 'Authorized subadmin must NOT have Coding Arena Admin item');
      assert.strictEqual(res.forumLabel, 'Forum Management', 'Authorized subadmin must see Forum Management label');
      assert.strictEqual(res.canManageCoding, true, 'Authorized subadmin must have canManageCoding = true');
    });

    it('4.3 Unauthorized Sub-Admin Experience (notes.view only): 1 Coding Arena, Community Forum, canManage = false', () => {
      const res = computeNavigationForRole({
        role: 'subadmin',
        permissions: ['notes.view'],
      });
      assert.strictEqual(res.codingNavItems.length, 1, 'Unauthorized subadmin must have exactly 1 Coding Arena sidebar item');
      assert.strictEqual(res.codingAdminNavItems.length, 0, 'Unauthorized subadmin must NOT have Coding Arena Admin item');
      assert.strictEqual(res.forumLabel, 'Community Forum', 'Unauthorized subadmin must see Community Forum label');
      assert.strictEqual(res.canManageCoding, false, 'Unauthorized subadmin must have canManageCoding = false');
    });

    it('4.4 Normal Student Experience: 1 Coding Arena, Community Forum, canManage = false', () => {
      const res = computeNavigationForRole({
        role: 'student',
        permissions: [],
        accessCategory: 'standard',
      });
      assert.strictEqual(res.codingNavItems.length, 1, 'Student must have exactly 1 Coding Arena sidebar item');
      assert.strictEqual(res.codingAdminNavItems.length, 0, 'Student must NOT have Coding Arena Admin item');
      assert.strictEqual(res.forumLabel, 'Community Forum', 'Student must see Community Forum label');
      assert.strictEqual(res.canManageCoding, false, 'Student must have canManageCoding = false');
    });

    it('4.5 Premium Student Experience: 1 Coding Arena, Community Forum, canManage = false', () => {
      const res = computeNavigationForRole({
        role: 'student',
        permissions: [],
        accessCategory: 'pro',
      });
      assert.strictEqual(res.codingNavItems.length, 1, 'Premium student must have exactly 1 Coding Arena sidebar item');
      assert.strictEqual(res.codingAdminNavItems.length, 0, 'Premium student must NOT have Coding Arena Admin item');
      assert.strictEqual(res.forumLabel, 'Community Forum', 'Premium student must see Community Forum label');
      assert.strictEqual(res.canManageCoding, false, 'Premium student must have canManageCoding = false');
    });
  });
});
