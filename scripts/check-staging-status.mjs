import { createClient } from '@supabase/supabase-js';
import { loadStagingEnv, validateStagingConfig } from './test-supabase-live.mjs';

const env = loadStagingEnv();
const validation = validateStagingConfig(env);
if (!validation.isValid) {
  console.error('Invalid staging config:', validation.errors);
  process.exit(1);
}

const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('Testing connection to:', env.VITE_SUPABASE_URL);

  // 1. Profiles columns
  const { data: pData, error: pErr } = await client.from('profiles').select('id, role, status, access_category, institution, program').limit(1);
  console.log('profiles access_category & institutional fields:', pErr ? `FAIL: ${pErr.message}` : 'EXISTS');

  // 2. staff_invitations table
  const { data: sData, error: sErr } = await client.from('staff_invitations').select('id, email, status').limit(1);
  console.log('staff_invitations table:', sErr ? `FAIL: ${sErr.message}` : 'EXISTS');

  // 3. study_notes columns
  const { data: nData, error: nErr } = await client.from('study_notes').select('id, is_restricted, required_tier').limit(1);
  console.log('study_notes is_restricted & required_tier:', nErr ? `FAIL: ${nErr.message}` : 'EXISTS');

  // 4. assessments columns
  const { data: aData, error: aErr } = await client.from('assessments').select('id, is_restricted, required_tier').limit(1);
  console.log('assessments is_restricted & required_tier:', aErr ? `FAIL: ${aErr.message}` : 'EXISTS');

  // 5. practical_assignments columns
  const { data: paData, error: paErr } = await client.from('practical_assignments').select('id, is_restricted, required_tier').limit(1);
  console.log('practical_assignments is_restricted & required_tier:', paErr ? `FAIL: ${paErr.message}` : 'EXISTS');

  // 6. Check has_entitlement function via RPC call
  const { data: rpcData, error: rpcErr } = await client.rpc('has_entitlement', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_required_tier: 'standard'
  });
  console.log('RPC has_entitlement:', rpcErr ? `FAIL: ${rpcErr.message}` : `EXISTS (returned ${rpcData})`);
}

check().catch(console.error);
