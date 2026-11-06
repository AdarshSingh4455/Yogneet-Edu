/**
 * ==============================================================================
 * Yogneet Edu — Winner Gift Supabase Persistence & Cross-User Security Test Suite
 * ==============================================================================
 * Validates:
 *   1. Safety check: Ensures tests run exclusively on Staging (never Production).
 *   2. Column verification: winner_gift exists in public.leaderboard_config.
 *   3. Admin Create: Admin sets winner_gift to '₹1,000 Amazon Gift Card'.
 *   4. Student Read: Separate authenticated student session sees the persisted gift.
 *   5. Admin Edit: Admin updates winner_gift to 'Free Premium Membership for 3 Months'.
 *   6. Student Updated Read: Student session sees the updated gift in real-time.
 *   7. Admin Clear: Admin clears winner_gift (null); student sees empty/null.
 *   8. RLS Authorization: Student cannot modify leaderboard_config (fails closed).
 *   9. DB Constraint: Strings > 120 chars are strictly rejected by PostgreSQL constraint.
 *  10. System Preservation: Scoring rules, eligibility, and Top 200 RPC remain intact.
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

describe('Leaderboard Winner Gift Supabase Integration Suite', () => {
  const PROD_URL = 'https://acmhdklihpqzurzuthkw.supabase.co';

  // Safety check
  it('0. Safety Boundary Check: Must NOT target production environment', () => {
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
  const studentEmail = `test-student-${runId}@staging.yogneet.internal`;
  const adminEmail = `test-admin-${runId}@staging.yogneet.internal`;
  const commonPass = `St@gingP@ss!${runId}`;

  let studentId = null;
  let adminId = null;
  let studentClient = null;
  let adminClient = null;
  let originalConfig = null;

  before(async () => {
    // 1. Capture original leaderboard_config
    const { data: origRow, error: fetchErr } = await serviceClient
      .from('leaderboard_config')
      .select('*')
      .eq('id', 1)
      .single();
    if (fetchErr) throw new Error(`Failed to capture original leaderboard_config: ${fetchErr.message}`);
    originalConfig = origRow;

    // 2. Provision test student account
    const { data: sUser, error: sErr } = await serviceClient.auth.admin.createUser({
      email: studentEmail,
      password: commonPass,
      email_confirm: true,
      user_metadata: { name: `Test Student ${runId}` },
    });
    if (sErr) throw new Error(`Failed to provision test student: ${sErr.message}`);
    studentId = sUser.user.id;
    await serviceClient.from('profiles').update({ role: 'student', status: 'active' }).eq('id', studentId);

    // 3. Provision test admin account
    const { data: aUser, error: aErr } = await serviceClient.auth.admin.createUser({
      email: adminEmail,
      password: commonPass,
      email_confirm: true,
      user_metadata: { name: `Test Admin ${runId}` },
    });
    if (aErr) throw new Error(`Failed to provision test admin: ${aErr.message}`);
    adminId = aUser.user.id;
    await serviceClient.from('profiles').update({ role: 'admin', status: 'active' }).eq('id', adminId);

    // 4. Authenticate separate student client
    studentClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: sLoginErr } = await studentClient.auth.signInWithPassword({
      email: studentEmail,
      password: commonPass,
    });
    if (sLoginErr) throw new Error(`Failed to sign in student: ${sLoginErr.message}`);

    // 5. Authenticate separate admin client
    adminClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: aLoginErr } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: commonPass,
    });
    if (aLoginErr) throw new Error(`Failed to sign in admin: ${aLoginErr.message}`);
  });

  after(async () => {
    // Restore original leaderboard config in Supabase
    if (originalConfig) {
      await serviceClient
        .from('leaderboard_config')
        .update({
          is_enabled: originalConfig.is_enabled,
          eligible_categories: originalConfig.eligible_categories,
          min_assessments_required: originalConfig.min_assessments_required,
          winner_gift: originalConfig.winner_gift,
          updated_by: originalConfig.updated_by,
        })
        .eq('id', 1);
    }

    // Clean up test auth users
    if (studentId) await serviceClient.auth.admin.deleteUser(studentId);
    if (adminId) await serviceClient.auth.admin.deleteUser(adminId);
  });

  it('1. Schema Verification: public.leaderboard_config has winner_gift column', async () => {
    const { data, error } = await serviceClient.from('leaderboard_config').select('*').eq('id', 1).single();
    assert.ifError(error);
    assert.ok(data !== null, 'Config row must exist');
    assert.ok('winner_gift' in data, 'Column winner_gift must exist on leaderboard_config');
    assert.ok('is_enabled' in data, 'Column is_enabled must be preserved');
    assert.ok('eligible_categories' in data, 'Column eligible_categories must be preserved');
    assert.ok('min_assessments_required' in data, 'Column min_assessments_required must be preserved');
  });

  it('2. Admin CREATE: Admin writes winner_gift to Supabase', async () => {
    const giftValue = '₹1,000 Amazon Gift Card';
    const { data, error } = await adminClient
      .from('leaderboard_config')
      .update({
        winner_gift: giftValue,
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      })
      .eq('id', 1)
      .select()
      .single();

    assert.ifError(error, `Admin update failed: ${error?.message}`);
    assert.strictEqual(data.winner_gift, giftValue, 'winner_gift must match set value');
  });

  it('3. Student READ: Student authenticated session retrieves saved winner_gift from Supabase', async () => {
    const { data, error } = await studentClient
      .from('leaderboard_config')
      .select('id, is_enabled, winner_gift')
      .eq('id', 1)
      .single();

    assert.ifError(error, `Student read failed: ${error?.message}`);
    assert.strictEqual(
      data.winner_gift,
      '₹1,000 Amazon Gift Card',
      'Student session must read exact value persisted by Admin'
    );
  });

  it('4. Admin EDIT: Admin modifies winner_gift to a different value', async () => {
    const updatedGift = 'Free Premium Membership for 3 Months';
    const { data, error } = await adminClient
      .from('leaderboard_config')
      .update({
        winner_gift: updatedGift,
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      })
      .eq('id', 1)
      .select()
      .single();

    assert.ifError(error, `Admin edit failed: ${error?.message}`);
    assert.strictEqual(data.winner_gift, updatedGift);
  });

  it('5. Student UPDATED READ: Student session observes updated winner_gift immediately', async () => {
    const { data, error } = await studentClient
      .from('leaderboard_config')
      .select('winner_gift')
      .eq('id', 1)
      .single();

    assert.ifError(error);
    assert.strictEqual(
      data.winner_gift,
      'Free Premium Membership for 3 Months',
      'Student session must see the newly updated gift'
    );
  });

  it('6. Admin CLEAR: Admin clears winner_gift (sets to NULL)', async () => {
    const { data, error } = await adminClient
      .from('leaderboard_config')
      .update({
        winner_gift: null,
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      })
      .eq('id', 1)
      .select()
      .single();

    assert.ifError(error, `Admin clear failed: ${error?.message}`);
    assert.strictEqual(data.winner_gift, null, 'winner_gift must be NULL after clear');
  });

  it('7. Student CLEARED READ: Student session confirms winner_gift is empty/null', async () => {
    const { data, error } = await studentClient
      .from('leaderboard_config')
      .select('winner_gift')
      .eq('id', 1)
      .single();

    assert.ifError(error);
    assert.strictEqual(data.winner_gift, null, 'Student session must observe null winner_gift');
  });

  it('8. RLS Security: Student is strictly blocked from modifying leaderboard_config', async () => {
    // Attempt unauthorized modification from student session
    const { data, error } = await studentClient
      .from('leaderboard_config')
      .update({ winner_gift: 'Unauthorized Rogue Modification' })
      .eq('id', 1)
      .select();

    // RLS policy prevents update: either returns error or 0 rows modified
    const modifiedCount = (data || []).length;
    assert.strictEqual(
      modifiedCount,
      0,
      'RLS policy must not allow student to modify leaderboard_config'
    );

    // Verify database value remains null
    const { data: verifyRow } = await serviceClient
      .from('leaderboard_config')
      .select('winner_gift')
      .eq('id', 1)
      .single();
    assert.strictEqual(verifyRow.winner_gift, null, 'winner_gift must remain unaltered by student');
  });

  it('9. Validation Constraint: Strings exceeding 120 characters are rejected by database', async () => {
    const oversizedGift = 'A'.repeat(121);
    const { error } = await adminClient
      .from('leaderboard_config')
      .update({ winner_gift: oversizedGift })
      .eq('id', 1);

    assert.ok(error !== null, 'Database must reject winner_gift > 120 characters');
    assert.ok(
      error.message.includes('check_leaderboard_config_winner_gift_length') ||
      error.message.includes('check constraint') ||
      error.code === '23514',
      `Error must reference constraint violation: ${error.message}`
    );
  });

  it('10. Validation Constraint: Strings exactly 120 characters are accepted by database', async () => {
    const exact120Gift = 'B'.repeat(120);
    const { data, error } = await adminClient
      .from('leaderboard_config')
      .update({ winner_gift: exact120Gift })
      .eq('id', 1)
      .select()
      .single();

    assert.ifError(error, `Valid 120-char gift should be accepted: ${error?.message}`);
    assert.strictEqual(data.winner_gift, exact120Gift);
  });

  it('11. Preservation Check: Top 200 Leaderboard RPC executes without regression', async () => {
    const { data, error } = await studentClient.rpc('get_top_200_leaderboard');
    assert.ifError(error, `Leaderboard RPC failed: ${error?.message}`);
    assert.ok(Array.isArray(data), 'RPC must return an array of leaderboard entries');
  });
});
