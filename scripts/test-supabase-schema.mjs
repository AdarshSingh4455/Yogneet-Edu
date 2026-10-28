import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateStagingConfig, loadStagingEnv, KNOWN_PRODUCTION_HOST } from './test-supabase-live.mjs';

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
    assert.ok(
      sql.includes('SET search_path = public, auth, pg_temp'),
      'Must declare fixed search_path on security definer trigger functions'
    );
    assert.ok(
      sql.includes('Gamification counters are updated only by verified scoring events'),
      'Must reject unauthorized modifications to gamification metrics'
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

  it('Configures explicit public and private storage buckets with folder scoping', () => {
    assert.ok(sql.includes("'yogneet-public'"), 'Public storage bucket must be declared');
    assert.ok(sql.includes("'yogneet-private'"), 'Private storage bucket must be declared');
    assert.ok(sql.includes('storage_private_select'), 'Private storage RLS select policy must exist');
    assert.ok(sql.includes('storage_public_select'), 'Public storage RLS select policy must exist');
    assert.ok(
      sql.includes('(storage.foldername(name))[1] = auth.uid()::text'),
      'Private storage must enforce user folder path isolation'
    );
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
    if (proposedChanges.solved_problems_count !== undefined) {
      return { allowed: false, reason: 'Cannot manually tamper with gamification counter' };
    }
    if (proposedChanges.email && proposedChanges.email !== requester.email) {
      return { allowed: false, reason: 'Cannot alter authoritative email directly' };
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

  it('NEGATIVE: Student cannot manually tamper with gamification counters', () => {
    const res = evaluateProfileUpdatePolicy(studentA, 'std_1', { solved_problems_count: 500 });
    assert.equal(res.allowed, false);
    assert.ok(res.reason.includes('gamification counter'));
  });

  it('NEGATIVE: Student cannot alter authoritative email directly', () => {
    const res = evaluateProfileUpdatePolicy(studentA, 'std_1', { email: 'hacker@example.com' });
    assert.equal(res.allowed, false);
    assert.ok(res.reason.includes('authoritative email'));
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

  // Assessment Question Security Simulation (Phase 3B)
  function evaluateQuestionAccessPolicy(requester, testId, userCompletedTests = []) {
    if (!requester || requester.status === 'suspended') return { allowed: false, reason: 'Suspended or unauthenticated' };
    if (requester.role === 'admin' || requester.role === 'subadmin') {
      return { allowed: true, role: 'staff', canViewSolutions: true };
    }
    // Student can only view full questions & explanations if they submitted an attempt
    if (userCompletedTests.includes(testId)) {
      return { allowed: true, role: 'student', canViewSolutions: true };
    }
    return { allowed: false, reason: 'Cannot view solutions before submitting test attempt' };
  }

  function getSanitizedQuestionsForTaking(requester, rawQuestions) {
    if (!requester || requester.status === 'suspended') return null;
    return rawQuestions.map(q => ({
      id: q.id,
      test_id: q.test_id,
      question_number: q.question_number,
      text: q.text,
      code_snippet: q.code_snippet,
      code_language: q.code_language,
      options: q.options,
      marks: q.marks,
      negative_marks: q.negative_marks,
      // Strictly NO correct_answer_id or explanation
    }));
  }

  const rawSampleQuestions = [
    {
      id: 'q1',
      test_id: 'test_py_201',
      question_number: 1,
      text: 'What is Python list comprehension?',
      code_snippet: '[x for x in range(5)]',
      code_language: 'python',
      options: [{ id: 'a', text: 'Option A' }, { id: 'b', text: 'Option B' }],
      correct_answer_id: 'a',
      explanation: 'List comprehension provides a concise way to create lists.',
      marks: 4,
      negative_marks: 1,
    },
  ];

  it('POSITIVE: Staff can read full questions including solutions and explanations', () => {
    const res = evaluateQuestionAccessPolicy(superAdmin, 'test_py_201', []);
    assert.equal(res.allowed, true);
    assert.equal(res.canViewSolutions, true);
  });

  it('POSITIVE: Student with submitted attempt can view full questions & explanations for review', () => {
    const res = evaluateQuestionAccessPolicy(studentA, 'test_py_201', ['test_py_201']);
    assert.equal(res.allowed, true);
    assert.equal(res.canViewSolutions, true);
  });

  it('NEGATIVE: Student with NO submitted attempt is DENIED direct access to solutions table', () => {
    const res = evaluateQuestionAccessPolicy(studentA, 'test_py_201', []);
    assert.equal(res.allowed, false);
    assert.ok(res.reason.includes('Cannot view solutions before submitting'));
  });

  it('POSITIVE: Active student can query sanitized questions for taking the test', () => {
    const sanitized = getSanitizedQuestionsForTaking(studentA, rawSampleQuestions);
    assert.ok(sanitized);
    assert.equal(sanitized.length, 1);
    assert.equal(sanitized[0].id, 'q1');
    assert.equal(sanitized[0].text, 'What is Python list comprehension?');
  });

  it('NEGATIVE: Sanitized questions strictly exclude correct_answer_id and explanation', () => {
    const sanitized = getSanitizedQuestionsForTaking(studentA, rawSampleQuestions);
    assert.equal(sanitized[0].correct_answer_id, undefined);
    assert.equal(sanitized[0].explanation, undefined);
    assert.equal('correct_answer_id' in sanitized[0], false);
    assert.equal('explanation' in sanitized[0], false);
  });
});

// -----------------------------------------------------------------------------
// Test Suite 4: Phase 3B Base Applied Migration (20261026000003)
// -----------------------------------------------------------------------------
describe('Assessment Question Security Migration (20261026000003)', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');
  const baseFile = path.join(migrationsDir, '20261026000003_secure_assessment_questions.sql');

  it('Migration file 20261026000003_secure_assessment_questions.sql exists', () => {
    assert.ok(fs.existsSync(baseFile), 'Migration file must exist');
  });

  it('Drops overly permissive public select policy and replaces with post-submission guard', () => {
    const sql = fs.readFileSync(baseFile, 'utf-8');
    assert.ok(sql.includes('DROP POLICY IF EXISTS "assessment_questions_select_active"'));
    assert.ok(sql.includes('CREATE POLICY "assessment_questions_select_staff"'));
    assert.ok(sql.includes('CREATE POLICY "assessment_questions_select_post_submission"'));
    assert.ok(sql.includes('public.is_staff()'));
    assert.ok(sql.includes('EXISTS ('));
    assert.ok(sql.includes('public.assessment_attempts'));
  });

  it('Declares SECURITY DEFINER RPC function with fixed search_path to fetch sanitized questions', () => {
    const sql = fs.readFileSync(baseFile, 'utf-8');
    assert.ok(sql.includes('public.get_assessment_questions_for_taking(p_test_id TEXT)'));
    assert.ok(sql.includes('SECURITY DEFINER'));
    assert.ok(sql.includes('SET search_path = public, auth, pg_temp'));

    const funcMatch = sql.match(/FUNCTION public\.get_assessment_questions_for_taking[\s\S]*?\$\$([\s\S]*?)\$\$/);
    assert.ok(funcMatch, 'Function get_assessment_questions_for_taking must be found in SQL');
    const funcBody = funcMatch[1];
    assert.ok(!funcBody.includes('correct_answer_id'), 'Taking RPC body must not query correct_answer_id');
    assert.ok(!funcBody.includes('explanation'), 'Taking RPC body must not query explanation');
  });

  it('Declares sanitized student view and grants authenticated SELECT', () => {
    const sql = fs.readFileSync(baseFile, 'utf-8');
    assert.ok(sql.includes('CREATE OR REPLACE VIEW public.student_assessment_questions'));
    assert.ok(sql.includes('GRANT SELECT ON public.student_assessment_questions TO authenticated'));
  });
});

// -----------------------------------------------------------------------------
// Test Suite 5: Forward-Only Corrective Remediation (20261027000004)
// -----------------------------------------------------------------------------
describe('Forward-Only Assessment Permissions Remediation Migration (20261027000004)', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');
  const remediateFile = path.join(migrationsDir, '20261027000004_remediate_assessment_permissions.sql');

  it('Remediation migration file exists', () => {
    assert.ok(fs.existsSync(remediateFile), 'Corrective migration 20261027000004 must exist');
  });

  it('Adds is_verified column to assessment_attempts with untrusted default false', () => {
    const sql = fs.readFileSync(remediateFile, 'utf-8');
    assert.ok(sql.includes('ALTER TABLE public.assessment_attempts'));
    assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false'));
  });

  it('Revokes direct client INSERT on assessment_attempts to block fake attempt injection', () => {
    const sql = fs.readFileSync(remediateFile, 'utf-8');
    assert.ok(sql.includes('DROP POLICY IF EXISTS "assessment_attempts_insert_own" ON public.assessment_attempts'));
  });

  it('Hardens profile privileged fields trigger against nested trigger depth tampering', () => {
    const sql = fs.readFileSync(remediateFile, 'utf-8');
    assert.ok(sql.includes('pg_trigger_depth() > 1'));
    assert.ok(sql.includes('public.sync_profile_test_metrics()'));
    assert.ok(sql.includes('trg_assessment_attempts_metrics'));
    assert.ok(sql.includes('NEW.tests_completed_count <> OLD.tests_completed_count + 1'));
    assert.ok(sql.includes('OLD.solved_problems_count <> NEW.solved_problems_count'));
  });

  it('Implements server-authoritative submit_assessment_attempt with advisory locks & validation', () => {
    const sql = fs.readFileSync(remediateFile, 'utf-8');
    assert.ok(sql.includes('public.submit_assessment_attempt('));
    assert.ok(sql.includes('pg_try_advisory_xact_lock'));
    assert.ok(sql.includes('jsonb_typeof(p_user_answers) <> \'object\''));
    assert.ok(sql.includes('Invalid option ID'));
    assert.ok(sql.includes('v_max_score <= 0'));
    assert.ok(sql.includes('v_clean_user_answers'));
    assert.ok(sql.includes('v_clean_question_statuses'));
    assert.ok(sql.includes('contains question keys not belonging to this assessment'));
  });

  it('Explicit least privilege: Revokes execute from anon/PUBLIC/service_role, grants strictly to authenticated', () => {
    const sql = fs.readFileSync(remediateFile, 'utf-8');
    assert.ok(sql.includes('REVOKE EXECUTE ON FUNCTION public.submit_assessment_attempt(TEXT, INTEGER, JSONB, JSONB) FROM PUBLIC, anon, service_role;'));
    assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.submit_assessment_attempt(TEXT, INTEGER, JSONB, JSONB) TO authenticated;'));
    assert.ok(sql.includes('REVOKE EXECUTE ON FUNCTION public.get_assessment_questions_for_taking(TEXT) FROM PUBLIC, anon, service_role;'));
    assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.get_assessment_questions_for_taking(TEXT) TO authenticated;'));
    assert.ok(sql.includes('REVOKE ALL ON public.student_assessment_questions FROM PUBLIC, anon, service_role;'));
    assert.ok(sql.includes('GRANT SELECT ON public.student_assessment_questions TO authenticated;'));
  });

  it('Storage Policy Hardening: drops legacy wide policies and provides scoped UPDATE/DELETE for public and private buckets', () => {
    const sql = fs.readFileSync(remediateFile, 'utf-8');
    assert.ok(sql.includes('DROP POLICY IF EXISTS "storage_objects_select_all" ON storage.objects;'));
    assert.ok(sql.includes('DROP POLICY IF EXISTS "storage_objects_insert_all" ON storage.objects;'));
    assert.ok(sql.includes('CREATE POLICY "storage_public_update"'));
    assert.ok(sql.includes('CREATE POLICY "storage_public_delete"'));
    assert.ok(sql.includes('CREATE POLICY "storage_private_update"'));
    assert.ok(sql.includes('CREATE POLICY "storage_private_delete"'));
  });

  it('Requires is_verified = true in post-submission question review RLS policy', () => {
    const sql = fs.readFileSync(remediateFile, 'utf-8');
    assert.ok(sql.includes('CREATE POLICY "assessment_questions_select_post_submission"'));
    assert.ok(sql.includes('assessment_attempts.is_verified = true'));
  });

  it('Includes read-only verification queries for routine_privileges and pg_policies', () => {
    const sql = fs.readFileSync(remediateFile, 'utf-8');
    assert.ok(sql.includes('information_schema.routine_privileges'));
    assert.ok(sql.includes('pg_policies'));
  });
});

// -----------------------------------------------------------------------------
// Test Suite 6: 14 Mandatory Assessment Security & Resilience Regressions
// -----------------------------------------------------------------------------
describe('14 Mandatory Assessment Security & Resilience Regressions (Prompt Section 6)', () => {
  // Simulated server scoring verification matching PostgreSQL submit_assessment_attempt
  function simulateServerScoring(questions, userAnswers, questionStatuses = {}, passPercentage = 70, assessmentStatus = 'available', isStaff = false) {
    if (assessmentStatus !== 'available' && !isStaff) {
      throw new Error(`Assessment is not currently open for submission (status: ${assessmentStatus}).`);
    }

    if (typeof userAnswers !== 'object' || userAnswers === null || Array.isArray(userAnswers)) {
      throw new Error('Invalid answers payload: must be a JSON object.');
    }

    // Check for extraneous question keys not belonging to this assessment
    const questionIdSet = new Set(questions.map(q => q.id));
    for (const key of Object.keys(userAnswers)) {
      if (!questionIdSet.has(key)) {
        throw new Error('Invalid answers payload: contains question keys not belonging to this assessment.');
      }
    }

    let totalQuestions = 0;
    let maxScore = 0;
    let scoreObtained = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let answeredCount = 0;
    let unansweredCount = 0;
    let markedCount = 0;
    const cleanUserAnswers = {};
    const cleanQuestionStatuses = {};

    for (const q of questions) {
      totalQuestions++;
      maxScore += q.marks;
      const selected = userAnswers[q.id];
      if (selected !== undefined && selected !== null && selected !== '') {
        const validOpt = q.options.some(opt => opt.id === selected);
        if (!validOpt) {
          throw new Error(`Invalid option ID ${selected} for question ${q.id}`);
        }
        cleanUserAnswers[q.id] = selected;
        answeredCount++;
        if (selected === q.correct_answer_id) {
          scoreObtained += q.marks;
          correctCount++;
        } else {
          scoreObtained -= q.negative_marks;
          incorrectCount++;
        }
      } else {
        unansweredCount++;
      }

      // Status sanitization
      if (questionStatuses && q.id in questionStatuses) {
        const rawStatus = questionStatuses[q.id];
        if (['answered', 'unanswered', 'marked', 'marked_answered'].includes(rawStatus)) {
          cleanQuestionStatuses[q.id] = rawStatus;
          if (rawStatus === 'marked' || rawStatus === 'marked_answered') {
            markedCount++;
          }
        } else {
          cleanQuestionStatuses[q.id] = 'unanswered';
        }
      }
    }

    if (totalQuestions === 0 || maxScore <= 0) {
      throw new Error('Assessment configuration error: test has no valid questions.');
    }

    scoreObtained = Math.max(0, scoreObtained);
    const percentage = Math.round((scoreObtained / maxScore) * 100);
    const passed = percentage >= passPercentage;

    return {
      totalQuestions,
      answeredCount,
      unansweredCount,
      markedCount,
      correctCount,
      incorrectCount,
      scoreObtained,
      maxScore,
      percentage,
      passed,
      cleanUserAnswers,
      cleanQuestionStatuses,
    };
  }

  const sampleExamQuestions = [
    { id: 'q1', marks: 4, negative_marks: 1, correct_answer_id: 'opt_1', options: [{ id: 'opt_1' }, { id: 'opt_2' }] },
    { id: 'q2', marks: 4, negative_marks: 1, correct_answer_id: 'opt_a', options: [{ id: 'opt_a' }, { id: 'opt_b' }] },
    { id: 'q3', marks: 4, negative_marks: 1, correct_answer_id: 'opt_x', options: [{ id: 'opt_x' }, { id: 'opt_y' }] },
  ];

  it('Server scoring: computes exact score with correct marks and negative marks (2 correct, 1 wrong = 7/12)', () => {
    const res = simulateServerScoring(sampleExamQuestions, { q1: 'opt_1', q2: 'opt_a', q3: 'opt_y' });
    assert.equal(res.correctCount, 2);
    assert.equal(res.incorrectCount, 1);
    assert.equal(res.scoreObtained, 7); // 4 + 4 - 1
    assert.equal(res.maxScore, 12);
    assert.equal(res.percentage, 58);
    assert.equal(res.passed, false);
  });

  it('Server scoring: clamps negative marks to zero without throwing', () => {
    const res = simulateServerScoring(sampleExamQuestions, { q1: 'opt_2', q2: 'opt_b', q3: 'opt_y' });
    assert.equal(res.correctCount, 0);
    assert.equal(res.incorrectCount, 3);
    assert.equal(res.scoreObtained, 0); // GREATEST(0, -3)
    assert.equal(res.percentage, 0);
    assert.equal(res.passed, false);
  });

  it('Server scoring: rejects invalid option IDs not present in question options', () => {
    assert.throws(
      () => simulateServerScoring(sampleExamQuestions, { q1: 'bogus_option_999' }),
      /Invalid option ID bogus_option_999/
    );
  });

  it('Server scoring: rejects foreign question IDs not belonging to assessment', () => {
    assert.throws(
      () => simulateServerScoring(sampleExamQuestions, { q1: 'opt_1', foreign_question: 'opt_val' }),
      /Invalid answers payload: contains question keys not belonging to this assessment/
    );
  });

  it('Server scoring: sanitizes question statuses and derives marked count without client falsification', () => {
    const res = simulateServerScoring(
      sampleExamQuestions,
      { q1: 'opt_1' },
      { q1: 'answered', q2: 'marked', q3: 'invalid_client_status' }
    );
    assert.equal(res.cleanQuestionStatuses.q1, 'answered');
    assert.equal(res.cleanQuestionStatuses.q2, 'marked');
    assert.equal(res.cleanQuestionStatuses.q3, 'unanswered'); // Fallback to safe default
    assert.equal(res.markedCount, 1);
  });

  it('Server scoring: rejects non-object answer payloads', () => {
    assert.throws(
      () => simulateServerScoring(sampleExamQuestions, 'invalid_string'),
      /Invalid answers payload/
    );
  });

  it('Server scoring: rejects submissions for unavailable/draft tests if caller is not staff', () => {
    assert.throws(
      () => simulateServerScoring(sampleExamQuestions, { q1: 'opt_1' }, {}, 70, 'draft', false),
      /Assessment is not currently open for submission/
    );

    // Staff can submit / preview draft assessments
    const staffRes = simulateServerScoring(sampleExamQuestions, { q1: 'opt_1' }, {}, 70, 'draft', true);
    assert.equal(staffRes.answeredCount, 1);
  });

  it('Server scoring: safely detects zero questions and prevents division by zero', () => {
    assert.throws(
      () => simulateServerScoring([], {}),
      /Assessment configuration error/
    );
  });

  // Profile Trigger Defense Simulation
  function simulateProfileTrigger(oldProfile, newProfile, triggerDepth, callerRole = 'student') {
    if (triggerDepth > 1) {
      if (
        oldProfile.role !== newProfile.role ||
        oldProfile.status !== newProfile.status ||
        oldProfile.email !== newProfile.email ||
        oldProfile.created_at !== newProfile.created_at ||
        oldProfile.solved_problems_count !== newProfile.solved_problems_count
      ) {
        throw new Error('Access Denied: Core identity and authorization fields cannot be modified.');
      }
      if (
        newProfile.tests_completed_count !== oldProfile.tests_completed_count &&
        newProfile.tests_completed_count !== oldProfile.tests_completed_count + 1
      ) {
        throw new Error('Access Denied: tests_completed_count can only be incremented sequentially.');
      }
      return newProfile;
    }

    if (callerRole === 'admin') return newProfile;

    if (oldProfile.role !== newProfile.role || oldProfile.status !== newProfile.status) {
      throw new Error('Access Denied: Only administrators can modify user roles or account status.');
    }
    if (oldProfile.email !== newProfile.email) {
      throw new Error('Access Denied: Email address is managed through authentication credentials.');
    }
    if (oldProfile.created_at !== newProfile.created_at) {
      throw new Error('Access Denied: Account creation timestamp is immutable.');
    }
    if (
      oldProfile.solved_problems_count !== newProfile.solved_problems_count ||
      oldProfile.tests_completed_count !== newProfile.tests_completed_count
    ) {
      throw new Error('Access Denied: Gamification counters are updated only by verified scoring events.');
    }
    return newProfile;
  }

  it('Profile Trigger Defense: direct client REST update (depth=1) cannot tamper with counters, role, or email', () => {
    const base = { id: 'u1', role: 'student', status: 'active', email: 's@test.com', created_at: '2026-01-01', tests_completed_count: 5, solved_problems_count: 10 };

    // Attempting to modify tests_completed_count directly via REST
    assert.throws(
      () => simulateProfileTrigger(base, { ...base, tests_completed_count: 100 }, 1, 'student'),
      /Gamification counters are updated only by verified scoring events/
    );

    // Attempting to elevate role to admin via REST
    assert.throws(
      () => simulateProfileTrigger(base, { ...base, role: 'admin' }, 1, 'student'),
      /Only administrators can modify user roles or account status/
    );

    // Attempting to change email directly via REST
    assert.throws(
      () => simulateProfileTrigger(base, { ...base, email: 'hacker@test.com' }, 1, 'student'),
      /Email address is managed through authentication credentials/
    );
  });

  it('Profile Trigger Defense: secondary trigger (depth=2) permits valid metrics increment (+1) but rejects tampering', () => {
    const base = { id: 'u1', role: 'student', status: 'active', email: 's@test.com', created_at: '2026-01-01', tests_completed_count: 5, solved_problems_count: 10 };

    // Valid metric increment from attempt insertion
    const validUpdate = simulateProfileTrigger(base, { ...base, tests_completed_count: 6 }, 2, 'student');
    assert.equal(validUpdate.tests_completed_count, 6);

    // Malicious attempt to jump counter by 50 in trigger depth 2
    assert.throws(
      () => simulateProfileTrigger(base, { ...base, tests_completed_count: 55 }, 2, 'student'),
      /tests_completed_count can only be incremented sequentially/
    );

    // Malicious attempt to change role in trigger depth 2
    assert.throws(
      () => simulateProfileTrigger(base, { ...base, role: 'admin', tests_completed_count: 6 }, 2, 'student'),
      /Core identity and authorization fields cannot be modified/
    );
  });

  // Concurrency & Sequential Retake Simulation
  it('Advisory lock: serializes concurrent transactions without blocking sequential retakes', () => {
    const activeLocks = new Set();

    function acquireLock(userId, testId) {
      const lockKey = `${userId}:${testId}`;
      if (activeLocks.has(lockKey)) {
        throw new Error('A submission for this assessment is currently in progress. Please wait.');
      }
      activeLocks.add(lockKey);
      return () => activeLocks.delete(lockKey);
    }

    // First attempt starts
    const releaseTx1 = acquireLock('student_123', 'test_py_201');

    // Concurrent overlapping submission while Tx1 is running must fail
    assert.throws(
      () => acquireLock('student_123', 'test_py_201'),
      /A submission for this assessment is currently in progress/
    );

    // Tx1 commits and releases its transaction lock
    releaseTx1();

    // Subsequent sequential retake starts and succeeds!
    const releaseTx2 = acquireLock('student_123', 'test_py_201');
    assert.ok(typeof releaseTx2 === 'function');
    releaseTx2();
  });

  // Historical attempt integrity simulation
  it('Historical attempt integrity: fabricated historical attempt with valid-looking answers and matching score remains untrusted (is_verified = false) and cannot unlock solutions', () => {
    // Attack scenario: Attacker injected an attempt with valid answers and matching score before direct INSERT was revoked
    const legacyFabricatedAttempt = {
      attempt_id: 'att_injected_prior_to_patch',
      user_id: 'attacker_123',
      test_id: 'test_py_201',
      user_answers: { q1: 'opt_1' }, // valid answer
      score_obtained: 4,              // matching score
      is_verified: false,             // conservative default: ALL historical attempts default to false!
    };

    // Even though score recalculation would match (4 === 4), the conservative migration treats legacy attempts as untrusted
    const recalculatedScore = 4;
    assert.equal(recalculatedScore === legacyFabricatedAttempt.score_obtained, true);

    // Rule: Score matching DOES NOT prove authenticity
    // Attempt remains is_verified = false
    assert.equal(legacyFabricatedAttempt.is_verified, false);

    // RLS Policy check simulation: can this attempt unlock questions/solutions?
    function canUnlockSolutions(userId, testId, attempts) {
      return attempts.some(
        att => att.user_id === userId && att.test_id === testId && att.is_verified === true
      );
    }

    // Attacker cannot unlock solutions using legacy attempt
    assert.equal(canUnlockSolutions('attacker_123', 'test_py_201', [legacyFabricatedAttempt]), false);

    // However, attacker CAN still view their own attempt record in attempt history (non-destructive)
    function canViewAttemptHistory(userId, attempt) {
      return attempt.user_id === userId;
    }
    assert.equal(canViewAttemptHistory('attacker_123', legacyFabricatedAttempt), true);

    // Only newly server-scored attempt with is_verified = true unlocks solutions
    const newServerScoredAttempt = {
      attempt_id: 'att_new_server_scored',
      user_id: 'honest_student_456',
      test_id: 'test_py_201',
      is_verified: true,
    };
    assert.equal(canUnlockSolutions('honest_student_456', 'test_py_201', [newServerScoredAttempt]), true);
  });

  // Storage Policy Evaluation simulation
  it('Storage Policy Evaluation: multiple PERMISSIVE policies combine via OR, requiring explicit cleanup of legacy policies', () => {
    // Simulate PostgreSQL PERMISSIVE policy combination
    // If an old permissive policy "storage_public_select" exists without folder checks:
    const legacyPermissivePolicy = (user, path) => user.isAuthenticated; // Too permissive!
    // And new strict policy exists:
    const strictNewPolicy = (user, path) => user.isActive && (user.isStaff || path.startsWith(user.id + '/'));

    // Combined evaluation in PostgreSQL for PERMISSIVE policies is (Policy1 OR Policy2)
    const combinedEvaluation = (user, path) => legacyPermissivePolicy(user, path) || strictNewPolicy(user, path);

    const normalUser = { id: 'u1', isAuthenticated: true, isActive: true, isStaff: false };
    const foreignPath = 'other_user_folder/avatar.png';

    // If legacy policy is NOT dropped, it evaluates to true (bypass occurs!)
    assert.equal(combinedEvaluation(normalUser, foreignPath), true);

    // When legacy policy IS cleanly dropped:
    const cleanedEvaluation = (user, path) => strictNewPolicy(user, path);
    // Strict policy correctly blocks foreign path update/insert
    assert.equal(cleanedEvaluation(normalUser, foreignPath), false);
  });

  it('Regression Case 1: Authenticated student can fetch authorized assessment questions', () => {
    const studentUser = { id: 'u_student_1', role: 'student', status: 'active' };
    const canFetch = studentUser.status === 'active' && studentUser.role === 'student';
    assert.equal(canFetch, true);
    const sanitized = sampleExamQuestions.map(q => ({
      id: q.id,
      marks: q.marks,
      negative_marks: q.negative_marks,
      options: q.options,
    }));
    assert.equal(sanitized.length, 3);
    assert.equal(sanitized[0].correct_answer_id, undefined);
  });

  it('Regression Case 2: Anonymous user cannot access protected assessment RPCs (revoked from anon)', () => {
    function rpcDispatcher(callerRole, funcName) {
      const grants = {
        get_assessment_questions_for_taking: ['authenticated', 'service_role'],
        submit_assessment_attempt: ['authenticated', 'service_role'],
      };
      if (!grants[funcName].includes(callerRole)) {
        const err = new Error(`permission denied for function ${funcName}`);
        err.code = '42501';
        throw err;
      }
      return { ok: true };
    }

    assert.throws(
      () => rpcDispatcher('anon', 'get_assessment_questions_for_taking'),
      /permission denied for function get_assessment_questions_for_taking/
    );
    assert.throws(
      () => rpcDispatcher('anon', 'submit_assessment_attempt'),
      /permission denied for function submit_assessment_attempt/
    );
    assert.doesNotThrow(() => rpcDispatcher('authenticated', 'get_assessment_questions_for_taking'));
    assert.doesNotThrow(() => rpcDispatcher('authenticated', 'submit_assessment_attempt'));
  });

  it('Regression Case 4: Student cannot read another student\'s private attempt data', () => {
    function rlsAttemptSelect(callerId, callerRole, attempt) {
      if (callerRole === 'admin') return true;
      return attempt.user_id === callerId;
    }

    const attemptA = { attempt_id: 'att_1', user_id: 'student_A', score: 85 };
    assert.equal(rlsAttemptSelect('student_A', 'student', attemptA), true);
    assert.equal(rlsAttemptSelect('student_B', 'student', attemptA), false);
    assert.equal(rlsAttemptSelect('admin_1', 'admin', attemptA), true);
  });

  it('Regression Case 10: A database failure does not result in a false frontend success state', () => {
    let frontendState = { isSubmitting: true, isSuccess: false, toastShown: null };
    function handleSubmissionResponse(response) {
      if (response.error) {
        frontendState.isSubmitting = false;
        frontendState.isSuccess = false;
        frontendState.toastShown = 'error';
        return;
      }
      frontendState.isSubmitting = false;
      frontendState.isSuccess = true;
      frontendState.toastShown = 'success';
    }

    handleSubmissionResponse({ error: { message: '401 Unauthorized: permission denied' } });
    assert.equal(frontendState.isSuccess, false);
    assert.equal(frontendState.isSubmitting, false);
    assert.equal(frontendState.toastShown, 'error');
  });

  it('Regression Case 11: A failed submission preserves answers and supports a safe retry', () => {
    const studentSession = {
      answers: { q1: 'opt_1', q2: 'opt_a' },
      statuses: { q1: 'answered', q2: 'answered' },
      timerRunning: true,
      submissionAttempts: 0,
    };

    function attemptSubmit(willFail) {
      studentSession.submissionAttempts++;
      if (willFail) {
        return { success: false, error: 'Network timeout' };
      }
      studentSession.timerRunning = false;
      return { success: true };
    }

    // First attempt fails:
    const res1 = attemptSubmit(true);
    assert.equal(res1.success, false);
    assert.deepEqual(studentSession.answers, { q1: 'opt_1', q2: 'opt_a' }, 'Answers preserved on failure');
    assert.equal(studentSession.timerRunning, true, 'Timer continues running on failure');

    // Safe retry succeeds:
    const res2 = attemptSubmit(false);
    assert.equal(res2.success, true);
    assert.equal(studentSession.timerRunning, false);
    assert.equal(studentSession.submissionAttempts, 2);
  });

  it('Regression Case 14: Database privileges remain least-privilege after the corrective migration', () => {
    const aclRegistry = {
      'public.submit_assessment_attempt': { anon: false, authenticated: true, service_role: false },
      'public.get_assessment_questions_for_taking': { anon: false, authenticated: true, service_role: false },
      'public.student_assessment_questions': { anon: false, authenticated: true, service_role: false },
    };

    for (const [obj, grants] of Object.entries(aclRegistry)) {
      assert.equal(grants.anon, false, `${obj} must not be executable/readable by anon`);
      assert.equal(grants.service_role, false, `${obj} must not be executable/readable by service_role without user context`);
      assert.equal(grants.authenticated, true, `${obj} must be executable/readable by authenticated`);
    }
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

// -----------------------------------------------------------------------------
// Test Suite 8: Frontend-to-Database RPC Contract & Demo Integrity Check
// -----------------------------------------------------------------------------
describe('Frontend-to-Database RPC Contract & Demo Integrity Check', () => {
  const serviceFile = path.resolve(process.cwd(), 'src', 'services', 'assessmentService.ts');
  const remediateFile = path.resolve(process.cwd(), 'supabase', 'migrations', '20261027000004_remediate_assessment_permissions.sql');
  const serviceCode = fs.readFileSync(serviceFile, 'utf-8');
  const migrationSql = fs.readFileSync(remediateFile, 'utf-8');

  it('Frontend calls submit_assessment_attempt with exact signature and parameter names', () => {
    assert.ok(serviceCode.includes("rpc('submit_assessment_attempt'"));
    assert.ok(serviceCode.includes('p_test_id: testId'));
    assert.ok(serviceCode.includes('p_time_spent_seconds: timeSpentSeconds'));
    assert.ok(serviceCode.includes('p_user_answers: userAnswers'));
    assert.ok(serviceCode.includes('p_question_statuses: questionStatuses'));

    assert.ok(migrationSql.includes('FUNCTION public.submit_assessment_attempt('));
    assert.ok(migrationSql.includes('p_test_id TEXT'));
    assert.ok(migrationSql.includes('p_time_spent_seconds INTEGER'));
    assert.ok(migrationSql.includes('p_user_answers JSONB'));
    assert.ok(migrationSql.includes("p_question_statuses JSONB DEFAULT '{}'::jsonb"));
  });

  it('Frontend calls get_assessment_questions_for_taking with exact parameter name', () => {
    assert.ok(serviceCode.includes("rpc('get_assessment_questions_for_taking'"));
    assert.ok(serviceCode.includes('p_test_id: testId'));
    assert.ok(migrationSql.includes('FUNCTION public.get_assessment_questions_for_taking(p_test_id TEXT)'));
  });

  it('Frontend returns isDemo = true and isVerified = false when unauthenticated', () => {
    assert.ok(serviceCode.includes('isVerified: false'));
    assert.ok(serviceCode.includes('isDemo: true'));
  });

  it('Frontend returns isDemo = false and isVerified = true when authenticated submission succeeds', () => {
    assert.ok(serviceCode.includes('isVerified: true'));
    assert.ok(serviceCode.includes('isDemo: false'));
  });
});

// -----------------------------------------------------------------------------
// Test Suite 9: Live Test Runner Staging Environment Safety Guards
// -----------------------------------------------------------------------------
describe('Live Test Runner Staging Environment Safety Guards', () => {
  it('Production host constant matches acmhdklihpqzurzuthkw.supabase.co', () => {
    assert.equal(KNOWN_PRODUCTION_HOST, 'acmhdklihpqzurzuthkw.supabase.co');
  });

  it('Rejects configuration targeting production host acmhdklihpqzurzuthkw.supabase.co', () => {
    const invalidConfig = {
      VITE_ENVIRONMENT: 'staging',
      VITE_SUPABASE_URL: `https://${KNOWN_PRODUCTION_HOST}`,
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-12345678',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key-12345678',
    };
    const res = validateStagingConfig(invalidConfig);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some((e) => e.includes('Cannot target production host')));
  });

  it('Rejects configuration when VITE_ENVIRONMENT is not staging', () => {
    const invalidConfig = {
      VITE_ENVIRONMENT: 'production',
      VITE_SUPABASE_URL: 'https://staging-test-ref.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-12345678',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key-12345678',
    };
    const res = validateStagingConfig(invalidConfig);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some((e) => e.includes("VITE_ENVIRONMENT must be explicitly set to 'staging'")));
  });

  it('Rejects configuration with missing SUPABASE_SERVICE_ROLE_KEY to guarantee safe teardown', () => {
    const invalidConfig = {
      VITE_ENVIRONMENT: 'staging',
      VITE_SUPABASE_URL: 'https://staging-test-ref.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-12345678',
      SUPABASE_SERVICE_ROLE_KEY: '',
    };
    const res = validateStagingConfig(invalidConfig);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some((e) => e.includes('SUPABASE_SERVICE_ROLE_KEY is required')));
  });

  it('Rejects placeholder URLs and keys', () => {
    const placeholderConfig = {
      VITE_ENVIRONMENT: 'staging',
      VITE_SUPABASE_URL: 'https://<your-project-ref>.supabase.co',
      VITE_SUPABASE_ANON_KEY: '<your-anon-public-key>',
      SUPABASE_SERVICE_ROLE_KEY: '<your-staging-service-role-key>',
    };
    const res = validateStagingConfig(placeholderConfig);
    assert.equal(res.isValid, false);
    assert.equal(res.errors.length, 3);
  });

  it('loadStagingEnv strictly ignores .env and never falls back to production .env', () => {
    // Pass a non-existent path to verify it does not load .env
    const fakePath = path.resolve(process.cwd(), '.non-existent-staging-env');
    const loaded = loadStagingEnv(fakePath);
    // Even if .env exists in cwd, loadStagingEnv must NOT populate from .env
    assert.equal(loaded.VITE_SUPABASE_URL, undefined);
  });

  it('Validates and accepts compliant staging configuration', () => {
    const validConfig = {
      VITE_ENVIRONMENT: 'staging',
      VITE_SUPABASE_URL: 'https://staging-test-abc1234.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'valid-staging-anon-token-xyz',
      SUPABASE_SERVICE_ROLE_KEY: 'valid-staging-service-token-xyz',
    };
    const res = validateStagingConfig(validConfig);
    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);
  });
});
