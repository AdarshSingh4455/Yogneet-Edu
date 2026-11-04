/**
 * Active Learners Presence & Counter Service for Yogneet Edu.
 *
 * Implements:
 *   1. Real-time presence heartbeat tracking.
 *   2. Public Displayed Count RPC (Strictly returns final scalar integer only: Actual + Base).
 *   3. Admin-Only Metrics & Base Counter Management (Actual, Base, Displayed).
 *   4. Zero credential or internal breakdown exposure to non-admins.
 */

import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { ActiveLearnersMetrics } from '../types';

// Fallback in-memory state for offline mock development
let mockBaseCounter = 50;
let mockActualActive = 5;

export const ActiveLearnersService = {
  /**
   * Retrieves the final calculated Active Learners number for ALL platform users.
   * STRICT SECURITY: Returns only the single integer scalar (Actual + Admin Base).
   * Does NOT return or expose the internal breakdown or base counter.
   */
  async getPublicActiveLearnersCount(): Promise<number> {
    if (!isSupabaseConfigured() || !supabase) {
      return mockActualActive + mockBaseCounter;
    }

    try {
      const { data, error } = await (supabase as any).rpc('get_public_active_learners_count');
      if (error) {
        console.warn('[ActiveLearnersService] Failed to fetch public count, fallback to local:', error.message);
        return mockActualActive + mockBaseCounter;
      }
      return typeof data === 'number' ? data : Number(data) || (mockActualActive + mockBaseCounter);
    } catch (err) {
      console.error('[ActiveLearnersService] Unexpected error getting public count:', err);
      return mockActualActive + mockBaseCounter;
    }
  },

  /**
   * Admin-Only: Retrieves complete presence metrics (Actual, Base, Final Displayed).
   * Guarded by database is_admin() check.
   */
  async getAdminActiveLearnersMetrics(): Promise<ActiveLearnersMetrics> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        actualActiveLearners: mockActualActive,
        configuredBaseCounter: mockBaseCounter,
        displayedActiveLearners: mockActualActive + mockBaseCounter,
        lastUpdated: new Date().toISOString(),
      };
    }

    try {
      const { data, error } = await (supabase as any).rpc('get_admin_active_learners_metrics');
      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      const res = data as any;
      return {
        actualActiveLearners: Number(res?.actual_active_learners) || 0,
        configuredBaseCounter: Number(res?.configured_base_counter) || 0,
        displayedActiveLearners: Number(res?.displayed_active_learners) || 0,
        lastUpdated: res?.last_updated || new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('[ActiveLearnersService] Failed to get admin metrics:', err);
      throw err;
    }
  },

  /**
   * Admin-Only: Updates the configured base counter.
   * Validates non-negative integer and records audit log.
   */
  async updateBaseCounter(newBase: number): Promise<ActiveLearnersMetrics> {
    if (newBase === undefined || newBase === null || isNaN(newBase) || newBase < 0 || !Number.isInteger(newBase)) {
      throw new Error('Validation Error: Base counter must be a non-negative integer.');
    }

    if (!isSupabaseConfigured() || !supabase) {
      mockBaseCounter = newBase;
      return {
        actualActiveLearners: mockActualActive,
        configuredBaseCounter: mockBaseCounter,
        displayedActiveLearners: mockActualActive + mockBaseCounter,
        lastUpdated: new Date().toISOString(),
      };
    }

    try {
      const { data, error } = await (supabase as any).rpc('update_active_learners_base_counter', {
        p_base_counter: newBase,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      mockBaseCounter = newBase;
      const res = data as any;

      return {
        actualActiveLearners: Number(res?.actual_active_learners) || 0,
        configuredBaseCounter: Number(res?.configured_base_counter) || newBase,
        displayedActiveLearners: Number(res?.displayed_active_learners) || (newBase + mockActualActive),
        lastUpdated: res?.last_updated || new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('[ActiveLearnersService] Failed to update base counter:', err);
      throw err;
    }
  },

  /**
   * Sends heartbeat ping for authenticated presence.
   * Deduplicated by user_id in database. Expiry interval removes stale clients.
   */
  async sendPresenceHeartbeat(clientMeta: Record<string, unknown> = {}): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    try {
      await (supabase as any).rpc('heartbeat_user_presence', {
        p_client_meta: clientMeta,
      });
    } catch {
      // Silently catch background presence network hiccups
    }
  },
};
