/**
 * Staff Administration Service for Yogneet Edu.
 * Provides secure, server-authoritative staff account provisioning, status toggling,
 * permission management, and dual-mode execution.
 */

import { UserProfile, PermissionKey } from '../types';
import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { ApiService, AuditService } from './api';

export interface ProvisionStaffInput {
  name: string;
  email: string;
  role: 'subadmin' | 'admin';
  department?: string;
  bio?: string;
  permissions: PermissionKey[];
}

export interface ProvisionStaffResult {
  success: boolean;
  message: string;
  status: 'invited' | 'activated' | 'elevated' | 'created';
  userId?: string;
}

export const StaffAdminService = {
  /**
   * Retrieves all staff members (subadmin and admin).
   */
  async getStaffMembers(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return ApiService.getSubAdmins();
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['subadmin', 'admin'])
        .order('created_at', { ascending: false });

      if (error) throw new Error(formatSupabaseError(error));

      // Fetch permissions for all staff
      const staffList: UserProfile[] = [];
      for (const row of (data || []) as any[]) {
        const { data: permRows } = await supabase
          .from('user_permissions')
          .select('permission_key')
          .eq('user_id', row.id);

        const permissions = ((permRows || []) as any[]).map(p => p.permission_key as PermissionKey);
        staffList.push({
          id: row.id,
          name: row.name,
          email: row.email,
          avatar: row.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: row.role,
          status: row.status,
          permissions,
          department: row.department || undefined,
          bio: row.bio || undefined,
          createdAt: row.created_at,
          lastActive: row.last_active,
        });
      }

      return staffList;
    } catch (err) {
      console.error('[StaffAdminService.getStaffMembers] Error:', err);
      return ApiService.getSubAdmins();
    }
  },

  /**
   * Provisions a new staff member account.
   * In Supabase mode: Invokes Edge Function 'admin-provision-staff', falling back to RPC 'admin_provision_staff_account'.
   * In local-mock mode: Stores in ApiService state.
   */
  async provisionStaff(actor: UserProfile, input: ProvisionStaffInput): Promise<ProvisionStaffResult> {
    if (actor.role !== 'admin') {
      throw new Error('Access Denied: Only platform administrators can provision staff.');
    }

    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      throw new Error('Invalid Email: Please provide a valid staff email address.');
    }

    if (!input.name || !input.name.trim()) {
      throw new Error('Name Required: Staff full name is required.');
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const trimmedName = input.name.trim();

    // Local Mock Mode
    if (!isSupabaseConfigured() || !supabase) {
      const created = ApiService.addSubAdmin(actor, {
        name: trimmedName,
        email: normalizedEmail,
        department: input.department || 'Curriculum & Video Authoring',
        bio: input.bio || '',
        permissions: input.permissions,
      });

      return {
        success: true,
        message: `Account for ${created.name} provisioned in prototype mode with ${input.permissions.length} permissions.`,
        status: 'created',
        userId: created.id,
      };
    }

    // Live Supabase Mode
    try {
      // 1. First attempt via Supabase Edge Function
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('admin-provision-staff', {
        body: {
          email: normalizedEmail,
          name: trimmedName,
          role: input.role,
          department: input.department || 'Curriculum & Video Authoring',
          bio: input.bio || '',
          permissions: input.permissions,
        },
      });

      if (!edgeErr && edgeData?.success) {
        AuditService.log(
          actor,
          'subadmins.manage',
          'StaffAccount',
          normalizedEmail,
          `Edge Function provisioned staff account for ${trimmedName} (${normalizedEmail}) as ${input.role}.`,
          'SUCCESS'
        );

        return {
          success: true,
          message: edgeData.message || `Staff account successfully invited.`,
          status: edgeData.status || 'invited',
          userId: edgeData.userId,
        };
      }

      // 2. Fallback to server-side RPC if Edge Function is not deployed
      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc('admin_provision_staff_account', {
        p_email: normalizedEmail,
        p_name: trimmedName,
        p_role: input.role,
        p_department: input.department || 'Curriculum & Video Authoring',
        p_bio: input.bio || '',
        p_permissions: input.permissions,
      });

      if (rpcErr) {
        throw new Error(formatSupabaseError(rpcErr));
      }

      AuditService.log(
        actor,
        'subadmins.manage',
        'StaffAccount',
        normalizedEmail,
        `Database RPC provisioned staff invitation for ${trimmedName} (${normalizedEmail}) as ${input.role}.`,
        'SUCCESS'
      );

      return {
        success: true,
        message: rpcData?.status === 'activated'
          ? `User ${normalizedEmail} already exists. Elevated to ${input.role} and assigned permissions.`
          : `Staff invitation registered for ${normalizedEmail}. Account will automatically activate upon login.`,
        status: rpcData?.status || 'invited',
        userId: rpcData?.userId,
      };
    } catch (err: any) {
      console.error('[StaffAdminService.provisionStaff] Provisioning failed:', err);
      throw err;
    }
  },

  /**
   * Toggles active / suspended status of a staff member.
   */
  async toggleStaffStatus(actor: UserProfile, staffId: string): Promise<UserProfile> {
    if (actor.role !== 'admin') {
      throw new Error('Access Denied: Only administrators can modify staff account status.');
    }

    if (!isSupabaseConfigured() || !supabase) {
      return ApiService.toggleSubAdminStatus(actor, staffId);
    }

    // Fetch target profile
    const { data: target, error: fetchErr } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', staffId)
      .single();

    if (fetchErr || !target) throw new Error('Staff member not found.');
    const targetStaff = target as any;
    if (targetStaff.role === 'admin') throw new Error('Cannot change status of Super Admin.');

    const newStatus = targetStaff.status === 'active' ? 'suspended' : 'active';

    const { data: updated, error: updateErr } = await (supabase as any)
      .from('profiles')
      .update({ status: newStatus, last_active: new Date().toISOString() })
      .eq('id', staffId)
      .select()
      .single();

    if (updateErr) throw new Error(formatSupabaseError(updateErr));
    const updatedStaff = updated as any;

    AuditService.log(
      actor,
      'subadmins.manage',
      'StaffAccount',
      targetStaff.email,
      `Changed status of ${targetStaff.name} to ${newStatus.toUpperCase()}.`,
      'SUCCESS'
    );

    return {
      id: updatedStaff.id,
      name: updatedStaff.name,
      email: updatedStaff.email,
      avatar: updatedStaff.avatar_url || '',
      role: updatedStaff.role,
      status: updatedStaff.status,
      permissions: [],
      department: updatedStaff.department || undefined,
      createdAt: updatedStaff.created_at,
      lastActive: updatedStaff.last_active,
    };
  },

  /**
   * Terminates / deletes a staff account.
   */
  async deleteStaff(actor: UserProfile, staffId: string): Promise<void> {
    if (actor.role !== 'admin') {
      throw new Error('Access Denied: Only administrators can terminate staff accounts.');
    }

    if (!isSupabaseConfigured() || !supabase) {
      ApiService.deleteSubAdmin(actor, staffId);
      return;
    }

    const { data: target } = await (supabase as any)
      .from('profiles')
      .select('email, role, name')
      .eq('id', staffId)
      .single();

    if (!target) throw new Error('Staff member not found.');
    const targetStaff = target as any;
    if (targetStaff.role === 'admin') throw new Error('Cannot delete Super Admin account.');

    // Delete permissions and profile (or mark suspended)
    await (supabase as any).from('user_permissions').delete().eq('user_id', staffId);
    const { error } = await (supabase as any).from('profiles').delete().eq('id', staffId);

    if (error) throw new Error(formatSupabaseError(error));

    AuditService.log(
      actor,
      'subadmins.manage',
      'StaffAccount',
      targetStaff.email,
      `Permanently terminated staff account for ${targetStaff.name} (${targetStaff.email}).`,
      'SUCCESS'
    );
  },
};
