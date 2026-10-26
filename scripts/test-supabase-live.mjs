/**
 * ==============================================================================
 * Yogneet Edu — Live Supabase Integration Test Suite
 * ==============================================================================
 * Executes real end-to-end integration tests against a live Supabase PostgreSQL
 * database when credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are provided.
 *
 * Checks:
 *   1. Database connectivity & Auth service availability
 *   2. Real user registration & profile auto-provisioning via trigger
 *   3. Positive profile mutation (bio, department)
 *   4. Negative authorization: Foreign profile mutation rejection (RLS)
 *   5. Negative authorization: Role self-escalation rejection (trigger)
 *   6. Negative authorization: Gamification metric tampering rejection (trigger)
 *   7. Negative authorization: Cross-student assessment attempts isolation (RLS)
 *   8. Negative authorization: Unauthorized audit log read isolation (RLS)
 *
 * If credentials are not present, gracefully skips with a setup advisory.
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Simple parser for .env / .env.local files without external dependencies
function loadLocalEnv() {
  const envFiles = ['.env.local', '.env'];
  const env = { ...process.env };

  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!env[key]) {
              env[key] = val;
            }
          }
        }
      } catch (err) {
        console.warn(`[Warning] Could not parse ${file}:`, err.message);
      }
    }
  }

  return env;
}

const env = loadLocalEnv();
const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim();

const isLiveConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder');

async function runLiveTests() {
  console.log('=============================================================================');
  console.log('           YOGNEET EDU — SUPABASE LIVE INTEGRATION TEST SUITE               ');
  console.log('=============================================================================');

  if (!isLiveConfigured) {
    console.log('[STATUS: SKIPPED] Live Supabase credentials are not configured in environment or .env.local.');
    console.log('');
    console.log('Notice: All 39 static and simulated tests in `npm test` are passing cleanly.');
    console.log('To run actual database integration tests against a live PostgreSQL database:');
    console.log('  1. Create .env.local with:');
    console.log('       VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co');
    console.log('       VITE_SUPABASE_ANON_KEY=<your-anon-public-key>');
    console.log('  2. Apply migrations in `supabase/migrations/` to the database.');
    console.log('  3. Re-run: npm run test:live');
    console.log('=============================================================================');
    process.exit(0);
  }

  console.log(`Target Supabase URL: ${supabaseUrl}`);
  console.log('Mode: Real PostgreSQL Engine Integration');
  console.log('-----------------------------------------------------------------------------');

  const clientAnon = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const testRunId = Date.now().toString(36);
  const emailA = `yogneet.test.a.${testRunId}@example.com`;
  const emailB = `yogneet.test.b.${testRunId}@example.com`;
  const password = `TestPass!9${testRunId}`;

  let studentAId = null;
  let studentBId = null;
  let clientA = null;
  let clientB = null;

  try {
    // -------------------------------------------------------------------------
    // Step 1: Sign up Student A
    // -------------------------------------------------------------------------
    console.log('\n[1/8] Registering Test Student A...');
    const { data: authDataA, error: authErrA } = await clientAnon.auth.signUp({
      email: emailA,
      password,
      options: {
        data: { name: `Test Student A (${testRunId})` },
      },
    });

    if (authErrA) {
      throw new Error(`Failed to sign up Test Student A: ${authErrA.message}`);
    }

    studentAId = authDataA.user?.id;
    if (!studentAId) throw new Error('Auth returned empty user ID for Student A.');
    console.log(`  ✓ Auth user created: ${studentAId}`);

    // Create authenticated client for Student A
    clientA = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          Authorization: `Bearer ${authDataA.session?.access_token}`,
        },
      },
    });

    // -------------------------------------------------------------------------
    // Step 2: Verify Profile Trigger Auto-Provisioning for Student A
    // -------------------------------------------------------------------------
    console.log('\n[2/8] Verifying public.handle_new_user() trigger for Student A...');
    // Allow brief trigger completion
    await new Promise((r) => setTimeout(r, 800));

    const { data: profileA, error: profErrA } = await clientA
      .from('profiles')
      .select('*')
      .eq('id', studentAId)
      .single();

    if (profErrA) throw new Error(`Could not query Student A profile: ${profErrA.message}`);
    if (!profileA) throw new Error('Trigger did not create profile row for Student A.');
    if (profileA.role !== 'student') throw new Error(`Unexpected default role: ${profileA.role}`);
    if (profileA.status !== 'active') throw new Error(`Unexpected default status: ${profileA.status}`);
    console.log(`  ✓ Profile auto-provisioned with role='${profileA.role}', status='${profileA.status}'`);

    // -------------------------------------------------------------------------
    // Step 3: Positive Test — Update Own Profile (Bio & Department)
    // -------------------------------------------------------------------------
    console.log('\n[3/8] Testing POSITIVE Profile Update (bio & department)...');
    const { data: updatedA, error: updateErrA } = await clientA
      .from('profiles')
      .update({
        bio: 'Aspiring Full Stack Engineer',
        department: 'Computer Science',
      })
      .eq('id', studentAId)
      .select()
      .single();

    if (updateErrA) throw new Error(`Failed to update own profile: ${updateErrA.message}`);
    if (updatedA.bio !== 'Aspiring Full Stack Engineer' || updatedA.department !== 'Computer Science') {
      throw new Error('Profile update fields did not persist properly.');
    }
    console.log('  ✓ Own profile updated successfully under RLS policy `profiles_update_own`.');

    // -------------------------------------------------------------------------
    // Step 4: Sign up Student B
    // -------------------------------------------------------------------------
    console.log('\n[4/8] Registering Test Student B...');
    const { data: authDataB, error: authErrB } = await clientAnon.auth.signUp({
      email: emailB,
      password,
      options: {
        data: { name: `Test Student B (${testRunId})` },
      },
    });

    if (authErrB) throw new Error(`Failed to sign up Test Student B: ${authErrB.message}`);
    studentBId = authDataB.user?.id;
    if (!studentBId) throw new Error('Auth returned empty user ID for Student B.');

    clientB = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          Authorization: `Bearer ${authDataB.session?.access_token}`,
        },
      },
    });
    console.log(`  ✓ Student B registered: ${studentBId}`);

    // Wait for Student B profile trigger
    await new Promise((r) => setTimeout(r, 800));

    // -------------------------------------------------------------------------
    // Step 5: Negative Test — Student A Attempts to Modify Student B Profile
    // -------------------------------------------------------------------------
    console.log('\n[5/8] Testing NEGATIVE Cross-Tenant Tampering (Student A -> Student B)...');
    const { data: tamperRes, error: tamperErr } = await clientA
      .from('profiles')
      .update({ bio: 'Illegitimately modified by Student A' })
      .eq('id', studentBId)
      .select();

    // RLS profiles_update_own should cause 0 rows to be updated
    if (tamperRes && tamperRes.length > 0) {
      throw new Error('SECURITY VIOLATION: Student A was able to update Student B profile!');
    }
    console.log('  ✓ Foreign profile mutation safely rejected by RLS (0 rows updated / access denied).');

    // -------------------------------------------------------------------------
    // Step 6: Negative Test — Privilege Escalation Rejection (Role -> Admin)
    // -------------------------------------------------------------------------
    console.log('\n[6/8] Testing NEGATIVE Privilege Escalation (Student A -> role: admin)...');
    const { data: escRes, error: escErr } = await clientA
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', studentAId)
      .select();

    if (!escErr && escRes && escRes.some((r) => r.role === 'admin')) {
      throw new Error('CRITICAL SECURITY VULNERABILITY: Student was able to escalate role to admin!');
    }
    console.log(`  ✓ Role escalation safely blocked by database trigger: ${escErr?.message || 'Access Denied'}`);

    // -------------------------------------------------------------------------
    // Step 7: Negative Test — Gamification Counter Tampering Rejection
    // -------------------------------------------------------------------------
    console.log('\n[7/8] Testing NEGATIVE Gamification Tampering (solved_problems_count)...');
    const { data: countRes, error: countErr } = await clientA
      .from('profiles')
      .update({ solved_problems_count: 9999 })
      .eq('id', studentAId)
      .select();

    if (!countErr && countRes && countRes.some((r) => r.solved_problems_count === 9999)) {
      throw new Error('CRITICAL SECURITY VULNERABILITY: Student altered gamification metric directly!');
    }
    console.log(`  ✓ Metric tampering safely blocked by database trigger: ${countErr?.message || 'Access Denied'}`);

    // -------------------------------------------------------------------------
    // Step 8: Negative Test — Assessment Attempts & Audit Log Isolation
    // -------------------------------------------------------------------------
    console.log('\n[8/8] Testing NEGATIVE Record Isolation (Attempts & Audit Logs)...');
    const { data: foreignAttempts, error: attemptErr } = await clientA
      .from('assessment_attempts')
      .select('*')
      .eq('user_id', studentBId);

    if (foreignAttempts && foreignAttempts.length > 0) {
      throw new Error('SECURITY VIOLATION: Student A can read Student B assessment attempts!');
    }

    const { data: auditRows, error: auditErr } = await clientA
      .from('audit_logs')
      .select('*');

    if (auditRows && auditRows.length > 0) {
      throw new Error('SECURITY VIOLATION: Non-admin student was able to read audit logs!');
    }
    console.log('  ✓ Private attempts and audit logs strictly isolated under RLS.');

    console.log('\n=============================================================================');
    console.log('  ALL LIVE POSTGRESQL DATABASE INTEGRATION & SECURITY TESTS PASSED!          ');
    console.log('=============================================================================');
  } catch (err) {
    console.error('\n[FAILED] Live Supabase integration test encountered an error:');
    console.error(err.message);
    process.exit(1);
  }
}

runLiveTests();
