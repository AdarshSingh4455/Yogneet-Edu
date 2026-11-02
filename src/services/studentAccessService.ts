/**
 * Student Module Access Management Service for Yogneet Edu.
 * Provides Admin configuration and tier-specific enforcement
 * for Normal vs. Premium Student platform tabs.
 */

import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { StudentModuleAccess } from '../types';
import { Database } from '../types/database.types';

type ModuleAccessRow = Database['public']['Tables']['student_module_access']['Row'];

function rowToModuleAccess(row: ModuleAccessRow): StudentModuleAccess {
  return {
    moduleKey: row.module_key,
    moduleName: row.module_name,
    moduleRoute: row.module_route,
    description: row.description || '',
    normalEnabled: row.normal_enabled,
    premiumEnabled: row.premium_enabled,
    displayOrder: row.display_order,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

// Fallback in-memory defaults when in offline mock mode or loading
export const DEFAULT_STUDENT_MODULE_ACCESS: StudentModuleAccess[] = [
  { moduleKey: 'dashboard', moduleName: 'Student Dashboard', moduleRoute: '/dashboard', description: 'Overview, recent activity, and learning hub', normalEnabled: true, premiumEnabled: true, displayOrder: 1, updatedAt: new Date().toISOString() },
  { moduleKey: 'videos', moduleName: 'Video Lessons', moduleRoute: '/videos', description: 'Curated YouTube lecture modules & playlists', normalEnabled: true, premiumEnabled: true, displayOrder: 2, updatedAt: new Date().toISOString() },
  { moduleKey: 'notes', moduleName: 'Study Notes & PDFs', moduleRoute: '/notes', description: 'Downloadable revision notes, PDF summaries, and architecture diagrams', normalEnabled: true, premiumEnabled: true, displayOrder: 3, updatedAt: new Date().toISOString() },
  { moduleKey: 'practical', moduleName: 'Practical Assignments', moduleRoute: '/practical', description: 'Hands-on project assignments and architecture challenges', normalEnabled: true, premiumEnabled: true, displayOrder: 4, updatedAt: new Date().toISOString() },
  { moduleKey: 'tests', moduleName: 'Test Series & Mocks', moduleRoute: '/tests', description: 'Timed competitive mock examinations and algorithmic quizzes', normalEnabled: true, premiumEnabled: true, displayOrder: 5, updatedAt: new Date().toISOString() },
  { moduleKey: 'micro_lessons', moduleName: 'Micro Lessons', moduleRoute: '/micro-lessons', description: 'Bite-sized vertical video concepts and interactive player', normalEnabled: true, premiumEnabled: true, displayOrder: 6, updatedAt: new Date().toISOString() },
  { moduleKey: 'coding', moduleName: 'Coding Practice Arena', moduleRoute: '/coding', description: 'Algorithmic challenge runner and problem solver', normalEnabled: true, premiumEnabled: true, displayOrder: 7, updatedAt: new Date().toISOString() },
  { moduleKey: 'community', moduleName: 'Community Forum', moduleRoute: '/community', description: 'Peer discussions, Q&A, and technical threads', normalEnabled: true, premiumEnabled: true, displayOrder: 8, updatedAt: new Date().toISOString() },
  { moduleKey: 'progress', moduleName: 'My Learning Progress', moduleRoute: '/progress', description: 'Personal mastery metrics, scores, and completion tracking', normalEnabled: true, premiumEnabled: true, displayOrder: 9, updatedAt: new Date().toISOString() },
  { moduleKey: 'feedback', moduleName: 'Feedback & Support', moduleRoute: '/feedback', description: 'Private bug reporting and feature requests directly to administration', normalEnabled: true, premiumEnabled: true, displayOrder: 10, updatedAt: new Date().toISOString() },
];

export const StudentAccessService = {
  /**
   * Retrieves all module access rules from Supabase (ordered by displayOrder).
   */
  async getModuleAccessList(): Promise<StudentModuleAccess[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [...DEFAULT_STUDENT_MODULE_ACCESS];
    }

    try {
      const { data, error } = await supabase
        .from('student_module_access')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw new Error(formatSupabaseError(error));
      if (!data || data.length === 0) return [...DEFAULT_STUDENT_MODULE_ACCESS];

      return (data as ModuleAccessRow[]).map(rowToModuleAccess);
    } catch (err) {
      console.error('[StudentAccessService.getModuleAccessList] Error fetching module access:', err);
      return [...DEFAULT_STUDENT_MODULE_ACCESS];
    }
  },

  /**
   * Admin-only update of module access settings for Normal and Premium tiers.
   */
  async updateModuleAccess(
    moduleKey: string,
    normalEnabled: boolean,
    premiumEnabled: boolean
  ): Promise<StudentModuleAccess> {
    if (!isSupabaseConfigured() || !supabase) {
      const idx = DEFAULT_STUDENT_MODULE_ACCESS.findIndex(m => m.moduleKey === moduleKey);
      if (idx !== -1) {
        DEFAULT_STUDENT_MODULE_ACCESS[idx].normalEnabled = normalEnabled;
        DEFAULT_STUDENT_MODULE_ACCESS[idx].premiumEnabled = premiumEnabled;
        DEFAULT_STUDENT_MODULE_ACCESS[idx].updatedAt = new Date().toISOString();
        return { ...DEFAULT_STUDENT_MODULE_ACCESS[idx] };
      }
      throw new Error(`Module ${moduleKey} not found.`);
    }

    const { data, error } = await (supabase.rpc as any)('admin_update_student_module_access', {
      p_module_key: moduleKey,
      p_normal_enabled: normalEnabled,
      p_premium_enabled: premiumEnabled,
    });

    if (error) {
      throw new Error(formatSupabaseError(error));
    }

    return rowToModuleAccess(data as ModuleAccessRow);
  },

  /**
   * Evaluates if a given module route or module key is permitted for the student.
   */
  isModuleAccessible(
    moduleKeyOrRoute: string,
    accessList: StudentModuleAccess[],
    isPremium: boolean
  ): boolean {
    const item = accessList.find(
      m => m.moduleKey === moduleKeyOrRoute || m.moduleRoute === moduleKeyOrRoute
    );
    if (!item) return true; // Default allow if unmapped route
    return isPremium ? item.premiumEnabled : item.normalEnabled;
  },
};
