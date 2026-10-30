/**
 * Supabase Edge Function: admin-provision-staff
 * Secure, server-authoritative staff provisioning endpoint.
 *
 * Requirements:
 * - Requires caller to be an authenticated active 'admin'.
 * - Validates requested email, name, role ('subadmin' or 'admin'), and permission keys.
 * - Uses Supabase Admin API with service_role key inside secure Deno runtime.
 * - Idempotent and race-safe.
 * - Compensating cleanup on delivery failure prevents orphaned pending invitations.
 * - Never overwrites or discards already accepted staff accounts.
 * - Logs audit trails without leaking secrets.
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
  'community.moderate',
  'subadmins.manage',
  'permissions.assign',
  'audit_logs.view',
  'analytics.view',
  'content.export',
]);

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
    const { email, name, role = 'subadmin', department = 'Curriculum & Video Authoring', bio = '', permissions = [] } = body;

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

    // Validate permissions array
    const validPermissions = Array.isArray(permissions)
      ? permissions.filter((p: string) => VALID_PERMISSION_KEYS.has(p))
      : [];

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // 3. Safety Check: Verify existing invitation state
    const { data: existingInv } = await adminClient
      .from('staff_invitations')
      .select('id, status, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingInv && existingInv.status === 'accepted') {
      // Account is already an active staff member; do not revert to pending
      return new Response(
        JSON.stringify({
          error: `Account ${normalizedEmail} is already an accepted staff member (${existingInv.role}). Use role management to update permissions.`,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Upsert pending invitation into public.staff_invitations
    const { error: invErr } = await adminClient
      .from('staff_invitations')
      .upsert({
        email: normalizedEmail,
        name: trimmedName,
        role,
        department: department.trim(),
        bio: bio.trim(),
        permissions: validPermissions,
        invited_by: callerUser.id,
        status: 'pending',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

    if (invErr) {
      console.error('[admin-provision-staff] Failed to register invitation:', invErr);
      return new Response(
        JSON.stringify({ error: 'Failed to record staff invitation in database.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Send official Supabase Auth invitation email
    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: {
          name: trimmedName,
          role,
        },
      }
    );

    // If already registered in auth.users, elevate existing account
    if (inviteErr) {
      if (inviteErr.message.includes('already registered') || inviteErr.status === 422) {
        // Find existing profile and elevate
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('email', normalizedEmail)
          .single();

        if (existingProfile) {
          await adminClient
            .from('profiles')
            .update({
              role,
              department: department.trim(),
              bio: bio.trim(),
              status: 'active',
            })
            .eq('id', existingProfile.id);

          // Insert permissions
          for (const perm of validPermissions) {
            await adminClient
              .from('user_permissions')
              .upsert({ user_id: existingProfile.id, permission_key: perm }, { onConflict: 'user_id,permission_key' });
          }

          // Mark invitation accepted
          await adminClient
            .from('staff_invitations')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('email', normalizedEmail);

          return new Response(
            JSON.stringify({
              success: true,
              message: `User ${normalizedEmail} was already registered. Elevated to ${role} and assigned permissions.`,
              status: 'elevated',
              userId: existingProfile.id,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // COMPENSATING CLEANUP: Delivery failed and not an existing account elevation
      // Delete the pending invitation record so no unverified orphan remains claimable
      console.warn('[admin-provision-staff] Invitation failed. Rolling back pending invitation:', inviteErr);
      await adminClient
        .from('staff_invitations')
        .delete()
        .eq('email', normalizedEmail)
        .eq('status', 'pending');

      // Log failure audit trail
      await adminClient.from('audit_logs').insert({
        actor_id: callerUser.id,
        actor_name: callerProfile.name || 'Platform Administrator',
        actor_role: 'admin',
        action: 'subadmins.provision_failed',
        resource_type: 'StaffAccount',
        resource_id: normalizedEmail,
        details: `Invitation delivery failed for ${trimmedName} (${normalizedEmail}): ${inviteErr.message}. Pending invite safely discarded.`,
        outcome: 'FAILED',
      });

      return new Response(
        JSON.stringify({ error: `Auth invitation delivery failed: ${inviteErr.message}. Invitation discarded.` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Log successful audit trail
    await adminClient.from('audit_logs').insert({
      actor_id: callerUser.id,
      actor_name: callerProfile.name || 'Platform Administrator',
      actor_role: 'admin',
      action: 'subadmins.provision',
      resource_type: 'StaffAccount',
      resource_id: normalizedEmail,
      details: `Provisioned staff account for ${trimmedName} (${normalizedEmail}) as ${role} with ${validPermissions.length} permissions.`,
      outcome: 'SUCCESS',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation successfully sent to ${normalizedEmail}.`,
        status: 'invited',
        userId: inviteData?.user?.id,
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
