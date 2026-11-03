import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadStagingEnv() {
  const env = { ...process.env };
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8');
    for (const line of content.split('\n')) {
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
  }
  return env;
}

const env = loadStagingEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const runId = Math.random().toString(36).substring(2, 8);
const testStudentEmail = `test-remediation-student-${runId}@staging.yogneet.internal`;
const testStudentPassword = `P@ssword_${runId}_Strict!`;

let adminClient;
let studentUser;
let studentClient;

describe('Phase 4 Security Remediation Live Verification', () => {
  before(async () => {
    if (!serviceRoleKey || !anonKey) throw new Error('Missing keys');
    adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create temporary test student
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: testStudentEmail,
      password: testStudentPassword,
      email_confirm: true,
      user_metadata: { name: `Remediation Student ${runId}` },
    });
    if (authErr) throw authErr;
    studentUser = authData.user;

    // Ensure student profile has role = 'student', status = 'active'
    await adminClient.from('profiles').update({ role: 'student', status: 'active' }).eq('id', studentUser.id);

    // Sign in as student to get real bearer token
    const loginClient = createClient(supabaseUrl, anonKey);
    const { data: loginData, error: loginErr } = await loginClient.auth.signInWithPassword({
      email: testStudentEmail,
      password: testStudentPassword,
    });
    if (loginErr) throw loginErr;

    studentClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${loginData.session.access_token}` } },
    });
  });

  after(async () => {
    if (studentUser && adminClient) {
      // Clean up test records
      await adminClient.from('user_study_activities').delete().eq('user_id', studentUser.id);
      await adminClient.from('user_streaks').delete().eq('user_id', studentUser.id);
      await adminClient.from('assessment_attempts').delete().eq('user_id', studentUser.id);
      await adminClient.from('profiles').delete().eq('id', studentUser.id);
      await adminClient.auth.admin.deleteUser(studentUser.id);
    }
  });

  it('1. Authenticated student directly invoking record_qualifying_study_activity: strictly denied', async () => {
    const { error } = await studentClient.rpc('record_qualifying_study_activity', {
      p_activity_type: 'assessment_completion',
      p_activity_id: 'some-assessment-id',
    });
    assert.ok(error !== null, 'Authenticated student direct invocation must be rejected');
    assert.ok(
      error.message.includes('permission denied') ||
      error.message.includes('Access Denied'),
      `Expected permission denied or Access Denied, got: ${error.message}`
    );
  });

  it('2. Student attempts video lesson streak generation: strictly denied', async () => {
    const { error } = await studentClient.rpc('record_qualifying_study_activity', {
      p_activity_type: 'lesson_completion',
      p_activity_id: 'vid_1793463778757',
    });
    assert.ok(error !== null, 'Video lesson streak generation must be rejected');
    assert.ok(
      error.message.includes('permission denied') ||
      error.message.includes('Access Denied'),
      `Expected denial, got: ${error.message}`
    );
  });

  it('3. Student attempts study-note streak generation: strictly denied', async () => {
    const { error } = await studentClient.rpc('record_qualifying_study_activity', {
      p_activity_type: 'notes_study',
      p_activity_id: 'note_123',
    });
    assert.ok(error !== null, 'Study note streak generation must be rejected');
    assert.ok(
      error.message.includes('permission denied') ||
      error.message.includes('Access Denied'),
      `Expected denial, got: ${error.message}`
    );
  });

  it('4. Student attempts arbitrary activity types: strictly denied', async () => {
    const { error } = await studentClient.rpc('record_qualifying_study_activity', {
      p_activity_type: 'arbitrary_hacked_streak',
      p_activity_id: 'some_id',
    });
    assert.ok(error !== null, 'Arbitrary activity types must be rejected');
    assert.ok(
      error.message.includes('permission denied') ||
      error.message.includes('Access Denied'),
      `Expected denial, got: ${error.message}`
    );
  });

  it('5. Direct insertion into user_study_activities by student: strictly blocked by RLS', async () => {
    const { error } = await studentClient.from('user_study_activities').insert({
      user_id: studentUser.id,
      activity_type: 'lesson_completion',
      activity_id: 'vid_1793463778757',
      activity_date: new Date().toISOString().split('T')[0],
    });
    assert.ok(error !== null, 'Direct insert into user_study_activities must be blocked by RLS');
  });

  it('6. Profile role escalation attempt by student: strictly rejected by database trigger', async () => {
    const { data, error } = await studentClient
      .from('profiles')
      .update({ role: 'super_admin' })
      .eq('id', studentUser.id)
      .select();

    assert.ok(
      error !== null || (Array.isArray(data) && data.length === 0),
      'Role escalation must fail or update 0 rows'
    );
    if (error) {
      assert.ok(
        error.message.includes('Access Denied') ||
        error.message.includes('administrators'),
        `Expected access denied message, got: ${error.message}`
      );
    }
  });

  it('7. Profile status tampering attempt by student: strictly rejected by database trigger', async () => {
    const { data, error } = await studentClient
      .from('profiles')
      .update({ status: 'suspended' })
      .eq('id', studentUser.id)
      .select();

    assert.ok(
      error !== null || (Array.isArray(data) && data.length === 0),
      'Status change must fail or update 0 rows'
    );
    if (error) {
      assert.ok(
        error.message.includes('Access Denied') ||
        error.message.includes('administrators'),
        `Expected access denied message, got: ${error.message}`
      );
    }
  });

  it('8. Valid submitted assessment generates streak activity via server trigger', async () => {
    // Fetch a real assessment from assessments table
    const { data: testRow } = await adminClient.from('assessments').select('id').limit(1).single();
    assert.ok(testRow, 'Need an assessment to test submission');

    // Insert an assessment attempt with submitted_at
    const { data: attempt, error: attemptErr } = await adminClient.from('assessment_attempts').insert({
      user_id: studentUser.id,
      test_id: testRow.id,
      submitted_at: new Date().toISOString(),
      time_spent_seconds: 120,
      total_questions: 10,
      answered_count: 10,
      unanswered_count: 0,
      marked_count: 0,
      correct_count: 8,
      incorrect_count: 2,
      score_obtained: 8,
      max_score: 10,
      percentage: 80,
      passed: true,
    }).select().single();

    assert.equal(attemptErr, null, attemptErr?.message);
    assert.ok(attempt, 'Attempt record created');

    // Verify user_study_activities has exactly 1 record created by trigger
    const { data: activities, error: actErr } = await adminClient
      .from('user_study_activities')
      .select('*')
      .eq('user_id', studentUser.id);

    assert.equal(actErr, null);
    assert.equal(activities.length, 1, 'Exactly 1 study activity created by assessment trigger');
    assert.equal(activities[0].activity_type, 'assessment_completion');
    assert.equal(activities[0].activity_id, testRow.id);

    // Verify user_streaks has current_streak = 1
    const { data: streakRow, error: streakErr } = await adminClient
      .from('user_streaks')
      .select('*')
      .eq('user_id', studentUser.id)
      .single();

    assert.equal(streakErr, null);
    assert.equal(streakRow.current_streak, 1, 'Current streak should be 1');
  });

  it('9. Repeated same-day submission: idempotent and does NOT inflate streak', async () => {
    const { data: testRows } = await adminClient.from('assessments').select('id').limit(2);
    const secondTestId = testRows.length > 1 ? testRows[1].id : testRows[0].id;

    // Submit a second assessment on the same day
    const { error: secondAttemptErr } = await adminClient.from('assessment_attempts').insert({
      user_id: studentUser.id,
      test_id: secondTestId,
      submitted_at: new Date().toISOString(),
      time_spent_seconds: 90,
      total_questions: 5,
      answered_count: 5,
      unanswered_count: 0,
      marked_count: 0,
      correct_count: 5,
      incorrect_count: 0,
      score_obtained: 5,
      max_score: 5,
      percentage: 100,
      passed: true,
    });
    assert.equal(secondAttemptErr, null);

    // Check user_streaks: streak must remain 1
    const { data: streakRow } = await adminClient
      .from('user_streaks')
      .select('*')
      .eq('user_id', studentUser.id)
      .single();

    assert.equal(streakRow.current_streak, 1, 'Streak must remain 1 on same calendar day (no inflation)');
  });
});
