import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Megaphone,
  FileText,
  Play,
  CheckSquare,
  MessageSquare,
  Trophy,
  Sparkles,
  Check,
  CheckCheck,
  X,
  Clock,
  ExternalLink,
  Inbox,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { NotificationService } from '../../services/notificationService';

export type NotificationCategory =
  | 'announcement'
  | 'notes'
  | 'videos'
  | 'assessments'
  | 'feedback'
  | 'results'
  | 'platform';

export interface PlatformNotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  linkUrl?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: PlatformNotificationItem[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onUnreadCountChange,
}) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [localNotifications, setLocalNotifications] = useState<PlatformNotificationItem[]>(notifications || []);
  const [isLoading, setIsLoading] = useState(false);

  // Synchronize when external notifications change
  React.useEffect(() => {
    if (notifications !== undefined) {
      setLocalNotifications(notifications);
    }
  }, [notifications]);

  // Load from NotificationService when open and no custom list passed
  React.useEffect(() => {
    if (isOpen && notifications === undefined) {
      setIsLoading(true);
      NotificationService.getMyNotifications()
        .then(items => {
          setLocalNotifications(items);
          const unread = items.filter(i => !i.read).length;
          onUnreadCountChange?.(unread);
        })
        .catch(err => console.warn('[NotificationCenter] Error fetching notifications:', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, notifications, onUnreadCountChange]);

  if (!isOpen) return null;

  const filteredItems = localNotifications.filter(item => {
    if (activeFilter === 'unread') return !item.read;
    return true;
  });

  const unreadCount = localNotifications.filter(n => !n.read).length;

  const handleItemClick = (item: PlatformNotificationItem) => {
    if (!item.read) {
      setLocalNotifications(prev =>
        prev.map(n => (n.id === item.id ? { ...n, read: true } : n))
      );
      NotificationService.markAsRead(item.id);
      if (onMarkAsRead) onMarkAsRead(item.id);
      onUnreadCountChange?.(Math.max(0, unreadCount - 1));
    }
    if (item.linkUrl) {
      onClose();
      navigate(item.linkUrl);
    }
  };

  const handleMarkItemRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLocalNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    NotificationService.markAsRead(id);
    if (onMarkAsRead) onMarkAsRead(id);
    onUnreadCountChange?.(Math.max(0, unreadCount - 1));
  };

  const handleMarkAllRead = () => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
    NotificationService.markAllAsRead();
    if (onMarkAllAsRead) onMarkAllAsRead();
    onUnreadCountChange?.(0);
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-yogneet-orange" />;
      case 'notes':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'videos':
        return <Play className="w-4 h-4 text-red-500" />;
      case 'assessments':
        return <CheckSquare className="w-4 h-4 text-amber-500" />;
      case 'feedback':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'results':
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'platform':
      default:
        return <Sparkles className="w-4 h-4 text-yogneet-cyan" />;
    }
  };

  return (
    <div
      className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      role="dialog"
      aria-label="Platform Notifications"
    >
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-light-border dark:border-dark-border bg-slate-50/50 dark:bg-dark-sidebar/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Platform Notifications
            </h3>
            {unreadCount > 0 && (
              <Badge variant="brand" size="sm">
                {unreadCount} New
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-brand-500 hover:text-brand-600 dark:text-cyan-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-light-border/60 dark:border-dark-border/60">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'all'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-card'
            }`}
          >
            All ({localNotifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'unread'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-card'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-light-border/60 dark:divide-dark-border/60">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-card border border-light-border dark:border-dark-border flex items-center justify-center text-slate-400 mx-auto">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[220px] mx-auto leading-relaxed">
              Curriculum updates, examination schedules, and admin alerts will appear here in real time.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-sidebar">
                Phase 4B Event Dispatcher Ready
              </span>
            </div>
          </div>
        ) : (
          filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                !item.read
                  ? 'bg-brand-50/40 dark:bg-dark-selected/30 hover:bg-brand-50/70 dark:hover:bg-dark-selected/50'
                  : 'hover:bg-slate-50 dark:hover:bg-dark-cardHover/50'
              }`}
            >
              {/* Category Icon Container */}
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                {getCategoryIcon(item.category)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {item.title}
                  </h4>
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" title="Unread" />
                  )}
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {item.description}
                </p>

                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.timestamp}
                  </span>

                  {!item.read && (
                    <button
                      onClick={e => handleMarkItemRead(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 text-brand-600 dark:text-cyan-400 hover:underline flex items-center gap-1 transition-opacity"
                    >
                      <Check className="w-3 h-3" />
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Notice */}
      <div className="p-2.5 bg-slate-50 dark:bg-dark-sidebar/60 border-t border-light-border dark:border-dark-border text-center">
        <span className="text-[10px] text-slate-400">
          Showing platform broadcasts and activity events
        </span>
      </div>
    </div>
  );
};
