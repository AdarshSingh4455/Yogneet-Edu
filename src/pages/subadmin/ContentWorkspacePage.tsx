import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { VideoLesson, StudyNote, TestSeriesItem, ContentStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  Video,
  CheckSquare,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Eye,
  Send,
  Upload,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const ContentWorkspacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, hasPermission, isAdmin } = useAuth();
  const toast = useToast();

  const tabFromUrl = (searchParams.get('tab') as 'notes' | 'videos' | 'tests') || 'notes';
  const [activeTab, setActiveTab] = useState<'notes' | 'videos' | 'tests'>(tabFromUrl);

  const [notes, setNotes] = useState<StudyNote[]>(() => ApiService.getNotes());
  const [videos, setVideos] = useState<VideoLesson[]>(() => ApiService.getVideos());
  const [tests, setTests] = useState<TestSeriesItem[]>(() => ApiService.getTests());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<StudyNote | null>(null);
  const [noteToPublish, setNoteToPublish] = useState<StudyNote | null>(null);

  // New Note Form
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Python');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newMarkdown, setNewMarkdown] = useState('');
  const [newInitialStatus, setNewInitialStatus] = useState<ContentStatus>('draft');

  // Permission checkers
  const canCreateNotes = hasPermission('notes.create');
  const canPublishNotes = hasPermission('notes.publish');
  const canDeleteNotes = hasPermission('notes.delete');

  const canCreateVideos = hasPermission('videos.create');
  const canPublishVideos = hasPermission('videos.publish');

  const handleTabChange = (tab: 'notes' | 'videos' | 'tests') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const reloadData = () => {
    setNotes(ApiService.getNotes());
    setVideos(ApiService.getVideos());
    setTests(ApiService.getTests());
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateNotes) {
      toast.error('Permission Denied', 'You lack "notes.create" permission.');
      return;
    }

    if (newInitialStatus === 'published' && !canPublishNotes) {
      toast.error(
        'Permission Restricted',
        'You lack "notes.publish" authorization. Please save as Draft or In Review.'
      );
      return;
    }

    try {
      const created = ApiService.addNote(currentUser, {
        title: newTitle.trim(),
        subject: newSubject,
        category: 'Computer Science',
        tags: [newSubject, 'Tutorial'],
        excerpt: newExcerpt.trim(),
        fullMarkdown: newMarkdown.trim() || `# ${newTitle}\n\nAuthored by ${currentUser.name}`,
        status: newInitialStatus,
      });

      toast.success(
        'Note Created',
        `Study note "${created.title}" saved with status "${created.status}".`
      );
      setIsAddNoteOpen(false);
      setNewTitle('');
      setNewExcerpt('');
      setNewMarkdown('');
      reloadData();
    } catch (err: any) {
      toast.error('Failed to create note', err.message);
    }
  };

  const handlePublishNoteConfirm = () => {
    if (!noteToPublish) return;
    if (!canPublishNotes) {
      toast.error('Authorization Required', 'You lack the "notes.publish" permission.');
      setNoteToPublish(null);
      return;
    }

    try {
      ApiService.updateNoteStatus(currentUser, noteToPublish.id, 'published');
      toast.success('Note Published', `"${noteToPublish.title}" is now publicly visible to students.`);
      setNoteToPublish(null);
      reloadData();
    } catch (err: any) {
      toast.error('Publish Failed', err.message);
    }
  };

  const handleDeleteNoteConfirm = () => {
    if (!noteToDelete) return;
    if (!canDeleteNotes) {
      toast.error('Permission Denied', 'You lack "notes.delete" authorization.');
      setNoteToDelete(null);
      return;
    }

    try {
      ApiService.deleteNote(currentUser, noteToDelete.id);
      toast.success('Note Deleted', `"${noteToDelete.title}" has been removed.`);
      setNoteToDelete(null);
      reloadData();
    } catch (err: any) {
      toast.error('Deletion Failed', err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              Staff Workspace
            </Badge>
            <span className="text-xs text-slate-400">Content Authoring & Editorial Review</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-brand-500" />
            Curriculum Content Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Manage educational notes, video lectures, and assessments. Actions are protected by fine-grained permissions: publication requires verified rights.
          </p>
        </div>

        {/* Action Button depending on active tab */}
        {activeTab === 'notes' && (
          <Button
            size="md"
            disabled={!canCreateNotes}
            onClick={() => setIsAddNoteOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            title={canCreateNotes ? 'Create new note' : 'Requires notes.create permission'}
            className="self-start sm:self-auto"
          >
            Create Note
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-light-border dark:border-dark-border pb-1">
        <button
          onClick={() => handleTabChange('notes')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors ${
            activeTab === 'notes'
              ? 'bg-brand-500 dark:bg-blue-600 text-white shadow-sm dark:shadow-blue-glow dark:border dark:border-blue-400/50'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Study Notes ({notes.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('videos')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors ${
            activeTab === 'videos'
              ? 'bg-brand-500 dark:bg-blue-600 text-white shadow-sm dark:shadow-blue-glow dark:border dark:border-blue-400/50'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Video Lessons ({videos.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('tests')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors ${
            activeTab === 'tests'
              ? 'bg-brand-500 dark:bg-blue-600 text-white shadow-sm dark:shadow-blue-glow dark:border dark:border-blue-400/50'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Assessments ({tests.length})</span>
        </button>
      </div>

      {/* Tab 1: Notes Management Table */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <Card padding="none" className="overflow-hidden border border-light-border dark:border-dark-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Title & Subject</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Downloads</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border dark:divide-dark-border">
                  {notes.map(note => {
                    const isDraft = note.status === 'draft' || note.status === 'in_review';

                    return (
                      <tr key={note.id} className="hover:bg-slate-50/80 dark:hover:bg-dark-hover/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">
                            {note.title}
                          </span>
                          <span className="text-[11px] text-brand-500 font-semibold">{note.subject}</span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          {note.author}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge
                            variant={note.status === 'published' ? 'success' : 'warning'}
                            size="sm"
                          >
                            {note.status.toUpperCase()}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                          {note.downloads}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {note.lastUpdated}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Publish action with permission check */}
                            {isDraft && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!canPublishNotes}
                                onClick={() => setNoteToPublish(note)}
                                title={canPublishNotes ? 'Publish note' : 'Requires notes.publish permission'}
                                leftIcon={canPublishNotes ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
                              >
                                Publish
                              </Button>
                            )}

                            {/* Delete action with permission check */}
                            <button
                              onClick={() => setNoteToDelete(note)}
                              disabled={!canDeleteNotes}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                canDeleteNotes
                                  ? 'border-slate-300 dark:border-dark-border text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                  : 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                              }`}
                              title={canDeleteNotes ? 'Delete note' : 'Requires notes.delete permission'}
                              aria-label="Delete note"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Videos Management Table */}
      {activeTab === 'videos' && (
        <Card padding="none" className="overflow-hidden border border-light-border dark:border-dark-border">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Lesson Title & Course</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">YouTube ID</th>
                <th className="py-3 px-4">Views</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {videos.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-dark-hover/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      {v.title}
                    </span>
                    <span className="text-[11px] text-slate-400">{v.courseTitle}</span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-xs">{v.duration}</td>

                  <td className="py-3.5 px-4 font-mono text-xs text-brand-500">
                    {v.youtubeId}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                    {v.views.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Badge variant="success" size="sm">
                      PUBLISHED
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Tab 3: Tests Catalog Management */}
      {activeTab === 'tests' && (
        <Card padding="none" className="overflow-hidden border border-light-border dark:border-dark-border">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Assessment Title</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Questions</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {tests.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-dark-hover/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                    {t.title}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{t.subject}</td>
                  <td className="py-3.5 px-4 font-mono text-xs">{t.questionCount} Qs</td>
                  <td className="py-3.5 px-4 font-mono text-xs">{t.durationMinutes} mins</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{t.attemptCount}</td>
                  <td className="py-3.5 px-4 text-right">
                    <Badge variant="success" size="sm">
                      ACTIVE
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create Note Modal */}
      <Modal
        isOpen={isAddNoteOpen}
        onClose={() => setIsAddNoteOpen(false)}
        title="Author Study Note & Reference Document"
        description="Create educational notes, configure file metadata, and publish."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateNote} className="space-y-4">
          <Input
            label="Note Title"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="e.g. Dynamic Programming: 2D Grid Patterns"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Subject
              </label>
              <select
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Python">Python</option>
                <option value="Data Structures">Data Structures</option>
                <option value="SQL">SQL</option>
                <option value="Algorithms">Algorithms</option>
                <option value="Cloud Computing">Cloud Computing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Initial Status
              </label>
              <select
                value={newInitialStatus}
                onChange={e => setNewInitialStatus(e.target.value as ContentStatus)}
                className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="draft">Draft (Private to author)</option>
                <option value="in_review">In Review (Awaiting team check)</option>
                <option value="published">
                  {canPublishNotes ? 'Published (Live immediately)' : 'Published (Requires notes.publish)'}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Short Description / Excerpt
            </label>
            <textarea
              rows={2}
              value={newExcerpt}
              onChange={e => setNewExcerpt(e.target.value)}
              placeholder="Brief summary of what this document covers..."
              className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Markdown Content Body
            </label>
            <textarea
              rows={6}
              value={newMarkdown}
              onChange={e => setNewMarkdown(e.target.value)}
              placeholder="# Markdown heading\n\nExplain key concepts, algorithms, and code blocks..."
              className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddNoteOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit">
              Save Note
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation to Publish Note */}
      {noteToPublish && (
        <ConfirmDialog
          isOpen={!!noteToPublish}
          onClose={() => setNoteToPublish(null)}
          onConfirm={handlePublishNoteConfirm}
          title={`Publish "${noteToPublish.title}"?`}
          message="Publishing will release this study note to all students immediately in the Study Notes directory and enable PDF downloads."
          confirmText="Publish to Live"
          variant="primary"
        />
      )}

      {/* Confirmation to Delete Note */}
      {noteToDelete && (
        <ConfirmDialog
          isOpen={!!noteToDelete}
          onClose={() => setNoteToDelete(null)}
          onConfirm={handleDeleteNoteConfirm}
          title={`Delete "${noteToDelete.title}"?`}
          message="Are you sure you want to permanently delete this study note? This operation cannot be undone."
          confirmText="Delete Note"
          variant="danger"
        />
      )}
    </div>
  );
};
