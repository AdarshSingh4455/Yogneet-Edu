import React, { useState } from 'react';
import { FeedbackService } from '../../services/feedbackService';
import { FeedbackCategory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  HelpCircle,
  Send,
  CheckCircle2,
  Paperclip,
  ShieldCheck,
  Lock,
  Clock,
  MessageSquare,
  Eye,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Inbox,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';

export interface SubmitterFeedbackTicket {
  id: string;
  category: FeedbackCategory;
  title: string;
  description: string;
  attachmentUrl?: string;
  status: 'New' | 'Pending' | 'In Progress' | 'Resolved';
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const FeedbackPage: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

  // Submission Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('Bug');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  // Submitter Database History State
  const [historyTickets, setHistoryTickets] = useState<SubmitterFeedbackTicket[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchHistory = React.useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const tickets = await FeedbackService.getMyFeedbackSubmissions();
      setHistoryTickets(tickets as SubmitterFeedbackTicket[]);
    } catch (err) {
      console.warn('[FeedbackPage] Could not load feedback history from Supabase:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Selected ticket for detailed modal view
  const [selectedTicket, setSelectedTicket] = useState<SubmitterFeedbackTicket | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) {
      toast.warning('Title Required', 'Please enter a descriptive title (at least 3 characters).');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      toast.warning('Description Required', 'Please provide detailed issue steps (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketId = await FeedbackService.submitFeedback({
        title: title.trim(),
        description: description.trim(),
        category,
        attachmentUrl: attachmentUrl.trim() || undefined,
      });

      setSubmittedTicketId(ticketId);
      toast.success(
        'Feedback Submitted',
        'Your feedback ticket has been securely routed directly to platform administrators.'
      );
      setTitle('');
      setDescription('');
      setAttachmentUrl('');
      // Reload caller's history from database
      await fetchHistory();
    } catch (err: any) {
      toast.error('Submission Failed', err.message || 'Unable to submit feedback at this time.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: SubmitterFeedbackTicket['status']) => {
    switch (status) {
      case 'New':
      case 'Pending':
        return (
          <Badge variant="brand" size="sm">
            <Clock className="w-3 h-3 mr-1" /> Pending Review
          </Badge>
        );
      case 'In Progress':
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 mr-1" /> In Progress
          </Badge>
        );
      case 'Resolved':
        return (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Resolved • Fixed
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="brand" size="sm">
            <ShieldCheck className="w-3 h-3 mr-1" /> Confidential Admin Channel
          </Badge>
          <span className="text-xs text-slate-400">Direct Super Administrator Support</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <HelpCircle className="w-6 h-6 text-brand-500" />
          Feedback &amp; Issue Reporting Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Report technical bugs, UI flaws, curriculum questions, or account requests directly to Platform Administration. All submissions are private and handled exclusively by verified Administrators.
        </p>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'submit'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-card'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Submit Feedback</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 relative ${
              activeTab === 'history'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-card'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>My Feedback History</span>
            {historyTickets.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                {historyTickets.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 1: SUBMIT FEEDBACK */}
      {activeTab === 'submit' && (
        <div className="space-y-6">
          {/* Privacy Guarantee Banner */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-slate-800 dark:text-slate-200 text-xs leading-relaxed max-w-2xl">
            <Lock className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-brand-600 dark:text-cyan-400">Strict Privacy Guarantee:</span>{' '}
              To ensure absolute user privacy, all submissions are delivered directly and privately to Platform Administrators. Feedback tickets, submitter identities, and internal administrative reviews are strictly inaccessible to other students or unauthorized users.
            </div>
          </div>

          {/* Success Notification */}
          {submittedTicketId && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3 max-w-2xl animate-in fade-in duration-150">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                  Feedback Received Successfully
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                  Thank you for your report. Your feedback has been securely dispatched to Platform Administrators for priority investigation.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                    Ref ID: #{submittedTicketId.slice(0, 8)}
                  </span>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-300 underline hover:no-underline"
                  >
                    View in Ticket History &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submission Form Card */}
          <div className="max-w-2xl">
            <Card padding="lg" className="border border-light-border dark:border-dark-border space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    New Feedback Ticket
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Submitting as: <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong> ({currentUser.role.toUpperCase()})
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Issue Category *
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as FeedbackCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                  >
                    <option value="Bug">Bug (System Error / Glitch)</option>
                    <option value="UI Issue">UI Issue (Display / Responsive Flaw)</option>
                    <option value="Content Issue">Content Issue (Lecture, Notes, or Questions)</option>
                    <option value="Account Issue">Account Issue (Access / Entitlements)</option>
                    <option value="Other">Other Suggestion / General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Issue Title *
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Video player controls overlap on mobile Safari"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={200}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Detailed Description *
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Please describe what occurred, the steps to reproduce, or any relevant details..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Optional Screenshot or Reference URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://drive.google.com/... or https://i.imgur.com/..."
                    value={attachmentUrl}
                    onChange={e => setAttachmentUrl(e.target.value)}
                    leftIcon={<Paperclip className="w-4 h-4 text-slate-400" />}
                  />
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <Button
                    type="submit"
                    size="md"
                    disabled={isSubmitting}
                    leftIcon={<Send className="w-4 h-4" />}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Confidential Feedback'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 2: MY FEEDBACK HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          {/* Real Secure Submitter Synchronization Banner */}
          <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/25 text-slate-800 dark:text-slate-200 text-xs flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-brand-600 dark:text-brand-400">Secure Submitter History Live:</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Your submitted feedback inquiries and official administrator replies are loaded securely through server-side authenticated RPC. Confidentiality and zero cross-user visibility are enforced at the database level.
              </p>
            </div>
          </div>

          {/* Tickets List */}
          {isLoadingHistory ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading your feedback tickets...</p>
            </div>
          ) : historyTickets.length === 0 ? (
            <Card padding="lg" className="text-center py-12 border-dashed border-2 border-light-border dark:border-dark-border">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-dark-sidebar flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Feedback Submissions Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                Have an inquiry or issue? Use the submission form to privately contact Platform Administration.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setActiveTab('submit')}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Submit New Feedback
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {historyTickets.map(ticket => (
                <Card
                  key={ticket.id}
                  padding="md"
                  onClick={() => setSelectedTicket(ticket)}
                  className="cursor-pointer hover:border-brand-500/40 hover:shadow-md transition-all border border-light-border dark:border-dark-border space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-light-border dark:border-dark-border">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400">
                        #{ticket.id.slice(0, 8)}
                      </span>
                      <Badge variant="purple" size="sm">
                        {ticket.category}
                      </Badge>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {ticket.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(ticket.status)}
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {ticket.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Submitted: {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>

                    {ticket.adminReply ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Admin Responded
                      </span>
                    ) : (
                      <span className="italic">Awaiting Admin Review</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <Modal
          isOpen={selectedTicket !== null}
          onClose={() => setSelectedTicket(null)}
          title={`Ticket Details — #${selectedTicket.id.slice(0, 8)}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-light-border dark:border-dark-border">
              <div className="flex items-center gap-2">
                <Badge variant="purple" size="sm">{selectedTicket.category}</Badge>
                <span className="text-xs text-slate-400 font-mono">Ref: {selectedTicket.id}</span>
              </div>
              {getStatusBadge(selectedTicket.status)}
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                {selectedTicket.title}
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed p-3.5 rounded-xl bg-slate-50 dark:bg-dark-sidebar/40 border border-light-border dark:border-dark-border">
                {selectedTicket.description}
              </p>
            </div>

            {selectedTicket.attachmentUrl && (
              <div className="text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Attachment:</span>
                <a
                  href={selectedTicket.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-brand-600 dark:text-cyan-400 hover:underline"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>View Attached Screenshot / Asset</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Admin Response Box */}
            <div className="p-4 rounded-xl border border-light-border dark:border-dark-border bg-slate-50/70 dark:bg-dark-sidebar/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-500" />
                  Platform Administration Response
                </span>
              </div>

              {selectedTicket.adminReply ? (
                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed pt-1">
                  {selectedTicket.adminReply}
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic pt-1">
                  This submission has been dispatched directly to platform administrators. An official response will appear here once reviewed.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-light-border dark:border-dark-border text-xs text-slate-400">
              <span>Submitted: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
              <Button size="sm" variant="outline" onClick={() => setSelectedTicket(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
