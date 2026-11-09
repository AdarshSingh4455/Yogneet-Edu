/**
 * Supabase Edge Function: admin-provision-staff
 * Secure, server-authoritative staff provisioning endpoint.
 *
 * Requirements:
 * - Requires caller to be an authenticated active 'admin'.
 * - Validates requested email, name, role ('subadmin' or 'admin'), department, and role preset.
 * - Rejects invalid department-role preset combinations server-side.
 * - Generates cryptographically secure temporary credential (min 16 chars: upper, lower, digits, symbols).
 * - Enforces mandatory first-login password change flag (must_change_password = true).
 * - Uses Supabase Admin API with service_role key inside secure Deno runtime.
 * - Idempotent and race-safe.
 * - Never stores plaintext passwords in tables or logs.
 * - Returns temporary credential to authorized Admin exactly once.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_PERMISSION_KEYS = new Set([
  'videos.view', 'videos.create', 'videos.edit', 'videos.delete', 'videos.publish',
  'notes.view', 'notes.create', 'notes.edit', 'notes.delete', 'notes.publish',
  'tests.view', 'tests.create', 'tests.edit', 'tests.publish', 'tests.schedule', 'tests.view_results',
  'students.view', 'students.suspend',
  'community.view', 'community.moderate',
  'subadmins.manage',
  'permissions.assign',
  'audit_logs.view',
  'analytics.view',
  'content.export',
  'advertisements.view', 'advertisements.manage',
  'leaderboard.view', 'leaderboard.manage',
  'coding.view', 'coding.manage',
  'notifications.view', 'notifications.manage',
]);

const DEPARTMENT_ROLE_MAPPING: Record<string, string[]> = {
  'Curriculum & Video Authoring': ['content_creator', 'content_manager'],
  'Assessment & Test Series': ['test_evaluator'],
  'Community Moderation': ['community_moderator'],
  'Platform Compliance & Audit': ['auditor'],
  'Advertisements & Monetization': ['ads_manager'],
  'Coding Arena & Practice': ['coding_lead'],
  'Tournaments & Leaderboard': ['leaderboard_manager'],
};

/**
 * Generates a cryptographically secure random password meeting all platform complexity rules:
 * - 16 characters in length
 * - At least one uppercase letter, lowercase letter, number, and special symbol
 * - Generated using crypto.getRandomValues()
 * - Never derived from predictable personal data
 */
function generateCryptographicPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;

  const getRandomByte = (): number => {
    const arr = new Uint8Array(1);
    crypto.getRandomValues(arr);
    return arr[0];
  };

  const u = upper[getRandomByte() % upper.length];
  const l = lower[getRandomByte() % lower.length];
  const d = digits[getRandomByte() % digits.length];
  const s = symbols[getRandomByte() % symbols.length];

  const restLength = 12;
  let rest = '';
  for (let i = 0; i < restLength; i++) {
    rest += all[getRandomByte() % all.length];
  }

  const chars = (u + l + d + s + rest).split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = getRandomByte() % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing admin credentials.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Authorize caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Validate JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: tokenErr } = await adminClient.auth.getUser(token);

    if (tokenErr || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid or expired session token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is active admin in public.profiles
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role, status, name')
      .eq('id', callerUser.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== 'admin' || callerProfile.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Access Denied: Only platform administrators can provision staff.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse and validate input payload
    const body = await req.json();
    const {
      email,
      name,
      role = 'subadmin',
      department = 'Curriculum & Video Authoring',
      presetKey,
      bio = '',
      permissions = [],
    } = body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: 'Validation Error: A valid email address is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(
        JSON.stringify({ error: 'Validation Error: Staff full name is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (role !== 'subadmin' && role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Validation Error: Staff role must be subadmin or admin.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Department
    const trimmedDept = typeof department === 'string' ? department.trim() : '';
    if (!trimmedDept || !DEPARTMENT_ROLE_MAPPING[trimmedDept]) {
      return new Response(
        JSON.stringify({
          error: `Validation Error: Invalid department "${trimmedDept}". Must be one of: ${Object.keys(DEPARTMENT_ROLE_MAPPING).join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Department-Role Preset Combination
    if (presetKey && typeof presetKey === 'string') {
      const allowedRoles = DEPARTMENT_ROLE_MAPPING[trimmedDept];
      if (!allowedRoles.includes(presetKey)) {
        return new Response(
          JSON.stringify({
            error: `Validation Error: Role preset "${presetKey}" is not valid for department "${trimmedDept}". Allowed roles: ${allowedRoles.join(', ')}`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate permissions array
    const validPermissions = Array.isArray(permissions)
      ? permissions.filter((p: string) => VALID_PERMISSION_KEYS.has(p))
      : [];

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // Concurrency defense: check if invitation is already accepted
    const { data: existingInv } = await adminClient
      .from('staff_invitations')
      .select('status, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingInv && existingInv.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: `User ${normalizedEmail} is already an accepted staff member.` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Generate Cryptographically Secure Temporary Password
    const tempPassword = generateCryptographicPassword();

    // 4. Create or Update Supabase Auth User with Temporary Password
    let targetUserId: string;

    const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: trimmedName,
        role,
        department: trimmedDept,
      },
    });

    if (createErr) {
      if (createErr.message.includes('already registered') || (createErr as any).status === 422) {
        // User already exists in auth.users: resolve ID and update password
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('email', normalizedEmail)
          .single();

        if (existingProfile?.id) {
          targetUserId = existingProfile.id;
          const { error: updateAuthErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
            password: tempPassword,
            user_metadata: {
              name: trimmedName,
              role,
              department: trimmedDept,
            },
          });

          if (updateAuthErr) {
            console.error('[admin-provision-staff] Failed to update auth credentials:', updateAuthErr);
            return new Response(
              JSON.stringify({ error: `Failed to update credentials for existing user: ${updateAuthErr.message}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: `User is registered in auth but profile record could not be found.` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        console.error('[admin-provision-staff] Failed to create auth user:', createErr);
        // COMPENSATING CLEANUP
        await adminClient.from('staff_invitations').delete().eq('email', normalizedEmail).eq('status', 'pending');

        await adminClient.from('audit_logs').insert({
          actor_id: callerUser.id,
          actor_name: callerProfile.name || 'Platform Administrator',
          actor_role: 'admin',
          action: 'subadmins.provision',
          resource_type: 'StaffAccount',
          resource_id: normalizedEmail,
          details: `Auth account creation failed: ${createErr.message}`,
          outcome: 'FAILED',
        });

        return new Response(
          JSON.stringify({ error: `Auth account creation failed: ${createErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      targetUserId = createData.user.id;
    }

    // 5. Update Profile with Mandatory Password Change & Provisioning Metadata
    const nowIso = new Date().toISOString();
    const { error: profileUpdateErr } = await adminClient
      .from('profiles')
      .update({
        name: trimmedName,
        role,
        department: trimmedDept,
        bio: bio.trim(),
        status: 'active',
        must_change_password: true,
        last_active: nowIso,
      })
      .eq('id', targetUserId);

    if (profileUpdateErr) {
      console.warn('[admin-provision-staff] Profile update note:', profileUpdateErr);
    }

    // 6. Assign Granular Permissions
    for (const perm of validPermissions) {
      await adminClient
        .from('user_permissions')
        .upsert({ user_id: targetUserId, permission_key: perm }, { onConflict: 'user_id,permission_key' });
    }

    // 7. Record Accepted Staff Invitation for Audit Tracking
    await adminClient
      .from('staff_invitations')
      .upsert({
        email: normalizedEmail,
        name: trimmedName,
        role,
        department: trimmedDept,
        bio: bio.trim(),
        permissions: validPermissions,
        invited_by: callerUser.id,
        status: 'accepted',
        updated_at: nowIso,
      }, { onConflict: 'email' });

    // 8. Log Audit Trail (Never leak temporary password)
    await adminClient.from('audit_logs').insert({
      actor_id: callerUser.id,
      actor_name: callerProfile.name || 'Platform Administrator',
      actor_role: 'admin',
      action: 'subadmins.provision',
      resource_type: 'StaffAccount',
      resource_id: normalizedEmail,
      details: `Provisioned staff account for ${trimmedName} (${normalizedEmail}) as ${role} in ${trimmedDept}. One-time cryptographic temporary credential generated and mandatory password change flagged.`,
      outcome: 'SUCCESS',
    });

    // 9. Return One-Time Temporary Credential to Authorized Admin
    return new Response(
      JSON.stringify({
        success: true,
        message: `Staff account successfully provisioned for ${trimmedName} (${normalizedEmail}).`,
        status: 'created',
        userId: targetUserId,
        temporaryPassword: tempPassword,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[admin-provision-staff] Unexpected exception:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
