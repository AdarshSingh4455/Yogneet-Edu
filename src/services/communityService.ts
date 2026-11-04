import { supabase, isMockFallbackAllowed } from './supabaseClient';
import { ApiService } from './api';
import { DiscussionThread, DiscussionReply, ModerationLogEntry, UserProfile } from '../types';

export const CommunityService = {
  /**
   * Fetch all threads.
   * If includeModerated is false (for students), excludes hidden and soft-deleted threads.
   */
  async getThreads(includeModerated = false): Promise<DiscussionThread[]> {
    if (supabase) {
      try {
        let query = (supabase as any)
          .from('discussion_threads')
          .select(`
            id,
            author_id,
            title,
            content,
            category,
            tags,
            is_pinned,
            is_locked,
            is_hidden,
            is_soft_deleted,
            moderation_reason,
            moderated_by,
            moderated_at,
            upvotes_count,
            replies_count,
            views_count,
            is_solved,
            created_at,
            updated_at,
            profiles:author_id (id, name, avatar, role)
          `)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });

        if (!includeModerated) {
          query = query.eq('is_hidden', false).eq('is_soft_deleted', false);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          return data.map((item: any) => ({
            id: item.id,
            title: item.title,
            content: item.content,
            author: {
              id: item.profiles?.id || item.author_id,
              name: item.profiles?.name || 'Anonymous Learner',
              avatar: item.profiles?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              role: item.profiles?.role || 'student',
              badge: item.profiles?.role === 'admin' ? 'Faculty Lead' : undefined,
            },
            category: item.category,
            tags: item.tags || [],
            createdAt: new Date(item.created_at).toLocaleDateString(),
            upvotes: item.upvotes_count || 0,
            userUpvoted: false,
            repliesCount: item.replies_count || 0,
            isSolved: item.is_solved || false,
            views: item.views_count || 0,
            replies: [],
            isPinned: item.is_pinned,
            isLocked: item.is_locked,
            isHidden: item.is_hidden,
            isSoftDeleted: item.is_soft_deleted,
            moderationReason: item.moderation_reason,
            moderatedBy: item.moderated_by,
            moderatedAt: item.moderated_at,
          }));
        }
      } catch (err) {
        console.warn('CommunityService.getThreads Supabase fallback:', err);
      }
    }

    if (isMockFallbackAllowed()) {
      return ApiService.getCommunityThreads();
    }
    return [];
  },

  /**
   * Fetch a single thread by ID with full replies
   */
  async getThreadById(id: string): Promise<DiscussionThread | null> {
    if (supabase) {
      try {
        const { data: threadData, error } = await (supabase as any)
          .from('discussion_threads')
          .select(`
            *,
            profiles:author_id (id, name, avatar, role)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        if (threadData) {
          // Fetch replies
          const { data: repliesData } = await (supabase as any)
            .from('discussion_replies')
            .select(`
              *,
              profiles:author_id (id, name, avatar, role)
            `)
            .eq('thread_id', id)
            .eq('is_soft_deleted', false)
            .order('created_at', { ascending: true });

          const replies: DiscussionReply[] = (repliesData || []).map((r: any) => ({
            id: r.id,
            threadId: r.thread_id,
            author: {
              id: r.profiles?.id || r.author_id,
              name: r.profiles?.name || 'Fellow Learner',
              avatar: r.profiles?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
              role: r.profiles?.role || 'student',
            },
            content: r.content,
            createdAt: new Date(r.created_at).toLocaleDateString(),
            upvotes: r.upvotes_count || 0,
            userUpvoted: false,
            isAcceptedSolution: r.is_solution,
            isSoftDeleted: r.is_soft_deleted,
          }));

          return {
            id: threadData.id,
            title: threadData.title,
            content: threadData.content,
            author: {
              id: threadData.profiles?.id || threadData.author_id,
              name: threadData.profiles?.name || 'Learner',
              avatar: threadData.profiles?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              role: threadData.profiles?.role || 'student',
            },
            category: threadData.category,
            tags: threadData.tags || [],
            createdAt: new Date(threadData.created_at).toLocaleDateString(),
            upvotes: threadData.upvotes_count || 0,
            userUpvoted: false,
            repliesCount: replies.length,
            isSolved: threadData.is_solved,
            views: (threadData.views_count || 0) + 1,
            replies,
            isPinned: threadData.is_pinned,
            isLocked: threadData.is_locked,
            isHidden: threadData.is_hidden,
            isSoftDeleted: threadData.is_soft_deleted,
            moderationReason: threadData.moderation_reason,
          };
        }
      } catch (err) {
        console.warn('CommunityService.getThreadById fallback:', err);
      }
    }

    if (isMockFallbackAllowed()) {
      return ApiService.getThreadById(id) || null;
    }
    return null;
  },

  /**
   * Post a new thread
   */
  async createThread(user: UserProfile | null, data: { title: string; content: string; category: string; tags: string[] }): Promise<DiscussionThread> {
    if (supabase && user) {
      try {
        const { data: created, error } = await (supabase as any)
          .from('discussion_threads')
          .insert({
            author_id: user.id,
            title: data.title,
            content: data.content,
            category: data.category,
            tags: data.tags,
          })
          .select()
          .single();

        if (error) throw error;
        if (created) {
          return {
            id: created.id,
            title: created.title,
            content: created.content,
            author: {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              role: user.role,
            },
            category: created.category,
            tags: created.tags || [],
            createdAt: 'Just now',
            upvotes: 0,
            userUpvoted: false,
            repliesCount: 0,
            isSolved: false,
            views: 1,
            replies: [],
          };
        }
      } catch (err) {
        console.warn('CommunityService.createThread Supabase fallback:', err);
      }
    }

    if (user) {
      return ApiService.addThread(user, data);
    }
    throw new Error('User must be authenticated to post a thread');
  },

  /**
   * Post a reply to a thread
   */
  async addReply(user: UserProfile | null, threadId: string, content: string): Promise<DiscussionReply | null> {
    if (supabase && user) {
      try {
        const { data, error } = await (supabase as any)
          .from('discussion_replies')
          .insert({
            thread_id: threadId,
            author_id: user.id,
            content,
          })
          .select()
          .single();

        if (error) throw error;
        return {
          id: data.id,
          threadId,
          author: {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
          },
          content: data.content,
          createdAt: 'Just now',
          upvotes: 0,
          userUpvoted: false,
        };
      } catch (err) {
        console.warn('CommunityService.addReply Supabase fallback:', err);
      }
    }

    if (user) {
      const updatedThread = ApiService.addReply(user, threadId, content);
      return updatedThread?.replies?.[updatedThread.replies.length - 1] || null;
    }
    return null;
  },

  /**
   * Moderate a thread (pin, lock, hide, soft_delete, restore)
   * Records action and reason in tamper-evident moderation_logs.
   */
  async moderateThread(
    threadId: string,
    action: 'pin' | 'unpin' | 'lock' | 'unlock' | 'hide' | 'unhide' | 'soft_delete' | 'restore',
    reason: string
  ): Promise<void> {
    if (supabase) {
      const { error } = await (supabase as any).rpc('moderate_thread', {
        p_thread_id: threadId,
        p_action: action,
        p_reason: reason,
      });

      if (error) throw error;
      return;
    }

    // Fallback in-memory
    console.info(`[CommunityModeration] ${action} executed for thread ${threadId}: ${reason}`);
  },

  /**
   * Moderate a user (warn, suspend, unsuspend)
   */
  async moderateUser(
    userId: string,
    action: 'warn' | 'suspend' | 'unsuspend',
    reason: string,
    details?: any
  ): Promise<void> {
    if (supabase) {
      const { error } = await (supabase as any).rpc('moderate_user', {
        p_user_id: userId,
        p_action: action,
        p_reason: reason,
        p_details: details || {},
      });

      if (error) throw error;
      return;
    }

    console.info(`[UserModeration] ${action} executed for user ${userId}: ${reason}`);
  },

  /**
   * Fetch append-only moderation logs
   */
  async getModerationLogs(limit = 100): Promise<ModerationLogEntry[]> {
    if (supabase) {
      try {
        const { data, error } = await (supabase as any)
          .from('moderation_logs')
          .select(`
            id,
            moderator_id,
            action,
            target_type,
            target_id,
            reason,
            details,
            created_at,
            profiles:moderator_id (name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        if (data) {
          return data.map((item: any) => ({
            id: item.id,
            moderatorId: item.moderator_id,
            moderatorName: item.profiles?.name || 'Staff Moderator',
            action: item.action,
            targetType: item.target_type,
            targetId: item.target_id,
            reason: item.reason,
            details: item.details,
            createdAt: item.created_at,
          }));
        }
      } catch (err) {
        console.warn('CommunityService.getModerationLogs fallback:', err);
      }
    }

    return [
      {
        id: 'log-1',
        moderatorId: 'mod-1',
        moderatorName: 'System Security Lead',
        action: 'pin',
        targetType: 'thread',
        targetId: 'th_1',
        reason: 'Official weekly algorithmic competition guidelines announcement',
        createdAt: new Date().toISOString(),
      },
    ];
  },
};
