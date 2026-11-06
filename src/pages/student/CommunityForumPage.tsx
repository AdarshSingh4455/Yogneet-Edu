import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { CommunityService } from '../../services/communityService';
import { DiscussionThread, ModerationLogEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  MessageSquare,
  Search,
  Plus,
  ThumbsUp,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Users,
  Shield,
  Send,
  Pin,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  UserX,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { EmptyState } from '../../components/common/EmptyState';

type ModerationActionType =
  | 'pin'
  | 'unpin'
  | 'lock'
  | 'unlock'
  | 'hide'
  | 'unhide'
  | 'soft_delete'
  | 'restore'
  | 'warn_user'
  | 'suspend_user';

export const CommunityForumPage: React.FC = () => {
  const { currentUser, isAdmin, hasPermission } = useAuth();
  const toast = useToast();

  const canModerate = isAdmin || hasPermission('community.moderate');

  const [threads, setThreads] = useState<DiscussionThread[]>(() => ApiService.getCommunityThreads());
  const [moderationLogs, setModerationLogs] = useState<ModerationLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pinned' | 'locked' | 'hidden' | 'deleted' | 'flagged'>('all');

  // Modals
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [isSubmittingMod, setIsSubmittingMod] = useState(false);

  // Moderation action form
  const [pendingAction, setPendingAction] = useState<{
    action: ModerationActionType;
    targetThread?: DiscussionThread;
    targetUserId?: string;
    targetUserName?: string;
  } | null>(null);
  const [moderationReason, setModerationReason] = useState('');

  // New thread form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('DSA & Algorithms');
  const [newTags, setNewTags] = useState('Dynamic Programming, Algorithms');
  const [newContent, setNewContent] = useState('');

  const categories = ['All', 'DSA & Algorithms', 'Python Internals', 'Web Dev', 'Interview Prep'];

  const reloadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const threadsData = await CommunityService.getThreads(canModerate);
      if (threadsData && threadsData.length > 0) {
        setThreads(threadsData);
      }
      if (canModerate) {
        const logsData = await CommunityService.getModerationLogs();
        setModerationLogs(logsData);
      }
    } catch (err: any) {
      console.warn('Failed to load live community data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [canModerate]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const filteredThreads = useMemo(() => {
    return threads.filter(t => {
      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesCategory || !matchesSearch) return false;

      if (canModerate) {
        if (statusFilter === 'active') return !t.isHidden && !t.isSoftDeleted;
        if (statusFilter === 'pinned') return t.isPinned;
        if (statusFilter === 'locked') return t.isLocked;
        if (statusFilter === 'hidden') return t.isHidden;
        if (statusFilter === 'deleted') return t.isSoftDeleted;
        if (statusFilter === 'flagged') return t.isHidden || t.isSoftDeleted || t.moderationReason;
      }

      return true;
    });
  }, [threads, selectedCategory, searchQuery, statusFilter, canModerate]);

  // Moderation Counters
  const pinnedCount = threads.filter(t => t.isPinned).length;
  const lockedCount = threads.filter(t => t.isLocked).length;
  const hiddenCount = threads.filter(t => t.isHidden).length;
  const deletedCount = threads.filter(t => t.isSoftDeleted).length;

  const handleToggleUpvote = (e: React.MouseEvent, threadId: string) => {
    e.preventDefault();
    e.stopPropagation();
    ApiService.toggleThreadUpvote(threadId);
    setThreads(ApiService.getCommunityThreads());
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.warning('Form Incomplete', 'Please provide a title and question content.');
      return;
    }

    const tagsArray = newTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    try {
      const created = await CommunityService.createThread(currentUser, {
        title: newTitle.trim(),
        category: newCategory,
        tags: tagsArray,
        content: newContent.trim(),
      });
      await reloadData();
      setIsNewThreadOpen(false);
      setNewTitle('');
      setNewContent('');
      toast.success('Discussion Created!', `"${created.title}" is now visible to the student community.`);
    } catch (err: any) {
      toast.error('Failed to create discussion', err.message);
    }
  };

  const handleOpenAction = (action: ModerationActionType, thread: DiscussionThread) => {
    setPendingAction({
      action,
      targetThread: thread,
      targetUserId: thread.author.id,
      targetUserName: thread.author.name,
    });
    setModerationReason('');
    setIsReasonModalOpen(true);
  };

  const handleOpenUserAction = (action: 'warn_user' | 'suspend_user', thread: DiscussionThread) => {
    setPendingAction({
      action,
      targetThread: thread,
      targetUserId: thread.author.id,
      targetUserName: thread.author.name,
    });
    setModerationReason(action === 'warn_user' ? 'Posting off-topic or disruptive content in discussion forum' : 'Severe community guidelines violation');
    setIsReasonModalOpen(true);
  };

  const handleExecuteModeration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAction || !moderationReason.trim()) {
      toast.warning('Reason Required', 'You must provide a documented reason for this moderation action.');
      return;
    }

    const { action, targetThread, targetUserId, targetUserName } = pendingAction;
    setIsSubmittingMod(true);

    try {
      if (action === 'warn_user' && targetUserId) {
        await CommunityService.moderateUser(targetUserId, 'warn', moderationReason.trim());
        toast.success('Warning Dispatched', `Formal warning issued to ${targetUserName}.`);
      } else if (action === 'suspend_user' && targetUserId) {
        await CommunityService.moderateUser(targetUserId, 'suspend', moderationReason.trim());
        toast.warning('Account Suspended', `Suspended access for ${targetUserName}.`);
      } else if (targetThread) {
        await CommunityService.moderateThread(targetThread.id, action as any, moderationReason.trim());
        toast.success('Action Applied', `Successfully executed ${action.replace('_', ' ')} on discussion.`);
      }

      setIsReasonModalOpen(false);
      setPendingAction(null);
      setModerationReason('');
      await reloadData();
    } catch (err: any) {
      toast.error('Moderation action failed', err.message || 'Operation failed');
    } finally {
      setIsSubmittingMod(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              Forum Management
            </Badge>
            <span className="text-xs text-slate-400">Peer Learning &amp; Technical Mentorship</span>
            {canModerate ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                <Shield className="w-3 h-3" /> Moderator Console
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                Interactive Preview
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0 text-purple-500 dark:text-purple-400">
              <Users className="w-4 h-4" />
            </div>
            Student Discussion Forum
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Collaborate with fellow engineers, ask algorithmic doubts, and receive answers directly from instructors and peers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {canModerate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsHistoryModalOpen(true)}
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-purple-400" />}
              className="border-purple-500/30 hover:border-purple-500/50"
            >
              Audit History ({moderationLogs.length})
            </Button>
          )}
          <Button
            size="md"
            onClick={() => setIsNewThreadOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Discussion
          </Button>
        </div>
      </div>

      {/* Prototype Preview Notice (Students only) */}
      {!canModerate && (
        <div className="flex items-start sm:items-center gap-3 p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-purple-500" />
          <div className="flex-1">
            <span className="font-semibold">Community Notice:</span>{' '}
            Discussions, replies, and community interactions are synchronized live across the student platform.
          </div>
        </div>
      )}

      {/* Moderator Toolbar (Visible only to Admin and authorized Sub-Admins) */}
      {canModerate && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-slate-50 dark:to-dark-card border border-purple-500/25 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-bold text-purple-700 dark:text-purple-300">
                <Shield className="w-3.5 h-3.5 text-purple-500" />
                Moderation Governance Controls
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">•</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Authorized as {isAdmin ? 'Super Admin' : 'Staff Moderator'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
                {pinnedCount} Pinned
              </span>
              <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-semibold">
                {lockedCount} Locked
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 font-semibold">
                {hiddenCount} Hidden
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold">
                {deletedCount} Deleted
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
            {[
              { id: 'all', label: `All (${threads.length})` },
              { id: 'active', label: 'Active Only' },
              { id: 'flagged', label: 'Flagged / Moderated' },
              { id: 'pinned', label: `Pinned (${pinnedCount})` },
              { id: 'locked', label: `Locked (${lockedCount})` },
              { id: 'hidden', label: `Hidden (${hiddenCount})` },
              { id: 'deleted', label: `Deleted (${deletedCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-light-border dark:border-dark-border hover:bg-slate-100 dark:hover:bg-dark-hover'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Layout: Threads on Left (2/3), Sidebar on Right (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search, Category Pills & Thread List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search discussions, questions, error messages..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-blue-500/40 dark:focus:border-blue-400 dark:focus:bg-dark-selected/30 transition-all"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-brand-500 dark:bg-blue-600 text-white shadow-sm dark:shadow-blue-glow dark:border dark:border-blue-400/50'
                    : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover dark:hover:text-blue-200 dark:hover:border-blue-900/40'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Threads List */}
          {filteredThreads.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="w-8 h-8 text-slate-400" />}
              title="No Discussions Found"
              description="No discussions matched your filter criteria. Start a new thread to ask your question!"
              actionLabel="Start a Discussion"
              onAction={() => setIsNewThreadOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {filteredThreads.map(thread => (
                <div
                  key={thread.id}
                  className="block group"
                >
                  <Card
                    padding="md"
                    className={`hover:border-slate-300 dark:hover:border-blue-500/40 transition-all space-y-3 ${
                      thread.isSoftDeleted
                        ? 'border-rose-500/40 bg-rose-50/10 dark:bg-rose-950/10 opacity-75'
                        : thread.isHidden
                        ? 'border-slate-400/40 bg-slate-50/20 dark:bg-slate-900/20 opacity-80'
                        : thread.isPinned
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : ''
                    }`}
                  >
                    {/* Header: Author, Category & Moderation Status Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={thread.author.avatar}
                          alt={thread.author.name}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {thread.author.name}
                            </span>
                            {thread.author.badge && (
                              <Badge variant="brand" size="sm">
                                {thread.author.badge}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {thread.createdAt} • in {thread.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {thread.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Pin className="w-3 h-3" /> PINNED
                          </span>
                        )}
                        {thread.isLocked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                            <Lock className="w-3 h-3" /> LOCKED
                          </span>
                        )}
                        {thread.isHidden && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
                            <EyeOff className="w-3 h-3" /> HIDDEN
                          </span>
                        )}
                        {thread.isSoftDeleted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <Trash2 className="w-3 h-3" /> DELETED
                          </span>
                        )}
                        {thread.isSolved && (
                          <Badge variant="success" size="sm" dot>
                            Solved
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Title & Preview */}
                    <Link to={`/community/${thread.id}`} className="block">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-500 transition-colors">
                        {thread.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {thread.content}
                      </p>
                    </Link>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {thread.tags.map(t => (
                        <span
                          key={t}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-cardHover text-slate-500 dark:text-slate-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    {/* Footer: Upvote & Reply Count */}
                    <div className="pt-2 border-t border-light-border dark:border-dark-border flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={e => handleToggleUpvote(e, thread.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                            thread.userUpvoted
                              ? 'bg-blue-50 dark:bg-dark-selected text-brand-600 dark:text-blue-300 border-brand-300 dark:border-blue-500 font-bold shadow-sm'
                              : 'hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200 dark:hover:border-blue-800/40 border-light-border dark:border-dark-border text-slate-500'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{thread.upvotes}</span>
                        </button>

                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{thread.repliesCount} replies</span>
                        </span>
                      </div>

                      <Link
                        to={`/community/${thread.id}`}
                        className="text-[11px] text-brand-500 font-medium group-hover:translate-x-0.5 transition-transform"
                      >
                        Join discussion →
                      </Link>
                    </div>

                    {/* Moderator Action Toolbar on each card (visible to authorized moderators) */}
                    {canModerate && (
                      <div className="pt-2 mt-2 border-t border-purple-500/20 bg-purple-500/5 -mx-4 -mb-4 px-4 py-2 rounded-b-2xl flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                          <Shield className="w-3.5 h-3.5 text-purple-500" />
                          <span>Moderation:</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenAction(thread.isPinned ? 'unpin' : 'pin', thread)}
                            className="px-2 py-0.5 text-[11px] font-medium rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 text-slate-700 dark:text-slate-300 transition-colors"
                            title={thread.isPinned ? 'Unpin thread' : 'Pin thread to top'}
                          >
                            {thread.isPinned ? 'Unpin' : 'Pin'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAction(thread.isLocked ? 'unlock' : 'lock', thread)}
                            className="px-2 py-0.5 text-[11px] font-medium rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 text-slate-700 dark:text-slate-300 transition-colors"
                            title={thread.isLocked ? 'Unlock replies' : 'Lock thread'}
                          >
                            {thread.isLocked ? 'Unlock' : 'Lock'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAction(thread.isHidden ? 'unhide' : 'hide', thread)}
                            className="px-2 py-0.5 text-[11px] font-medium rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 text-slate-700 dark:text-slate-300 transition-colors"
                            title={thread.isHidden ? 'Unhide from feed' : 'Hide from student feed'}
                          >
                            {thread.isHidden ? 'Unhide' : 'Hide'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAction(thread.isSoftDeleted ? 'restore' : 'soft_delete', thread)}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded hover:bg-rose-100 dark:hover:bg-rose-950/40 ${
                              thread.isSoftDeleted ? 'text-emerald-600 font-bold' : 'text-rose-600'
                            } transition-colors`}
                            title={thread.isSoftDeleted ? 'Restore discussion' : 'Soft-delete discussion'}
                          >
                            {thread.isSoftDeleted ? 'Restore' : 'Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenUserAction('warn_user', thread)}
                            className="px-2 py-0.5 text-[11px] font-medium rounded hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition-colors"
                            title="Issue official warning to author"
                          >
                            Warn Author
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Guidelines, Mentors & Trending */}
        <div className="space-y-6">
          {/* Community Guidelines Card */}
          <Card padding="md" className="space-y-3 bg-gradient-to-br from-slate-50 to-blue-50/20 dark:from-dark-card dark:to-blue-950/20">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
              <Shield className="w-4 h-4 text-brand-500" />
              Community Code of Conduct
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>Be respectful, supportive, and kind to all learners.</li>
              <li>Format code snippets inside markdown fences for readability.</li>
              <li>Avoid posting raw solutions during active test series.</li>
              <li>Mark accepted answers when your question is resolved.</li>
              <li>Follow moderation directives issued by staff.</li>
            </ul>
          </Card>

          {/* Top Mentors / Educators */}
          <Card padding="md" className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Community Leads & Mentors
            </h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                  alt="Tech Geek Adarsh"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    Tech Geek Adarsh
                  </p>
                  <span className="text-[10px] text-brand-500 font-semibold">
                    Platform Founder &amp; Lead Educator
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
                  alt="Priyanshi Verma"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    Priyanshi Verma
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Curriculum &amp; Video Specialist
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* New Discussion Modal */}
      <Modal
        isOpen={isNewThreadOpen}
        onClose={() => setIsNewThreadOpen(false)}
        title="Start a New Discussion"
        description="Share a problem, architectural pattern, or ask an engineering question."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateThread} className="space-y-4">
          <Input
            label="Discussion Title"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="e.g. How does Python garbage collector handle cyclic references?"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="DSA & Algorithms">DSA & Algorithms</option>
                <option value="Python Internals">Python Internals</option>
                <option value="Web Dev">Web Dev</option>
                <option value="Interview Prep">Interview Prep</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Tags (Comma Separated)
              </label>
              <input
                type="text"
                value={newTags}
                onChange={e => setNewTags(e.target.value)}
                placeholder="Python, Memory, CPython"
                className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Question or Discussion Details
            </label>
            <textarea
              rows={5}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Provide context, what you have tried, and any code blocks..."
              className="w-full p-3 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsNewThreadOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" leftIcon={<Send className="w-3.5 h-3.5" />}>
              Publish Thread
            </Button>
          </div>
        </form>
      </Modal>

      {/* Mandatory Reason Modal for Moderation */}
      <Modal
        isOpen={isReasonModalOpen}
        onClose={() => {
          setIsReasonModalOpen(false);
          setPendingAction(null);
          setModerationReason('');
        }}
        title="Document Mandatory Moderation Justification"
        description="Every moderation action requires documented compliance rationale for tamper-evident audit logging."
        maxWidth="md"
      >
        {pendingAction && (
          <form onSubmit={handleExecuteModeration} className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Target Discussion:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {pendingAction.targetThread?.title || 'User Action'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Author:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {pendingAction.targetUserName || pendingAction.targetThread?.author.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Action:</span>
                <Badge variant="purple" size="sm">
                  {pendingAction.action.toUpperCase().replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Moderation Reason (Mandatory)
              </label>
              <textarea
                rows={3}
                required
                value={moderationReason}
                onChange={e => setModerationReason(e.target.value)}
                placeholder="Specify the policy reason (e.g., Code of Conduct §2, offensive language, spam, off-topic)..."
                className="w-full p-3 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Quick Reason Snippets */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Quick Presets:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  'Violates Community Code of Conduct',
                  'Off-topic or disruptive content',
                  'Spam / external promotional material',
                  'Inappropriate or offensive language',
                  'Duplicate discussion topic',
                ].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setModerationReason(r)}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-dark-cardHover text-slate-600 dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-light-border dark:border-dark-border">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setIsReasonModalOpen(false);
                  setPendingAction(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                type="submit"
                disabled={isSubmittingMod || !moderationReason.trim()}
                leftIcon={<Shield className="w-3.5 h-3.5" />}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmittingMod ? 'Applying...' : 'Confirm Moderation'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Moderation Audit History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Moderation Audit History & Governance Trail"
        description="Immutable chronological record of all administrative and moderator actions applied to forum content."
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Showing {moderationLogs.length} logged moderation actions</span>
            <Button
              variant="outline"
              size="sm"
              onClick={reloadData}
              disabled={isLoading}
              leftIcon={<RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh Logs
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 border border-light-border dark:border-dark-border rounded-xl p-2 bg-slate-50/50 dark:bg-dark-card/50">
            {moderationLogs.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">
                No moderation logs recorded yet. All administrative actions will appear here.
              </p>
            ) : (
              moderationLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {log.moderatorName}
                      </span>
                      <Badge variant="purple" size="sm">
                        {log.action}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">Reason:</span> {log.reason}
                  </p>
                  <div className="text-[10px] text-slate-400">
                    Target: {log.targetType} ({log.targetId})
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-light-border dark:border-dark-border">
            <Button size="sm" onClick={() => setIsHistoryModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
