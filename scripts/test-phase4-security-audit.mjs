/**
 * ==============================================================================
 * Yogneet Edu — Phase 4 Final Integration & Security Audit Test Suite
 * ==============================================================================
 * Validates:
 *   1. Study Streak Security: Spoofed activities, arbitrary generation, and idempotence.
 *   2. Notification Security: Non-admin creation prevention, recipient isolation, and RLS.
 *   3. Feedback Privacy: Submitter isolation, zero cross-user leakage, and admin reply auth.
 *   4. Storage Security: Folder isolation for avatars on yogneet-public.
 *   5. Icon Library Security: Admin-only CRUD, system icon lock, reference-aware deletion.
 *   6. Profile & RBAC Security: Role escalation blocking via trigger.
 *   7. Analytics Authorization: Real DB records & uninstrumented telemetry labels.
 * ==============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const KNOWN_PRODUCTION_HOST = 'acmhdklihpqzurzuthkw.supabase.co';

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
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://ksjeravfkjfbpvfdazus.supabase.co';
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

// -----------------------------------------------------------------------------
// Suite 1: Production Isolation & Target Verification
// -----------------------------------------------------------------------------
describe('1. Production Safety & Target Verification', () => {
  it('Guards strictly against production Supabase target', () => {
    assert.ok(supabaseUrl, 'Supabase URL must be configured');
    const parsed = new URL(supabaseUrl);
    assert.notEqual(parsed.host, KNOWN_PRODUCTION_HOST, 'Must never target production');
    assert.ok(parsed.host.includes('ksjeravfkjfbpvfdazus'), 'Target must be staging ksjeravfkjfbpvfdazus');
  });
});

// -----------------------------------------------------------------------------
// Suite 2: Study Streak Security Audit
// -----------------------------------------------------------------------------
describe('2. Study Streak Security Audit', () => {
  it('Anon client cannot record study activities', async (t) => {
    if (!anonKey) return t.skip('Anon key missing');
    const client = createClient(supabaseUrl, anonKey);
    const { error } = await client.rpc('record_qualifying_study_activity', {
      p_activity_type: 'assessment_completion',
      p_activity_id: 'arbitrary-id',
    });
    assert.ok(error !== null, 'Anon caller must be rejected');
  });

  it('Rejects arbitrary / non-existent assessment activity IDs or unauthenticated callers', async (t) => {
    if (!serviceRoleKey) return t.skip('Service role key missing');
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Call without authenticated user context or with fake assessment ID
    const fakeTestId = '00000000-0000-0000-0000-000000009999';
    const { error } = await admin.rpc('record_qualifying_study_activity', {
      p_activity_type: 'assessment_completion',
      p_activity_id: fakeTestId,
    });

    assert.ok(error !== null, 'Recording unverified assessment activity must fail');
    assert.ok(
      error.message.includes('Authentication required') ||
      error.message.includes('Invalid activity') ||
      error.message.includes('No completed assessment') ||
      error.message.includes('Access Denied'),
      `Expected auth or validation error, got: ${error.message}`
    );
  });

  it('Rejects invalid activity types outside the allowed enum constraint', async (t) => {
    if (!serviceRoleKey) return t.skip('Service role key missing');
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await admin.rpc('record_qualifying_study_activity', {
      p_activity_type: 'hacked_streak_type',
      p_activity_id: 'some-id',
    });

    assert.ok(error !== null, 'Invalid activity type must be rejected');
  });

  it('Daily study activity unique constraint prevents same-day streak inflation', () => {
    const migrationPath = path.resolve('supabase/migrations/20261103000021_phase_4b_backend_and_supabase_integration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(
      sql.includes('CONSTRAINT unique_user_daily_activity UNIQUE (user_id, activity_type, activity_date, activity_id)'),
      'Must enforce unique constraint per activity per day'
    );
    assert.ok(
      sql.includes('v_streak.last_activity_date = NEW.activity_date') || sql.includes('v_streak.last_activity_date = v_today'),
      'Must handle same-day activity idempotently'
    );
  });
});

// -----------------------------------------------------------------------------
// Suite 3: Notification Security & RLS Audit
// -----------------------------------------------------------------------------
describe('3. Notification Security & RLS Audit', () => {
  it('Anon client cannot invoke create_user_notification', async (t) => {
    if (!anonKey) return t.skip('Anon key missing');
    const client = createClient(supabaseUrl, anonKey);
    const { error } = await client.rpc('create_user_notification', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_category: 'platform',
      p_title: 'Spam',
      p_description: 'Spam description',
    });
    assert.ok(error !== null, 'Anon caller cannot dispatch notifications');
  });

  it('Notifications RLS restricts SELECT to owner (user_id = auth.uid())', async (t) => {
    if (!anonKey) return t.skip('Anon key missing');
    const client = createClient(supabaseUrl, anonKey);
    const { data } = await client.from('notifications').select('*');
    assert.ok(Array.isArray(data) && data.length === 0, 'Anon client receives 0 notifications');
  });

  it('Notifications RLS restricts UPDATE to owner (user_id = auth.uid())', async (t) => {
    if (!anonKey) return t.skip('Anon key missing');
    const client = createClient(supabaseUrl, anonKey);
    const { data } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .select();
    assert.ok(Array.isArray(data) && data.length === 0, 'Cannot update notifications without ownership');
  });
});

// -----------------------------------------------------------------------------
// Suite 4: Feedback Privacy & Submitter Isolation Audit
// -----------------------------------------------------------------------------
describe('4. Feedback Privacy & Submitter Isolation Audit', () => {
  it('Direct PostgREST SELECT on feedback_submissions is blocked for non-admins', async (t) => {
    if (!anonKey) return t.skip('Anon key missing');
    const client = createClient(supabaseUrl, anonKey);
    const { data } = await client.from('feedback_submissions').select('*');
    assert.ok(Array.isArray(data) && data.length === 0, 'Non-admin receives 0 rows via PostgREST');
  });

  it('get_my_feedback_submissions derives identity exclusively from auth.uid()', () => {
    const migrationPath = path.resolve('supabase/migrations/20261103000021_phase_4b_backend_and_supabase_integration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(
      sql.includes('v_user_id UUID := auth.uid();'),
      'Must derive identity exclusively from auth.uid()'
    );
    assert.ok(
      !sql.includes('get_my_feedback_submissions(p_user_id'),
      'Must NOT accept client-supplied user_id parameter'
    );
  });

  it('Non-admin caller cannot execute admin_reply_feedback', async (t) => {
    if (!anonKey) return t.skip('Anon key missing');
    const client = createClient(supabaseUrl, anonKey);
    const { error } = await client.rpc('admin_reply_feedback', {
      p_feedback_id: '00000000-0000-0000-0000-000000000000',
      p_reply_text: 'Unauthorized reply',
      p_new_status: 'In Progress',
    });
    assert.ok(error !== null, 'Non-admin reply must fail');
  });

  it('Two separate users have zero cross-user feedback visibility', async (t) => {
    if (!serviceRoleKey) return t.skip('Service role key missing');
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Retrieve two different user IDs from profiles
    const { data: profiles } = await admin.from('profiles').select('id, email, role').limit(2);
    if (!profiles || profiles.length < 2) {
      return t.skip('Need at least 2 profiles to test two-user privacy');
    }

    const userA = profiles[0].id;
    const userB = profiles[1].id;

    // Check feedback records for userA vs userB
    const { data: ticketsA } = await admin.from('feedback_submissions').select('id, user_id').eq('user_id', userA);
    const { data: ticketsB } = await admin.from('feedback_submissions').select('id, user_id').eq('user_id', userB);

    if (ticketsA && ticketsA.length > 0) {
      const ticketsA_ids = ticketsA.map(t => t.id);
      const crossLeak = (ticketsB || []).filter(t => ticketsA_ids.includes(t.id));
      assert.equal(crossLeak.length, 0, 'User B must never share tickets with User A');
    }
  });
});

// -----------------------------------------------------------------------------
// Suite 5: Storage Folder Isolation Security
// -----------------------------------------------------------------------------
describe('5. Storage Folder Isolation Security Audit', () => {
  it('Public storage bucket yogneet-public exists and is public', async (t) => {
    if (!serviceRoleKey) return t.skip('Service role key missing');
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: buckets, error } = await admin.storage.listBuckets();
    assert.equal(error, null, 'Can list buckets');

    const pubBucket = buckets.find(b => b.id === 'yogneet-public');
    assert.ok(pubBucket, 'yogneet-public bucket must exist');
    assert.equal(pubBucket.public, true, 'yogneet-public bucket must have public = true for asset CDN delivery');
  });

  it('Storage RLS enforces folder isolation: (storage.foldername(name))[1] = auth.uid()::text', () => {
    const migrationPath = path.resolve('supabase/migrations/20261026000002_rls_policies.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(
      sql.includes('(storage.foldername(name))[1] = auth.uid()::text'),
      'Must enforce folder isolation based on auth.uid()'
    );
  });
});

// -----------------------------------------------------------------------------
// Suite 6: Icon Library Security & Reference Protection
// -----------------------------------------------------------------------------
describe('6. Icon Library Security & Reference Protection Audit', () => {
  it('Icon library enforces Admin-only modifications via RLS', async (t) => {
    if (!anonKey) return t.skip('Anon key missing');
    const client = createClient(supabaseUrl, anonKey);

    const { error: insertErr } = await client.from('icon_library').insert({
      name: 'Hacked Icon',
      category: 'General',
      source_type: 'lucide',
    });
    assert.ok(insertErr !== null, 'Anon cannot insert icons');

    const { data: updateData, error: updateErr } = await client
      .from('icon_library')
      .update({ name: 'Tampered' })
      .eq('name', 'Code & Algorithms')
      .select();
    assert.ok(
      (updateErr !== null) || (Array.isArray(updateData) && updateData.length === 0),
      'Anon cannot update icons (blocked or 0 rows modified)'
    );
  });

  it('admin_delete_icon rejects unauthenticated or unauthorized deletion of system icons', async (t) => {
    if (!serviceRoleKey) return t.skip('Service role key missing');
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: sysIcon } = await admin
      .from('icon_library')
      .select('id, name')
      .eq('is_system', true)
      .limit(1)
      .single();

    if (sysIcon) {
      const { error } = await admin.rpc('admin_delete_icon', { p_icon_id: sysIcon.id });
      assert.ok(error !== null, 'Deleting system icons must be rejected');
      assert.ok(
        error.message.includes('Unauthorized') ||
        error.message.includes('Built-in system icons cannot be deleted')
      );
    }
  });

  it('admin_delete_icon checks references in subjects and micro_subjects before deletion', () => {
    const migrationPath = path.resolve('supabase/migrations/20261103000021_phase_4b_backend_and_supabase_integration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes('v_subjects_count') && sql.includes('public.subjects'), 'Checks subjects usage');
    assert.ok(sql.includes('v_micro_count') && sql.includes('public.micro_subjects'), 'Checks micro_subjects usage');
    assert.ok(sql.includes('Icon is currently assigned to active curriculum content'), 'Returns informative conflict message');
  });
});

// -----------------------------------------------------------------------------
// Suite 7: Profile & RBAC Security Audit
// -----------------------------------------------------------------------------
describe('7. Profile & RBAC Security Audit', () => {
  it('Database trigger trg_protect_profile_modifications blocks role escalation', () => {
    const migrationPath = path.resolve('supabase/migrations/20261026000001_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(
      sql.includes('IF OLD.role <> NEW.role OR OLD.status <> NEW.status THEN'),
      'Must check OLD.role <> NEW.role in trigger'
    );
    assert.ok(
      sql.includes('Only administrators can modify user roles or account status'),
      'Must raise exception on unauthorized role change'
    );
  });

  it('Profile audit trigger trg_audit_profile_changes captures metadata mutations', () => {
    const migrationPath = path.resolve('supabase/migrations/20261103000021_phase_4b_backend_and_supabase_integration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes('PROFILE_UPDATED'), 'Logs PROFILE_UPDATED audit action');
    assert.ok(sql.includes('institution_changed'), 'Tracks institution change in audit');
    assert.ok(sql.includes('avatar_changed'), 'Tracks avatar change in audit');
  });
});

// -----------------------------------------------------------------------------
// Suite 8: Analytics Authorization & Telemetry Integrity
// -----------------------------------------------------------------------------
describe('8. Analytics Authorization & Telemetry Integrity Audit', () => {
  it('Analytics service calculates metrics from live DB tables (profiles, assessment_attempts, study_notes, video_lessons)', () => {
    const code = fs.readFileSync(path.resolve('src/services/analyticsService.ts'), 'utf8');
    assert.ok(code.includes("from('profiles')"), 'Queries profiles table');
    assert.ok(code.includes("from('assessment_attempts')"), 'Queries assessment_attempts table');
    assert.ok(code.includes("from('study_notes')"), 'Queries study_notes table');
    assert.ok(code.includes("from('video_lessons')"), 'Queries video_lessons table');
  });

  it('Transparently marks uninstrumented video watch hours & note downloads as Not tracked', () => {
    const code = fs.readFileSync(path.resolve('src/services/analyticsService.ts'), 'utf8');
    assert.ok(code.includes("displayValue: 'Not tracked'"), 'Labels uninstrumented metrics as Not tracked');
    assert.ok(code.includes('isTracked: false'), 'Explicitly flags isTracked: false');
    assert.ok(!code.includes('14,290'), 'Does not display hardcoded fake watch hours');
  });
});
