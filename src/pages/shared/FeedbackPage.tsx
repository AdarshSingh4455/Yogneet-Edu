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
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';

export const FeedbackPage: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('Bug');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

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
    } catch (err: any) {
      toast.error('Submission Failed', err.message || 'Unable to submit feedback at this time.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="brand" size="sm">
            <ShieldCheck className="w-3 h-3 mr-1" /> Confidential Admin Submission
          </Badge>
          <span className="text-xs text-slate-400">Direct Admin Feedback Channel</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <HelpCircle className="w-6 h-6 text-brand-500" />
          Feedback &amp; Issue Reporting
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Report technical bugs, UI flaws, curriculum questions, or account requests directly to the platform administration. All submissions are private and accessible exclusively by verified Super Administrators.
        </p>
      </div>

      {/* Strict Privacy Guarantee Banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-slate-800 dark:text-slate-200 text-xs leading-relaxed max-w-2xl">
        <Lock className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-brand-600 dark:text-cyan-400">Strict Privacy Guarantee:</span>{' '}
          To ensure absolute user privacy and confidentiality, all submissions are delivered directly and privately to Platform Administrators. Feedback tickets, submitter identities, and internal administrative reviews are strictly inaccessible to other students or unauthorized users.
        </div>
      </div>

      {/* Success Notification */}
      {submittedTicketId && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3 max-w-2xl animate-in fade-in duration-150">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
              Feedback Received Successfully
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
              Thank you for your report. Your feedback has been securely dispatched to Platform Administrators for priority investigation.
            </p>
            <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 pt-0.5">
              Reference ID: {submittedTicketId}
            </p>
          </div>
        </div>
      )}

      {/* Submission Form */}
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
  );
};
