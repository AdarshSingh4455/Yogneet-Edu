import { UserProfile, PermissionKey, UserRole, UserStatus } from '../types';
import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { ApiService } from './api';
import { Database } from '../types/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export interface ProfileUpdatePayload {
  name?: string;
  bio?: string;
  department?: string;
  avatar?: string;
}

/**
 * Transforms a Supabase database row and associated permissions into the frontend UserProfile.
 */
export function rowToUserProfile(row: ProfileRow, permissions: PermissionKey[] = []): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    role: row.role as UserRole,
    status: row.status as UserStatus,
    permissions,
    department: row.department ?? undefined,
    bio: row.bio ?? undefined,
    enrolledCourses: row.enrolled_courses,
    solvedProblemsCount: row.solved_problems_count,
    testsCompletedCount: row.tests_completed_count,
    accessCategory: ((row as any).access_category as any) || 'standard',
    institution: ((row as any).institution as string) || undefined,
    program: ((row as any).program as string) || undefined,
    createdAt: row.created_at,
    lastActive: row.last_active,
  };
}

export const ProfileService = {
  /**
   * Retrieves a single user profile by ID with granular permissions.
   * Seamlessly queries Supabase in connected mode, or falls back to mock service in local mode.
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured() || !supabase) {
      const mock = ApiService.getUserById(userId);
      return mock ? { ...mock } : null;
    }

    try {
      // 1. Fetch profile row
      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(formatSupabaseError(profileError));
      }

      // 2. Fetch assigned user permissions
      const { data: permRows, error: permError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (permError) {
        throw new Error(formatSupabaseError(permError));
      }

      const rawPerms = permRows as unknown as Array<{ permission_key: string }> | null;
      const permissions = (rawPerms || []).map(r => r.permission_key as PermissionKey);
      return rowToUserProfile(profileRow as unknown as ProfileRow, permissions);
    } catch (err) {
      console.error('[ProfileService.getProfile] Error retrieving profile:', err);
      throw err;
    }
  },

  /**
   * Updates non-privileged profile information (name, bio, department, avatar).
   * Note: Role and account status modifications are rejected at the database level by RLS & triggers.
   */
  async updateProfile(userId: string, updates: ProfileUpdatePayload): Promise<UserProfile> {
    if (!isSupabaseConfigured() || !supabase) {
      // Local Mock persistence
      const current = ApiService.getUserById(userId);
      if (!current) throw new Error('User not found in local mock state.');

      const updated: UserProfile = {
        ...current,
        name: updates.name !== undefined ? updates.name : current.name,
        bio: updates.bio !== undefined ? updates.bio : current.bio,
        department: updates.department !== undefined ? updates.department : current.department,
        avatar: updates.avatar !== undefined ? updates.avatar : current.avatar,
      };

      ApiService.updateUserProfile(updated);
      return updated;
    }

    try {
      const updateData: ProfileUpdate = {
        last_active: new Date().toISOString(),
      };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.department !== undefined) updateData.department = updates.department;
      if (updates.avatar !== undefined) updateData.avatar_url = updates.avatar;

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData as never)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      // Re-fetch assigned permissions
      const { data: permRows } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      const rawPerms = permRows as unknown as Array<{ permission_key: string }> | null;
      const permissions = (rawPerms || []).map(r => r.permission_key as PermissionKey);
      return rowToUserProfile(data as unknown as ProfileRow, permissions);
    } catch (err) {
      console.error('[ProfileService.updateProfile] Failed to update profile:', err);
      throw err;
    }
  },

  /**
   * Retrieves all user profiles.
   */
  async getAllProfiles(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return ApiService.getUsers();
    }

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (error) throw new Error(formatSupabaseError(error));

      const rawProfiles = (profiles as unknown as ProfileRow[]) || [];
      return rawProfiles.map(p => rowToUserProfile(p, []));
    } catch (err) {
      console.error('[ProfileService.getAllProfiles] Error retrieving profiles:', err);
      throw err;
    }
  },
};
