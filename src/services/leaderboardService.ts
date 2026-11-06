/**
 * Top 200 Student Leaderboard Service for Yogneet Edu.
 *
 * Implements:
 *   1. Strict Top 200 rank assignment (students outside top 200 receive NO rank).
 *   2. Deterministic composite scoring (attempts, accuracy, difficulty weighting).
 *   3. Admin controls (enable/disable, eligible categories, fraud exclusion with audit trail).
 */

import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { LeaderboardEntry, LeaderboardConfig, StudentLeaderboardStatus } from '../types';
import { ApiService } from './api';

// Fallback mock configuration for offline development
let mockLeaderboardConfig: LeaderboardConfig = {
  isEnabled: true,
  eligibleCategories: ['all'],
  minAssessmentsRequired: 1,
  winnerGift: '',
  updatedAt: new Date().toISOString(),
};

export const LeaderboardService = {
  /**
   * Retrieves the Top 200 ranked students.
   * Returns empty array if leaderboard is disabled by administration.
   */
  async getTop200Leaderboard(): Promise<LeaderboardEntry[]> {
    if (!isSupabaseConfigured() || !supabase) {
      if (!mockLeaderboardConfig.isEnabled) return [];
      // Generate deterministic mock leaderboard from available students
      const users = ApiService.getUsers().filter(u => u.role === 'student' && u.status === 'active');
      return users.slice(0, 200).map((u, idx) => ({
        rank: idx + 1,
        studentId: u.id,
        studentName: u.name,
        avatarUrl: u.avatar || '',
        compositeScore: Math.round(950 - idx * 45),
        testsCompleted: Math.max(1, 12 - idx),
        accuracyPercentage: Math.max(60, Math.round(98 - idx * 2.5)),
        streakDays: Math.max(1, 14 - idx),
        department: u.department || 'Enrolled Student',
        isPremium: (u as any).isPremium || false,
      }));
    }

    try {
      const { data, error } = await (supabase as any).rpc('get_top_200_leaderboard');
      if (error) {
        console.warn('[LeaderboardService] Failed to fetch leaderboard via RPC:', error.message);
        return [];
      }

      return ((data as any[]) || []).map(row => ({
        rank: Number(row.rank) || 0,
        studentId: row.student_id,
        studentName: row.student_name || 'Anonymous Student',
        avatarUrl: row.avatar_url || '',
        compositeScore: Number(row.composite_score) || 0,
        testsCompleted: Number(row.tests_completed) || 0,
        accuracyPercentage: Number(row.accuracy_percentage) || 0,
        streakDays: Number(row.streak_days) || 0,
        department: row.department || 'Enrolled Student',
        isPremium: Boolean(row.is_premium),
      }));
    } catch (err) {
      console.error('[LeaderboardService] Unexpected error getting top 200:', err);
      return [];
    }
  },

  /**
   * Retrieves a student's personal rank status.
   * STRICT REQUIREMENT: If the student is outside top 200, rank is strictly null.
   */
  async getStudentStatus(studentId: string): Promise<StudentLeaderboardStatus> {
    if (!studentId) {
      return { inTop200: false, rank: null, compositeScore: 0, testsCompleted: 0, accuracyPercentage: 0 };
    }

    if (!isSupabaseConfigured() || !supabase) {
      const list = await this.getTop200Leaderboard();
      const match = list.find(e => e.studentId === studentId);
      if (match && match.rank <= 200) {
        return {
          inTop200: true,
          rank: match.rank,
          compositeScore: match.compositeScore,
          testsCompleted: match.testsCompleted,
          accuracyPercentage: match.accuracyPercentage,
        };
      }
      return { inTop200: false, rank: null, compositeScore: 0, testsCompleted: 0, accuracyPercentage: 0 };
    }

    try {
      const { data, error } = await (supabase as any).rpc('get_student_leaderboard_status', {
        p_student_id: studentId,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      const res = data as any;
      return {
        inTop200: Boolean(res?.in_top_200),
        rank: res?.rank !== null && res?.rank !== undefined ? Number(res.rank) : null,
        compositeScore: Number(res?.composite_score) || 0,
        testsCompleted: Number(res?.tests_completed) || 0,
        accuracyPercentage: Number(res?.accuracy_percentage) || 0,
      };
    } catch (err) {
      console.error('[LeaderboardService] Error getting student status:', err);
      return { inTop200: false, rank: null, compositeScore: 0, testsCompleted: 0, accuracyPercentage: 0 };
    }
  },

  /**
   * Retrieves leaderboard configuration from Supabase.
   */
  async getConfig(): Promise<LeaderboardConfig> {
    if (!isSupabaseConfigured() || !supabase) {
      return { ...mockLeaderboardConfig };
    }

    try {
      const { data, error } = await supabase
        .from('leaderboard_config' as any)
        .select('*')
        .eq('id', 1)
        .single();

      if (error || !data) {
        if (error) {
          console.warn('[LeaderboardService] Failed to fetch leaderboard config from Supabase:', error.message);
        }
        return { ...mockLeaderboardConfig };
      }

      const row = data as any;
      const winnerGiftVal = row.winner_gift ? String(row.winner_gift).trim() : '';

      return {
        isEnabled: Boolean(row.is_enabled),
        eligibleCategories: row.eligible_categories || ['all'],
        minAssessmentsRequired: Number(row.min_assessments_required) || 1,
        winnerGift: winnerGiftVal,
        updatedAt: row.updated_at,
      };
    } catch (err: any) {
      console.error('[LeaderboardService] Error fetching leaderboard config:', err);
      return { ...mockLeaderboardConfig };
    }
  },

  /**
   * Admin / Leaderboard Manager: Updates leaderboard settings directly in Supabase.
   * Throws an error if Supabase persistence fails.
   */
  async updateConfig(updates: Partial<LeaderboardConfig>, adminId: string): Promise<LeaderboardConfig> {
    if (!isSupabaseConfigured() || !supabase) {
      mockLeaderboardConfig = {
        ...mockLeaderboardConfig,
        ...updates,
        winnerGift: updates.winnerGift !== undefined ? updates.winnerGift.trim() : mockLeaderboardConfig.winnerGift,
        updatedAt: new Date().toISOString(),
      };
      return { ...mockLeaderboardConfig };
    }

    const payload: any = {
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    };

    if (updates.isEnabled !== undefined) payload.is_enabled = updates.isEnabled;
    if (updates.eligibleCategories !== undefined) payload.eligible_categories = updates.eligibleCategories;
    if (updates.minAssessmentsRequired !== undefined) payload.min_assessments_required = updates.minAssessmentsRequired;
    if (updates.winnerGift !== undefined) {
      const trimmed = updates.winnerGift.trim();
      payload.winner_gift = trimmed === '' ? null : trimmed;
    }

    const { data, error } = await (supabase as any)
      .from('leaderboard_config')
      .update(payload)
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      const formatted = formatSupabaseError(error);
      console.error('[LeaderboardService] Failed to update config in Supabase:', formatted);
      throw new Error(formatted);
    }

    if (!data) {
      throw new Error('No configuration record returned from Supabase update.');
    }

    const resRow = data as any;
    return {
      isEnabled: Boolean(resRow.is_enabled),
      eligibleCategories: resRow.eligible_categories || ['all'],
      minAssessmentsRequired: Number(resRow.min_assessments_required) || 1,
      winnerGift: resRow.winner_gift ? String(resRow.winner_gift).trim() : '',
      updatedAt: resRow.updated_at,
    };
  },

  /**
   * Admin / Manager: Excludes an invalid/fraudulent attempt from leaderboard calculations.
   * Records mandatory audit trail.
   */
  async excludeAttempt(attemptId: string, reason: string): Promise<void> {
    if (!attemptId || !reason || !reason.trim()) {
      throw new Error('Attempt ID and exclusion reason are required.');
    }

    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    const { error } = await (supabase as any).rpc('admin_exclude_attempt_from_leaderboard', {
      p_attempt_id: attemptId,
      p_reason: reason.trim(),
    });

    if (error) {
      throw new Error(formatSupabaseError(error));
    }
  },
};
