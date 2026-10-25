import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { DiscussionThread } from '../../types';
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
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const CommunityThreadPage: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [thread, setThread] = useState<DiscussionThread | undefined>(() =>
    ApiService.getThreadById(threadId || 'th_1')
  );
  const [replyText, setNewReplyText] = useState('');

  if (!thread) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-slate-500">Discussion thread not found.</p>
        <Link to="/community">
          <Button size="sm">Back to Community</Button>
        </Link>
      </div>
    );
  }

  const handleToggleUpvote = () => {
    ApiService.toggleThreadUpvote(thread.id);
    setThread(ApiService.getThreadById(thread.id));
  };

  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    ApiService.addReply(currentUser, thread.id, replyText.trim());
    setThread(ApiService.getThreadById(thread.id));
    setNewReplyText('');
    toast.success('Reply Posted', 'Your answer has been shared with the community.');
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
          <span>Back to All Discussions</span>
        </Link>
        <span className="text-xs text-slate-400">Category: {thread.category}</span>
      </div>

      {/* Main Post Card */}
      <Card padding="lg" className="space-y-4">
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

          {thread.isSolved && (
            <Badge variant="success" size="sm" dot>
              Solved
            </Badge>
          )}
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
          Replies & Answers ({thread.replies.length})
        </h2>

        {thread.replies.map(reply => (
          <Card
            key={reply.id}
            padding="md"
            className={`space-y-3 ${
              reply.isAcceptedSolution
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

              {reply.isAcceptedSolution && (
                <Badge variant="success" size="sm">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accepted Solution
                </Badge>
              )}
            </div>

            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line pl-10">
              {reply.content}
            </div>

            <div className="pl-10 pt-2 flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3 text-slate-400" /> {reply.upvotes} helpful
              </span>
            </div>
          </Card>
        ))}

        {/* Post Reply Box */}
        <Card padding="md" className="space-y-3">
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
      </div>
    </div>
  );
};
