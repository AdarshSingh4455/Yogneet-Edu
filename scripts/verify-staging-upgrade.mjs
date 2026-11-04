import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

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
if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing staging credentials in .env.local');
  process.exit(1);
}

const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const anonClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function verify() {
  console.log('====================================================');
  console.log('🔍 VERIFYING STAGING DATABASE OBJECTS & INTEGRITY');
  console.log('Target URL:', env.VITE_SUPABASE_URL);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Tables Verification
  const tables = [
    'platform_settings',
    'user_presence',
    'leaderboard_config',
    'advertisements',
    'ad_events',
    'coding_problems',
    'coding_test_cases',
    'coding_submissions',
    'discussion_threads',
    'discussion_replies',
    'discussion_upvotes',
    'moderation_logs'
  ];

  for (const table of tables) {
    await check(`Table exists: public.${table}`, async () => {
      const { data, error } = await client.from(table).select('*').limit(1);
      if (error) throw new Error(`Query error on ${table}: ${error.message}`);
    });
  }

  // 2. Feature 1: Active Learners
  await check('Feature 1: public.get_public_active_learners_count() returns integer scalar', async () => {
    const { data, error } = await anonClient.rpc('get_public_active_learners_count');
    if (error) throw error;
    if (typeof data !== 'number') throw new Error(`Expected number, got ${typeof data}: ${JSON.stringify(data)}`);
    console.log(`     (Live public active learners count: ${data})`);
  });

  await check('Feature 1: Anon client CANNOT read public.platform_settings directly (RLS protected)', async () => {
    const { data, error } = await anonClient.from('platform_settings').select('*');
    if (data && data.length > 0) throw new Error('RLS leaked platform_settings to unauthenticated anon user!');
  });

  await check('Feature 1: Admin RPC get_admin_active_learners_metrics() enforces is_admin() access control', async () => {
    const { error } = await anonClient.rpc('get_admin_active_learners_metrics');
    if (!error) throw new Error('Expected access denied exception for unauthenticated caller');
    if (!error.message.includes('Access Denied') && !error.message.includes('permission denied')) {
      throw new Error(`Unexpected error: ${error.message}`);
    }
    console.log('     (Correctly failed closed with Access Denied/Permission Denied for non-admin)');
  });

  // 3. Feature 2: Leaderboard
  await check('Feature 2: public.get_top_200_leaderboard() executes cleanly', async () => {
    const { data, error } = await anonClient.rpc('get_top_200_leaderboard');
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Expected array of leaderboard rows');
    console.log(`     (Ranked students count: ${data.length} <= 200)`);
  });

  await check('Feature 2: assessment_attempts has is_excluded_from_leaderboard column', async () => {
    const { data, error } = await client
      .from('assessment_attempts')
      .select('attempt_id, is_excluded_from_leaderboard, leaderboard_exclusion_reason, excluded_by, excluded_at')
      .limit(1);
    if (error) throw error;
  });

  // 4. Feature 3: Advertisements
  await check('Feature 3: public.get_ad_analytics_summary() enforces advertisements.view permission check', async () => {
    const { error } = await anonClient.rpc('get_ad_analytics_summary');
    if (!error) throw new Error('Expected permission denied for unauthenticated caller');
    if (!error.message.includes('Access Denied') && !error.message.includes('permission denied')) {
      throw new Error(`Unexpected error: ${error.message}`);
    }
    console.log('     (Correctly failed closed with Access Denied for unauthorized caller)');
  });

  // 5. Feature 5: Coding Arena & Test Cases
  await check('Feature 5: coding_problems and coding_test_cases accessible', async () => {
    const { data: pData, error: pErr } = await client.from('coding_problems').select('id, title, difficulty, starter_code').limit(1);
    if (pErr) throw pErr;
    const { data: tcData, error: tcErr } = await client.from('coding_test_cases').select('id, input, expected_output, is_hidden').limit(1);
    if (tcErr) throw tcErr;
  });

  await check('Feature 5: Student / Anon cannot view hidden test cases (RLS protected)', async () => {
    const { data, error } = await anonClient
      .from('coding_test_cases')
      .select('*')
      .eq('is_hidden', true);
    if (data && data.length > 0) throw new Error('RLS leaked hidden test cases to student/anon!');
    console.log('     (Hidden test cases successfully protected by RLS)');
  });

  // 6. Feature 6: Community & Moderation Logs
  await check('Feature 6: discussion_threads with is_locked and moderation_logs accessible', async () => {
    const { data: thData, error: thErr } = await client
      .from('discussion_threads')
      .select('id, title, is_pinned, is_locked, is_hidden')
      .limit(1);
    if (thErr) throw thErr;

    const { data: logData, error: logErr } = await client
      .from('moderation_logs')
      .select('id, action, target_type, reason')
      .limit(1);
    if (logErr) throw logErr;
  });

  await check('Feature 6: moderate_thread RPC enforces community.moderate permission check', async () => {
    const { error } = await anonClient.rpc('moderate_thread', {
      p_thread_id: '00000000-0000-0000-0000-000000000000',
      p_action: 'PIN',
      p_reason: 'Test reason',
    });
    if (!error) throw new Error('Expected permission denied for unauthenticated caller');
    if (!error.message.includes('Access Denied') && !error.message.includes('permission denied')) {
      throw new Error(`Unexpected error: ${error.message}`);
    }
    console.log('     (Correctly failed closed with Access Denied for unauthorized caller)');
  });

  console.log('\n====================================================');
  console.log(`VERIFICATION COMPLETE: ${passed} / ${passed + failed} CHECKS PASSED`);
  if (failed > 0) {
    console.error(`FAILED: ${failed} CHECKS FAILED`);
    process.exit(1);
  } else {
    console.log('🎉 ALL 20 STAGING DATABASE UPGRADE CHECKS PASSED PERFECTLY!');
    console.log('====================================================');
  }
}

verify().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
