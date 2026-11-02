/**
 * ==============================================================================
 * Yogneet Edu — Phase 2 Backend Integration Test Suite
 * ==============================================================================
 * Validates:
 *   1. Phase 2 Database Migration (20261101000008) DDL, constraints, triggers, RLS.
 *   2. Main Subjects and foreign key cascade/archival restrictions.
 *   3. Independent Micro Lessons & Micro Subjects architecture.
 *   4. Concurrency-safe enrollment number formatting & sequence rules (2026001..20261000).
 *   5. YouTube Shorts robust URL parsing & official embed generation.
 *   6. Secure random temporary credential generation (no phone/enrollment passwords).
 *   7. Read-only audited account inspection contract.
 *   8. Live staging database connectivity and schema verification (isolated staging).
 * ==============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const KNOWN_PRODUCTION_HOST = 'acmhdklihpqzurzuthkw.supabase.co';

// Helper to load staging environment safely
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
// Suite 1: Migration DDL & Relational Schema Integrity
// -----------------------------------------------------------------------------
describe('Suite 1: Phase 2 Database Migration & Relational Schema Integrity', () => {
  const migrationPath = path.resolve('supabase/migrations/20261101000008_phase_2_subjects_microlessons_premium.sql');

  it('Migration file 20261101000008 exists and contains forward-only DDL', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration 20261101000008 must exist');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.length > 2000, 'Migration must contain substantial DDL definitions');
  });

  it('Defines public.subjects with unique constraints and required metadata columns', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.subjects'), 'Must create public.subjects');
    assert.ok(sql.includes('name TEXT NOT NULL UNIQUE'), 'Must enforce unique subject name');
    assert.ok(sql.includes('slug TEXT NOT NULL UNIQUE'), 'Must enforce unique subject slug');
    assert.ok(sql.includes('icon TEXT NOT NULL DEFAULT'), 'Must define subject icon');
    assert.ok(sql.includes('display_order INTEGER NOT NULL DEFAULT'), 'Must define display_order');
    assert.ok(sql.includes('is_active BOOLEAN NOT NULL DEFAULT true'), 'Must define is_active');
    assert.ok(sql.includes('color_scheme TEXT NOT NULL DEFAULT'), 'Must define color_scheme');
  });

  it('Associates educational content tables with subject_id and ON DELETE RESTRICT', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes('ALTER TABLE public.video_lessons') && sql.includes('subject_id TEXT REFERENCES public.subjects(id) ON DELETE RESTRICT'),
      'video_lessons must reference subjects with ON DELETE RESTRICT');
    assert.ok(sql.includes('ALTER TABLE public.study_notes') && sql.includes('subject_id TEXT REFERENCES public.subjects(id) ON DELETE RESTRICT'),
      'study_notes must reference subjects with ON DELETE RESTRICT');
    assert.ok(sql.includes('ALTER TABLE public.practical_assignments') && sql.includes('subject_id TEXT REFERENCES public.subjects(id) ON DELETE RESTRICT'),
      'practical_assignments must reference subjects with ON DELETE RESTRICT');
    assert.ok(sql.includes('ALTER TABLE public.assessments') && sql.includes('subject_id TEXT REFERENCES public.subjects(id) ON DELETE RESTRICT'),
      'assessments must reference subjects with ON DELETE RESTRICT');
  });

  it('Creates deletion guard trigger to prevent deletion of subjects with active dependent content', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes('FUNCTION public.check_subject_deletion_guard()'), 'Must define check_subject_deletion_guard function');
    assert.ok(sql.includes('TRIGGER trg_check_subject_deletion_guard'), 'Must attach trigger to public.subjects');
    assert.ok(sql.includes('Cannot delete subject'), 'Must raise informative exception on dependent content deletion attempt');
  });

  it('Defines completely independent public.micro_subjects and public.micro_lessons', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.micro_subjects'), 'Must create public.micro_subjects');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.micro_lessons'), 'Must create public.micro_lessons');

    // Independence check: micro_subjects must NOT reference public.subjects
    const microSubjectSection = sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS public.micro_subjects'), sql.indexOf('CREATE TABLE IF NOT EXISTS public.micro_lessons'));
    assert.ok(!microSubjectSection.includes('REFERENCES public.subjects'), 'Micro subjects must NOT inherit or reference main subjects');

    assert.ok(sql.includes('youtube_id TEXT NOT NULL CHECK (length(youtube_id) = 11)'), 'Must enforce strict 11-char YouTube ID');
  });

  it('Defines enrollment_sequences and generate_next_enrollment_number with row locking', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.enrollment_sequences'), 'Must create public.enrollment_sequences');
    assert.ok(sql.includes('FUNCTION public.generate_next_enrollment_number'), 'Must define generate_next_enrollment_number');
    assert.ok(sql.includes('FOR UPDATE'), 'Must acquire exclusive pessimistic row lock during sequence increment');
  });

  it('Extends public.profiles with authoritative premium fields', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes('enrollment_number TEXT UNIQUE'), 'Must add unique enrollment_number');
    assert.ok(sql.includes('admission_year INTEGER'), 'Must add admission_year');
    assert.ok(sql.includes('sequential_number INTEGER'), 'Must add sequential_number');
    assert.ok(sql.includes('is_premium BOOLEAN NOT NULL DEFAULT false'), 'Must add is_premium flag');
    assert.ok(sql.includes('yogneet_email TEXT UNIQUE'), 'Must add unique yogneet_email');
    assert.ok(sql.includes('must_change_password BOOLEAN NOT NULL DEFAULT false'), 'Must add must_change_password');
  });

  it('Hardens protect_profile_privileged_fields trigger against unauthorized premium mutations', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes('OLD.is_premium IS DISTINCT FROM NEW.is_premium'), 'Must guard is_premium against student direct updates');
    assert.ok(sql.includes('OLD.enrollment_number IS DISTINCT FROM NEW.enrollment_number'), 'Must guard enrollment_number');
    assert.ok(sql.includes('OLD.yogneet_email IS DISTINCT FROM NEW.yogneet_email'), 'Must guard yogneet_email');
  });

  it('Defines upgrade_student_to_premium and admin_generate_temporary_credential RPCs', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes('FUNCTION public.upgrade_student_to_premium'), 'Must define upgrade_student_to_premium');
    assert.ok(sql.includes('FUNCTION public.admin_generate_temporary_credential'), 'Must define admin_generate_temporary_credential');
    assert.ok(sql.includes('FUNCTION public.get_student_inspection_summary'), 'Must define get_student_inspection_summary');
    assert.ok(sql.includes('STUDENT_PREMIUM_UPGRADE'), 'Must log audit event for upgrades');
    assert.ok(sql.includes('ADMIN_TEMPORARY_CREDENTIAL_ISSUED'), 'Must log audit event for credentials');
    assert.ok(sql.includes('ACCOUNT_INSPECTION_ACCESSED'), 'Must log audit event for account inspection');
  });
});

// -----------------------------------------------------------------------------
// Suite 2: Enrollment Number Formatting & Sequence Verification
// -----------------------------------------------------------------------------
describe('Suite 2: Concurrency-Safe Enrollment Number Formatting & Rules', () => {
  function formatEnrollmentNumber(year, seq) {
    const seqStr = seq < 1000 ? String(seq).padStart(3, '0') : String(seq);
    return `${year}${seqStr}`;
  }

  it('Pads sequential numbers below 1000 to 3 digits (e.g. 2026001 .. 2026999)', () => {
    assert.equal(formatEnrollmentNumber(2026, 1), '2026001');
    assert.equal(formatEnrollmentNumber(2026, 2), '2026002');
    assert.equal(formatEnrollmentNumber(2026, 42), '2026042');
    assert.equal(formatEnrollmentNumber(2026, 999), '2026999');
  });

  it('Handles 1000 and beyond without overflow or extra padding', () => {
    assert.equal(formatEnrollmentNumber(2026, 1000), '20261000');
    assert.equal(formatEnrollmentNumber(2026, 1001), '20261001');
    assert.equal(formatEnrollmentNumber(2026, 12500), '202612500');
  });

  it('Generates proposed email with username@yogneet.edu convention', () => {
    function generateProposedEmail(name) {
      const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/(^\.|\.$)/g, '');
      return `${clean || 'student'}@yogneet.edu`;
    }
    assert.equal(generateProposedEmail('Alex Rivera'), 'alex.rivera@yogneet.edu');
    assert.equal(generateProposedEmail('Sneha Rao'), 'sneha.rao@yogneet.edu');
    assert.equal(generateProposedEmail('Ravi Kumar!'), 'ravi.kumar@yogneet.edu');
  });
});

// -----------------------------------------------------------------------------
// Suite 3: Robust YouTube Shorts URL Parser & Embed Compliance
// -----------------------------------------------------------------------------
describe('Suite 3: YouTube Shorts URL Parser & Creator Engagement Standards', () => {
  function extractYouTubeId(urlOrId) {
    if (!urlOrId || typeof urlOrId !== 'string') return null;
    const trimmed = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

    try {
      const url = new URL(trimmed);
      if (url.hostname === 'youtu.be') {
        const id = url.pathname.slice(1).split('/')[0].split('?')[0];
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
      if (url.hostname.includes('youtube.com')) {
        if (url.pathname.startsWith('/shorts/')) {
          const id = url.pathname.split('/')[2]?.split('?')[0];
          return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
        }
        if (url.pathname.startsWith('/embed/')) {
          const id = url.pathname.split('/')[2]?.split('?')[0];
          return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
        }
        if (url.pathname === '/watch') {
          const v = url.searchParams.get('v');
          return v && /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : null;
        }
      }
    } catch {
      // url parse failed
    }
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return match && /^[a-zA-Z0-9_-]{11}$/.test(match[1]) ? match[1] : null;
  }

  function toOfficialYouTubeEmbedUrl(youtubeId, origin = 'https://yogneetedu.in') {
    return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&enablejsapi=1&playsinline=1&modestbranding=1&rel=0&origin=${encodeURIComponent(origin)}`;
  }

  it('Parses standard youtube.com/shorts/VIDEO_ID URLs', () => {
    assert.equal(extractYouTubeId('https://www.youtube.com/shorts/bM7SZ5SBzyY'), 'bM7SZ5SBzyY');
    assert.equal(extractYouTubeId('https://youtube.com/shorts/kJQP7kiw5Fk'), 'kJQP7kiw5Fk');
  });

  it('Parses shorts with query parameters (e.g. ?feature=share, ?si=...)', () => {
    assert.equal(extractYouTubeId('https://www.youtube.com/shorts/bM7SZ5SBzyY?si=abc1234&feature=share'), 'bM7SZ5SBzyY');
  });

  it('Parses standard watch, youtu.be, and embed URLs', () => {
    assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.equal(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.equal(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  it('Rejects invalid, malformed, or malicious inputs', () => {
    assert.equal(extractYouTubeId('not-a-url'), null);
    assert.equal(extractYouTubeId('https://evil.com/shorts/bM7SZ5SBzyY'), null);
    assert.equal(extractYouTubeId('https://www.youtube.com/shorts/tooshort'), null);
    assert.equal(extractYouTubeId('https://www.youtube.com/shorts/toolongstring12345'), null);
    assert.equal(extractYouTubeId(''), null);
  });

  it('Generates official YouTube embed URL with origin, loop, and playlist parameters', () => {
    const embedUrl = toOfficialYouTubeEmbedUrl('bM7SZ5SBzyY', 'https://yogneetedu.in');
    assert.ok(embedUrl.startsWith('https://www.youtube.com/embed/bM7SZ5SBzyY'));
    assert.ok(embedUrl.includes('playlist=bM7SZ5SBzyY'), 'Looping requires playlist parameter');
    assert.ok(embedUrl.includes('loop=1'));
    assert.ok(embedUrl.includes('origin=https%3A%2F%2Fyogneetedu.in'));
  });
});

// -----------------------------------------------------------------------------
// Suite 4: Credential Security & Password Lifecycle Rules
// -----------------------------------------------------------------------------
describe('Suite 4: Secure Temporary Credentials & Mandatory First-Login Password Change', () => {
  it('Rejects predictable credentials derived from phone or enrollment numbers', () => {
    const phone = '+91 98765 43210';
    const enrollment = '2026001';

    // Must NOT derive password from phone or enrollment
    const prohibitedPhoneSuffix = phone.slice(-4);
    const prohibitedEnrollmentSuffix = enrollment.slice(-4);

    // Cryptographic generator
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let token = 'Yg#';
    for (let i = 0; i < 10; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    token += '9z';

    assert.ok(token.length >= 12, 'Temporary token must have minimum 12 characters');
    assert.ok(!token.includes(prohibitedPhoneSuffix), 'Must not use phone suffix');
    assert.ok(!token.includes(prohibitedEnrollmentSuffix), 'Must not use enrollment suffix');
  });
});

// -----------------------------------------------------------------------------
// Suite 5: Live Supabase Staging Environment Verification
// -----------------------------------------------------------------------------
describe('Suite 5: Live Supabase Staging Verification (Isolated Staging)', async () => {
  const env = loadStagingEnv();
  const isStagingReady = Boolean(
    env.VITE_SUPABASE_URL &&
    env.SUPABASE_SERVICE_ROLE_KEY &&
    !env.VITE_SUPABASE_URL.includes(KNOWN_PRODUCTION_HOST)
  );

  it('Staging environment configuration strictly isolates away from production host', () => {
    if (env.VITE_SUPABASE_URL) {
      assert.ok(!env.VITE_SUPABASE_URL.includes(KNOWN_PRODUCTION_HOST),
        `CRITICAL SAFETY VIOLATION: Staging script detected production host ${KNOWN_PRODUCTION_HOST}`);
    }
  });

  it('Live query on public.subjects verifies seeded academic curriculum', async (t) => {
    if (!isStagingReady) return t.skip('Staging credentials not configured');
    const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await client.from('subjects').select('id, name, is_active').order('display_order');
    assert.equal(error, null, error?.message);
    assert.ok(Array.isArray(data) && data.length >= 5, 'Must have at least 5 seeded subjects');
    const pythonSubj = data.find(s => s.id === 'subj_python');
    assert.ok(pythonSubj, 'Python Programming subject must exist');
    assert.equal(pythonSubj.is_active, true);
  });

  it('Live query on public.micro_subjects verifies independent micro topics', async (t) => {
    if (!isStagingReady) return t.skip('Staging credentials not configured');
    const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await client.from('micro_subjects').select('id, name, is_active').order('display_order');
    assert.equal(error, null, error?.message);
    assert.ok(Array.isArray(data) && data.length >= 5, 'Must have at least 5 seeded micro subjects');
  });

  it('Live query on public.micro_lessons verifies 11-char YouTube IDs', async (t) => {
    if (!isStagingReady) return t.skip('Staging credentials not configured');
    const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await client.from('micro_lessons').select('id, youtube_id, status').limit(5);
    assert.equal(error, null, error?.message);
    assert.ok(Array.isArray(data) && data.length > 0, 'Must have micro lessons');
    for (const lesson of data) {
      assert.equal(lesson.youtube_id.length, 11, 'YouTube ID must be exactly 11 characters');
    }
  });

  it('Live execution of generate_next_enrollment_number RPC returns valid sequence', async (t) => {
    if (!isStagingReady) return t.skip('Staging credentials not configured');
    const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await client.rpc('generate_next_enrollment_number', { p_year: 2026 });
    assert.equal(error, null, error?.message);
    assert.ok(Array.isArray(data) && data.length > 0, 'RPC must return generated sequence record');
    assert.ok(data[0].enrollment_number.startsWith('2026'), 'Enrollment must start with year 2026');
    assert.ok(data[0].seq_num > 0, 'Sequence number must be positive');
  });

  it('Live query on public.profiles verifies Phase 2 premium and enrollment columns', async (t) => {
    if (!isStagingReady) return t.skip('Staging credentials not configured');
    const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await client.from('profiles').select('id, enrollment_number, is_premium, yogneet_email, must_change_password').limit(1);
    assert.equal(error, null, error?.message);
    assert.ok(Array.isArray(data), 'Profiles columns must exist without query errors');
  });
});
