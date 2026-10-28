/**
 * ==============================================================================
 * Yogneet Edu — Live Supabase Integration Test Suite (Hardened Staging E2E)
 * ==============================================================================
 * Executes real end-to-end integration tests against an isolated staging
 * Supabase PostgreSQL database.
 *
 * Safety & Isolation Guarantees:
 *   1. Strictly requires .env.local; NEVER falls back to production .env.
 *   2. Strictly requires VITE_ENVIRONMENT=staging.
 *   3. Rejects known production hostname acmhdklihpqzurzuthkw.supabase.co.
 *   4. Fails closed before client initialization or network requests.
 *   5. Requires staging service-role key for guaranteed automated teardown.
 *   6. Dispatches pre-confirmed disposable test accounts via admin API,
 *      eliminating the need to disable email confirmation project-wide.
 *   7. Distinguishes safe skips from failures; incomplete runs fail closed.
 *   8. All 12 test assertions must pass before printing the verified banner.
 *
 * Phase 3B Test Coverage:
 *   - Auto-provisioning via public.handle_new_user() trigger
 *   - Positive profile update under profiles_update_own
 *   - Negative cross-tenant profile mutation rejection
 *   - Negative privilege escalation rejection (role -> admin)
 *   - Negative gamification counter tampering rejection (trigger depth check)
 *   - Cross-student assessment attempts and audit log RLS isolation
 *   - Pre-submission question masking (RPC get_assessment_questions_for_taking)
 *   - Direct attempt insertion denial (policy dropped)
 *   - Server-authoritative scoring & verification (RPC submit_assessment_attempt)
 *   - Post-submission solution review unlocking for verified attempts
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

export const KNOWN_PRODUCTION_HOST = 'acmhdklihpqzurzuthkw.supabase.co';
export const SUCCESS_BANNER = 'ALL 12 HARDENED STAGING E2E SECURITY INTEGRATION TESTS PASSED CLEANLY!';

/**
 * Loads environment variables strictly from .env.local (or specified file).
 * Never reads or falls back to .env!
 */
export function loadStagingEnv(customEnvPath) {
  const targetPath = customEnvPath || path.resolve(process.cwd(), '.env.local');
  const env = { ...process.env };

  if (fs.existsSync(targetPath)) {
    try {
      const content = fs.readFileSync(targetPath, 'utf-8');
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
          env[key] = val;
        }
      }
    } catch (err) {
      console.warn(`[Warning] Could not parse ${targetPath}:`, err.message);
    }
  }

  return env;
}

/**
 * Validates the runtime configuration to guarantee strict isolation from production.
 * Fails closed before any network request or client instantiation.
 */
export function validateStagingConfig(env) {
  const errors = [];

  // 1. Explicit staging environment declaration
  if (env.VITE_ENVIRONMENT !== 'staging') {
    errors.push("VITE_ENVIRONMENT must be explicitly set to 'staging'");
  }

  // 2. Reject production host and validate staging URL
  const rawUrl = env.VITE_SUPABASE_URL?.trim();
  if (!rawUrl) {
    errors.push('VITE_SUPABASE_URL is missing or empty');
  } else {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.hostname === KNOWN_PRODUCTION_HOST || rawUrl.includes('acmhdklihpqzurzuthkw')) {
        errors.push(`CRITICAL SECURITY VIOLATION: Cannot target production host ${KNOWN_PRODUCTION_HOST}`);
      }
      if (!parsed.protocol.startsWith('http')) {
        errors.push('VITE_SUPABASE_URL must use http or https protocol');
      }
      if (rawUrl.includes('placeholder') || rawUrl.includes('<your-project-ref>')) {
        errors.push('VITE_SUPABASE_URL contains placeholder value');
      }
    } catch {
      errors.push('VITE_SUPABASE_URL is not a valid URL');
    }
  }

  // 3. Staging Anon Key
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is missing or empty');
  } else if (anonKey.includes('placeholder') || anonKey.includes('<your-anon-public-key>')) {
    errors.push('VITE_SUPABASE_ANON_KEY contains placeholder value');
  }

  // 4. Staging Service Role Key (Mandatory for safe automated cleanup of test users)
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required for automated test teardown');
  } else if (serviceKey.includes('placeholder') || serviceKey.includes('<your-staging-service-role-key>')) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY contains placeholder value');
  }

  return {
    isValid: errors.length === 0,
    errors,
    url: rawUrl,
    anonKey,
    serviceKey,
  };
}

export async function runLiveTests(injectedEnv, options = {}) {
  console.log('=============================================================================');
  console.log('      YOGNEET EDU — HARDENED STAGING E2E ASSESSMENT SECURITY TEST SUITE     ');
  console.log('=============================================================================');

  const localEnvPath = path.resolve(process.cwd(), '.env.local');
  const hasLocalEnv = injectedEnv ? true : fs.existsSync(localEnvPath);
  const env = injectedEnv || loadStagingEnv();

  // If .env.local does not exist, fail closed with safe setup instructions
  if (!hasLocalEnv && !env.VITE_SUPABASE_URL) {
    console.log('[STATUS: SKIPPED] No .env.local staging file detected.');
    console.log('');
    console.log('Safety rule: The live E2E test runner strictly requires .env.local with VITE_ENVIRONMENT=staging.');
    console.log('It will NEVER fall back to .env to prevent accidental execution against production.');
    console.log('');
    console.log('To run against an isolated staging project:');
    console.log('  1. Create .env.local with:');
    console.log('       VITE_ENVIRONMENT=staging');
    console.log('       VITE_SUPABASE_URL=https://<staging-project-ref>.supabase.co');
    console.log('       VITE_SUPABASE_ANON_KEY=<staging-anon-key>');
    console.log('       SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>');
    console.log('  2. Re-run: npm run test:live');
    console.log('=============================================================================');
    if (options.exitOnSkip === false) {
      return { status: 'SKIPPED', message: 'No .env.local staging file detected.' };
    }
    process.exit(0);
  }

  const validation = validateStagingConfig(env);
  if (!validation.isValid) {
    console.error('[CRITICAL CONFIGURATION ERROR] Staging environment validation failed:');
    for (const err of validation.errors) {
      console.error(`  - ${err}`);
    }
    console.error('\nAborting before creating any Supabase clients or initiating network connections.');
    if (options.throwOnInvalid) {
      throw new Error(`Staging environment validation failed: ${validation.errors.join('; ')}`);
    }
    process.exit(1);
  }

  const supabaseUrl = validation.url;
  const supabaseAnonKey = validation.anonKey;
  const serviceKey = validation.serviceKey;
  const createSupabaseClient = options.clientFactory || createClient;
  const delayMs = options.delayMs !== undefined ? options.delayMs : 800;

  console.log(`Target Staging Host: ${supabaseUrl}`);
  console.log('Mode: Isolated Staging Integration');
  console.log('-----------------------------------------------------------------------------');

  const adminClient = createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const clientAnon = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const testRunId = Date.now().toString(36);
  const emailA = `yogneet.staging.a.${testRunId}@example.com`;
  const emailB = `yogneet.staging.b.${testRunId}@example.com`;
  const password = `StagingPass!9${testRunId}`;
  const testAssessmentId = `staging-assessment-${testRunId}`;

  let studentAId = null;
  let studentBId = null;
  let clientA = null;
  let clientB = null;
  let createdAssessment = false;
  let completedSteps = 0;
  let failureError = null;

  try {
    // -------------------------------------------------------------------------
    // Step 1: Provision & Authenticate Disposable Student A
    // -------------------------------------------------------------------------
    console.log('\n[1/12] Provisioning & Authenticating Disposable Student A...');
    // Create via admin API with email_confirm: true (disposable test account pre-confirmed)
    const { data: authDataA, error: authErrA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { name: `Test Student A (${testRunId})` },
    });

    if (authErrA) throw new Error(`Failed to provision Test Student A: ${authErrA.message}`);
    studentAId = authDataA?.user?.id;
    if (!studentAId) throw new Error('Auth admin API returned empty user ID for Student A.');
    console.log(`  ✓ Auth user provisioned (pre-confirmed): ${studentAId}`);

    // Authenticate via clientAnon to obtain authentic student session and access token
    const { data: signInDataA, error: signInErrA } = await clientAnon.auth.signInWithPassword({
      email: emailA,
      password,
    });

    if (signInErrA) throw new Error(`Failed to sign in as Student A: ${signInErrA.message}`);
    if (!signInDataA?.session?.access_token) {
      throw new Error('Authentication failure: No access token returned for Student A session.');
    }

    clientA = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${signInDataA.session.access_token}` } },
    });
    console.log(`  ✓ Student A authenticated session established.`);
    completedSteps++;

    // -------------------------------------------------------------------------
    // Step 2: Verify Profile Trigger Auto-Provisioning for Student A
    // -------------------------------------------------------------------------
    console.log('\n[2/12] Verifying public.handle_new_user() trigger for Student A...');
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

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
    completedSteps++;

    // -------------------------------------------------------------------------
    // Step 3: Positive Test — Update Own Profile (Bio & Department)
    // -------------------------------------------------------------------------
    console.log('\n[3/12] Testing POSITIVE Profile Update (bio & department)...');
    const { data: updatedA, error: updateErrA } = await clientA
      .from('profiles')
      .update({ bio: 'Aspiring Full Stack Engineer', department: 'Computer Science' })
      .eq('id', studentAId)
      .select()
      .single();

    if (updateErrA) throw new Error(`Failed to update own profile: ${updateErrA.message}`);
    if (updatedA.bio !== 'Aspiring Full Stack Engineer' || updatedA.department !== 'Computer Science') {
      throw new Error('Profile update fields did not persist properly.');
    }
    console.log('  ✓ Own profile updated successfully under RLS policy `profiles_update_own`.');
    completedSteps++;

    // -------------------------------------------------------------------------
    // Step 4: Provision & Authenticate Disposable Student B
    // -------------------------------------------------------------------------
    console.log('\n[4/12] Provisioning & Authenticating Disposable Student B...');
    const { data: authDataB, error: authErrB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { name: `Test Student B (${testRunId})` },
    });

    if (authErrB) throw new Error(`Failed to provision Test Student B: ${authErrB.message}`);
    studentBId = authDataB?.user?.id;
    if (!studentBId) throw new Error('Auth admin API returned empty user ID for Student B.');
    console.log(`  ✓ Auth user provisioned (pre-confirmed): ${studentBId}`);

    const { data: signInDataB, error: signInErrB } = await clientAnon.auth.signInWithPassword({
      email: emailB,
      password,
    });

    if (signInErrB) throw new Error(`Failed to sign in as Student B: ${signInErrB.message}`);
    if (!signInDataB?.session?.access_token) {
      throw new Error('Authentication failure: No access token returned for Student B session.');
    }

    clientB = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${signInDataB.session.access_token}` } },
    });
    console.log(`  ✓ Student B authenticated session established.`);
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    completedSteps++;

    // -------------------------------------------------------------------------
    // Step 5: Negative Test — Cross-Tenant Profile Tampering
    // -------------------------------------------------------------------------
    console.log('\n[5/12] Testing NEGATIVE Cross-Tenant Tampering (Student A -> Student B)...');
    const { data: tamperRes } = await clientA
      .from('profiles')
      .update({ bio: 'Illegitimately modified by Student A' })
      .eq('id', studentBId)
      .select();

    if (tamperRes && tamperRes.length > 0) {
      throw new Error('SECURITY VIOLATION: Student A was able to update Student B profile!');
    }
    console.log('  ✓ Foreign profile mutation safely rejected by RLS (0 rows updated).');
    completedSteps++;

    // -------------------------------------------------------------------------
    // Step 6: Negative Test — Privilege Escalation Rejection
    // -------------------------------------------------------------------------
    console.log('\n[6/12] Testing NEGATIVE Privilege Escalation (Student A -> role: admin)...');
    const { data: escRes, error: escErr } = await clientA
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', studentAId)
      .select();

    if (!escErr && escRes && escRes.some((r) => r.role === 'admin')) {
      throw new Error('CRITICAL SECURITY VULNERABILITY: Student was able to escalate role to admin!');
    }
    console.log(`  ✓ Role escalation safely blocked by database trigger: ${escErr?.message || 'Access Denied'}`);
    completedSteps++;

    // -------------------------------------------------------------------------
    // Step 7: Negative Test — Gamification Counter Tampering Rejection
    // -------------------------------------------------------------------------
    console.log('\n[7/12] Testing NEGATIVE Gamification Tampering (tests_completed_count)...');
    const { data: countRes, error: countErr } = await clientA
      .from('profiles')
      .update({ tests_completed_count: 999 })
      .eq('id', studentAId)
      .select();

    if (!countErr && countRes && countRes.some((r) => r.tests_completed_count === 999)) {
      throw new Error('CRITICAL SECURITY VULNERABILITY: Student altered gamification metric directly!');
    }
    console.log(`  ✓ Metric tampering safely blocked by database trigger: ${countErr?.message || 'Access Denied'}`);
    completedSteps++;

    // -------------------------------------------------------------------------
    // Step 8: Negative Test — Cross-Student Attempts & Audit Log Isolation
    // -------------------------------------------------------------------------
    console.log('\n[8/12] Testing NEGATIVE Record Isolation (Attempts & Audit Logs)...');
    const { data: foreignAttempts } = await clientA
      .from('assessment_attempts')
      .select('*')
      .eq('user_id', studentBId);

    if (foreignAttempts && foreignAttempts.length > 0) {
      throw new Error('SECURITY VIOLATION: Student A can read Student B assessment attempts!');
    }

    const { data: auditRows } = await clientA.from('audit_logs').select('*');
    if (auditRows && auditRows.length > 0) {
      throw new Error('SECURITY VIOLATION: Non-admin student was able to read audit logs!');
    }
    console.log('  ✓ Private attempts and audit logs strictly isolated under RLS.');
    completedSteps++;

    // -------------------------------------------------------------------------
    // Step 9: Phase 3B — Set Up Staging Assessment Fixture & Verify Question Masking
    // -------------------------------------------------------------------------
    console.log('\n[9/12] Setting up staging assessment & testing Question Masking...');
    const q1Id = `q1-${testRunId}`;
    const q2Id = `q2-${testRunId}`;

    // Admin creates fixture assessment
    await adminClient.from('assessments').insert({
      id: testAssessmentId,
      title: `E2E Staging Assessment (${testRunId})`,
      description: 'Automated assessment security test',
      category: 'Security Testing',
      difficulty: 'Intermediate',
      total_marks: 10,
      total_questions: 2,
      duration_minutes: 15,
      passing_percentage: 50,
      status: 'active',
    });
    createdAssessment = true;

    await adminClient.from('assessment_questions').insert([
      {
        id: q1Id,
        test_id: testAssessmentId,
        question_number: 1,
        text: 'What is the standard principle of least privilege?',
        marks: 5,
        negative_marks: 1,
        options: [
          { id: 'opt_1a', text: 'Grant minimal necessary permissions' },
          { id: 'opt_1b', text: 'Grant unrestricted superuser access' },
        ],
        correct_answer_id: 'opt_1a',
        explanation: 'Least privilege minimizes the attack surface.',
      },
      {
        id: q2Id,
        test_id: testAssessmentId,
        question_number: 2,
        text: 'Where must assessment scoring calculations be performed?',
        marks: 5,
        negative_marks: 1,
        options: [
          { id: 'opt_2a', text: 'In the client browser' },
          { id: 'opt_2b', text: 'On the authoritative server/database' },
        ],
        correct_answer_id: 'opt_2b',
        explanation: 'Server-side scoring prevents student score tampering.',
      },
    ]);

    // Student A calls taking RPC
    const { data: takingQuestions, error: takingErr } = await clientA.rpc(
      'get_assessment_questions_for_taking',
      { p_test_id: testAssessmentId }
    );

    if (takingErr) throw new Error(`get_assessment_questions_for_taking failed: ${takingErr.message}`);
    if (!takingQuestions || takingQuestions.length !== 2) {
      throw new Error(`Expected 2 questions, received: ${takingQuestions?.length}`);
    }

    for (const q of takingQuestions) {
      if (q.correct_answer_id !== undefined || q.explanation !== undefined) {
        throw new Error('SECURITY VIOLATION: Taking RPC leaked solution keys or explanation!');
      }
    }
    console.log('  ✓ Question taking RPC returned questions with solutions strictly masked.');

    // Pre-submission direct table select must return 0 rows for Student A
    const { data: preSubmissionRaw } = await clientA
      .from('assessment_questions')
      .select('*')
      .eq('test_id', testAssessmentId);

    if (preSubmissionRaw && preSubmissionRaw.length > 0) {
      throw new Error('SECURITY VIOLATION: Student queried full assessment_questions table prior to submission!');
    }
    console.log('  ✓ Direct assessment_questions SELECT rejected prior to verified submission.');
    completedSteps++;

    // -------------------------------------------------------------------------
    // Step 10: Phase 3B — Direct Attempt Insertion Denial (RLS)
    // -------------------------------------------------------------------------
    console.log('\n[10/12] Testing NEGATIVE Direct Attempt Insertion (RLS default-deny)...');
    const { data: directInsertRes, error: directInsertErr } = await clientA
      .from('assessment_attempts')
      .insert({
        test_id: testAssessmentId,
        user_id: studentAId,
        is_verified: true,
        score_obtained: 10,
        max_score: 10,
        percentage: 100,
        passed: true,
        total_questions: 2,
        answered_count: 2,
        unanswered_count: 0,
        marked_count: 0,
        correct_count: 2,
        incorrect_count: 0,
        user_answers: { [q1Id]: 'opt_1a', [q2Id]: 'opt_2b' },
      })
      .select();

    if (!directInsertErr && directInsertRes && directInsertRes.length > 0) {
      throw new Error('CRITICAL SECURITY VULNERABILITY: Student directly inserted an assessment attempt!');
    }
    console.log('  ✓ Direct attempt insertion safely rejected by RLS policy drop.');
    completedSteps++;

    // -------------------------------------------------------------------------
    // Step 11: Phase 3B — Authoritative Server Scoring & Attempt Verification
    // -------------------------------------------------------------------------
    console.log('\n[11/12] Testing Server-Authoritative Scoring via submit_assessment_attempt()...');
    // Student A submits 1 correct answer (q1=opt_1a) and 1 wrong answer (q2=opt_2a)
    // Expected: +5 marks, -1 mark = 4 / 10 marks (40% percentage, passed = false)
    const { data: submitResult, error: submitErr } = await clientA.rpc('submit_assessment_attempt', {
      p_test_id: testAssessmentId,
      p_time_spent_seconds: 90,
      p_user_answers: { [q1Id]: 'opt_1a', [q2Id]: 'opt_2a' },
      p_question_statuses: { [q1Id]: 'answered', [q2Id]: 'answered' },
    });

    if (submitErr) throw new Error(`submit_assessment_attempt failed: ${submitErr.message}`);
    if (submitResult.score_obtained !== 4) {
      throw new Error(`Expected score 4 (5 - 1), but got: ${submitResult.score_obtained}`);
    }
    if (submitResult.passed !== false) {
      throw new Error(`Expected passed=false for 40%, got: ${submitResult.passed}`);
    }

    // Verify stored attempt row is marked is_verified = true
    const { data: storedAttempt, error: storedErr } = await clientA
      .from('assessment_attempts')
      .select('*')
      .eq('attempt_id', submitResult.attempt_id)
      .single();

    if (storedErr) throw new Error(`Could not query submitted attempt: ${storedErr.message}`);
    if (storedAttempt.is_verified !== true) {
      throw new Error('SECURITY VIOLATION: Server-scored attempt was not marked is_verified=true!');
    }
    console.log(`  ✓ Authoritative score computed: ${storedAttempt.score_obtained}/${storedAttempt.max_score} (${storedAttempt.percentage}%) with is_verified=true.`);
    completedSteps++;

    // -------------------------------------------------------------------------
    // Step 12: Phase 3B — Post-Submission Solution Unlocking
    // -------------------------------------------------------------------------
    console.log('\n[12/12] Testing Post-Submission Solution Review Unlocking...');
    // Student A (verified attempt exists) queries assessment_questions
    const { data: postSubA, error: postSubErrA } = await clientA
      .from('assessment_questions')
      .select('*')
      .eq('test_id', testAssessmentId);

    if (postSubErrA) throw new Error(`Student A post-submission query failed: ${postSubErrA.message}`);
    if (!postSubA || postSubA.length !== 2) {
      throw new Error('Student A with verified attempt could not access solutions for review!');
    }
    console.log('  ✓ Student A with verified attempt unlocked full questions and explanations.');

    // Student B (no verified attempt) queries assessment_questions
    const { data: postSubB } = await clientB
      .from('assessment_questions')
      .select('*')
      .eq('test_id', testAssessmentId);

    if (postSubB && postSubB.length > 0) {
      throw new Error('SECURITY VIOLATION: Student B without an attempt was able to view solutions!');
    }
    console.log('  ✓ Student B without an attempt remained strictly blocked from solutions.');
    completedSteps++;

    if (completedSteps !== 12) {
      throw new Error(`Incomplete test suite execution: Only ${completedSteps}/12 tests completed successfully.`);
    }

    console.log('\n=============================================================================');
    console.log(`  ${SUCCESS_BANNER}     `);
    console.log('=============================================================================');
  } catch (err) {
    console.error('\n[FAILED] Live Supabase integration test encountered an error:');
    console.error(err.message);
    failureError = err;
  } finally {
    console.log('\n[Teardown] Cleaning up temporary test fixtures and disposable accounts...');
    if (createdAssessment) {
      try {
        await adminClient.from('assessments').delete().eq('id', testAssessmentId);
        console.log(`  ✓ Cleaned up test assessment fixture: ${testAssessmentId}`);
      } catch (err) {
        console.warn(`  [!] Warning: Failed to delete test assessment: ${err.message}`);
      }
    }
    if (studentAId) {
      try {
        await adminClient.auth.admin.deleteUser(studentAId);
        console.log(`  ✓ Cleaned up disposable Student A: ${studentAId}`);
      } catch (err) {
        console.warn(`  [!] Warning: Failed to delete Student A user: ${studentAId} (${err.message})`);
      }
    }
    if (studentBId) {
      try {
        await adminClient.auth.admin.deleteUser(studentBId);
        console.log(`  ✓ Cleaned up disposable Student B: ${studentBId}`);
      } catch (err) {
        console.warn(`  [!] Warning: Failed to delete Student B user: ${studentBId} (${err.message})`);
      }
    }
  }

  if (failureError) {
    if (options.throwOnError) {
      throw failureError;
    }
    process.exit(1);
  }

  return {
    status: 'PASSED',
    completedSteps,
    testRunId,
  };
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  runLiveTests().catch((err) => {
    console.error('[Fatal Error]', err.message);
    process.exit(1);
  });
}
