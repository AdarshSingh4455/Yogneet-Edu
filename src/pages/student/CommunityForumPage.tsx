import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { DiscussionThread } from '../../types';
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
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { EmptyState } from '../../components/common/EmptyState';

export const CommunityForumPage: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [threads, setThreads] = useState<DiscussionThread[]>(() => ApiService.getCommunityThreads());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);

  // New thread form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('DSA & Algorithms');
  const [newTags, setNewTags] = useState('Dynamic Programming, Algorithms');
  const [newContent, setNewContent] = useState('');

  const categories = ['All', 'DSA & Algorithms', 'Python Internals', 'Web Dev', 'Interview Prep'];

  const filteredThreads = threads.filter(t => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleToggleUpvote = (e: React.MouseEvent, threadId: string) => {
    e.preventDefault();
    e.stopPropagation();
    ApiService.toggleThreadUpvote(threadId);
    setThreads(ApiService.getCommunityThreads());
  };

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.warning('Form Incomplete', 'Please provide a title and question content.');
      return;
    }

    const tagsArray = newTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const created = ApiService.addThread(currentUser, {
      title: newTitle.trim(),
      category: newCategory,
      tags: tagsArray,
      content: newContent.trim(),
    });

    setThreads(ApiService.getCommunityThreads());
    setIsNewThreadOpen(false);
    setNewTitle('');
    setNewContent('');
    toast.success('Discussion Created!', `"${created.title}" is now visible to the student community.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              Community Hub
            </Badge>
            <span className="text-xs text-slate-400">Peer Learning & Mentorship</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-brand-500" />
            Student Discussion Forum
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Collaborate with fellow engineers, ask algorithmic doubts, and receive answers directly from instructors and peers.
          </p>
        </div>

        <Button
          size="md"
          onClick={() => setIsNewThreadOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="self-start sm:self-auto"
        >
          New Discussion
        </Button>
      </div>

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
              description="No discussions matched your query. Start a new thread to ask your question!"
              actionLabel="Start a Discussion"
              onAction={() => setIsNewThreadOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {filteredThreads.map(thread => (
                <Link
                  key={thread.id}
                  to={`/community/${thread.id}`}
                  className="block group"
                >
                  <Card
                    padding="md"
                    className="hover:border-slate-300 dark:hover:border-blue-500/40 dark:hover:shadow-[0_4px_20px_-2px_rgba(59,130,246,0.12)] transition-all space-y-3"
                  >
                    {/* Header: Author & Tag */}
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

                      {thread.isSolved && (
                        <Badge variant="success" size="sm" dot>
                          Solved
                        </Badge>
                      )}
                    </div>

                    {/* Title & Preview */}
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-500 transition-colors">
                        {thread.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {thread.content}
                      </p>
                    </div>

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

                      <span className="text-[11px] text-brand-500 font-medium group-hover:translate-x-0.5 transition-transform">
                        Join discussion →
                      </span>
                    </div>
                  </Card>
                </Link>
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
                    Platform Founder & Lead Educator
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
                    Curriculum & Video Specialist
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
    </div>
  );
};
