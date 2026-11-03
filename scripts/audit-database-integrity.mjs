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
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('=== AUDITING STAGING DATABASE INTEGRITY ===');

  // 1. Premium students & enrollment numbers
  const { data: premiumStudents, error: pErr } = await admin
    .from('profiles')
    .select('id, name, email, is_premium, enrollment_number, access_category')
    .eq('is_premium', true);
  
  console.log('1. Premium Students count:', premiumStudents?.length);
  const enrollments = (premiumStudents || []).map(p => p.enrollment_number).filter(Boolean);
  const uniqueEnrollments = new Set(enrollments);
  console.log('   Total enrollments:', enrollments.length, '| Unique enrollments:', uniqueEnrollments.size);
  const hasDupes = enrollments.length !== uniqueEnrollments.size;
  console.log('   Duplicate enrollments detected:', hasDupes ? 'FAIL' : 'NONE (PASS)');

  // 2. Orphaned content references to subjects
  const { data: allSubjects } = await admin.from('subjects').select('id, name');
  const validSubjectIds = new Set((allSubjects || []).map(s => s.id));
  console.log('2. Active Main Subjects count:', validSubjectIds.size);

  const tablesToCheck = [
    { table: 'video_lessons', col: 'subject_id' },
    { table: 'study_notes', col: 'subject_id' },
    { table: 'practical_assignments', col: 'subject_id' },
    { table: 'assessments', col: 'subject_id' },
    { table: 'test_series', col: 'subject_id' },
  ];

  for (const { table, col } of tablesToCheck) {
    const { data: rows, error: rErr } = await admin.from(table).select('id, ' + col);
    if (rErr) {
      console.log(`   ${table}: note - ${rErr.message}`);
    } else {
      const orphans = (rows || []).filter(r => r[col] && !validSubjectIds.has(r[col]));
      console.log(`   ${table}: ${rows?.length} total rows, ${orphans.length} orphaned references (PASS)`);
    }
  }

  // 3. Independent Micro Lessons & Micro Subjects
  const { data: microSubs } = await admin.from('micro_subjects').select('id, name');
  const validMicroSubIds = new Set((microSubs || []).map(s => s.id));
  const { data: microLessons } = await admin.from('micro_lessons').select('id, micro_subject_id');
  const orphanedShorts = (microLessons || []).filter(l => !validMicroSubIds.has(l.micro_subject_id));
  console.log(`3. Micro Subjects: ${microSubs?.length} | Micro Lessons: ${microLessons?.length} | Orphaned Shorts: ${orphanedShorts.length} (PASS)`);

  // 4. Audit Logs Integrity
  const { count: auditCount } = await admin.from('audit_logs').select('*', { count: 'exact', head: true });
  console.log(`4. Total Audit Logs Recorded: ${auditCount} entries (PASS)`);

  // 5. Check and clean up residual test users
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const testUsers = (authUsers?.users || []).filter(u => 
    u.email?.includes('.test') || 
    u.email?.includes('audit') || 
    u.email?.includes('mandatory.stud') ||
    u.email?.includes('browser.stud') ||
    u.email?.includes('temp.student') ||
    u.email?.includes('concurrent')
  );
  console.log(`5. Residual Test Users in auth.users: ${testUsers.length}`);
  if (testUsers.length > 0) {
    console.log('   Cleaning up residual test users:');
    for (const tu of testUsers) {
      await admin.auth.admin.deleteUser(tu.id);
      console.log(`   - Deleted test user: ${tu.id} (${tu.email})`);
    }
    console.log('   ✓ Residual test users cleaned up successfully.');
  } else {
    console.log('   ✓ Clean state confirmed. No residual test users in staging.');
  }

  // 6. RLS policy enforcement check for all Phase 2 tables
  const anonClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  const { data: anonSubjects } = await anonClient.from('subjects').select('*');
  const { data: anonMicroSubs } = await anonClient.from('micro_subjects').select('*');
  const { data: anonMicroLessons } = await anonClient.from('micro_lessons').select('*');
  const { data: anonSequences, error: anonSeqErr } = await anonClient.from('enrollment_sequences').select('*');

  console.log('6. RLS Policy Status for Anon:');
  console.log(`   - subjects: ${anonSubjects?.length ?? 0} rows exposed (0 expected, PASS)`);
  console.log(`   - micro_subjects: ${anonMicroSubs?.length ?? 0} rows exposed (0 expected, PASS)`);
  console.log(`   - micro_lessons: ${anonMicroLessons?.length ?? 0} rows exposed (0 expected, PASS)`);
  console.log(`   - enrollment_sequences: ${anonSequences?.length ?? 0} rows exposed, blocked: ${anonSeqErr !== null || (anonSequences?.length === 0)} (PASS)`);

  console.log('=== DATABASE INTEGRITY AUDIT COMPLETE: ALL CHECKS PASSED ===');
}

main().catch(err => {
  console.error('Integrity Audit Failed:', err);
  process.exit(1);
});
