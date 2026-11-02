/**
 * Private Feedback Management Service for Yogneet Edu.
 * Feedback is strictly confidential and visible ONLY to Platform Administrators.
 * Authenticated users (Normal Students, Premium Students, Staff, Sub-admins) can submit feedback.
 * Only Super Admin can view submissions, submitter details, and reply/resolve tickets.
 */

import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { FeedbackSubmission, FeedbackCategory, FeedbackStatus } from '../types';
import { Database } from '../types/database.types';

type FeedbackRow = Database['public']['Tables']['feedback_submissions']['Row'];

function rowToFeedbackSubmission(row: FeedbackRow): FeedbackSubmission {
  return {
    id: row.id,
    userId: row.user_id,
    userRole: row.user_role,
    userName: row.user_name,
    userEmail: row.user_email,
    accessCategory: row.access_category,
    title: row.title,
    description: row.description,
    category: row.category as FeedbackCategory,
    attachmentUrl: row.attachment_url,
    status: row.status as FeedbackStatus,
    adminReply: row.admin_reply,
    adminRepliedBy: row.admin_replied_by,
    repliedAt: row.replied_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const FeedbackService = {
  /**
   * Submits a new feedback issue using authenticated server-side user context.
   * Session user identity and role are enforced by the server-side RPC.
   */
  async submitFeedback(input: {
    title: string;
    description: string;
    category: FeedbackCategory;
    attachmentUrl?: string | null;
  }): Promise<string> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase client is required to submit feedback.');
    }

    const { data, error } = await (supabase.rpc as any)('submit_user_feedback', {
      p_title: input.title,
      p_description: input.description,
      p_category: input.category,
      p_attachment_url: input.attachmentUrl || null,
    });

    if (error) {
      throw new Error(formatSupabaseError(error));
    }

    return data as string;
  },

  /**
   * Super Admin only: Fetches all submitted feedback records with filtering and search.
   * Non-admins are blocked from querying feedback records by database RLS.
   */
  async getAdminFeedbackList(filters?: {
    role?: string;
    status?: string;
    search?: string;
  }): Promise<FeedbackSubmission[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      let query = supabase
        .from('feedback_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.role && filters.role !== 'all') {
        if (filters.role === 'pro' || filters.role === 'premium') {
          query = query.eq('access_category', 'pro');
        } else {
          query = query.eq('user_role', filters.role);
        }
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw new Error(formatSupabaseError(error));

      let items = ((data as FeedbackRow[]) || []).map(rowToFeedbackSubmission);

      if (filters?.search?.trim()) {
        const q = filters.search.toLowerCase();
        items = items.filter(
          f =>
            f.title.toLowerCase().includes(q) ||
            f.description.toLowerCase().includes(q) ||
            f.userName.toLowerCase().includes(q) ||
            f.userEmail.toLowerCase().includes(q) ||
            f.category.toLowerCase().includes(q)
        );
      }

      return items;
    } catch (err) {
      console.error('[FeedbackService.getAdminFeedbackList] Error:', err);
      return [];
    }
  },

  /**
   * Super Admin only: Replies to a feedback issue and updates its status.
   */
  async adminUpdateFeedback(
    feedbackId: string,
    status: FeedbackStatus,
    adminReply?: string
  ): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase client is required to update feedback.');
    }

    const { error } = await (supabase.rpc as any)('admin_update_feedback_status', {
      p_feedback_id: feedbackId,
      p_status: status,
      p_admin_reply: adminReply?.trim() || null,
    });

    if (error) {
      throw new Error(formatSupabaseError(error));
    }
  },
};
