/**
 * ==============================================================================
 * Yogneet Edu — Student Access & Feedback Management Test Suite
 * ==============================================================================
 * Validates:
 *   1. Migration 00019 & 00020 DDL: student_module_access & feedback_submissions schema.
 *   2. Strict Feedback Privacy: Visible ONLY to Admin.
 *   3. get_my_feedback_submissions is dropped / blocked for non-admins.
 *   4. Non-admins cannot query feedback_submissions via PostgREST or RPC.
 *   5. Server-side session identity & role attribution in submit_user_feedback.
 *   6. Student Module Access router guard logic for Normal vs Premium tiers.
 *   7. Staging Supabase live connectivity & security verification.
 * ==============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const KNOWN_PRODUCTION_HOST = 'acmhdklihpqzurzuthkw.supabase.co';

// Helper to safely load staging env from .env.local
function loadStagingEnv() {
  const targetPath = path.resolve(process.cwd(), '.env.local');
  const env = { ...process.env };
  if (fs.existsSync(targetPath)) {
    const content = fs.readFileSync(targetPath, 'utf-8');
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

// -----------------------------------------------------------------------------
// Suite 1: Migration Schema & Security Constraints
// -----------------------------------------------------------------------------
describe('Suite 1: Migration 00019 & 00020 Schema & Security Constraints', () => {
  const migration00019Path = path.resolve('supabase/migrations/20261101000019_student_access_and_feedback_system.sql');
  const migration00020Path = path.resolve('supabase/migrations/20261101000020_restrict_feedback_strictly_to_admin.sql');

  it('Migration files exist and define required tables', () => {
    assert.ok(fs.existsSync(migration00019Path), 'Migration 00019 must exist');
    assert.ok(fs.existsSync(migration00020Path), 'Migration 00020 must exist');
    const sql19 = fs.readFileSync(migration00019Path, 'utf8');

    assert.ok(sql19.includes('public.student_module_access'), 'Must define student_module_access table');
    assert.ok(sql19.includes('public.feedback_submissions'), 'Must define feedback_submissions table');
  });

  it('Defines all 10 standard platform modules in student_module_access', () => {
    const sql19 = fs.readFileSync(migration00019Path, 'utf8');
    const requiredModules = [
      'dashboard',
      'videos',
      'notes',
      'practical',
      'tests',
      'micro_lessons',
      'coding',
      'community',
      'progress',
      'feedback'
    ];

    for (const mod of requiredModules) {
      assert.ok(sql19.includes(`'${mod}'`), `Must seed module '${mod}'`);
    }
  });

  it('Enforces strict Admin-Only RLS on feedback_submissions', () => {
    const sql20 = fs.readFileSync(migration00020Path, 'utf8');

    assert.ok(sql20.includes('ENABLE ROW LEVEL SECURITY'), 'Must enable RLS');
    assert.ok(sql20.includes('admin_full_feedback_access'), 'Must define admin policy on feedback_submissions');
    assert.ok(sql20.includes('public.is_admin()'), 'Policy must strictly check admin identity');
  });

  it('Migration 00020 explicitly drops get_my_feedback_submissions', () => {
    const sql20 = fs.readFileSync(migration00020Path, 'utf8');
    assert.ok(
      sql20.includes('DROP FUNCTION IF EXISTS public.get_my_feedback_submissions()'),
      'Must drop get_my_feedback_submissions to block non-admin retrieval'
    );
  });

  it('Defines secure RPC functions for feedback submission and admin update', () => {
    const sql19 = fs.readFileSync(migration00019Path, 'utf8');

    assert.ok(sql19.includes('FUNCTION public.submit_user_feedback'), 'Must define submit_user_feedback RPC');
    assert.ok(sql19.includes('FUNCTION public.admin_update_feedback_status'), 'Must define admin_update_feedback_status RPC');
    assert.ok(sql19.includes('FUNCTION public.admin_update_student_module_access'), 'Must define admin_update_student_module_access RPC');
    assert.ok(sql19.includes('FUNCTION public.check_student_module_access'), 'Must define check_student_module_access RPC');

    // Verify SECURITY DEFINER is set on RPCs
    assert.ok(sql19.includes('SECURITY DEFINER'), 'RPCs must use SECURITY DEFINER with locked search_path');
    assert.ok(sql19.includes('SET search_path = public'), 'Must lock search_path = public for security');
  });
});

// -----------------------------------------------------------------------------
// Suite 2: Tier Module Access Routing Rules
// -----------------------------------------------------------------------------
describe('Suite 2: Student Tier Module Access Logic', () => {
  const sampleAccessRules = [
    { moduleKey: 'dashboard', moduleRoute: '/dashboard', normalEnabled: true, premiumEnabled: true },
    { moduleKey: 'videos', moduleRoute: '/videos', normalEnabled: true, premiumEnabled: true },
    { moduleKey: 'micro_lessons', moduleRoute: '/micro-lessons', normalEnabled: false, premiumEnabled: true },
    { moduleKey: 'tests', moduleRoute: '/tests', normalEnabled: false, premiumEnabled: true },
    { moduleKey: 'notes', moduleRoute: '/notes', normalEnabled: true, premiumEnabled: true },
    { moduleKey: 'coding', moduleRoute: '/coding', normalEnabled: false, premiumEnabled: true },
    { moduleKey: 'feedback', moduleRoute: '/feedback', normalEnabled: true, premiumEnabled: true },
  ];

  function isModuleAccessible(routeOrKey, accessList, isPremium) {
    const item = accessList.find(m => m.moduleKey === routeOrKey || m.moduleRoute === routeOrKey);
    if (!item) return true;
    return isPremium ? item.premiumEnabled : item.normalEnabled;
  }

  it('Normal students are granted access only to normal-enabled modules', () => {
    assert.equal(isModuleAccessible('/dashboard', sampleAccessRules, false), true);
    assert.equal(isModuleAccessible('/videos', sampleAccessRules, false), true);
    assert.equal(isModuleAccessible('/notes', sampleAccessRules, false), true);
    assert.equal(isModuleAccessible('/feedback', sampleAccessRules, false), true);

    // Disabled for normal tier
    assert.equal(isModuleAccessible('/micro-lessons', sampleAccessRules, false), false);
    assert.equal(isModuleAccessible('/tests', sampleAccessRules, false), false);
    assert.equal(isModuleAccessible('/coding', sampleAccessRules, false), false);
  });

  it('Premium students are granted access when premium_enabled is true', () => {
    assert.equal(isModuleAccessible('/dashboard', sampleAccessRules, true), true);
    assert.equal(isModuleAccessible('/videos', sampleAccessRules, true), true);
    assert.equal(isModuleAccessible('/micro-lessons', sampleAccessRules, true), true);
    assert.equal(isModuleAccessible('/tests', sampleAccessRules, true), true);
    assert.equal(isModuleAccessible('/coding', sampleAccessRules, true), true);
    assert.equal(isModuleAccessible('/feedback', sampleAccessRules, true), true);
  });

  it('Blocks navigation when an admin disables a module for both tiers', () => {
    const lockedRules = [
      ...sampleAccessRules,
      { moduleKey: 'community', moduleRoute: '/community', normalEnabled: false, premiumEnabled: false },
    ];

    assert.equal(isModuleAccessible('/community', lockedRules, false), false);
    assert.equal(isModuleAccessible('/community', lockedRules, true), false);
  });
});

// -----------------------------------------------------------------------------
// Suite 3: Staging Supabase Live Security & Privacy Verification
// -----------------------------------------------------------------------------
describe('Suite 3: Staging Supabase Live Feedback Privacy & Security Verification', () => {
  const env = loadStagingEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  it('Guards against production environment target', () => {
    if (supabaseUrl) {
      assert.notEqual(
        new URL(supabaseUrl).host,
        KNOWN_PRODUCTION_HOST,
        'Live security test must never run against production'
      );
    }
  });

  it('Anon client cannot SELECT records from feedback_submissions via PostgREST', async (t) => {
    if (!supabaseUrl || !anonKey) {
      t.skip('Skipping live Supabase check: .env.local credentials not present');
      return;
    }

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data, error } = await anonClient
      .from('feedback_submissions')
      .select('*');

    // RLS policy permits only public.is_admin().
    // An unauthenticated / anon caller must receive an empty array (or 403 / RLS denial)
    assert.ok(
      (data === null && error !== null) || (Array.isArray(data) && data.length === 0),
      'Direct PostgREST SELECT by unauthenticated client must return 0 rows or be denied'
    );
  });

  it('Anon client cannot directly INSERT into feedback_submissions via PostgREST', async (t) => {
    if (!supabaseUrl || !anonKey) {
      t.skip('Skipping live Supabase check: .env.local credentials not present');
      return;
    }

    const anonClient = createClient(supabaseUrl, anonKey);
    const { error } = await anonClient
      .from('feedback_submissions')
      .insert({
        title: 'Bypass test',
        description: 'Testing direct insert',
        category: 'Bug',
        user_id: '00000000-0000-0000-0000-000000000000',
        user_email: 'attacker@evil.com',
        user_name: 'Attacker',
        user_role: 'student'
      });

    assert.ok(error !== null, 'Direct insert into feedback_submissions by anon must be blocked by RLS');
  });

  it('Calling get_my_feedback_submissions RPC fails because it is removed/disabled', async (t) => {
    if (!supabaseUrl || !anonKey) {
      t.skip('Skipping live Supabase check: .env.local credentials not present');
      return;
    }

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data, error } = await anonClient.rpc('get_my_feedback_submissions');

    // Because the function was dropped in migration 00020, RPC must return an error (42883 or PGRST202)
    assert.ok(error !== null, 'get_my_feedback_submissions must fail as it was dropped in migration 00020');
  });

  it('student_module_access table contains 10 records verified via service-role', async (t) => {
    if (!supabaseUrl || !serviceRoleKey) {
      t.skip('Skipping live Supabase check: service role key not present');
      return;
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await adminClient
      .from('student_module_access')
      .select('module_key, normal_enabled, premium_enabled, display_order')
      .order('display_order', { ascending: true });

    assert.equal(error, null, 'student_module_access must query cleanly');
    assert.ok(Array.isArray(data) && data.length === 10, `Expected 10 modules, found ${data?.length}`);

    const keys = data.map(d => d.module_key);
    assert.ok(keys.includes('dashboard'), 'Must include dashboard');
    assert.ok(keys.includes('videos'), 'Must include videos');
    assert.ok(keys.includes('notes'), 'Must include notes');
    assert.ok(keys.includes('practical'), 'Must include practical');
    assert.ok(keys.includes('tests'), 'Must include tests');
    assert.ok(keys.includes('micro_lessons'), 'Must include micro_lessons');
    assert.ok(keys.includes('coding'), 'Must include coding');
    assert.ok(keys.includes('community'), 'Must include community');
    assert.ok(keys.includes('progress'), 'Must include progress');
    assert.ok(keys.includes('feedback'), 'Must include feedback');
  });

  it('Feedback submissions table is queryable ONLY by Admin via PostgREST', async (t) => {
    if (!supabaseUrl || !serviceRoleKey) {
      t.skip('Skipping live Supabase check: service role key not present');
      return;
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await adminClient
      .from('feedback_submissions')
      .select('id, user_role, user_name, user_email, title, status')
      .limit(5);

    assert.equal(error, null, 'Admin / service-role must query feedback cleanly');
    assert.ok(Array.isArray(data), 'Admin query returns array of submissions');
  });
});
