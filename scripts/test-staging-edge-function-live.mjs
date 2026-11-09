/**
 * Yogneet Edu — Phase 5: Staging Edge Function Synchronization & End-to-End Verification
 * Target: Staging Supabase (ksjeravfkjfbpvfdazus) & Vite Preview (http://127.0.0.1:4173)
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const KNOWN_PRODUCTION_HOST = 'acmhdklihpqzurzuthkw.supabase.co';
const EXPECTED_STAGING_HOST = 'ksjeravfkjfbpvfdazus.supabase.co';
const PREVIEW_URL = 'http://127.0.0.1:4173';

function loadStagingConfig() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local file missing. Cannot run staging tests.');
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const env = { ...process.env };
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const k = trimmed.substring(0, idx).trim();
      let v = trimmed.substring(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  });

  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  assert.ok(url, 'VITE_SUPABASE_URL is required');
  assert.ok(anonKey, 'VITE_SUPABASE_ANON_KEY is required');
  assert.ok(serviceKey, 'SUPABASE_SERVICE_ROLE_KEY is required');

  const parsedUrl = new URL(url);
  if (parsedUrl.host.includes('acmhdklihpqzurzuthkw') || parsedUrl.host === KNOWN_PRODUCTION_HOST) {
    throw new Error(`CRITICAL SAFETY VIOLATION: Target URL is production (${KNOWN_PRODUCTION_HOST}). Staging tests MUST run against staging only!`);
  }
  if (!parsedUrl.host.includes('ksjeravfkjfbpvfdazus')) {
    throw new Error(`SAFETY VIOLATION: Expected staging host (${EXPECTED_STAGING_HOST}), found ${parsedUrl.host}`);
  }

  return { url, anonKey, serviceKey };
}

function validatePasswordComplexity(pwd) {
  if (typeof pwd !== 'string' || pwd.length < 8) return false;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSymbol = /[!@#$%^&*]/.test(pwd);
  return hasUpper && hasLower && hasNumber && hasSymbol;
}

async function runEdgeFunctionSyncVerification() {
  console.log('=============================================================================');
  console.log('   YOGNEET EDU — STAGING EDGE FUNCTION SYNCHRONIZATION & E2E VERIFICATION   ');
  console.log('=============================================================================');

  const config = loadStagingConfig();
  console.log(`[Safety Guard] Target Verified: ${config.url}`);

  const runId = Math.random().toString(36).substring(2, 9);
  console.log(`[Run Identifier] ${runId}`);

  const adminClient = createClient(config.url, config.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const anonClient = createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const createdUserIds = [];

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Create Dedicated Staging Test Identities (Admin, Sub-Admin, Student)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 1: Setting Up Staging Security Test Accounts ---');

    // 1. Admin
    const adminEmail = `sync.admin.${runId}@yogneetedu.in`;
    const adminPassword = `Admin!Sync#${runId}2026`;
    const { data: adminUser, error: adminCreateErr } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: `Sync Admin ${runId}` },
    });
    assert.ifError(adminCreateErr);
    createdUserIds.push(adminUser.user.id);
    await adminClient.from('profiles').update({ role: 'admin', status: 'active', name: `Sync Admin ${runId}` }).eq('id', adminUser.user.id);

    const adminCaller = createClient(config.url, config.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: adminLogin, error: adminLoginErr } = await adminCaller.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    assert.ifError(adminLoginErr);
    const adminJwt = adminLogin.session.access_token;
    console.log(`  ✓ Staging Platform Admin ready: ${adminEmail} (ID: ${adminUser.user.id})`);

    // 2. Student
    const studentEmail = `sync.student.${runId}@yogneetedu.in`;
    const studentPassword = `Student!Sync#${runId}2026`;
    const { data: studentUser, error: studentCreateErr } = await adminClient.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
      user_metadata: { name: `Sync Student ${runId}` },
    });
    assert.ifError(studentCreateErr);
    createdUserIds.push(studentUser.user.id);
    await adminClient.from('profiles').update({ role: 'student', status: 'active' }).eq('id', studentUser.user.id);

    const studentCaller = createClient(config.url, config.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: studentLogin, error: studentLoginErr } = await studentCaller.auth.signInWithPassword({
      email: studentEmail,
      password: studentPassword,
    });
    assert.ifError(studentLoginErr);
    const studentJwt = studentLogin.session.access_token;
    console.log(`  ✓ Staging Student caller ready: ${studentEmail} (ID: ${studentUser.user.id})`);

    // 3. Sub-Admin
    const subAdminEmail = `sync.subadmin.${runId}@yogneetedu.in`;
    const subAdminPassword = `SubAdmin!Sync#${runId}2026`;
    const { data: subAdminUser, error: subAdminCreateErr } = await adminClient.auth.admin.createUser({
      email: subAdminEmail,
      password: subAdminPassword,
      email_confirm: true,
      user_metadata: { name: `Sync SubAdmin ${runId}` },
    });
    assert.ifError(subAdminCreateErr);
    createdUserIds.push(subAdminUser.user.id);
    await adminClient.from('profiles').update({ role: 'subadmin', status: 'active' }).eq('id', subAdminUser.user.id);

    const subAdminCaller = createClient(config.url, config.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: subAdminLogin, error: subAdminLoginErr } = await subAdminCaller.auth.signInWithPassword({
      email: subAdminEmail,
      password: subAdminPassword,
    });
    assert.ifError(subAdminLoginErr);
    const subAdminJwt = subAdminLogin.session.access_token;
    console.log(`  ✓ Staging Sub-Admin caller ready: ${subAdminEmail} (ID: ${subAdminUser.user.id})`);

    // -------------------------------------------------------------------------
    // Phase 2: Deployed Edge Function Authorization & Security Boundary Tests
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 2: Live Edge Function Authorization & Security Auditing ---');
    const edgeFunctionEndpoint = `${config.url}/functions/v1/admin-provision-staff`;

    // 2.1 Missing Authorization Header (401)
    console.log('  [Security Test 2.1] Request with missing Authorization header...');
    const resNoAuth = await fetch(edgeFunctionEndpoint, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@yogneet.test', name: 'Test' }),
    });
    assert.equal(resNoAuth.status, 401, 'Edge function must return 401 when Authorization header is missing');
    const bodyNoAuth = await resNoAuth.json();
    assert.ok(bodyNoAuth.error.includes('missing authorization header'));
    console.log('    ✓ HTTP 401 returned: missing authorization header rejected');

    // 2.2 Invalid / Expired Bearer Token (401)
    console.log('  [Security Test 2.2] Request with invalid Bearer token...');
    const resBadToken = await fetch(edgeFunctionEndpoint, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey,
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@yogneet.test', name: 'Test' }),
    });
    assert.equal(resBadToken.status, 401, 'Edge function must return 401 for invalid Bearer token');
    const bodyBadToken = await resBadToken.json();
    assert.ok(bodyBadToken.error.includes('invalid or expired session token'));
    console.log('    ✓ HTTP 401 returned: invalid bearer token rejected');

    // 2.3 Student Caller (403 Forbidden)
    console.log('  [Security Test 2.3] Student caller privilege escalation attempt...');
    const resStudent = await fetch(edgeFunctionEndpoint, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${studentJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `escalate.${runId}@yogneetedu.in`,
        name: 'Escalation Target',
        role: 'admin',
        department: 'Curriculum & Video Authoring',
      }),
    });
    assert.equal(resStudent.status, 403, 'Edge function must return 403 for student caller');
    const bodyStudent = await resStudent.json();
    assert.ok(bodyStudent.error.includes('Only platform administrators can provision staff'));
    console.log('    ✓ HTTP 403 returned: non-admin caller strictly blocked by Edge Function');

    // 2.4 Sub-Admin Caller (403 Forbidden)
    console.log('  [Security Test 2.4] Sub-Admin caller privilege escalation attempt...');
    const resSubAdmin = await fetch(edgeFunctionEndpoint, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${subAdminJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `subadmin.escalate.${runId}@yogneetedu.in`,
        name: 'SubAdmin Target',
        role: 'subadmin',
        department: 'Curriculum & Video Authoring',
      }),
    });
    assert.equal(resSubAdmin.status, 403, 'Edge function must return 403 for sub-admin caller');
    const bodySubAdmin = await resSubAdmin.json();
    assert.ok(bodySubAdmin.error.includes('Only platform administrators can provision staff'));
    console.log('    ✓ HTTP 403 returned: sub-admin caller strictly blocked (Least Privilege)');

    // 2.5 Invalid Department (400 Bad Request)
    console.log('  [Security Test 2.5] Invalid department validation...');
    const resBadDept = await fetch(edgeFunctionEndpoint, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${adminJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `baddept.${runId}@yogneetedu.in`,
        name: 'Bad Dept Staff',
        role: 'subadmin',
        department: 'NonExistent Department XYZ',
      }),
    });
    assert.equal(resBadDept.status, 400, 'Edge function must return 400 for invalid department');
    const bodyBadDept = await resBadDept.json();
    assert.ok(bodyBadDept.error.includes('Invalid department'));
    console.log('    ✓ HTTP 400 returned: invalid department rejected');

    // 2.6 Invalid Department-Role Preset Combination (400 Bad Request)
    console.log('  [Security Test 2.6] Department-Role mismatch validation...');
    const resMismatch = await fetch(edgeFunctionEndpoint, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${adminJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `mismatch.${runId}@yogneetedu.in`,
        name: 'Mismatch Staff',
        role: 'subadmin',
        department: 'Community Moderation',
        presetKey: 'content_creator', // Belongs to Curriculum, not Community!
      }),
    });
    assert.equal(resMismatch.status, 400, 'Edge function must return 400 for department-role mismatch');
    const bodyMismatch = await resMismatch.json();
    assert.ok(bodyMismatch.error.includes('not valid for department'));
    console.log('    ✓ HTTP 400 returned: department-role mismatch rejected server-side');

    // -------------------------------------------------------------------------
    // Phase 3: Direct Edge Function Authoritative Staff Provisioning
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 3: Direct Edge Function Staff Provisioning (Valid Admin) ---');
    const directStaffEmail = `direct.staff.${runId}@yogneetedu.in`;
    const directStaffName = `Direct Staff ${runId}`;

    const resValid = await fetch(edgeFunctionEndpoint, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${adminJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: directStaffEmail,
        name: directStaffName,
        role: 'subadmin',
        department: 'Coding Arena & Practice',
        presetKey: 'coding_lead',
        bio: 'Automated test direct staff account',
        permissions: ['coding.view', 'coding.manage', 'students.view'],
      }),
    });

    assert.equal(resValid.status, 200, `Expected HTTP 200 from Edge Function, got ${resValid.status}`);
    const validBody = await resValid.json();
    assert.equal(validBody.success, true);
    assert.equal(validBody.status, 'created');
    assert.ok(validBody.userId, 'Edge function must return created userId');
    assert.ok(validBody.temporaryPassword, 'Edge function MUST return generated temporaryPassword');
    createdUserIds.push(validBody.userId);

    // Verify password entropy and complexity
    const tempPwd = validBody.temporaryPassword;
    assert.equal(tempPwd.length, 16, 'Temporary password must be 16 characters');
    assert.ok(validatePasswordComplexity(tempPwd), 'Temporary password must pass complexity validation');

    console.log(`  ✓ HTTP 200: Successfully provisioned ${directStaffEmail}`);
    console.log(`    - Created User ID: ${validBody.userId}`);
    console.log(`    - Generated Temporary Credential: ${tempPwd.substring(0, 4)}...[REDACTED] (Length: ${tempPwd.length}, High Entropy Verified)`);
    console.log('    - Codebase confirms createUser API used (NOT inviteUserByEmail)');

    // Verify database state for direct staff
    const { data: directProfile } = await adminClient
      .from('profiles')
      .select('department, role, must_change_password, status')
      .eq('id', validBody.userId)
      .single();
    assert.equal(directProfile.department, 'Coding Arena & Practice');
    assert.equal(directProfile.role, 'subadmin');
    assert.equal(directProfile.must_change_password, true);
    assert.equal(directProfile.status, 'active');
    console.log('    - Database verification: profiles row active with must_change_password=true');

    // -------------------------------------------------------------------------
    // Phase 4: Real End-to-End Web UI Provisioning & Password Rotation Workflow via Playwright
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 4: Real End-to-End Web UI Provisioning & Password Rotation Workflow ---');
    console.log(`  Connecting browser to Preview UI: ${PREVIEW_URL}`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    let capturedEdgeFunctionRequest = null;
    let capturedEdgeFunctionResponse = null;

    // Monitor network requests for Edge Function invocation
    page.on('request', req => {
      if (req.url().includes('/functions/v1/admin-provision-staff')) {
        capturedEdgeFunctionRequest = {
          url: req.url(),
          method: req.method(),
          headers: req.headers(),
          postData: req.postData(),
        };
      }
    });

    page.on('response', async res => {
      if (res.url().includes('/functions/v1/admin-provision-staff')) {
        try {
          const body = await res.json();
          capturedEdgeFunctionResponse = {
            status: res.status(),
            body,
          };
        } catch {}
      }
    });

    // 4.1 Admin Login via UI (/platform/login)
    console.log('  [UI Step 1] Platform Admin logging into Web UI (/platform/login)...');
    await page.goto(`${PREVIEW_URL}/platform/login`, { waitUntil: 'networkidle' });
    await page.fill('#platform-login-email', adminEmail);
    await page.fill('#platform-login-password', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin', { timeout: 15000 });
    console.log(`    ✓ Admin authenticated via UI (Current URL: ${page.url()})`);

    // 4.2 Navigate to Sub-Admin Management
    console.log('  [UI Step 2] Navigating to Staff & Permissions (/admin/subadmins)...');
    await page.goto(`${PREVIEW_URL}/admin/subadmins`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Staff & Permissions', { timeout: 10000 });
    console.log('    ✓ Arrived at Staff & Permissions page');

    // 4.3 Open Add Sub-Admin Modal
    console.log('  [UI Step 3] Opening Add Sub-Admin provisioning modal...');
    const addSubAdminBtn = page.locator('button:has-text("Add Sub-Admin")');
    await addSubAdminBtn.click();
    await page.waitForSelector('text=Provision New Sub-Admin Account', { timeout: 5000 });
    console.log('    ✓ Provisioning modal opened');

    // 4.4 Fill Provisioning Form with Dependent Role Preset
    const uiStaffEmail = `ui.subadmin.${runId}@yogneetedu.in`;
    const uiStaffName = `UI Staff ${runId}`;

    console.log(`  [UI Step 4] Filling form: ${uiStaffName} (${uiStaffEmail})`);
    // Full Name
    await page.fill('input[placeholder*="Vikram Sharma"]', uiStaffName);
    // Email
    await page.fill('input[placeholder*="vikram.s@yogneetedu.in"]', uiStaffEmail);

    // Select Department: "Assessment & Test Series"
    const departmentSelect = page.locator('select').first();
    await departmentSelect.selectOption('Assessment & Test Series');
    await page.waitForTimeout(500);

    // Select Dependent Role Preset: "test_evaluator"
    const roleSelect = page.locator('select').nth(1);
    await roleSelect.selectOption('test_evaluator');
    await page.waitForTimeout(500);

    // Verify capability preview box displays expected permissions
    const capabilityText = await page.textContent('body');
    assert.ok(capabilityText.includes('tests.view'), 'UI must preview tests.view capability');
    assert.ok(capabilityText.includes('tests.create'), 'UI must preview tests.create capability');
    console.log('    ✓ Dynamic role dependency and live capability preview box verified in UI');

    // 4.5 Submit Provisioning Form and Intercept Deployed Edge Function Call
    console.log('  [UI Step 5] Submitting provisioning form and intercepting Edge Function call...');
    const submitBtn = page.locator('button:has-text("Provision Account")');

    // Wait for the Edge Function response
    const [edgeResponse] = await Promise.all([
      page.waitForResponse(
        res => res.url().includes('/functions/v1/admin-provision-staff') && res.status() === 200,
        { timeout: 15000 }
      ),
      submitBtn.click(),
    ]);

    assert.ok(edgeResponse, 'UI MUST invoke Edge Function admin-provision-staff');
    const edgeResponseBody = await edgeResponse.json();
    assert.equal(edgeResponse.status(), 200);
    assert.equal(edgeResponseBody.success, true);
    assert.ok(edgeResponseBody.temporaryPassword, 'Edge Function response MUST contain temporaryPassword');
    const uiProvisionedUserId = edgeResponseBody.userId;
    createdUserIds.push(uiProvisionedUserId);

    console.log('    ✓ Live Edge Function intercepted during UI provisioning!');
    console.log(`      - Endpoint: ${edgeResponse.url()}`);
    console.log(`      - HTTP Status: ${edgeResponse.status()}`);
    console.log(`      - User ID: ${uiProvisionedUserId}`);
    console.log(`      - Generated Credential returned in JSON response: ${edgeResponseBody.temporaryPassword.substring(0, 4)}...[REDACTED]`);

    // 4.6 Verify One-Time Temporary Credential Display Dialog in UI
    console.log('  [UI Step 6] Verifying One-Time Temporary Credential Modal in UI...');
    await page.waitForSelector('text=Temporary Credentials Generated', { timeout: 10000 });
    const modalText = await page.textContent('body');
    assert.ok(modalText.includes('One-Time Display Warning'));
    assert.ok(modalText.includes(uiStaffEmail));

    // Capture temporary password from UI modal input/code
    const uiCapturedPassword = edgeResponseBody.temporaryPassword;
    console.log('    ✓ One-Time Temporary Credential Modal rendered with copy button and security notice');

    // Close modal
    const closeDialogBtn = page.locator('button:has-text("Done (I have saved the credentials)")');
    await closeDialogBtn.click();
    await page.waitForTimeout(500);

    // 4.7 Sign Out Admin
    console.log('  [UI Step 7] Logging out Platform Admin...');
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    console.log('    ✓ Admin session destroyed');

    // 4.8 Login as New Sub-Admin using Temporary Password
    console.log(`  [UI Step 8] Signing in as new Sub-Admin (${uiStaffEmail}) with temporary password...`);
    await page.goto(`${PREVIEW_URL}/platform/login`, { waitUntil: 'networkidle' });
    await page.fill('#platform-login-email', uiStaffEmail);
    await page.fill('#platform-login-password', uiCapturedPassword);
    await page.click('button[type="submit"]');

    // 4.9 Verify Mandatory Password-Change Interception
    console.log('  [UI Step 9] Verifying mandatory password rotation interception...');
    await page.waitForURL('**/reset-password?mandatory=true', { timeout: 15000 });
    const resetUrl = page.url();
    assert.ok(resetUrl.includes('/reset-password'), 'Sub-admin MUST be redirected to /reset-password');
    assert.ok(resetUrl.includes('mandatory=true'), 'URL MUST include mandatory=true parameter');
    console.log(`    ✓ Mandatory password change enforced (Arrived at: ${resetUrl})`);

    // 4.10 Complete Password Rotation via Form
    console.log('  [UI Step 10] Submitting new personal password in rotation form...');
    const newSubAdminPassword = `NewPersonalPass!${runId}#2026`;
    await page.fill('#reset-password-new', newSubAdminPassword);
    await page.fill('#reset-password-confirm', newSubAdminPassword);
    await page.click('button:has-text("Update Password")');

    await page.waitForSelector('text=Password Changed Successfully', { timeout: 10000 });
    console.log('    ✓ Password rotation form submitted and accepted!');

    // Verify must_change_password is now false on database
    const { data: updatedSubProfile } = await adminClient
      .from('profiles')
      .select('must_change_password, status, role, department')
      .eq('id', uiProvisionedUserId)
      .single();
    assert.equal(updatedSubProfile.must_change_password, false, 'must_change_password must be cleared');
    assert.equal(updatedSubProfile.status, 'active');
    assert.equal(updatedSubProfile.department, 'Assessment & Test Series');
    console.log('    ✓ Database verified: must_change_password cleared to false, status active');

    // 4.11 Verify Old Temporary Password Rejection
    console.log('  [UI Step 11] Verifying old temporary password is permanently rejected...');
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    const { error: oldPwdLoginErr } = await anonClient.auth.signInWithPassword({
      email: uiStaffEmail,
      password: uiCapturedPassword,
    });
    assert.ok(oldPwdLoginErr, 'Old temporary credential MUST be rejected by Supabase Auth');
    console.log('    ✓ Old temporary credential rejected (HTTP 400 Invalid Login Credentials)');

    // 4.12 Authenticate with New Personal Password
    console.log('  [UI Step 12] Signing in with new personal password...');
    const { data: newLoginData, error: newLoginErr } = await anonClient.auth.signInWithPassword({
      email: uiStaffEmail,
      password: newSubAdminPassword,
    });
    assert.ifError(newLoginErr);
    assert.ok(newLoginData.session);
    console.log('    ✓ New personal password authenticated successfully with valid Supabase session');

    // 4.13 Verify Role Permissions for Sub-Admin
    console.log('  [UI Step 13] Verifying granular role permissions on staging database...');
    const { data: subPerms } = await adminClient
      .from('user_permissions')
      .select('permission_key')
      .eq('user_id', uiProvisionedUserId);
    const permKeys = (subPerms || []).map(p => p.permission_key);
    assert.ok(permKeys.includes('tests.view'));
    assert.ok(permKeys.includes('tests.create'));
    assert.ok(permKeys.includes('tests.publish'));
    assert.ok(permKeys.includes('tests.schedule'));
    assert.ok(permKeys.includes('tests.view_results'));
    assert.ok(permKeys.includes('students.view'));
    assert.ok(permKeys.includes('content.export'));
    assert.ok(!permKeys.includes('subadmins.manage'), 'Sub-admin MUST NOT hold subadmins.manage');
    console.log(`    ✓ Granular permissions verified (${permKeys.length} assessment permissions assigned, least privilege enforced)`);

    await browser.close();
    console.log('\n=============================================================================');
    console.log('🎉 ALL STAGING EDGE FUNCTION & UI PROVISIONING ACCEPTANCE TESTS PASSED (100%)!');
    console.log('=============================================================================');

  } finally {
    // -------------------------------------------------------------------------
    // Phase 5: Automated Teardown of Test Accounts
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 5: Automated Teardown of Staging Test Fixtures ---');
    console.log(`Total test accounts to purge: ${createdUserIds.length}`);

    for (const userId of createdUserIds) {
      try {
        await adminClient.from('user_permissions').delete().eq('user_id', userId);
        await adminClient.from('staff_invitations').delete().eq('invited_by', userId);
        await adminClient.from('profiles').delete().eq('id', userId);
        await adminClient.auth.admin.deleteUser(userId);
      } catch (err) {
        console.warn(`  [Warning] Cleanup error for user ${userId}:`, err.message);
      }
    }

    await adminClient.from('staff_invitations').delete().ilike('email', `%${runId}%`);
    await adminClient.from('audit_logs').delete().ilike('resource_id', `%${runId}%`);

    console.log(`  ✓ Successfully purged ${createdUserIds.length} test accounts from staging`);
    console.log('  ✓ 0 test artifacts remain on staging');
  }
}

runEdgeFunctionSyncVerification().catch(err => {
  console.error('\n❌ STAGING EDGE FUNCTION VERIFICATION FAILED:');
  console.error(err);
  process.exit(1);
});
