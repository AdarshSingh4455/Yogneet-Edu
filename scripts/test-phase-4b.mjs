import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// -----------------------------------------------------------------------------
// Pure logic reproductions of Phase 4B Entitlement Checker
// matching src/components/common/AccessGate.tsx
// -----------------------------------------------------------------------------

function checkStudentEntitlement(
  userTier,
  requiredTier = 'standard',
  userRole
) {
  // Staff and Admins always have unrestricted platform access
  if (userRole === 'admin' || userRole === 'subadmin') {
    return true;
  }

  // Standard resources are available to all students
  if (!requiredTier || requiredTier === 'standard') {
    return true;
  }

  const effectiveTier = userTier || 'standard';

  // Pro tier users have access to Pro and Standard content
  if (effectiveTier === 'pro' && (requiredTier === 'pro' || requiredTier === 'standard')) {
    return true;
  }

  // Institutional Managed or Scholarship cohorts receive full entitlement
  if (effectiveTier === 'managed' || effectiveTier === 'scholarship') {
    return true;
  }

  // Exact tier match
  return effectiveTier === requiredTier;
}

// -----------------------------------------------------------------------------
// Pure logic reproduction of Platform Portal Role Guard
// matching src/context/AuthContext.tsx signInWithEmail logic
// -----------------------------------------------------------------------------

function evaluatePortalLogin(portal, profile) {
  if (!profile) {
    throw new Error('Authentication Error: User profile could not be resolved.');
  }

  if (profile.status === 'suspended') {
    throw new Error('Account Suspended: Your access has been deactivated. Please contact platform administration.');
  }

  if (portal === 'platform') {
    if (profile.role === 'student') {
      throw new Error('Access denied: Student accounts cannot access the Platform Portal.');
    }
    if (profile.role !== 'admin' && profile.role !== 'subadmin') {
      throw new Error('Access denied: Insufficient privileges for Platform Portal.');
    }
  }

  return {
    allowed: true,
    targetRoute: profile.role === 'admin' ? '/admin/subadmins' : profile.role === 'subadmin' ? '/subadmin/content' : '/dashboard',
  };
}

// -----------------------------------------------------------------------------
// Pure logic reproduction of Staff Provisioning Input Validation
// matching src/services/staffAdminService.ts & Edge Function
// -----------------------------------------------------------------------------

const VALID_PERMISSION_KEYS = new Set([
  'videos.view', 'videos.create', 'videos.edit', 'videos.delete', 'videos.publish',
  'notes.view', 'notes.create', 'notes.edit', 'notes.delete', 'notes.publish',
  'tests.view', 'tests.create', 'tests.edit', 'tests.publish', 'tests.schedule', 'tests.view_results',
  'students.view', 'students.suspend',
  'community.moderate',
  'subadmins.manage',
  'permissions.assign',
  'audit_logs.view',
  'analytics.view',
  'content.export',
]);

function validateStaffProvisioning(actor, input) {
  if (!actor || actor.role !== 'admin') {
    throw new Error('Access Denied: Only platform administrators can provision staff.');
  }
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    throw new Error('Invalid Email: Please provide a valid staff email address.');
  }
  if (!input.name || !input.name.trim()) {
    throw new Error('Name Required: Staff full name is required.');
  }
  if (input.role !== 'subadmin' && input.role !== 'admin') {
    throw new Error('Invalid Role: Staff role must be subadmin or admin.');
  }

  const validPermissions = Array.isArray(input.permissions)
    ? input.permissions.filter(p => VALID_PERMISSION_KEYS.has(p))
    : [];

  return {
    normalizedEmail: input.email.trim().toLowerCase(),
    trimmedName: input.name.trim(),
    role: input.role,
    validPermissions,
  };
}

// -----------------------------------------------------------------------------
// Test Suites
// -----------------------------------------------------------------------------

describe('Phase 4B: Student Signup Contract & Client Role Isolation', () => {
  const signupPagePath = path.resolve('src/pages/auth/StudentSignupPage.tsx');
  const authContextPath = path.resolve('src/context/AuthContext.tsx');
  const migrationPath = path.resolve('supabase/migrations/20261029000006_phase_4b_auth_entitlements.sql');

  it('StudentSignupPage never accepts or submits role parameters', () => {
    assert.ok(fs.existsSync(signupPagePath), 'StudentSignupPage.tsx must exist');
    const content = fs.readFileSync(signupPagePath, 'utf8');

    // Invariant: Student signup UI must NEVER pass a role parameter
    assert.ok(!content.includes("role: 'admin'"), 'Must not allow admin role selection');
    assert.ok(!content.includes("role: 'subadmin'"), 'Must not allow subadmin role selection');
    assert.ok(!content.includes("role: 'faculty'"), 'Must not allow faculty role selection');
    assert.ok(!content.includes('roleSelect'), 'Must not have role selector state');

    // Invariant: Wire to signUpStudent from useAuth
    assert.ok(content.includes('signUpStudent'), 'Must invoke signUpStudent');
    assert.ok(content.includes('password') && content.includes('confirmPassword'), 'Must validate password confirmation');
  });

  it('AuthContext.signUpStudent submits only user profile metadata without role parameter', () => {
    assert.ok(fs.existsSync(authContextPath), 'AuthContext.tsx must exist');
    const content = fs.readFileSync(authContextPath, 'utf8');

    assert.ok(content.includes('signUpStudent = async'), 'AuthContext must export signUpStudent');
    assert.ok(!content.includes("role: 'admin'") && !content.includes("role: 'subadmin'"), 'signUpStudent must not inject elevated roles');
  });

  it('Database migration guarantees default role is strictly "student" in handle_new_user', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration 20261029000006 must exist');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(sql.includes("CREATE OR REPLACE FUNCTION public.handle_new_user()"), 'Must define handle_new_user');
    assert.ok(sql.includes("'student'"), 'Must default to student role for public signups');
    assert.ok(sql.includes("staff_invitations"), 'Must check staff_invitations table for pre-authorized staff');
  });
});
describe('Phase 4B: Dual-Portal Role Enforcement & Suspended User Handling', () => {
  it('Evaluates portal login and strictly denies student accounts from Platform Portal', () => {
    const studentUser = { id: 'usr_1', email: 'student@example.com', role: 'student', status: 'active' };

    assert.throws(
      () => evaluatePortalLogin('platform', studentUser),
      /Access denied: Student accounts cannot access the Platform Portal/
    );
  });

  it('Allows student accounts to access student portal', () => {
    const studentUser = { id: 'usr_1', email: 'student@example.com', role: 'student', status: 'active' };
    const res = evaluatePortalLogin('student', studentUser);
    assert.equal(res.allowed, true);
    assert.equal(res.targetRoute, '/dashboard');
  });

  it('Allows admin and subadmin accounts to access Platform Portal with correct routes', () => {
    const adminUser = { id: 'adm_1', email: 'admin@yogneet.edu', role: 'admin', status: 'active' };
    const subadminUser = { id: 'sub_1', email: 'staff@yogneet.edu', role: 'subadmin', status: 'active' };

    const adminRes = evaluatePortalLogin('platform', adminUser);
    assert.equal(adminRes.allowed, true);
    assert.equal(adminRes.targetRoute, '/admin/subadmins');

    const subadminRes = evaluatePortalLogin('platform', subadminUser);
    assert.equal(subadminRes.allowed, true);
    assert.equal(subadminRes.targetRoute, '/subadmin/content');
  });

  it('Strictly denies suspended accounts across all portals', () => {
    const suspendedStudent = { id: 'usr_susp_1', email: 'bad@example.com', role: 'student', status: 'suspended' };
    const suspendedAdmin = { id: 'adm_susp_1', email: 'rogue@yogneet.edu', role: 'admin', status: 'suspended' };

    assert.throws(
      () => evaluatePortalLogin('student', suspendedStudent),
      /Account Suspended/
    );

    assert.throws(
      () => evaluatePortalLogin('platform', suspendedAdmin),
      /Account Suspended/
    );
  });
});

describe('Phase 4B: Google OAuth Integration & Redirection Contracts', () => {
  const authContextPath = path.resolve('src/context/AuthContext.tsx');
  const studentLoginPath = path.resolve('src/pages/auth/StudentLoginPage.tsx');
  const platformLoginPath = path.resolve('src/pages/auth/PlatformLoginPage.tsx');

  it('AuthContext implements signInWithGoogle with clean redirect configuration', () => {
    const content = fs.readFileSync(authContextPath, 'utf8');

    assert.ok(content.includes('signInWithGoogle'), 'AuthContext must export signInWithGoogle');
    assert.ok(content.includes("provider: 'google'"), 'Must call Supabase auth with provider google');
    assert.ok(content.includes('redirectTo'), 'Must configure redirectTo callback');
  });

  it('StudentLoginPage wires Google OAuth button and PlatformLoginPage restricts to direct credentials', () => {
    const studentContent = fs.readFileSync(studentLoginPath, 'utf8');
    const platformContent = fs.readFileSync(platformLoginPath, 'utf8');

    assert.ok(studentContent.includes('signInWithGoogle'), 'Student login must use signInWithGoogle');
    // Platform portal strictly requires direct email credentials, no self-service Google OAuth
    assert.ok(!platformContent.includes('signInWithGoogle'), 'Platform login must not permit public Google OAuth');
  });
});

describe('Phase 4B: Password Recovery & Reset Password Contracts', () => {
  const authContextPath = path.resolve('src/context/AuthContext.tsx');
  const forgotPasswordPath = path.resolve('src/pages/auth/ForgotPasswordPage.tsx');
  const resetPasswordPath = path.resolve('src/pages/auth/ResetPasswordPage.tsx');

  it('AuthContext implements requestPasswordReset and completePasswordReset', () => {
    const content = fs.readFileSync(authContextPath, 'utf8');

    assert.ok(content.includes('requestPasswordReset'), 'Must export requestPasswordReset');
    assert.ok(content.includes('resetPasswordForEmail'), 'Must call resetPasswordForEmail');
    assert.ok(content.includes('completePasswordReset'), 'Must export completePasswordReset');
    assert.ok(content.includes('updateUser'), 'Must call updateUser with new password');
    assert.ok(content.includes('isRecoverySession'), 'Must track recovery session state');
    assert.ok(content.includes('PASSWORD_RECOVERY'), 'Must listen for PASSWORD_RECOVERY event');
  });

  it('ForgotPasswordPage validates email and invokes requestPasswordReset', () => {
    assert.ok(fs.existsSync(forgotPasswordPath), 'ForgotPasswordPage.tsx must exist');
    const content = fs.readFileSync(forgotPasswordPath, 'utf8');

    assert.ok(content.includes('requestPasswordReset'), 'Must invoke requestPasswordReset');
    assert.ok(content.includes('isSubmitted') || content.includes('success'), 'Must render success confirmation UI');
  });

  it('ResetPasswordPage validates new passwords and invokes completePasswordReset', () => {
    assert.ok(fs.existsSync(resetPasswordPath), 'ResetPasswordPage.tsx must exist');
    const content = fs.readFileSync(resetPasswordPath, 'utf8');

    assert.ok(content.includes('completePasswordReset'), 'Must invoke completePasswordReset');
    assert.ok(content.includes('password') && content.includes('confirmPassword'), 'Must require confirmation');
    assert.ok(content.includes('isRecoverySession') || content.includes('token'), 'Must verify session or token');
  });
});

describe('Phase 4B: Server-Authoritative Staff Provisioning & Edge Function', () => {
  const edgeFunctionPath = path.resolve('supabase/functions/admin-provision-staff/index.ts');
  const staffServicePath = path.resolve('src/services/staffAdminService.ts');
  const subAdminPagePath = path.resolve('src/pages/admin/SubAdminManagementPage.tsx');
  const migrationPath = path.resolve('supabase/migrations/20261029000006_phase_4b_auth_entitlements.sql');

  it('Edge function enforces JWT authentication, admin caller role, and valid permissions', () => {
    assert.ok(fs.existsSync(edgeFunctionPath), 'admin-provision-staff Edge Function must exist');
    const content = fs.readFileSync(edgeFunctionPath, 'utf8');

    assert.ok(content.includes("Authorization"), 'Must check Authorization header');
    assert.ok(content.includes("adminClient.auth.getUser(token)"), 'Must validate JWT token with Supabase Admin');
    assert.ok(content.includes("callerProfile.role !== 'admin'"), 'Must verify caller role is admin');
    assert.ok(content.includes("callerProfile.status !== 'active'"), 'Must verify caller status is active');
    assert.ok(content.includes("VALID_PERMISSION_KEYS"), 'Must validate assigned permissions');
    assert.ok(content.includes("auth.admin.inviteUserByEmail") || content.includes("auth.admin.createUser"), 'Must use Supabase Admin Auth API');
  });

  it('Database migration defines staff_invitations and admin_provision_staff_account RPC', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS public.staff_invitations"), 'Must create staff_invitations table');
    assert.ok(sql.includes("CREATE POLICY \"staff_invitations_admin_all\""), 'Must enforce admin-only RLS policy on staff_invitations');
    assert.ok(sql.includes("CREATE OR REPLACE FUNCTION public.admin_provision_staff_account"), 'Must define admin_provision_staff_account');
    assert.ok(sql.includes("SECURITY DEFINER"), 'RPC must be SECURITY DEFINER');
    assert.ok(sql.includes("v_actor_role <> 'admin' THEN"), 'Must assert caller is admin in RPC');
  });

  it('StaffAdminService validates caller and delegates provisioning to Edge Function / RPC', () => {
    assert.ok(fs.existsSync(staffServicePath), 'staffAdminService.ts must exist');
    const content = fs.readFileSync(staffServicePath, 'utf8');

    assert.ok(content.includes("provisionStaff"), 'Must export provisionStaff');
    assert.ok(content.includes("admin-provision-staff"), 'Must target admin-provision-staff Edge Function');
    assert.ok(content.includes("admin_provision_staff_account"), 'Must fall back to admin_provision_staff_account RPC');
  });

  it('SubAdminManagementPage provides async provisioning modal and status toggle', () => {
    assert.ok(fs.existsSync(subAdminPagePath), 'SubAdminManagementPage.tsx must exist');
    const content = fs.readFileSync(subAdminPagePath, 'utf8');

    assert.ok(content.includes("StaffAdminService"), 'Must import StaffAdminService');
    assert.ok(content.includes("provisionStaff") || content.includes("handleSaveSubAdmin"), 'Must invoke staff provisioning');
    assert.ok(content.includes("toggleStaffStatus") || content.includes("handleToggleStatus"), 'Must support status toggling');
  });

  it('Staff provisioning pure validator rejects unauthorized or malformed inputs', () => {
    const adminActor = { id: 'adm_1', email: 'adm@yogneet.edu', role: 'admin' };
    const studentActor = { id: 'stu_1', email: 'stu@yogneet.edu', role: 'student' };

    // Non-admin rejection
    assert.throws(
      () => validateStaffProvisioning(studentActor, { name: 'Staff User', email: 'staff@test.com', role: 'subadmin' }),
      /Only platform administrators can provision staff/
    );

    // Invalid email rejection
    assert.throws(
      () => validateStaffProvisioning(adminActor, { name: 'Staff User', email: 'invalid-email', role: 'subadmin' }),
      /Please provide a valid staff email/
    );

    // Missing name rejection
    assert.throws(
      () => validateStaffProvisioning(adminActor, { name: '   ', email: 'staff@test.com', role: 'subadmin' }),
      /Staff full name is required/
    );

    // Invalid role rejection
    assert.throws(
      () => validateStaffProvisioning(adminActor, { name: 'Staff User', email: 'staff@test.com', role: 'student' }),
      /Staff role must be subadmin or admin/
    );

    // Valid provisioning with filtered permissions
    const valid = validateStaffProvisioning(adminActor, {
      name: '  Priya Patel  ',
      email: '  PRIYA@yogneet.edu  ',
      role: 'subadmin',
      permissions: ['videos.create', 'notes.publish', 'unauthorized.fake.perm'],
    });

    assert.equal(valid.trimmedName, 'Priya Patel');
    assert.equal(valid.normalizedEmail, 'priya@yogneet.edu');
    assert.equal(valid.role, 'subadmin');
    assert.deepEqual(valid.validPermissions, ['videos.create', 'notes.publish']);
  });
});

describe('Phase 4B: Student Entitlement Hierarchy & Access Gating', () => {
  const accessGatePath = path.resolve('src/components/common/AccessGate.tsx');
  const migrationPath = path.resolve('supabase/migrations/20261029000006_phase_4b_auth_entitlements.sql');

  it('checkStudentEntitlement enforces tier hierarchy accurately', () => {
    // 1. Staff and Admin bypass all entitlement checks
    assert.equal(checkStudentEntitlement('standard', 'pro', 'admin'), true, 'Admin always has access');
    assert.equal(checkStudentEntitlement('standard', 'scholarship', 'subadmin'), true, 'Subadmin always has access');

    // 2. Standard content is available to everyone
    assert.equal(checkStudentEntitlement('standard', 'standard', 'student'), true, 'Standard user can access standard content');
    assert.equal(checkStudentEntitlement(undefined, 'standard', 'student'), true, 'Undefined tier defaults to standard access');
    assert.equal(checkStudentEntitlement('pro', 'standard', 'student'), true, 'Pro user can access standard content');

    // 3. Pro content requires pro, managed, or scholarship
    assert.equal(checkStudentEntitlement('standard', 'pro', 'student'), false, 'Standard user denied pro content');
    assert.equal(checkStudentEntitlement('pro', 'pro', 'student'), true, 'Pro user granted pro content');
    assert.equal(checkStudentEntitlement('managed', 'pro', 'student'), true, 'Managed user granted pro content');
    assert.equal(checkStudentEntitlement('scholarship', 'pro', 'student'), true, 'Scholarship user granted pro content');

    // 4. Managed content requires managed or scholarship
    assert.equal(checkStudentEntitlement('standard', 'managed', 'student'), false, 'Standard user denied managed content');
    assert.equal(checkStudentEntitlement('pro', 'managed', 'student'), false, 'Pro user denied managed cohort content');
    assert.equal(checkStudentEntitlement('managed', 'managed', 'student'), true, 'Managed user granted managed content');

    // 5. Scholarship cohort content
    assert.equal(checkStudentEntitlement('standard', 'scholarship', 'student'), false, 'Standard user denied scholarship content');
    assert.equal(checkStudentEntitlement('scholarship', 'scholarship', 'student'), true, 'Scholarship user granted scholarship content');
  });

  it('AccessGate component file exists and exports checkStudentEntitlement', () => {
    assert.ok(fs.existsSync(accessGatePath), 'AccessGate.tsx must exist');
    const content = fs.readFileSync(accessGatePath, 'utf8');

    assert.ok(content.includes('export function checkStudentEntitlement'), 'Must export checkStudentEntitlement');
    assert.ok(content.includes('export const AccessGate'), 'Must export AccessGate');
    assert.ok(content.includes('displayTitle') || content.includes('displayDesc'), 'Must render upgrade CTA');
  });

  it('Database migration defines has_entitlement SQL function and restricted columns', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(sql.includes("CREATE OR REPLACE FUNCTION public.has_entitlement"), 'Must define has_entitlement SQL function');
    assert.ok(sql.includes("ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN"), 'Must add is_restricted to content tables');
    assert.ok(sql.includes("ADD COLUMN IF NOT EXISTS required_tier TEXT"), 'Must add required_tier to content tables');
    assert.ok(sql.includes("CREATE OR REPLACE FUNCTION public.admin_update_student_entitlement"), 'Must define admin_update_student_entitlement');
    assert.ok(sql.includes("protect_profile_privileged_fields"), 'Must protect access_category in profile trigger');
  });

  it('StudentManagementPage displays Access Tier badge and provides tier update modal', () => {
    const studentMgmtPath = path.resolve('src/pages/admin/StudentManagementPage.tsx');
    assert.ok(fs.existsSync(studentMgmtPath), 'StudentManagementPage.tsx must exist');
    const content = fs.readFileSync(studentMgmtPath, 'utf8');

    assert.ok(content.includes('accessCategory') || content.includes('Access Tier'), 'Must reference accessCategory or Access Tier');
    assert.ok(content.includes('updateStudentEntitlement') || content.includes('handleUpdateTier'), 'Must provide tier update action');
  });

  it('NotesDirectoryPage gates file downloads according to entitlement', () => {
    const notesPagePath = path.resolve('src/pages/student/NotesDirectoryPage.tsx');
    assert.ok(fs.existsSync(notesPagePath), 'NotesDirectoryPage.tsx must exist');
    const content = fs.readFileSync(notesPagePath, 'utf8');

    assert.ok(content.includes('checkStudentEntitlement') || content.includes('accessCategory'), 'Must check student entitlement');
    assert.ok(content.includes('handleDownload'), 'Must verify entitlement in handleDownload');
  });
});

// =============================================================================
// Security Remediation Test Suites (Ranked Findings 1 - 5)
// =============================================================================

function resolveSupabaseConfigTest(env = {}) {
  const rawUrl = env.VITE_SUPABASE_URL?.trim();
  const rawKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  const isProductionBuild = Boolean(
    env.PROD === 'true' ||
    env.MODE === 'production' ||
    env.VITE_ENVIRONMENT === 'production' ||
    env.VITE_ENVIRONMENT === 'staging'
  );
  const allowMockAuth = env.VITE_ALLOW_MOCK_AUTH === 'true';

  if (isProductionBuild && !allowMockAuth) {
    if (!rawUrl || !rawKey) {
      return {
        url: '',
        anonKey: '',
        isConfigured: false,
        mode: 'fail-closed',
        isFatalConfigError: true,
        configError: 'Production configuration error: Supabase backend credentials are required. System operating in fail-closed mode.',
      };
    }

    try {
      const parsed = new URL(rawUrl);
      if (!parsed.protocol.startsWith('http')) {
        throw new Error('Supabase URL must use http or https protocol.');
      }
    } catch {
      return {
        url: rawUrl,
        anonKey: rawKey,
        isConfigured: false,
        mode: 'fail-closed',
        isFatalConfigError: true,
        configError: 'Production configuration error: Invalid VITE_SUPABASE_URL format. System operating in fail-closed mode.',
      };
    }

    return {
      url: rawUrl,
      anonKey: rawKey,
      isConfigured: true,
      mode: 'supabase',
      isFatalConfigError: false,
    };
  }

  if (!rawUrl && !rawKey) {
    return {
      url: '',
      anonKey: '',
      isConfigured: false,
      mode: 'local-mock',
      isFatalConfigError: false,
    };
  }

  if (rawUrl && !rawKey) {
    return {
      url: rawUrl,
      anonKey: '',
      isConfigured: false,
      mode: 'local-mock',
      isFatalConfigError: false,
    };
  }

  if (!rawUrl && rawKey) {
    return {
      url: '',
      anonKey: rawKey,
      isConfigured: false,
      mode: 'local-mock',
      isFatalConfigError: false,
    };
  }

  try {
    const parsed = new URL(rawUrl);
    if (!parsed.protocol.startsWith('http')) {
      throw new Error('Supabase URL must use http or https protocol.');
    }
  } catch {
    return {
      url: rawUrl,
      anonKey: rawKey,
      isConfigured: false,
      mode: 'local-mock',
      isFatalConfigError: false,
    };
  }

  return {
    url: rawUrl,
    anonKey: rawKey,
    isConfigured: true,
    mode: 'supabase',
    isFatalConfigError: false,
  };
}

function parseRecoverySessionStatus(hash, search, isRecoverySession, backendMode) {
  const hasRecoveryToken = Boolean(
    (hash && hash.includes('type=recovery')) ||
    (search && (new URLSearchParams(search).get('type') === 'recovery' || new URLSearchParams(search).has('code')))
  );
  return isRecoverySession || hasRecoveryToken || backendMode === 'local-mock';
}

describe('Security Remediation Finding 1 (HIGH): Unverified Email Privilege Claiming Defense', () => {
  const migrationPath = path.resolve('supabase/migrations/20261029000006_phase_4b_auth_entitlements.sql');

  it('handle_new_user() strictly checks email confirmation before associating staff invitations or student directory', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(sql.includes("v_is_email_verified BOOLEAN;"), 'Must declare v_is_email_verified flag');
    assert.ok(sql.includes("NEW.email_confirmed_at IS NOT NULL"), 'Must check email_confirmed_at');
    assert.ok(sql.includes("NEW.confirmed_at IS NOT NULL"), 'Must check confirmed_at');
    assert.ok(sql.includes("IF v_is_email_verified THEN"), 'Must branch on email verification status');
    assert.ok(sql.includes("reconcile_verified_user_entitlements"), 'Must call reconcile_verified_user_entitlements when verified');
  });

  it('Unverified signups strictly receive standard student profile without elevated role or tier', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(
      sql.includes("Always create base profile with strict student role and standard tier initially"),
      'Must contain explicit unverified standard student assignment'
    );
    assert.ok(sql.includes("'student'"), 'Must set role to student');
    assert.ok(sql.includes("'standard'"), 'Must set access_category to standard');
  });

  it('Database migration creates handle_user_email_confirmed trigger on auth.users', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(
      sql.includes("CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()"),
      'Must define handle_user_email_confirmed function'
    );
    assert.ok(
      sql.includes("CREATE TRIGGER on_auth_user_email_confirmed"),
      'Must create on_auth_user_email_confirmed trigger'
    );
    assert.ok(
      sql.includes("AFTER UPDATE OF email_confirmed_at, confirmed_at ON auth.users"),
      'Trigger must monitor email_confirmed_at and confirmed_at update'
    );
  });

  it('reconcile_verified_user_entitlements acquires transaction-level advisory lock to eliminate concurrency races', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(
      sql.includes("CREATE OR REPLACE FUNCTION public.reconcile_verified_user_entitlements"),
      'Must define reconcile_verified_user_entitlements function'
    );
    assert.ok(
      sql.includes("hashtext('entitlement_reconcile:' || lower(trim(p_email)))"),
      'Must compute hash for user email advisory lock'
    );
    assert.ok(
      sql.includes("pg_try_advisory_xact_lock"),
      'Must use pg_try_advisory_xact_lock to prevent concurrent execution'
    );
  });

  it('reconcile_verified_user_entitlements prevents invitation replay and duplicate claiming', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(
      sql.includes("status = 'pending'"),
      'Must verify invitation is pending'
    );
    assert.ok(
      sql.includes("status = 'accepted'"),
      'Must mark invitation as accepted upon reconciliation'
    );
    assert.ok(
      sql.includes("updated_at = timezone('utc'::text, now())"),
      'Must record update timestamp'
    );
  });

  it('Internal trigger uses yogneet.internal_auth_sync to authorize privileged updates', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(
      sql.includes("PERFORM set_config('yogneet.internal_auth_sync', 'on', true);"),
      'Must set yogneet.internal_auth_sync session variable'
    );
    assert.ok(
      sql.includes("current_setting('yogneet.internal_auth_sync', true) = 'on'"),
      'protect_profile_privileged_fields must check yogneet.internal_auth_sync'
    );
  });
});

describe('Security Remediation Finding 2 (HIGH): Server-Side Entitlement Enforcement for Assessments & Storage', () => {
  const migrationPath = path.resolve('supabase/migrations/20261029000006_phase_4b_auth_entitlements.sql');
  const storageServicePath = path.resolve('src/services/storageService.ts');
  const notesPagePath = path.resolve('src/pages/student/NotesDirectoryPage.tsx');

  it('get_assessment_questions_for_taking enforces server-side tier entitlement check', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(
      sql.includes("CREATE OR REPLACE FUNCTION public.get_assessment_questions_for_taking"),
      'Must define secure get_assessment_questions_for_taking'
    );
    assert.ok(
      sql.includes("(v_test.is_restricted OR v_test.required_tier <> 'standard')") &&
      sql.includes("public.has_entitlement(v_caller_id, v_test.required_tier)"),
      'Must assert caller has entitlement before returning assessment questions'
    );
    assert.ok(
      sql.includes("Access Denied: This assessment requires \"%\" entitlement tier"),
      'Must raise exception with required entitlement description'
    );
  });

  it('submit_assessment_attempt enforces server-side tier entitlement check', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(
      sql.includes("CREATE OR REPLACE FUNCTION public.submit_assessment_attempt"),
      'Must define secure submit_assessment_attempt'
    );
    assert.ok(
      sql.includes("Access Denied: Your account does not have the required \"%\" entitlement tier to submit this assessment"),
      'Must raise exception if attempt submission fails tier check'
    );
  });

  it('get_study_note_download_url RPC enforces server-side tier check before issuing download URLs', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(
      sql.includes("CREATE OR REPLACE FUNCTION public.get_study_note_download_url"),
      'Must define get_study_note_download_url RPC'
    );
    assert.ok(
      sql.includes("Access Denied: This study note requires \"%\" entitlement tier"),
      'Must raise exception if caller lacks note entitlement'
    );
  });

  it('Private storage RLS policy enforces has_entitlement for notes directory', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(
      sql.includes("storage_private_select"),
      'Must create storage_private_select policy'
    );
    assert.ok(
      sql.includes("public.has_entitlement(auth.uid(), 'pro')"),
      'Must enforce pro entitlement for private storage note objects'
    );
  });

  it('StorageService calls get_study_note_download_url RPC for authorized access', () => {
    const content = fs.readFileSync(storageServicePath, 'utf8');

    assert.ok(
      content.includes("getAuthorizedNoteDownloadUrl"),
      'StorageService must export getAuthorizedNoteDownloadUrl'
    );
    assert.ok(
      content.includes("get_study_note_download_url"),
      'StorageService must invoke get_study_note_download_url RPC'
    );
  });

  it('NotesDirectoryPage uses getAuthorizedNoteDownloadUrl and surfaces authorization errors', () => {
    const content = fs.readFileSync(notesPagePath, 'utf8');

    assert.ok(
      content.includes("getAuthorizedNoteDownloadUrl"),
      'NotesDirectoryPage must invoke getAuthorizedNoteDownloadUrl'
    );
    assert.ok(
      content.includes("Entitlement Required") || content.includes("Download Failed"),
      'NotesDirectoryPage must display clear feedback when download is denied'
    );
  });
});

describe('Security Remediation Finding 3 (MEDIUM): Staff Provisioning Failure Compensation & Concurrency Defense', () => {
  const edgeFunctionPath = path.resolve('supabase/functions/admin-provision-staff/index.ts');

  it('Edge function rejects attempts to overwrite already accepted staff invitations', () => {
    const content = fs.readFileSync(edgeFunctionPath, 'utf8');

    assert.ok(
      content.includes("existingInv && existingInv.status === 'accepted'"),
      'Must check if invitation is already accepted'
    );
    assert.ok(
      content.includes("is already an accepted staff member"),
      'Must provide descriptive error for existing active staff'
    );
    assert.ok(
      content.includes("status: 409"),
      'Must return 409 Conflict status'
    );
  });

  it('Edge function performs compensating deletion when invite delivery fails', () => {
    const content = fs.readFileSync(edgeFunctionPath, 'utf8');

    assert.ok(
      content.includes("COMPENSATING CLEANUP"),
      'Must include compensating cleanup logic'
    );
    assert.ok(
      content.includes(".delete()") && content.includes(".eq('status', 'pending')"),
      'Must delete pending invitation record on auth error'
    );
  });

  it('Edge function writes FAILED audit log on delivery failure', () => {
    const content = fs.readFileSync(edgeFunctionPath, 'utf8');

    assert.ok(
      content.includes("outcome: 'FAILED'"),
      'Must record FAILED outcome in audit logs on error'
    );
  });
});

describe('Security Remediation Finding 4 (MEDIUM): Production Fail-Closed Supabase Configuration Guard', () => {
  const clientPath = path.resolve('src/services/supabaseClient.ts');
  const authContextPath = path.resolve('src/context/AuthContext.tsx');
  const authLayoutPath = path.resolve('src/components/layout/AuthLayout.tsx');

  it('resolveSupabaseConfigForEnv fails closed in production when credentials are missing', () => {
    // Missing URL in production
    const resNoUrl = resolveSupabaseConfigTest({ PROD: 'true', VITE_SUPABASE_ANON_KEY: 'some-key' });
    assert.equal(resNoUrl.mode, 'fail-closed');
    assert.equal(resNoUrl.isFatalConfigError, true);
    assert.ok(resNoUrl.configError.includes('Production configuration error'));

    // Missing Anon Key in production
    const resNoKey = resolveSupabaseConfigTest({ PROD: 'true', VITE_SUPABASE_URL: 'https://ksjeravfkjfbpvfdazus.supabase.co' });
    assert.equal(resNoKey.mode, 'fail-closed');
    assert.equal(resNoKey.isFatalConfigError, true);

    // Staging environment with missing credentials
    const resStaging = resolveSupabaseConfigTest({ VITE_ENVIRONMENT: 'staging' });
    assert.equal(resStaging.mode, 'fail-closed');
    assert.equal(resStaging.isFatalConfigError, true);

    // Invalid URL format in production
    const resInvalidUrl = resolveSupabaseConfigTest({
      PROD: 'true',
      VITE_SUPABASE_URL: 'not-a-valid-url',
      VITE_SUPABASE_ANON_KEY: 'some-key',
    });
    assert.equal(resInvalidUrl.mode, 'fail-closed');
    assert.equal(resInvalidUrl.isFatalConfigError, true);
  });

  it('resolveSupabaseConfigForEnv initializes supabase mode in production when valid credentials are provided', () => {
    const res = resolveSupabaseConfigTest({
      PROD: 'true',
      VITE_SUPABASE_URL: 'https://ksjeravfkjfbpvfdazus.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'eyJh...valid-key',
    });
    assert.equal(res.mode, 'supabase');
    assert.equal(res.isConfigured, true);
    assert.equal(res.isFatalConfigError, false);
  });

  it('resolveSupabaseConfigForEnv defaults to local-mock mode in local development', () => {
    const res = resolveSupabaseConfigTest({});
    assert.equal(res.mode, 'local-mock');
    assert.equal(res.isConfigured, false);
    assert.equal(res.isFatalConfigError, false);
  });

  it('resolveSupabaseConfigForEnv allows local-mock mode in production if VITE_ALLOW_MOCK_AUTH is explicitly set', () => {
    const res = resolveSupabaseConfigTest({
      PROD: 'true',
      VITE_ALLOW_MOCK_AUTH: 'true',
    });
    assert.equal(res.mode, 'local-mock');
    assert.equal(res.isFatalConfigError, false);
  });

  it('src/services/supabaseClient.ts exports resolveSupabaseConfigForEnv and fail-closed types', () => {
    const content = fs.readFileSync(clientPath, 'utf8');

    assert.ok(content.includes("export type BackendMode = 'supabase' | 'local-mock' | 'fail-closed'"), 'Must define BackendMode');
    assert.ok(content.includes("export function resolveSupabaseConfigForEnv"), 'Must export resolveSupabaseConfigForEnv');
    assert.ok(content.includes("mode: 'fail-closed'"), 'Must implement fail-closed return');
  });

  it('AuthContext blocks all authentication and mock switching actions when isFatalConfigError is active', () => {
    const content = fs.readFileSync(authContextPath, 'utf8');

    assert.ok(content.includes("supabaseConfig.isFatalConfigError"), 'Must check isFatalConfigError');
    assert.ok(content.includes("isFatalConfigError: supabaseConfig.isFatalConfigError"), 'Must provide isFatalConfigError in context');
    assert.ok(content.includes("Persona switching is blocked in production fail-closed mode"), 'Must block switchUser in fail-closed');
  });

  it('AuthLayout renders configuration safety banner when isFatalConfigError is active', () => {
    const content = fs.readFileSync(authLayoutPath, 'utf8');

    assert.ok(content.includes("Configuration Safety Lock Engaged"), 'Must render Configuration Safety Lock Engaged banner');
    assert.ok(content.includes("isFatalConfigError"), 'Must check isFatalConfigError in AuthLayout');
  });
});

describe('Security Remediation Finding 5 (LOW): Password Recovery Session Verification & Expired Session UX', () => {
  const resetPasswordPath = path.resolve('src/pages/auth/ResetPasswordPage.tsx');

  it('parseRecoverySessionStatus correctly identifies valid recovery hash, query params, and mock mode', () => {
    // Hash token
    assert.equal(parseRecoverySessionStatus('#access_token=xyz&type=recovery', '', false, 'supabase'), true);

    // Query param type=recovery
    assert.equal(parseRecoverySessionStatus('', '?type=recovery', false, 'supabase'), true);

    // Query param code
    assert.equal(parseRecoverySessionStatus('', '?code=recovery-code-123', false, 'supabase'), true);

    // Existing recovery session in state
    assert.equal(parseRecoverySessionStatus('', '', true, 'supabase'), true);

    // Local mock mode always valid for testing
    assert.equal(parseRecoverySessionStatus('', '', false, 'local-mock'), true);

    // Missing token in live Supabase mode -> invalid
    assert.equal(parseRecoverySessionStatus('', '', false, 'supabase'), false);
  });

  it('ResetPasswordPage verifies recovery session validity and presents safe recovery request guidance', () => {
    const content = fs.readFileSync(resetPasswordPath, 'utf8');

    assert.ok(content.includes("isValidRecovery"), 'Must check isValidRecovery');
    assert.ok(content.includes("No Active Recovery Session"), 'Must render No Active Recovery Session warning');
    assert.ok(content.includes("/forgot-password"), 'Must link to /forgot-password to request fresh link');
  });
});
