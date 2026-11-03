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

describe('Audit Logging Reliability & Fail-Closed Integrity Tests', () => {
  let stagingEnv;
  let adminClient;
  let studentUser;
  let studentClient;
  let subadminUser;
  let subadminClient;
  let superadminUser;
  let superadminClient;

  before(async () => {
    stagingEnv = loadStagingEnv();
    if (stagingEnv.VITE_SUPABASE_URL.includes(KNOWN_PRODUCTION_HOST)) {
      throw new Error('STRICT SAFETY GUARD: Cannot run against production host!');
    }

    adminClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const runId = crypto.randomBytes(4).toString('hex');
    const studentEmail = `audit-student-${runId}@staging.yogneet.internal`;
    const subadminEmail = `audit-subadmin-${runId}@staging.yogneet.internal`;
    const superadminEmail = `audit-superadmin-${runId}@staging.yogneet.internal`;
    const commonPass = `AuditPass!${runId}A1`;

    // 1. Create Student
    const { data: sCreated, error: sErr } = await adminClient.auth.admin.createUser({
      email: studentEmail,
      password: commonPass,
      email_confirm: true,
      user_metadata: { name: `Audit Student ${runId}` },
    });
    if (sErr) throw sErr;
    studentUser = sCreated.user;

    // 2. Create Sub-Admin
    const { data: subCreated, error: subErr } = await adminClient.auth.admin.createUser({
      email: subadminEmail,
      password: commonPass,
      email_confirm: true,
      user_metadata: { name: `Audit SubAdmin ${runId}` },
    });
    if (subErr) throw subErr;
    subadminUser = subCreated.user;
    await adminClient.from('profiles').update({ role: 'subadmin' }).eq('id', subadminUser.id);

    // 3. Create Superadmin
    const { data: saCreated, error: saErr } = await adminClient.auth.admin.createUser({
      email: superadminEmail,
      password: commonPass,
      email_confirm: true,
      user_metadata: { name: `Audit SuperAdmin ${runId}` },
    });
    if (saErr) throw saErr;
    superadminUser = saCreated.user;
    await adminClient.from('profiles').update({ role: 'admin' }).eq('id', superadminUser.id);

    // Authenticate student client
    studentClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: sLoginErr } = await studentClient.auth.signInWithPassword({
      email: studentEmail,
      password: commonPass,
    });
    if (sLoginErr) throw sLoginErr;

    // Authenticate sub-admin client
    subadminClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: subLoginErr } = await subadminClient.auth.signInWithPassword({
      email: subadminEmail,
      password: commonPass,
    });
    if (subLoginErr) throw subLoginErr;

    // Authenticate superadmin client
    superadminClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: saLoginErr } = await superadminClient.auth.signInWithPassword({
      email: superadminEmail,
      password: commonPass,
    });
    if (saLoginErr) throw saLoginErr;
  });

  after(async () => {
    if (studentUser?.id) await adminClient.auth.admin.deleteUser(studentUser.id);
    if (subadminUser?.id) await adminClient.auth.admin.deleteUser(subadminUser.id);
    if (superadminUser?.id) await adminClient.auth.admin.deleteUser(superadminUser.id);
  });

  it('1. Positive Audit Insertion: log_audit_event persists record to public.audit_logs atomically', async () => {
    // 1A. Authenticated student audit event
    const studentAction = `TEST_STUDENT_ACTION_${Date.now()}`;
    const { data: sLogId, error: sError } = await studentClient.rpc('log_audit_event', {
      p_actor_id: studentUser.id,
      p_action: studentAction,
      p_outcome: 'SUCCESS',
      p_changes: { test: true },
      p_details: 'Student audit event verification',
    });
    assert.equal(sError, null, `Student audit should succeed: ${sError?.message}`);
    assert.ok(sLogId);

    const { data: sLogRow } = await adminClient.from('audit_logs').select('*').eq('id', sLogId).single();
    assert.ok(sLogRow);
    assert.equal(sLogRow.action, studentAction);
    assert.equal(sLogRow.actor_id, studentUser.id);

    // 1B. Trusted service-role execution (with specified actor)
    const serviceAction = `SERVICE_TASK_${Date.now()}`;
    const { data: srvLogId, error: srvError } = await adminClient.rpc('log_audit_event', {
      p_actor_id: studentUser.id,
      p_action: serviceAction,
      p_outcome: 'SUCCESS',
      p_details: 'Background worker maintenance',
    });
    assert.equal(srvError, null);
    const { data: srvRow } = await adminClient.from('audit_logs').select('*').eq('id', srvLogId).single();
    assert.equal(srvRow.actor_id, studentUser.id);

    // 1C. Legitimate system-generated audit event (actor_id is null)
    const sysAction = `SYSTEM_HEALTH_CHECK_${Date.now()}`;
    const { data: sysLogId, error: sysError } = await adminClient.rpc('log_audit_event', {
      p_actor_id: null,
      p_action: sysAction,
      p_outcome: 'SUCCESS',
    });
    assert.equal(sysError, null);
    const { data: sysRow } = await adminClient.from('audit_logs').select('*').eq('id', sysLogId).single();
    assert.equal(sysRow.actor_id, null);
    assert.equal(sysRow.actor_name, 'System');
    assert.equal(sysRow.actor_role, 'system');
  });

  it('2. Anti-Spoofing: Student caller cannot forge actor_id of another user', async () => {
    const victimId = studentUser.id;

    // 2A. Student caller attempts to spoof superadmin identity
    const studentForgeAction = `STUDENT_FORGE_ATTEMPT_${Date.now()}`;
    const { data: sLogId, error: sErr } = await studentClient.rpc('log_audit_event', {
      p_actor_id: superadminUser.id,
      p_action: studentForgeAction,
      p_outcome: 'SUCCESS',
    });
    assert.equal(sErr, null);
    const { data: sRow } = await adminClient.from('audit_logs').select('actor_id').eq('id', sLogId).single();
    assert.equal(sRow.actor_id, studentUser.id, 'Database must override student spoof attempt with auth.uid()');

    // 2B. Sub-admin caller attempts to spoof superadmin identity
    const subForgeAction = `SUBADMIN_FORGE_ATTEMPT_${Date.now()}`;
    const { data: subLogId, error: subErr } = await subadminClient.rpc('log_audit_event', {
      p_actor_id: superadminUser.id,
      p_action: subForgeAction,
      p_outcome: 'SUCCESS',
    });
    assert.equal(subErr, null);
    const { data: subRow } = await adminClient.from('audit_logs').select('actor_id').eq('id', subLogId).single();
    assert.equal(subRow.actor_id, subadminUser.id, 'Database must override subadmin spoof attempt with auth.uid()');

    // 2C. Superadmin caller attempts to forge student victim identity through direct RPC
    const saForgeAction = `SUPERADMIN_FORGE_ATTEMPT_${Date.now()}`;
    const { data: saLogId, error: saErr } = await superadminClient.rpc('log_audit_event', {
      p_actor_id: victimId,
      p_action: saForgeAction,
      p_outcome: 'SUCCESS',
    });
    assert.equal(saErr, null);
    const { data: saRow } = await adminClient.from('audit_logs').select('actor_id, actor_role').eq('id', saLogId).single();
    assert.equal(saRow.actor_id, superadminUser.id, 'Database must override superadmin direct RPC forge attempt with authentic auth.uid()');
    assert.equal(saRow.actor_role, 'admin');
  });

  it('3. Negative Fail-Closed: log_audit_event rejects empty action with an exception', async () => {
    const { data, error } = await studentClient.rpc('log_audit_event', {
      p_actor_id: studentUser.id,
      p_action: '   ', // empty action
    });

    assert.ok(error, 'Must reject empty action');
    assert.match(error.message, /Mandatory audit logging failed/, 'Must throw fail-closed exception');
  });

  it('4. Negative Fail-Closed: Calling with null action fails closed', async () => {
    const { data, error } = await studentClient.rpc('log_audit_event', {
      p_actor_id: studentUser.id,
      p_action: null,
    });

    assert.ok(error, 'Must reject null action');
    assert.match(error.message, /Mandatory audit logging failed/);
  });
});
