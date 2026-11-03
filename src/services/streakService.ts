/**
 * Day Streak and Study Activity Service for Yogneet Edu.
 * Computes consecutive learning habits, records daily qualifying activities,
 * and interfaces with user_streaks and user_study_activities tables.
 */

import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  totalActiveDays: number;
  hasActivityToday: boolean;
}

export type QualifyingActivityType =
  | 'assessment_completion'
  | 'lesson_completion'
  | 'practical_challenge'
  | 'notes_study';

export const StreakService = {
  /**
   * Retrieves the authenticated user's real daily streak summary.
   * Calls get_my_streak_summary RPC which calculates effective consecutive days.
   */
  async getMyStreakSummary(): Promise<StreakSummary> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        totalActiveDays: 0,
        hasActivityToday: false,
      };
    }

    try {
      const { data, error } = await (supabase.rpc as any)('get_my_streak_summary');

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      const rows = data as Array<{
        current_streak: number;
        longest_streak: number;
        last_activity_date: string | null;
        total_active_days: number;
        has_activity_today: boolean;
      }>;

      if (!rows || rows.length === 0) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: null,
          totalActiveDays: 0,
          hasActivityToday: false,
        };
      }

      const row = rows[0];
      return {
        currentStreak: row.current_streak ?? 0,
        longestStreak: row.longest_streak ?? 0,
        lastActivityDate: row.last_activity_date ?? null,
        totalActiveDays: row.total_active_days ?? 0,
        hasActivityToday: Boolean(row.has_activity_today),
      };
    } catch (err) {
      console.warn('[StreakService.getMyStreakSummary] Failed to retrieve streak:', err);
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        totalActiveDays: 0,
        hasActivityToday: false,
      };
    }
  },

  /**
   * Client-side study activity recording is disabled for platform security.
   * Study streaks are awarded exclusively by trusted database triggers upon
   * verified assessment submission (trg_assessment_attempt_study_activity).
   */
  async recordActivity(
    _activityType: QualifyingActivityType,
    _activityId: string,
    _metadata: Record<string, any> = {}
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    lastActivityDate: string;
  } | null> {
    // Client-side activity recording disabled to prevent spoofing
    console.info('[StreakService] Study activities are awarded automatically via server triggers upon verified assessment submission.');
    return null;
  },
};
