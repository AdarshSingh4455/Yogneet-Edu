import React, { useState, useEffect, useCallback } from 'react';
import { CommunityService } from '../../services/communityService';
import { DiscussionThread, ModerationLogEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  MessageSquare,
  Shield,
  Pin,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserX,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Link } from 'react-router-dom';

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

export const CommunityModerationPage: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'threads' | 'audit_logs'>('threads');
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [auditLogs, setAuditLogs] = useState<ModerationLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'flagged' | 'pinned' | 'locked' | 'hidden' | 'deleted'>('all');

  // Mandatory Reason Dialog
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    action: ModerationActionType;
    targetThread?: DiscussionThread;
    targetUserId?: string;
    targetUserName?: string;
  } | null>(null);
  const [moderationReason, setModerationReason] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [threadsData, logsData] = await Promise.all([
        CommunityService.getThreads(true),
        CommunityService.getModerationLogs(),
      ]);
      setThreads(threadsData);
      setAuditLogs(logsData);
    } catch (err: any) {
      toast.error('Failed to load community moderation data', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    setModerationReason(action === 'warn_user' ? 'Posting off-topic or disruptive content' : 'Severe community guidelines violation');
    setIsReasonModalOpen(true);
  };

  const handleExecuteModeration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAction || !moderationReason.trim()) {
      toast.warning('Reason Required', 'You must provide a documented reason for this moderation action.');
      return;
    }

    const { action, targetThread, targetUserId, targetUserName } = pendingAction;

    try {
      if (action === 'warn_user' && targetUserId) {
        await CommunityService.moderateUser(targetUserId, 'warn', moderationReason.trim());
        toast.success('Warning Dispatched', `Formal warning issued to ${targetUserName}.`);
      } else if (action === 'suspend_user' && targetUserId) {
        await CommunityService.moderateUser(targetUserId, 'suspend', moderationReason.trim());
        toast.warning('Account Suspended', `Suspended access for ${targetUserName}.`);
      } else if (targetThread) {
        await CommunityService.moderateThread(targetThread.id, action as any, moderationReason.trim());
        toast.success('Action Applied', `Successfully executed ${action.replace('_', ' ')} on thread.`);
      }

      setIsReasonModalOpen(false);
      setPendingAction(null);
      setModerationReason('');
      loadData();
    } catch (err: any) {
      toast.error('Moderation action failed', err.message);
    }
  };

  const filteredThreads = threads.filter(t => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'pinned') return t.isPinned;
    if (statusFilter === 'locked') return t.isLocked;
    if (statusFilter === 'hidden') return t.isHidden;
    if (statusFilter === 'deleted') return t.isSoftDeleted;
    if (statusFilter === 'flagged') return t.isHidden || t.isSoftDeleted || t.moderationReason;

    return true;
  });

  const hiddenCount = threads.filter(t => t.isHidden || t.isSoftDeleted).length;
  const pinnedCount = threads.filter(t => t.isPinned).length;
  const lockedCount = threads.filter(t => t.isLocked).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-light-border dark:border-dark-border gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              Community Moderation
            </Badge>
            <span className="text-xs text-slate-400">Discussion Governance &amp; Safety Desk</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0 text-purple-500">
              <Shield className="w-4 h-4" />
            </div>
            Forum Moderation &amp; Enforcement
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review public discussions, take down policy-violating content, issue warnings, and inspect immutable audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant={activeTab === 'threads' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('threads')}
            leftIcon={<MessageSquare className="w-4 h-4" />}
          >
            Discussions ({threads.length})
          </Button>
          <Button
            variant={activeTab === 'audit_logs' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('audit_logs')}
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
          >
            Audit Logs ({auditLogs.length})
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Total Threads</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{threads.length}</span>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Pin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Pinned Notices</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{pinnedCount}</span>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Locked Threads</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{lockedCount}</span>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Hidden / Deleted</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{hiddenCount}</span>
          </div>
        </Card>
      </div>

      {activeTab === 'threads' ? (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search threads, authors, categories..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl text-xs sm:text-sm focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="flagged">Flagged / Moderated Only</option>
                <option value="pinned">Pinned Only</option>
                <option value="locked">Locked Only</option>
                <option value="hidden">Hidden Only</option>
                <option value="deleted">Soft-Deleted Only</option>
              </select>

              <Button variant="outline" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Refresh
              </Button>
            </div>
          </div>

          {/* Threads List */}
          <div className="space-y-3">
            {filteredThreads.map(thread => (
              <Card
                key={thread.id}
                padding="md"
                className={`transition-all ${
                  thread.isSoftDeleted
                    ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/50'
                    : thread.isHidden
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10'
                    : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {thread.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      {thread.isLocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                      {thread.isHidden && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          <EyeOff className="w-3 h-3" /> Hidden from Students
                        </span>
                      )}
                      {thread.isSoftDeleted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                          <Trash2 className="w-3 h-3" /> Soft-Deleted
                        </span>
                      )}

                      <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                        {thread.category}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      {thread.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {thread.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={thread.author.avatar}
                          alt={thread.author.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {thread.author.name}
                        </span>
                      </div>
                      <span>•</span>
                      <span>{thread.createdAt}</span>
                      <span>•</span>
                      <span>{thread.repliesCount} replies</span>
                      <span>•</span>
                      <span>{thread.upvotes} upvotes</span>
                    </div>

                    {thread.moderationReason && (
                      <div className="mt-2 p-2 bg-slate-100 dark:bg-dark-sidebar rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-light-border dark:border-dark-border">
                        <span className="font-bold text-slate-500">Moderation Reason:</span> {thread.moderationReason}
                      </div>
                    )}
                  </div>

                  {/* Moderation Controls */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start lg:self-center">
                    <Link to={`/community/thread/${thread.id}`} target="_blank">
                      <Button variant="outline" size="sm" className="px-2.5 py-1 text-xs">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                    </Link>

                    {/* Pin/Unpin */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAction(thread.isPinned ? 'unpin' : 'pin', thread)}
                      className="px-2 py-1 text-xs"
                    >
                      <Pin className="w-3.5 h-3.5 mr-1 text-purple-500" />
                      {thread.isPinned ? 'Unpin' : 'Pin'}
                    </Button>

                    {/* Lock/Unlock */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAction(thread.isLocked ? 'unlock' : 'lock', thread)}
                      className="px-2 py-1 text-xs"
                    >
                      {thread.isLocked ? <Unlock className="w-3.5 h-3.5 mr-1" /> : <Lock className="w-3.5 h-3.5 mr-1 text-amber-500" />}
                      {thread.isLocked ? 'Unlock' : 'Lock'}
                    </Button>

                    {/* Hide/Unhide */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAction(thread.isHidden ? 'unhide' : 'hide', thread)}
                      className="px-2 py-1 text-xs"
                    >
                      {thread.isHidden ? <Eye className="w-3.5 h-3.5 mr-1 text-blue-500" /> : <EyeOff className="w-3.5 h-3.5 mr-1 text-slate-500" />}
                      {thread.isHidden ? 'Unhide' : 'Hide'}
                    </Button>

                    {/* Soft Delete / Restore */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAction(thread.isSoftDeleted ? 'restore' : 'soft_delete', thread)}
                      className={`px-2 py-1 text-xs ${thread.isSoftDeleted ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {thread.isSoftDeleted ? <RotateCcw className="w-3.5 h-3.5 mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                      {thread.isSoftDeleted ? 'Restore' : 'Delete'}
                    </Button>

                    {/* User Warning / Suspension */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenUserAction('warn_user', thread)}
                      className="px-2 py-1 text-xs text-amber-600"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Warn Author
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {filteredThreads.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                No discussion threads match your filter criteria.
              </div>
            )}
          </div>
        </>
      ) : (
        /* Audit Logs Tab */
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-sidebar/60 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Moderator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-card/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {log.moderatorName || 'Staff Moderator'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 uppercase text-[11px] text-slate-500 font-mono">
                      {log.targetType}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {log.reason}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      No moderation audit records logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Mandatory Reason Modal */}
      <Modal
        isOpen={isReasonModalOpen}
        onClose={() => setIsReasonModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            <span>Document Moderation Reason</span>
          </div>
        }
        description={`Documenting reason for action: ${pendingAction?.action.toUpperCase().replace('_', ' ')}`}
        maxWidth="lg"
      >
        <form onSubmit={handleExecuteModeration} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-dark-sidebar rounded-xl border border-light-border dark:border-dark-border text-xs space-y-1">
            <div className="text-slate-500">Target Content / Author:</div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {pendingAction?.targetThread?.title || pendingAction?.targetUserName}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mandatory Justification / Policy Citation
            </label>
            <textarea
              rows={3}
              value={moderationReason}
              onChange={e => setModerationReason(e.target.value)}
              placeholder="e.g. Violates community spam policy §4.2, non-constructive flame post..."
              className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl text-xs sm:text-sm focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsReasonModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={!moderationReason.trim()}
            >
              Confirm &amp; Record Action
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
