import React, { useState, useEffect, useMemo } from 'react';
import { FeedbackService } from '../../services/feedbackService';
import { FeedbackSubmission, FeedbackStatus, FeedbackCategory } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Shield,
  Paperclip,
  Reply,
  RefreshCw,
  User,
  Crown,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';

export const FeedbackManagementPage: React.FC = () => {
  const toast = useToast();
  const [feedbackList, setFeedbackList] = useState<FeedbackSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected for review & reply
  const [selectedTicket, setSelectedTicket] = useState<FeedbackSubmission | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState<FeedbackStatus>('In Progress');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchFeedback = async () => {
    setIsLoading(true);
    try {
      const data = await FeedbackService.getAdminFeedbackList({
        role: roleFilter,
        status: statusFilter,
        search: searchQuery,
      });
      setFeedbackList(data);
    } catch (err) {
      console.error('Failed to load feedback:', err);
      toast.error('Error', 'Could not fetch submitted feedback records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [roleFilter, statusFilter]);

  const handleOpenReview = (ticket: FeedbackSubmission) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.adminReply || '');
    setNewStatus(ticket.status);
  };

  const handleSaveUpdate = async () => {
    if (!selectedTicket) return;

    setIsUpdating(true);
    try {
      await FeedbackService.adminUpdateFeedback(
        selectedTicket.id,
        newStatus,
        replyText.trim() || undefined
      );

      toast.success(
        'Feedback Updated',
        `Ticket #${selectedTicket.id.slice(0, 8)} set to ${newStatus}${replyText ? ' with official admin reply.' : '.'}`
      );

      // Refresh list
      await fetchFeedback();
      setSelectedTicket(null);
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update feedback status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return feedbackList.filter(ticket => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        ticket.title.toLowerCase().includes(q) ||
        ticket.description.toLowerCase().includes(q) ||
        ticket.userName.toLowerCase().includes(q) ||
        ticket.userEmail.toLowerCase().includes(q) ||
        ticket.category.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [feedbackList, searchQuery]);

  const getStatusBadge = (status: FeedbackStatus) => {
    switch (status) {
      case 'New':
        return (
          <Badge variant="brand" size="sm">
            <Clock className="w-3 h-3 mr-1" /> New
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
      default:
        return <Badge variant="default" size="sm">{status}</Badge>;
    }
  };

  const getRoleBadge = (ticket: FeedbackSubmission) => {
    if (ticket.userRole === 'admin') {
      return <Badge variant="brand" size="sm">Admin</Badge>;
    }
    if (ticket.userRole === 'subadmin') {
      return <Badge variant="purple" size="sm">Staff / Sub-Admin</Badge>;
    }
    if (ticket.accessCategory === 'pro') {
      return (
        <Badge variant="warning" size="sm">
          <Crown className="w-3 h-3 mr-1" /> Premium Student
        </Badge>
      );
    }
    return (
      <Badge variant="default" size="sm">
        <User className="w-3 h-3 mr-1" /> Student
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              <Shield className="w-3 h-3 mr-1" /> Super Admin Only
            </Badge>
            <span className="text-xs text-slate-400">Private Issue Triage &amp; Responses</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-brand-500" />
            Feedback Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Review user feedback, technical bug reports, and suggestions across Students, Premium Students, and Staff. Respond securely with verified administrative resolution status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchFeedback}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="lg:col-span-2">
          <Input
            type="text"
            placeholder="Search by title, description, user name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Filter by Role */}
        <div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Roles (Students &amp; Staff)</option>
            <option value="student">Normal Students</option>
            <option value="pro">Premium Students</option>
            <option value="subadmin">Sub-Admins / Staff</option>
          </select>
        </div>

        {/* Filter by Status */}
        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="New">New Issues</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved • Fixed</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <Card padding="none" className="overflow-hidden border border-light-border dark:border-dark-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-dark-sidebar/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] font-bold border-b border-light-border dark:border-dark-border">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Submitter</th>
                <th className="py-3.5 px-4">Category &amp; Title</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Submitted</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                    Loading submitted feedback...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No feedback tickets match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTickets.map(ticket => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-dark-hover/40 transition-colors"
                  >
                    {/* Submitter */}
                    <td className="py-4 px-4 sm:px-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {ticket.userName}
                          </span>
                          {getRoleBadge(ticket)}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {ticket.userEmail}
                        </p>
                      </div>
                    </td>

                    {/* Category & Title */}
                    <td className="py-4 px-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-cyan-400 block mb-0.5">
                          {ticket.category}
                        </span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                          {ticket.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {ticket.description}
                        </p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getStatusBadge(ticket.status)}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenReview(ticket)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Inspect &amp; Reply
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review & Reply Modal */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={`Ticket: ${selectedTicket.title}`}
          description={`Submitted by ${selectedTicket.userName} (${selectedTicket.userEmail}) on ${new Date(selectedTicket.createdAt).toLocaleString()}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Meta Tags */}
            <div className="flex items-center gap-2 pb-3 border-b border-light-border dark:border-dark-border">
              {getRoleBadge(selectedTicket)}
              <Badge variant="purple" size="sm">{selectedTicket.category}</Badge>
              {getStatusBadge(selectedTicket.status)}
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Issue Description
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-card border border-light-border dark:border-dark-border text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {selectedTicket.description}
              </div>
            </div>

            {/* Attachment */}
            {selectedTicket.attachmentUrl && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Attachment
                </h4>
                <a
                  href={selectedTicket.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-dark-sidebar border border-slate-200 dark:border-dark-border text-xs text-brand-600 dark:text-cyan-400 hover:underline"
                >
                  <Paperclip className="w-4 h-4" />
                  <span>Open Attached Asset</span>
                </a>
              </div>
            )}

            {/* Change Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Set Issue Status *
              </label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value as FeedbackStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
              >
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved • Fixed</option>
              </select>
            </div>

            {/* Reply Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Administrative Response
              </label>
              <textarea
                rows={4}
                placeholder="Explain the resolution, troubleshooting steps, or status update to the submitter..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This response will be visible only to the submitter in their private "My Submitted Tickets" panel.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTicket(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveUpdate}
                disabled={isUpdating}
                leftIcon={<Check className="w-4 h-4" />}
              >
                {isUpdating ? 'Saving...' : 'Save Status & Reply'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
