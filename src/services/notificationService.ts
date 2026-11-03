/**
 * Notification Service for Yogneet Edu.
 * Interacts with Supabase `notifications` table and associated SECURITY DEFINER RPCs.
 * Implements real-time notification synchronization, unread tracking, and safe state updates.
 */

import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { PlatformNotificationItem, NotificationCategory } from '../components/layout/NotificationCenter';

export interface NotificationRecord {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  isRead: boolean;
  relatedResourceType?: string;
  relatedResourceId?: string;
  destinationRoute?: string;
  createdAt: string;
  readAt?: string;
}

function mapRowToNotification(row: any): PlatformNotificationItem {
  // Map backend category string to frontend NotificationCategory
  let cat: NotificationCategory = 'platform';
  const rawCat = (row.category || '').toLowerCase();
  if (rawCat === 'announcement') cat = 'announcement';
  else if (rawCat === 'notes') cat = 'notes';
  else if (rawCat === 'video' || rawCat === 'videos') cat = 'videos';
  else if (rawCat === 'test' || rawCat === 'assessments') cat = 'assessments';
  else if (rawCat === 'feedback') cat = 'feedback';
  else if (rawCat === 'result' || rawCat === 'results') cat = 'results';

  return {
    id: row.id,
    category: cat,
    title: row.title,
    description: row.description,
    timestamp: row.created_at,
    read: row.is_read ?? false,
    linkUrl: row.destination_route || undefined,
  };
}

export const NotificationService = {
  /**
   * Fetches the authenticated user's notifications.
   * Leverages get_my_notifications RPC to enforce server-side auth.uid() identity.
   */
  async getMyNotifications(filterUnread = false, limit = 50): Promise<PlatformNotificationItem[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const { data, error } = await (supabase.rpc as any)('get_my_notifications', {
        p_filter_unread: filterUnread,
        p_limit: limit,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      return (data || []).map(mapRowToNotification);
    } catch (err) {
      console.error('[NotificationService.getMyNotifications] Error:', err);
      return [];
    }
  },

  /**
   * Retrieves the count of unread notifications for the current user.
   */
  async getUnreadCount(): Promise<number> {
    if (!isSupabaseConfigured() || !supabase) {
      return 0;
    }

    try {
      const { count, error } = await (supabase.from('notifications') as any)
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      return count ?? 0;
    } catch (err) {
      console.warn('[NotificationService.getUnreadCount] Failed to count unread notifications:', err);
      return 0;
    }
  },

  /**
   * Marks a single notification as read by ID.
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) {
      return true;
    }

    try {
      const { data, error } = await (supabase.rpc as any)('mark_notification_read', {
        p_notification_id: notificationId,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      return Boolean(data);
    } catch (err) {
      console.error('[NotificationService.markAsRead] Failed:', err);
      return false;
    }
  },

  /**
   * Marks all notifications as read for the authenticated user.
   */
  async markAllAsRead(): Promise<number> {
    if (!isSupabaseConfigured() || !supabase) {
      return 0;
    }

    try {
      const { data, error } = await (supabase.rpc as any)('mark_all_notifications_read');

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      return Number(data ?? 0);
    } catch (err) {
      console.error('[NotificationService.markAllAsRead] Failed:', err);
      return 0;
    }
  },

  /**
   * Subscribes to real-time notification inserts for the active user.
   */
  subscribeToMyNotifications(userId: string, onNewNotification: (notif: PlatformNotificationItem) => void) {
    if (!isSupabaseConfigured() || !supabase) {
      return { unsubscribe: () => {} };
    }

    const channel = supabase
      .channel(`user-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          if (payload.new) {
            onNewNotification(mapRowToNotification(payload.new));
          }
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase?.removeChannel(channel);
      },
    };
  },
};
