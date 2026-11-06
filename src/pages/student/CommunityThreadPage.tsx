import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { CommunityService } from '../../services/communityService';
import { DiscussionThread, DiscussionReply } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  MessageSquare,
  ThumbsUp,
  ArrowLeft,
  CheckCircle2,
  Send,
  Sparkles,
  Share2,
  Shield,
  Pin,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

type ModerationAction =
  | 'pin'
  | 'unpin'
  | 'lock'
  | 'unlock'
  | 'hide'
  | 'unhide'
  | 'soft_delete'
  | 'restore'
  | 'warn_user'
  | 'suspend_user'
  | 'soft_delete_reply'
  | 'restore_reply';

export const CommunityThreadPage: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const { currentUser, isAdmin, hasPermission } = useAuth();
  const toast = useToast();

  const canModerate = isAdmin || hasPermission('community.moderate');

  const [thread, setThread] = useState<DiscussionThread | undefined>(() =>
    ApiService.getThreadById(threadId || 'th_1')
  );
  const [replyText, setNewReplyText] = useState('');

  // Moderation state
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    action: ModerationAction;
    targetTitle?: string;
    targetUserId?: string;
    targetUserName?: string;
    targetReplyId?: string;
  } | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [isSubmittingMod, setIsSubmittingMod] = useState(false);

  const loadThread = useCallback(async () => {
    if (threadId) {
      const t = await CommunityService.getThreadById(threadId, canModerate);
      if (t) setThread(t);
    }
  }, [threadId, canModerate]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  if (!thread) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-slate-500">Discussion thread not found.</p>
        <Link to="/community">
          <Button size="sm">Back to Forum Management</Button>
        </Link>
      </div>
    );
  }

  const handleToggleUpvote = () => {
    ApiService.toggleThreadUpvote(thread.id);
    setThread(ApiService.getThreadById(thread.id));
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    if (thread.isLocked && !canModerate) {
      toast.warning('Thread Locked', 'This discussion is locked. New replies are disabled.');
      return;
    }

    try {
      await CommunityService.addReply(currentUser, thread.id, replyText.trim());
      await loadThread();
      setNewReplyText('');
      toast.success('Reply Posted', 'Your answer has been shared with the community.');
    } catch (err: any) {
      toast.error('Failed to post reply', err.message);
    }
  };

  const handleOpenThreadAction = (action: ModerationAction) => {
    setPendingAction({
      action,
      targetTitle: thread.title,
      targetUserId: thread.author.id,
      targetUserName: thread.author.name,
    });
    setModerationReason('');
    setIsReasonModalOpen(true);
  };

  const handleOpenReplyAction = (action: 'soft_delete_reply' | 'restore_reply', reply: DiscussionReply) => {
    setPendingAction({
      action,
      targetTitle: `Reply by ${reply.author.name}`,
      targetUserId: reply.author.id,
      targetUserName: reply.author.name,
      targetReplyId: reply.id,
    });
    setModerationReason('');
    setIsReasonModalOpen(true);
  };

  const handleOpenUserAction = (action: 'warn_user' | 'suspend_user', userId: string, userName: string) => {
    setPendingAction({
      action,
      targetTitle: `User: ${userName}`,
      targetUserId: userId,
      targetUserName: userName,
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

    const { action, targetUserId, targetUserName, targetReplyId } = pendingAction;
    setIsSubmittingMod(true);

    try {
      if (action === 'warn_user' && targetUserId) {
        await CommunityService.moderateUser(targetUserId, 'warn', moderationReason.trim());
        toast.success('Warning Dispatched', `Formal warning issued to ${targetUserName}.`);
      } else if (action === 'suspend_user' && targetUserId) {
        await CommunityService.moderateUser(targetUserId, 'suspend', moderationReason.trim());
        toast.warning('Account Suspended', `Suspended access for ${targetUserName}.`);
      } else if (action === 'soft_delete_reply' && targetReplyId) {
        await CommunityService.moderateReply(targetReplyId, 'soft_delete', moderationReason.trim(), thread.id);
        toast.success('Reply Moderated', 'The reply has been soft-deleted.');
      } else if (action === 'restore_reply' && targetReplyId) {
        await CommunityService.moderateReply(targetReplyId, 'restore', moderationReason.trim(), thread.id);
        toast.success('Reply Restored', 'The reply has been restored to view.');
      } else {
        await CommunityService.moderateThread(thread.id, action as any, moderationReason.trim());
        toast.success('Action Applied', `Successfully executed ${action.replace('_', ' ')} on discussion.`);
      }

      setIsReasonModalOpen(false);
      setPendingAction(null);
      setModerationReason('');
      await loadThread();
    } catch (err: any) {
      toast.error('Moderation action failed', err.message || 'Operation failed');
    } finally {
      setIsSubmittingMod(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Back button */}
      <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
        <Link
          to="/community"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Forum Management</span>
        </Link>
        <div className="flex items-center gap-2">
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
          <span className="text-xs text-slate-400">Category: {thread.category}</span>
        </div>
      </div>

      {/* Moderator Action Toolbar for this discussion (Visible to authorized moderators) */}
      {canModerate && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-slate-50 dark:to-dark-card border border-purple-500/25 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-purple-700 dark:text-purple-300">
            <Shield className="w-4 h-4 text-purple-500" />
            <span>Discussion Moderation Controls</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenThreadAction(thread.isPinned ? 'unpin' : 'pin')}
              leftIcon={<Pin className="w-3 h-3" />}
            >
              {thread.isPinned ? 'Unpin' : 'Pin'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenThreadAction(thread.isLocked ? 'unlock' : 'lock')}
              leftIcon={thread.isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            >
              {thread.isLocked ? 'Unlock' : 'Lock'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenThreadAction(thread.isHidden ? 'unhide' : 'hide')}
              leftIcon={thread.isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            >
              {thread.isHidden ? 'Unhide' : 'Hide'}
            </Button>
            <Button
              size="sm"
              variant={thread.isSoftDeleted ? 'primary' : 'danger'}
              onClick={() => handleOpenThreadAction(thread.isSoftDeleted ? 'restore' : 'soft_delete')}
              leftIcon={thread.isSoftDeleted ? <RotateCcw className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
            >
              {thread.isSoftDeleted ? 'Restore' : 'Delete'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleOpenUserAction('warn_user', thread.author.id, thread.author.name)}
              leftIcon={<AlertTriangle className="w-3 h-3 text-amber-500" />}
            >
              Warn Author
            </Button>
          </div>
        </div>
      )}

      {/* Main Post Card */}
      <Card padding="lg" className={`space-y-4 ${
        thread.isSoftDeleted
          ? 'border-rose-500/40 bg-rose-50/10 dark:bg-rose-950/10'
          : thread.isHidden
          ? 'border-slate-400/40 bg-slate-50/20 dark:bg-slate-900/20'
          : ''
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={thread.author.avatar}
              alt={thread.author.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {thread.author.name}
                </span>
                {thread.author.badge && (
                  <Badge variant="brand" size="sm">
                    {thread.author.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-slate-400">{thread.createdAt}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {thread.isSolved && (
              <Badge variant="success" size="sm" dot>
                Solved
              </Badge>
            )}
          </div>
        </div>

        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
          {thread.title}
        </h1>

        <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
          {thread.content}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {thread.tags.map(t => (
            <span
              key={t}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-cardHover text-slate-500 dark:text-slate-400 font-medium"
            >
              #{t}
            </span>
          ))}
        </div>

        {/* Post Actions Bar */}
        <div className="pt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between">
          <button
            onClick={handleToggleUpvote}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              thread.userUpvoted
                ? 'bg-blue-50 dark:bg-dark-selected text-brand-600 dark:text-blue-300 border-brand-300 dark:border-blue-500 font-bold shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200 dark:hover:border-blue-800/40 border-light-border dark:border-dark-border text-slate-600 dark:text-slate-400'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>{thread.upvotes} Upvotes</span>
          </button>

          <span className="text-xs text-slate-400">
            {thread.replies.length} Community Replies
          </span>
        </div>
      </Card>

      {/* Replies Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Replies &amp; Answers ({thread.replies.length})
        </h2>

        {thread.replies.map(reply => (
          <Card
            key={reply.id}
            padding="md"
            className={`space-y-3 ${
              reply.isSoftDeleted
                ? 'border-rose-500/40 bg-rose-50/15 dark:bg-rose-950/15 opacity-80'
                : reply.isAcceptedSolution
                ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={reply.author.avatar}
                  alt={reply.author.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {reply.author.name}
                    </span>
                    {reply.author.badge && (
                      <Badge variant="purple" size="sm">
                        {reply.author.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">{reply.createdAt}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {reply.isSoftDeleted && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/25">
                    <Trash2 className="w-3 h-3" /> SOFT-DELETED
                  </span>
                )}
                {reply.isAcceptedSolution && (
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accepted Solution
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line pl-10">
              {reply.content}
            </div>

            <div className="pl-10 pt-2 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3 text-slate-400" /> {reply.upvotes} helpful
              </span>

              {/* Reply Moderation Actions (Authorized moderators only) */}
              {canModerate && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenReplyAction(reply.isSoftDeleted ? 'restore_reply' : 'soft_delete_reply', reply)}
                    className={`text-[11px] px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors ${
                      reply.isSoftDeleted ? 'text-emerald-600 font-bold' : 'text-rose-500'
                    }`}
                  >
                    {reply.isSoftDeleted ? 'Restore Reply' : 'Delete Reply'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenUserAction('warn_user', reply.author.id, reply.author.name)}
                    className="text-[11px] px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-dark-hover text-amber-600 dark:text-amber-400 transition-colors"
                  >
                    Warn Author
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}

        {/* Post Reply Box */}
        {thread.isLocked && !canModerate ? (
          <div className="p-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-200 text-xs sm:text-sm flex items-center gap-3">
            <Lock className="w-5 h-5 text-orange-500 shrink-0" />
            <div>
              <p className="font-bold">This discussion has been locked by moderation.</p>
              <p className="text-xs text-orange-700/80 dark:text-orange-300/80 mt-0.5">
                New replies are currently disabled. Contact community moderators if you require further discussion on this topic.
              </p>
            </div>
          </div>
        ) : (
          <Card padding="md" className="space-y-3">
            {thread.isLocked && canModerate && (
              <div className="p-2.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300 text-xs flex items-center justify-between">
                <span>
                  <Lock className="w-3.5 h-3.5 inline mr-1 text-orange-500" />
                  Thread is locked for students. You are replying as authorized staff.
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenThreadAction('unlock')}
                  className="font-bold underline hover:text-orange-900 dark:hover:text-orange-100"
                >
                  Unlock Thread
                </button>
              </div>
            )}
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Write your answer or explanation
            </h3>
            <form onSubmit={handlePostReply} className="space-y-3">
              <textarea
                rows={4}
                value={replyText}
                onChange={e => setNewReplyText(e.target.value)}
                placeholder="Explain your approach, provide code examples, or share feedback..."
                className="w-full p-3 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-blue-500/40 dark:focus:border-blue-400 dark:focus:bg-dark-selected/30 transition-all"
                required
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Markdown syntax supported for code blocks (`code` and ```code```)
                </span>
                <Button size="sm" type="submit" leftIcon={<Send className="w-3.5 h-3.5" />}>
                  Post Answer
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      {/* Mandatory Moderation Reason Dialog */}
      <Modal
        isOpen={isReasonModalOpen}
        onClose={() => {
          setIsReasonModalOpen(false);
          setPendingAction(null);
          setModerationReason('');
        }}
        title="Document Mandatory Moderation Justification"
        description="Every moderation action requires a documented compliance rationale for tamper-evident audit logging."
        maxWidth="md"
      >
        {pendingAction && (
          <form onSubmit={handleExecuteModeration} className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Target:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {pendingAction.targetTitle}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Target User:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {pendingAction.targetUserName}
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
    </div>
  );
};
