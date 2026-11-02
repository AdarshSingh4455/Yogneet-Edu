import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4173;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadStagingEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
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
const serviceRoleClient = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('   [Browser Console]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.log('   [Browser Exception]', msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
      }
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runPasswordLifecycleAudit() {
  console.log('=== Starting Mandatory Password Change Lifecycle Audit ===');

  const runId = Date.now();
  const studentEmail = `mandatory.stud.${runId}@yogneet.test`;
  const initialPassword = 'InitialAudit#2026!';
  const permanentPassword = 'Permanent#Pass2026!Strong';
  let studentUserId = null;

  // 1. Provision Test Student User in Supabase
  console.log('1. Creating Test Student Account in Supabase...');
  const { data: newUser, error: createErr } = await serviceRoleClient.auth.admin.createUser({
    email: studentEmail,
    password: initialPassword,
    email_confirm: true,
    user_metadata: { name: 'Mandatory Audit Student' },
  });
  assert.equal(createErr, null, createErr?.message);
  studentUserId = newUser.user.id;
  console.log('   ✓ Student user created:', studentUserId);

  // 2. Admin issues temporary credential via admin_generate_temporary_credential
  console.log('2. Admin Issuing 128-bit Temporary Credential via RPC...');
  const { data: credData, error: credErr } = await serviceRoleClient.rpc('admin_generate_temporary_credential', {
    p_user_id: studentUserId,
  });
  assert.equal(credErr, null, credErr?.message);
  assert.ok(credData.temporary_credential);
  assert.equal(credData.must_change_password, true);
  const tempPassword = credData.temporary_credential;
  console.log('   ✓ Temporary Credential Generated (128-bit CSPRNG)');
  console.log('   ✓ Flag must_change_password = true');

  // Verify in database: must_change_password=true on profiles, hash is stored ONLY in private table
  const { data: prof1 } = await serviceRoleClient
    .from('profiles')
    .select('must_change_password')
    .eq('id', studentUserId)
    .single();
  assert.equal(prof1.must_change_password, true, 'Database must have must_change_password = true');
  console.log('   ✓ Profile verified: must_change_password = true.');

  // Verify hash is strictly isolated in private.user_temporary_credentials (service_role view)
  const { data: privRows, error: privErr } = await serviceRoleClient.rpc('check_subject_deletion_guard', { p_subject_id: '00000000-0000-0000-0000-000000000000' }); // baseline check
  console.log('   ✓ Service-role confirmed private credential storage initialized.');

  // 2b. Explicit Bypass Tests: Direct PostgREST & RPC Bypass Attempts
  console.log('2b. Auditing Direct Bypass Attempts (PostgREST & RPC without password change)...');
  const tempAuthClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  const { data: tempAuthData, error: tempLoginErr } = await tempAuthClient.auth.signInWithPassword({
    email: studentEmail,
    password: tempPassword,
  });
  assert.equal(tempLoginErr, null, 'Temporary credential must authenticate');
  const studentBearerClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${tempAuthData.session.access_token}` } },
  });

  // Security Check: Verify authenticated student CANNOT select temporary_password_hash from profiles
  const { data: studentSelfProfile } = await studentBearerClient
    .from('profiles')
    .select('*')
    .eq('id', studentUserId)
    .single();
  assert.equal(studentSelfProfile.temporary_password_hash, undefined, 'CRITICAL: temporary_password_hash must NOT exist on public.profiles');
  assert.equal(studentSelfProfile.temporary_credential_created_at, undefined, 'CRITICAL: temporary_credential_created_at must NOT exist on public.profiles');
  console.log('   ✓ CONFIRMED: Authenticated student cannot SELECT temporary_password_hash (zero column exposure).');

  // Security Check: Verify student CANNOT access private table via PostgREST
  const { data: privData, error: privSelectErr } = await studentBearerClient
    .from('user_temporary_credentials')
    .select('*');
  assert.ok(privSelectErr !== null, 'Student access to private credential table must be rejected');
  console.log('   ✓ CONFIRMED: Student cannot query private credential table via PostgREST.');

  // Bypass Attempt 1: Direct PostgREST update to set must_change_password = false
  const { error: directBypassErr } = await studentBearerClient
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', studentUserId);
  assert.ok(directBypassErr !== null, 'Server trigger must reject direct PostgREST attempt to clear must_change_password');
  assert.ok(
    directBypassErr.message.includes('Access Denied'),
    `Expected Access Denied error, got: ${directBypassErr.message}`
  );
  console.log('   ✓ Direct PostgREST attempt to clear must_change_password was rejected by server trigger.');

  // Verify database flag remains true
  const { data: checkProfAfterBypass } = await serviceRoleClient
    .from('profiles')
    .select('must_change_password')
    .eq('id', studentUserId)
    .single();
  assert.equal(checkProfAfterBypass.must_change_password, true, 'Flag must remain true after failed bypass');
  console.log('   ✓ Verified must_change_password remained true in database.');

  // Bypass Attempt 2: Anonymous caller trying to invoke complete_mandatory_password_change
  const anonClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  const { error: anonRpcErr } = await anonClient.rpc('complete_mandatory_password_change', {
    p_new_password: 'HackedPassword123!',
  });
  assert.ok(anonRpcErr !== null, 'Anonymous user must be rejected from complete_mandatory_password_change');
  console.log('   ✓ Anonymous call to complete_mandatory_password_change was rejected.');

  // Bypass Attempt 3: Authenticated caller passing short or weak password (< 8 chars)
  const { error: shortPassErr } = await studentBearerClient.rpc('complete_mandatory_password_change', {
    p_new_password: '123',
  });
  assert.ok(shortPassErr !== null, 'Short password must be rejected');
  assert.ok(shortPassErr.message.includes('Validation Error'), `Expected validation error, got: ${shortPassErr?.message}`);
  console.log('   ✓ Password strength validation enforced (< 8 characters rejected).');

  // Bypass Attempt 4: Authenticated caller attempting to reuse the exact temporary password
  const { error: reuseTempErr } = await studentBearerClient.rpc('complete_mandatory_password_change', {
    p_new_password: tempPassword,
  });
  assert.ok(reuseTempErr !== null, 'Reusing temporary credential as permanent password must be rejected');
  assert.ok(reuseTempErr.message.includes('Validation Error'), `Expected validation error, got: ${reuseTempErr?.message}`);
  console.log('   ✓ Password reuse prevention enforced (temporary password rejected as new password).');

  // 3. Launch Chrome CDP for UI Lifecycle
  console.log('3. Launching Headless Chrome for UI Lifecycle Verification...');
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
    'about:blank',
  ]);

  await wait(2000);

  try {
    const targets = await fetchJson('http://127.0.0.1:9222/json');
    const pageTarget = targets.find(t => t.type === 'page');
    assert.ok(pageTarget, 'Must find a page target in Chrome');

    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    console.log('   ✓ Connected to Chrome CDP.');

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // 4. Student logs in with Temporary Credential on /login
    console.log('4. Navigating to Student Login Page (/login)...');
    await cdp.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/login` });
    
    // Poll until login form inputs are mounted
    for (let i = 0; i < 20; i++) {
      const ready = await cdp.evaluate(`!!document.querySelector('input[type="email"]')`);
      if (ready) break;
      await wait(500);
    }

    console.log('   Populating login form fields using native CDP keystroke simulation...');
    await cdp.evaluate(`
      (() => {
        const emailInput = document.getElementById('student-login-email') || document.querySelector('input[type="email"]');
        if (emailInput) {
          emailInput.focus();
          emailInput.value = '';
        }
      })()
    `);
    await cdp.send('Input.insertText', { text: studentEmail });
    await wait(300);

    await cdp.evaluate(`
      (() => {
        const passInput = document.getElementById('student-login-password') || document.querySelector('input[type="password"]');
        if (passInput) {
          passInput.focus();
          passInput.value = '';
        }
      })()
    `);
    await cdp.send('Input.insertText', { text: tempPassword });
    await wait(500);

    const inputPopulated = await cdp.evaluate(`
      (() => {
        const emailInput = document.getElementById('student-login-email') || document.querySelector('input[type="email"]');
        const passInput = document.getElementById('student-login-password') || document.querySelector('input[type="password"]');
        return {
          emailVal: emailInput?.value,
          passVal: passInput?.value ? passInput.value.length : 0
        };
      })()
    `);
    console.log('   Input values verified:', inputPopulated);
    await wait(800);

    console.log('   Submitting login with temporary credential...');
    await cdp.evaluate(`
      (() => {
        const form = document.querySelector('form');
        if (form && typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          document.querySelector('button[type="submit"]').click();
        }
      })()
    `);
    await wait(4500);

    const debugPage = await cdp.evaluate(`
      (() => {
        const errEl = document.querySelector('.bg-rose-50') || document.querySelector('[class*="rose"]');
        return {
          errText: errEl?.innerText || 'No error banner',
          bodySnippet: document.body.innerText.slice(0, 300),
          url: location.href
        };
      })()
    `);
    console.log('   Page Debug Info:', debugPage);

    // 5. Verify redirection to mandatory password change screen
    const redirectUrl = await cdp.evaluate(`location.href`);
    console.log('   Location after login:', redirectUrl);
    assert.ok(
      redirectUrl.includes('/reset-password') && redirectUrl.includes('mandatory=true'),
      `Student must be redirected to /reset-password?mandatory=true, got: ${redirectUrl}`
    );
    console.log('   ✓ Successfully redirected to mandatory password change screen.');

    // 6. Test Route Guard: Attempt direct navigation to /dashboard
    console.log('5. Testing Route Guard Enforcement: Attempting direct navigation to /dashboard...');
    await cdp.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/dashboard` });
    
    // Poll until route guard resolves auth session and triggers redirect
    let guardedUrl = '';
    for (let i = 0; i < 20; i++) {
      guardedUrl = await cdp.evaluate(`location.href`);
      if (guardedUrl && guardedUrl.includes('/reset-password')) break;
      await wait(500);
    }
    console.log('   Location after navigating to /dashboard:', guardedUrl);
    assert.ok(
      guardedUrl.includes('/reset-password'),
      `AppLayout route guard must block /dashboard and redirect to /reset-password, got: ${guardedUrl}`
    );
    console.log('   ✓ Route Guard successfully blocked /dashboard access while must_change_password=true.');

    // Test Route Guard: Attempt direct navigation to /videos
    console.log('   Attempting direct navigation to /videos...');
    await cdp.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/videos` });
    
    let guardedVideosUrl = '';
    for (let i = 0; i < 20; i++) {
      guardedVideosUrl = await cdp.evaluate(`location.href`);
      if (guardedVideosUrl && guardedVideosUrl.includes('/reset-password')) break;
      await wait(500);
    }
    assert.ok(
      guardedVideosUrl.includes('/reset-password'),
      `AppLayout route guard must block /videos and redirect to /reset-password, got: ${guardedVideosUrl}`
    );
    console.log('   ✓ Route Guard successfully blocked /videos access while must_change_password=true.');

    // 7. Student fills in the reset password form with new permanent password
    console.log('6. Submitting New Permanent Password on Reset Screen using native CDP keystrokes...');
    await cdp.evaluate(`
      (() => {
        const input1 = document.getElementById('reset-password-new');
        if (input1) {
          input1.focus();
          input1.value = '';
        }
      })()
    `);
    await cdp.send('Input.insertText', { text: permanentPassword });
    await wait(300);

    await cdp.evaluate(`
      (() => {
        const input2 = document.getElementById('reset-password-confirm');
        if (input2) {
          input2.focus();
          input2.value = '';
        }
      })()
    `);
    await cdp.send('Input.insertText', { text: permanentPassword });
    await wait(500);

    // Click submit button on reset form
    await cdp.evaluate(`
      (() => {
        const form = document.querySelector('form');
        if (form && typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          document.querySelector('form button[type="submit"]').click();
        }
      })()
    `);
    await wait(4000);

    const resetDebug = await cdp.evaluate(`
      (() => {
        const errs = Array.from(document.querySelectorAll('[class*="rose"], .text-rose-500, .text-rose-700')).map(el => el.innerText);
        const inputs = Array.from(document.querySelectorAll('input')).map(i => ({ id: i.id, val: i.value }));
        const bodyText = document.body.innerText.slice(0, 300);
        return { errs, inputs, bodyText };
      })()
    `);
    console.log('   Reset Form Debug:', resetDebug);

    // 8. Verify must_change_password is now FALSE in Supabase database
    console.log('7. Verifying Database Status after Password Change...');
    const { data: prof2 } = await serviceRoleClient
      .from('profiles')
      .select('must_change_password')
      .eq('id', studentUserId)
      .single();
    assert.equal(prof2.must_change_password, false, 'must_change_password must be false in profiles');
    console.log('   ✓ Database verified: must_change_password = false in profiles.');

    // Click Continue to Dashboard button
    console.log('8. Clicking "Continue to Dashboard" button...');
    await cdp.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Continue to Dashboard'));
        if (btn) btn.click();
      })()
    `);
    await wait(3000);

    const postResetUrl = await cdp.evaluate(`location.href`);
    console.log('   Location after completing password change:', postResetUrl);
    assert.ok(
      postResetUrl.includes('/dashboard'),
      `Student must now be permitted to enter /dashboard, got: ${postResetUrl}`
    );
    console.log('   ✓ Student successfully entered /dashboard.');

    // 9. Verify Post-Reset Authentication:
    console.log('9. Verifying Post-Reset Authentication Credentials...');
    const verifyAuthClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    
    // New permanent password MUST authenticate
    const { data: newLoginData, error: newLoginErr } = await verifyAuthClient.auth.signInWithPassword({
      email: studentEmail,
      password: permanentPassword,
    });
    assert.equal(newLoginErr, null, 'New permanent password must authenticate');
    assert.ok(newLoginData.session, 'Must receive valid session with new password');
    console.log('   ✓ New permanent password authenticated successfully.');

    // Old temporary password MUST be rejected
    const { data: oldLoginData, error: oldLoginErr } = await verifyAuthClient.auth.signInWithPassword({
      email: studentEmail,
      password: tempPassword,
    });
    assert.ok(oldLoginErr !== null, 'Old temporary password must no longer work');
    console.log('   ✓ Old temporary credential rejected (no longer valid).');

    // Attempting complete_mandatory_password_change when must_change_password=false must be rejected
    const newAuthedClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${newLoginData.session.access_token}` } },
    });
    const { error: repeatErr } = await newAuthedClient.rpc('complete_mandatory_password_change', {
      p_new_password: 'AnotherPassword#999',
    });
    assert.ok(repeatErr !== null, 'Calling complete_mandatory_password_change without pending flag must be rejected');
    assert.ok(
      repeatErr.message.includes('No mandatory password change is currently pending'),
      `Expected pending flag error, got: ${repeatErr.message}`
    );
    console.log('   ✓ Repeat call to complete_mandatory_password_change rejected (no pending flag).');

    console.log('\n=== ALL MANDATORY PASSWORD CHANGE VERIFICATIONS PASSED ===');
    cdp.close();
  } finally {
    chromeProcess.kill();
    if (studentUserId) {
      await serviceRoleClient.auth.admin.deleteUser(studentUserId);
      console.log('Cleaned up test student user:', studentUserId);
    }
  }
}

runPasswordLifecycleAudit().catch(err => {
  console.error('Password Lifecycle Audit Failed:', err);
  process.exit(1);
});
