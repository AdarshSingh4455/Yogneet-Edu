import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  VideoLesson,
  StudyNote,
  ContentStatus,
  PracticalAssignment,
  AssignmentRubricItem,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StudyNotesService } from '../../services/studyNotesService';
import { VideoLessonsService, extractYouTubeId } from '../../services/videoLessonsService';
import { PracticalAssignmentsService } from '../../services/practicalAssignmentsService';
import { validatePdfFile, formatBytes } from '../../services/storageService';
import {
  FileText,
  Video,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  Eye,
  Download,
  FileCode,
  Award,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

type WorkspaceTab = 'notes' | 'videos' | 'assignments';

export const ContentWorkspacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, hasPermission, isAdmin } = useAuth();
  const toast = useToast();

  const tabParam = searchParams.get('tab');
  // If user navigated with ?tab=tests, redirect to dedicated Test Catalog Manager
  useEffect(() => {
    if (tabParam === 'tests') {
      navigate('/admin/tests', { replace: true });
    }
  }, [tabParam, navigate]);

  const activeTab: WorkspaceTab =
    tabParam === 'videos' || tabParam === 'assignments' ? tabParam : 'notes';

  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [assignments, setAssignments] = useState<PracticalAssignment[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Permission checkers
  const canCreateNotes = hasPermission('notes.create') || isAdmin;
  const canPublishNotes = hasPermission('notes.publish') || isAdmin;
  const canDeleteNotes = hasPermission('notes.delete') || isAdmin;
  const canEditNotes = hasPermission('notes.edit') || isAdmin;

  const canCreateVideos = hasPermission('videos.create') || isAdmin;
  const canPublishVideos = hasPermission('videos.publish') || isAdmin;
  const canDeleteVideos = hasPermission('videos.delete') || isAdmin;
  const canEditVideos = hasPermission('videos.edit') || isAdmin;

  // =========================================================================
  // Note Creation State
  // =========================================================================
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteMode, setNoteMode] = useState<'markdown' | 'pdf'>('markdown');
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Python');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newMarkdown, setNewMarkdown] = useState('');
  const [newInitialStatus, setNewInitialStatus] = useState<ContentStatus>('draft');
  const [selectedNoteFile, setSelectedNoteFile] = useState<File | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [noteToDelete, setNoteToDelete] = useState<StudyNote | null>(null);
  const [noteToPublish, setNoteToPublish] = useState<StudyNote | null>(null);

  // Edit Note State
  const [noteToEdit, setNoteToEdit] = useState<StudyNote | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteSubject, setEditNoteSubject] = useState('Python');
  const [editNoteCategory, setEditNoteCategory] = useState('Study Guide');
  const [editNoteExcerpt, setEditNoteExcerpt] = useState('');
  const [editNoteMarkdown, setEditNoteMarkdown] = useState('');
  const [editNoteStatus, setEditNoteStatus] = useState<ContentStatus>('draft');
  const [isUpdatingNote, setIsUpdatingNote] = useState(false);

  // =========================================================================
  // Video Creation State
  // =========================================================================
  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoCourse, setVideoCourse] = useState('Python');
  const [videoModule, setVideoModule] = useState('Core Architecture');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState('18:45');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoTopics, setVideoTopics] = useState('Concept Explanation, Code Walkthrough');
  const [videoStatus, setVideoStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<VideoLesson | null>(null);

  // Edit Video State
  const [videoToEdit, setVideoToEdit] = useState<VideoLesson | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState('');
  const [editVideoCourse, setEditVideoCourse] = useState('Python');
  const [editVideoModule, setEditVideoModule] = useState('Core Architecture');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editVideoDuration, setEditVideoDuration] = useState('18:45');
  const [editVideoDescription, setEditVideoDescription] = useState('');
  const [editVideoStatus, setEditVideoStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [isUpdatingVideo, setIsUpdatingVideo] = useState(false);

  // =========================================================================
  // Practical Assignment State
  // =========================================================================
  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState(false);
  const [previewAssignment, setPreviewAssignment] = useState<PracticalAssignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<PracticalAssignment | null>(null);
  const [asgTitle, setAsgTitle] = useState('');
  const [asgSubject, setAsgSubject] = useState('Python');
  const [asgModule, setAsgModule] = useState('System Design');
  const [asgProblem, setAsgProblem] = useState('');
  const [asgInstructions, setAsgInstructions] = useState('');
  const [asgTopics, setAsgTopics] = useState('Event Loops, Concurrency, Socket Programming');
  const [asgDeliverables, setAsgDeliverables] = useState('Source code, Architecture diagrams, Test suite');
  const [asgTotalMarks, setAsgTotalMarks] = useState(100);
  const [asgDeadline, setAsgDeadline] = useState('');
  const [asgStatus, setAsgStatus] = useState<ContentStatus>('published');
  const [asgRubric, setAsgRubric] = useState<AssignmentRubricItem[]>([
    { criteria: 'System Architecture & Concurrency', marks: 40, description: 'Correct usage of non-blocking I/O' },
    { criteria: 'Reliability & Graceful Teardown', marks: 30, description: 'Clean handling of OS signals' },
    { criteria: 'Unit Tests & Documentation', marks: 30, description: 'High branch coverage and architecture guide' },
  ]);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  // =========================================================================
  // Data Loading
  // =========================================================================
  const reloadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedNotes, fetchedVideos, fetchedAsgs] = await Promise.all([
        StudyNotesService.getNotes(undefined, false),
        VideoLessonsService.getVideoLessons(undefined, false),
        PracticalAssignmentsService.getAssignments(undefined, false),
      ]);
      setNotes(fetchedNotes);
      setVideos(fetchedVideos);
      setAssignments(fetchedAsgs);
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleTabChange = (tab: WorkspaceTab) => {
    setSearchParams({ tab });
  };

  // =========================================================================
  // Handlers: Study Notes
  // =========================================================================
  const handleNoteFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validatePdfFile(file);
    if (!validation.isValid) {
      setFileValidationError(validation.error || 'Invalid file.');
      setSelectedNoteFile(null);
      return;
    }
    setFileValidationError(null);
    setSelectedNoteFile(file);
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '));
    }
  };

  const handleCreateNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateNotes) {
      toast.error('Permission Denied', 'You lack "notes.create" permission.');
      return;
    }

    if (newInitialStatus === 'published' && !canPublishNotes) {
      toast.error('Permission Restricted', 'You lack "notes.publish" authorization.');
      return;
    }

    if (noteMode === 'pdf' && !selectedNoteFile) {
      toast.error('File Required', 'Please attach a valid PDF document for PDF mode.');
      return;
    }

    setIsSubmittingNote(true);
    try {
      await StudyNotesService.createNote(
        currentUser,
        {
          title: newTitle.trim(),
          subject: newSubject,
          excerpt: newExcerpt.trim() || newTitle.trim(),
          fullMarkdown: newMarkdown.trim() || `# ${newTitle}\n\nComprehensive technical reference.`,
          status: newInitialStatus,
        },
        noteMode === 'pdf' ? (selectedNoteFile as File) : undefined
      );

      toast.success(
        'Study Note Created',
        noteMode === 'pdf'
          ? `Uploaded "${newTitle}" and saved to storage.`
          : `Created markdown note "${newTitle}".`
      );

      setIsAddNoteOpen(false);
      resetNoteForm();
      await reloadData();
    } catch (err: any) {
      toast.error('Failed to Create Note', err.message || 'An error occurred.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const resetNoteForm = () => {
    setNewTitle('');
    setNewSubject('Python');
    setNewExcerpt('');
    setNewMarkdown('');
    setNewInitialStatus('draft');
    setSelectedNoteFile(null);
    setFileValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublishNoteConfirm = async () => {
    if (!noteToPublish) return;
    try {
      await StudyNotesService.updateNoteStatus(currentUser, noteToPublish.id, 'published');
      toast.success('Note Published', `"${noteToPublish.title}" is now available to students.`);
      setNoteToPublish(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Publish Failed', err.message);
    }
  };

  const handleDeleteNoteConfirm = async () => {
    if (!noteToDelete) return;
    try {
      await StudyNotesService.deleteNote(currentUser, noteToDelete.id);
      toast.success('Note Deleted', `"${noteToDelete.title}" was removed.`);
      setNoteToDelete(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    }
  };

  const handleOpenEditNote = (note: StudyNote) => {
    setNoteToEdit(note);
    setEditNoteTitle(note.title);
    setEditNoteSubject(note.subject);
    setEditNoteCategory(note.category || 'Study Guide');
    setEditNoteExcerpt(note.excerpt);
    setEditNoteMarkdown(note.fullMarkdown || '');
    setEditNoteStatus(note.status);
  };

  const handleUpdateNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteToEdit) return;
    if (!canEditNotes) {
      toast.error('Permission Denied', 'You lack "notes.edit" authorization.');
      return;
    }
    setIsUpdatingNote(true);
    try {
      await StudyNotesService.updateNote(currentUser, noteToEdit.id, {
        title: editNoteTitle.trim(),
        subject: editNoteSubject.trim(),
        category: editNoteCategory.trim(),
        excerpt: editNoteExcerpt.trim(),
        fullMarkdown: editNoteMarkdown,
        status: editNoteStatus,
      });
      toast.success('Note Updated', `"${editNoteTitle}" has been updated.`);
      setNoteToEdit(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Update Failed', err.message);
    } finally {
      setIsUpdatingNote(false);
    }
  };

  // =========================================================================
  // Handlers: Video Lessons
  // =========================================================================
  const handleCreateVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateVideos) {
      toast.error('Permission Denied', 'You lack "videos.create" permission.');
      return;
    }

    const ytId = extractYouTubeId(videoUrl);
    if (!ytId) {
      toast.error('Invalid Video URL', 'Please enter a valid YouTube video URL or ID.');
      return;
    }

    setIsSubmittingVideo(true);
    try {
      await VideoLessonsService.createVideoLesson(currentUser, {
        title: videoTitle.trim(),
        courseTitle: videoCourse.trim(),
        moduleName: videoModule.trim(),
        videoUrl: ytId,
        duration: videoDuration.trim() || '15:00',
        description: videoDescription.trim(),
        overview: videoTopics.split(',').map(t => t.trim()).filter(Boolean),
        status: videoStatus,
      });

      toast.success('Video Lesson Added', `"${videoTitle}" is now part of the curriculum.`);
      setIsAddVideoOpen(false);
      resetVideoForm();
      await reloadData();
    } catch (err: any) {
      toast.error('Failed to Add Video', err.message);
    } finally {
      setIsSubmittingVideo(false);
    }
  };

  const resetVideoForm = () => {
    setVideoTitle('');
    setVideoCourse('Python');
    setVideoModule('Core Architecture');
    setVideoUrl('');
    setVideoDuration('18:45');
    setVideoDescription('');
    setVideoTopics('Concept Explanation, Code Walkthrough');
    setVideoStatus('published');
  };

  const handleDeleteVideoConfirm = async () => {
    if (!videoToDelete) return;
    try {
      await VideoLessonsService.deleteVideoLesson(currentUser, videoToDelete.id);
      toast.success('Video Removed', `"${videoToDelete.title}" deleted.`);
      setVideoToDelete(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    }
  };

  const handleOpenEditVideo = (video: VideoLesson) => {
    setVideoToEdit(video);
    setEditVideoTitle(video.title);
    setEditVideoCourse(video.courseTitle);
    setEditVideoModule(video.moduleName);
    setEditVideoUrl(`https://www.youtube.com/watch?v=${video.youtubeId}`);
    setEditVideoDuration(video.duration);
    setEditVideoDescription(video.description || '');
    setEditVideoStatus((video.status as 'draft' | 'published' | 'archived') || 'published');
  };

  const handleUpdateVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoToEdit) return;
    if (!canEditVideos) {
      toast.error('Permission Denied', 'You lack "videos.edit" authorization.');
      return;
    }
    setIsUpdatingVideo(true);
    try {
      await VideoLessonsService.updateVideoLesson(currentUser, videoToEdit.id, {
        title: editVideoTitle.trim(),
        courseTitle: editVideoCourse.trim(),
        moduleName: editVideoModule.trim(),
        videoUrl: editVideoUrl.trim(),
        duration: editVideoDuration.trim(),
        description: editVideoDescription.trim(),
        status: editVideoStatus,
      });
      toast.success('Video Updated', `"${editVideoTitle}" has been updated.`);
      setVideoToEdit(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Update Failed', err.message);
    } finally {
      setIsUpdatingVideo(false);
    }
  };

  // =========================================================================
  // Handlers: Practical Assignments
  // =========================================================================
  const handleCreateAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateNotes) {
      toast.error('Permission Denied', 'You lack content creation permission.');
      return;
    }

    setIsSubmittingAssignment(true);
    try {
      const created = await PracticalAssignmentsService.createAssignment(currentUser, {
        title: asgTitle.trim(),
        subject: asgSubject.trim(),
        module: asgModule.trim(),
        problemStatement: asgProblem.trim(),
        instructions: asgInstructions.trim(),
        topics: asgTopics.split(',').map(t => t.trim()).filter(Boolean),
        deliverables: asgDeliverables.split(',').map(t => t.trim()).filter(Boolean),
        totalMarks: asgTotalMarks,
        deadline: asgDeadline.trim() || undefined,
        status: asgStatus,
        rubric: asgRubric,
      });

      toast.success('Practical Assessment Created', `"${created.title}" published with PDF export.`);
      setIsAddAssignmentOpen(false);
      resetAssignmentForm();
      await reloadData();
    } catch (err: any) {
      toast.error('Failed to Save', err.message);
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const resetAssignmentForm = () => {
    setAsgTitle('');
    setAsgSubject('Python');
    setAsgModule('System Design');
    setAsgProblem('');
    setAsgInstructions('');
    setAsgTopics('Event Loops, Concurrency, Socket Programming');
    setAsgDeliverables('Source code, Architecture diagrams, Test suite');
    setAsgTotalMarks(100);
    setAsgDeadline('');
    setAsgStatus('published');
  };

  const handleDeleteAssignmentConfirm = async () => {
    if (!assignmentToDelete) return;
    try {
      await PracticalAssignmentsService.deleteAssignment(currentUser, assignmentToDelete.id);
      toast.success('Deleted', `"${assignmentToDelete.title}" was removed.`);
      setAssignmentToDelete(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    }
  };

  // Filtered Items
  const filteredNotes = notes.filter(n => {
    if (statusFilter !== 'all' && n.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.subject.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredVideos = videos.filter(v => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return v.title.toLowerCase().includes(q) || v.courseTitle.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredAssignments = assignments.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.subject.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-light-border dark:border-dark-border">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Content Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Author and manage curriculum assets: PDF Study Notes, Video Lessons, and Practical Projects.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick link to dedicated Test Catalog Manager */}
          <Link to="/admin/tests">
            <Button
              size="md"
              variant="outline"
              leftIcon={<Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs font-semibold"
            >
              Test Catalog Manager
            </Button>
          </Link>

          {activeTab === 'notes' && (
            <Button
              size="md"
              disabled={!canCreateNotes}
              onClick={() => setIsAddNoteOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
            >
              Upload / Create Note
            </Button>
          )}

          {activeTab === 'videos' && (
            <Button
              size="md"
              disabled={!canCreateVideos}
              onClick={() => setIsAddVideoOpen(true)}
              leftIcon={<Video className="w-4 h-4" />}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
            >
              Add Video Lesson
            </Button>
          )}

          {activeTab === 'assignments' && (
            <Button
              size="md"
              disabled={!canCreateNotes}
              onClick={() => setIsAddAssignmentOpen(true)}
              leftIcon={<Award className="w-4 h-4" />}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
            >
              New Practical Assessment
            </Button>
          )}
        </div>
      </div>

      {/* 3 Focused Curriculum Tabs */}
      <div className="flex items-center gap-2 border-b border-light-border dark:border-dark-border pb-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => handleTabChange('notes')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl shrink-0 transition-colors ${
            activeTab === 'notes'
              ? 'bg-brand-500 dark:bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-hover'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Study Notes ({notes.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('videos')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl shrink-0 transition-colors ${
            activeTab === 'videos'
              ? 'bg-brand-500 dark:bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-hover'
          }`}
        >
          <Video className="w-4 h-4 shrink-0" />
          <span>Video Lessons ({videos.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('assignments')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl shrink-0 transition-colors ${
            activeTab === 'assignments'
              ? 'bg-brand-500 dark:bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-hover'
          }`}
        >
          <FileCode className="w-4 h-4 shrink-0" />
          <span>Practical Assessments ({assignments.length})</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search items by title, subject, or module..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published / Available</option>
            <option value="draft">Drafts / In Review</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: STUDY NOTES LIST */}
      {/* =================================================================== */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <Card padding="lg" className="text-center py-12 border border-light-border dark:border-dark-border">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Study Notes Found</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Upload a PDF revision guide or author a Markdown note using the button above.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map(note => {
                const isDraft = note.status === 'draft' || note.status === 'in_review';

                return (
                  <Card key={note.id} padding="md" className="border border-light-border dark:border-dark-border flex flex-col justify-between space-y-3 shadow-xs">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant={note.status === 'published' ? 'success' : 'warning'} size="sm">
                          {note.status.toUpperCase()}
                        </Badge>
                        <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                          {note.subject}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-2 line-clamp-2">
                        {note.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {note.excerpt}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-light-border dark:border-dark-border space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>By {note.author}</span>
                        {note.fileUrl ? (
                          <span className="text-emerald-500 font-semibold flex items-center gap-1">
                            <Download className="w-3 h-3" /> PDF Attached ({note.fileSize || 'PDF'})
                          </span>
                        ) : (
                          <span>Markdown Note</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400">{note.lastUpdated}</span>
                        <div className="flex items-center gap-1.5">
                          {isDraft && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canPublishNotes}
                              onClick={() => setNoteToPublish(note)}
                              leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                            >
                              Publish
                            </Button>
                          )}
                          <button
                            onClick={() => handleOpenEditNote(note)}
                            disabled={!canEditNotes}
                            className="p-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                            title="Edit note"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setNoteToDelete(note)}
                            disabled={!canDeleteNotes}
                            className="p-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: VIDEO LESSONS */}
      {/* =================================================================== */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          {filteredVideos.length === 0 ? (
            <Card padding="lg" className="text-center py-12 border border-light-border dark:border-dark-border">
              <Video className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Video Lessons Found</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Register a new YouTube lesson using the button above.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map(video => {
                return (
                  <Card key={video.id} padding="md" className="border border-light-border dark:border-dark-border flex flex-col justify-between space-y-3 shadow-xs">
                    <div>
                      {/* Responsive YouTube Thumbnail preview */}
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 mb-2 border border-light-border dark:border-dark-border">
                        <img
                          src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[10px]">
                          {video.duration}
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
                        {video.courseTitle} &bull; {video.moduleName}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1 line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {video.description || 'Comprehensive video walkthrough.'}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-light-border dark:border-dark-border">
                      <span className="text-[11px] text-slate-400">{video.publishedAt}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditVideo(video)}
                          disabled={!canEditVideos}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                          title="Edit video lesson"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setVideoToDelete(video)}
                          disabled={!canDeleteVideos}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete video lesson"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: PRACTICAL ASSESSMENTS */}
      {/* =================================================================== */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {filteredAssignments.length === 0 ? (
            <Card padding="lg" className="text-center py-12 border border-light-border dark:border-dark-border">
              <Award className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Practical Assessments</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Author a practical coding challenge and export it as an official branded PDF.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssignments.map(asg => {
                return (
                  <Card key={asg.id} padding="md" className="border border-light-border dark:border-dark-border flex flex-col justify-between space-y-3 shadow-xs">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant={asg.status === 'published' ? 'success' : 'warning'} size="sm">
                          {asg.status.toUpperCase()}
                        </Badge>
                        <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
                          {asg.subject} &bull; {asg.totalMarks} Marks
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-2 line-clamp-2">
                        {asg.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {asg.problemStatement}
                      </p>

                      {asg.topics && asg.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {asg.topics.slice(0, 3).map((t, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-dark-sidebar text-slate-600 dark:text-slate-300">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-light-border dark:border-dark-border flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => PracticalAssignmentsService.downloadPdf(asg)}
                        leftIcon={<Download className="w-3.5 h-3.5 text-brand-500" />}
                      >
                        Branded PDF
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewAssignment(asg)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          View
                        </Button>
                        <button
                          onClick={() => setAssignmentToDelete(asg)}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD / UPLOAD STUDY NOTE */}
      {/* =================================================================== */}
      <Modal
        isOpen={isAddNoteOpen}
        onClose={() => setIsAddNoteOpen(false)}
        title="Create or Upload Study Note"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateNoteSubmit} className="space-y-4">
          {/* Note Format Mode Switcher */}
          <div className="flex items-center rounded-xl p-1 bg-slate-100 dark:bg-dark-sidebar border border-light-border dark:border-dark-border">
            <button
              type="button"
              onClick={() => setNoteMode('markdown')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                noteMode === 'markdown'
                  ? 'bg-white dark:bg-dark-card text-brand-500 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Markdown Text Note
            </button>
            <button
              type="button"
              onClick={() => setNoteMode('pdf')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                noteMode === 'pdf'
                  ? 'bg-white dark:bg-dark-card text-brand-500 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              PDF Document Upload
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Note Title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Asynchronous Architecture & Event Loops"
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject Track
              </label>
              <select
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
              >
                <option value="Python">Python</option>
                <option value="DSA">Data Structures & Algorithms</option>
                <option value="SQL">SQL & Database Architecture</option>
                <option value="System Design">System Design</option>
                <option value="DevOps">DevOps & Cloud</option>
              </select>
            </div>
          </div>

          <Input
            label="Short Excerpt / Summary"
            value={newExcerpt}
            onChange={e => setNewExcerpt(e.target.value)}
            placeholder="Brief overview of key concepts covered..."
          />

          {noteMode === 'pdf' && (
            <div className="p-3.5 rounded-2xl border-2 border-dashed border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-sidebar/40 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Attach Official PDF Document (Max 25MB)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleNoteFileSelect}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600 cursor-pointer"
              />
              {selectedNoteFile && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Selected: {selectedNoteFile.name} ({formatBytes(selectedNoteFile.size)})
                  </span>
                </div>
              )}
              {fileValidationError && (
                <p className="text-xs text-rose-500 font-medium">{fileValidationError}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {noteMode === 'pdf' ? 'Accompanying Notes / Table of Contents (Markdown)' : 'Note Content (Markdown)'}
            </label>
            <textarea
              value={newMarkdown}
              onChange={e => setNewMarkdown(e.target.value)}
              placeholder="# Heading 1&#10;&#10;Explain algorithms, code samples, and architecture patterns..."
              rows={noteMode === 'pdf' ? 4 : 8}
              className="w-full text-xs font-mono rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border">
            <Button type="button" variant="ghost" onClick={() => setIsAddNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingNote}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
            >
              {isSubmittingNote ? 'Uploading & Persisting...' : 'Save Study Note'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL: ADD VIDEO LESSON */}
      {/* =================================================================== */}
      <Modal
        isOpen={isAddVideoOpen}
        onClose={() => setIsAddVideoOpen(false)}
        title="Add Video Lesson"
        maxWidth="md"
      >
        <form onSubmit={handleCreateVideoSubmit} className="space-y-3">
          <Input
            label="Lesson Title"
            value={videoTitle}
            onChange={e => setVideoTitle(e.target.value)}
            placeholder="e.g. Asynchronous I/O, Queues & Event Loop"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Course / Subject"
              value={videoCourse}
              onChange={e => setVideoCourse(e.target.value)}
              placeholder="e.g. Python Architecture"
              required
            />
            <Input
              label="Module Name"
              value={videoModule}
              onChange={e => setVideoModule(e.target.value)}
              placeholder="e.g. Concurrency"
            />
          </div>

          <Input
            label="YouTube Video Link or ID"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="e.g. https://youtu.be/dQw4w9WgXcQ or https://www.youtube.com/watch?v=..."
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (mm:ss)"
              value={videoDuration}
              onChange={e => setVideoDuration(e.target.value)}
              placeholder="18:30"
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={videoStatus}
                onChange={e => setVideoStatus(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Topics Covered (Comma separated)
            </label>
            <input
              type="text"
              value={videoTopics}
              onChange={e => setVideoTopics(e.target.value)}
              placeholder="GIL, asyncio, threading"
              className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes
            </label>
            <textarea
              value={videoDescription}
              onChange={e => setVideoDescription(e.target.value)}
              placeholder="Video learning objectives, prerequisite knowledge..."
              rows={3}
              className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border">
            <Button type="button" variant="ghost" onClick={() => setIsAddVideoOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingVideo}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
            >
              {isSubmittingVideo ? 'Adding...' : 'Save Video Lesson'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL: ADD PRACTICAL ASSIGNMENT */}
      {/* =================================================================== */}
      <Modal
        isOpen={isAddAssignmentOpen}
        onClose={() => setIsAddAssignmentOpen(false)}
        title="Author Practical Coding Assessment"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateAssignmentSubmit} className="space-y-4">
          <Input
            label="Assignment Title"
            value={asgTitle}
            onChange={e => setAsgTitle(e.target.value)}
            placeholder="e.g. Asynchronous Microservice with Rate Limiting"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subject / Technology"
              value={asgSubject}
              onChange={e => setAsgSubject(e.target.value)}
              placeholder="Python"
              required
            />
            <Input
              label="Module"
              value={asgModule}
              onChange={e => setAsgModule(e.target.value)}
              placeholder="System Architecture"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Problem Statement
            </label>
            <textarea
              value={asgProblem}
              onChange={e => setAsgProblem(e.target.value)}
              placeholder="Describe the architectural challenge, constraints, and business domain..."
              rows={3}
              className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Step-by-Step Instructions & Requirements
            </label>
            <textarea
              value={asgInstructions}
              onChange={e => setAsgInstructions(e.target.value)}
              placeholder="1. Implement the token bucket algorithm&#10;2. Add Redis synchronization&#10;3. Include load tests"
              rows={4}
              className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Total Marks"
              type="number"
              value={asgTotalMarks}
              onChange={e => setAsgTotalMarks(parseInt(e.target.value) || 100)}
            />
            <Input
              label="Submission Deadline (Optional)"
              type="date"
              value={asgDeadline}
              onChange={e => setAsgDeadline(e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={asgStatus}
                onChange={e => setAsgStatus(e.target.value as ContentStatus)}
                className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Rubric Definition */}
          <div className="space-y-2 pt-2 border-t border-light-border dark:border-dark-border">
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
              Evaluation Rubric Criteria
            </label>
            {asgRubric.map((r, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={r.criteria}
                  onChange={e => {
                    const next = [...asgRubric];
                    next[idx].criteria = e.target.value;
                    setAsgRubric(next);
                  }}
                  placeholder="Criteria"
                  className="flex-1 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2"
                />
                <input
                  type="number"
                  value={r.marks}
                  onChange={e => {
                    const next = [...asgRubric];
                    next[idx].marks = parseInt(e.target.value) || 0;
                    setAsgRubric(next);
                  }}
                  className="w-20 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-center"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border">
            <Button type="button" variant="ghost" onClick={() => setIsAddAssignmentOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingAssignment}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
            >
              {isSubmittingAssignment ? 'Saving...' : 'Save & Export PDF'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL: PREVIEW PRACTICAL ASSIGNMENT */}
      {/* =================================================================== */}
      {previewAssignment && (
        <Modal
          isOpen={!!previewAssignment}
          onClose={() => setPreviewAssignment(null)}
          title={`Practical Assignment: ${previewAssignment.title}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {previewAssignment.subject} &bull; {previewAssignment.module}
                </span>
                <p className="text-slate-500">Total Marks: {previewAssignment.totalMarks}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => PracticalAssignmentsService.downloadPdf(previewAssignment)}
                leftIcon={<Download className="w-3.5 h-3.5 text-brand-500" />}
              >
                Download PDF
              </Button>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">1. Problem Statement</h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {previewAssignment.problemStatement}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">2. Instructions</h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {previewAssignment.instructions}
              </p>
            </div>

            {previewAssignment.rubric && previewAssignment.rubric.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">3. Evaluation Rubric</h4>
                <div className="space-y-1.5">
                  {previewAssignment.rubric.map((r, i) => (
                    <div key={i} className="flex justify-between p-2 rounded bg-slate-50 dark:bg-dark-sidebar">
                      <span>{r.criteria}</span>
                      <span className="font-bold text-brand-600 dark:text-brand-400">{r.marks} Marks</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT STUDY NOTE */}
      {/* =================================================================== */}
      {noteToEdit && (
        <Modal
          isOpen={!!noteToEdit}
          onClose={() => setNoteToEdit(null)}
          title={`Edit Study Note: ${noteToEdit.title}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleUpdateNoteSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={editNoteTitle}
                  onChange={e => setEditNoteTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Track
                </label>
                <input
                  type="text"
                  required
                  value={editNoteSubject}
                  onChange={e => setEditNoteSubject(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={editNoteCategory}
                  onChange={e => setEditNoteCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Publication Status
                </label>
                <select
                  value={editNoteStatus}
                  onChange={e => setEditNoteStatus(e.target.value as ContentStatus)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="draft">Draft (Private)</option>
                  <option value="published">Published (Visible to Students)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Short Excerpt
              </label>
              <textarea
                rows={2}
                value={editNoteExcerpt}
                onChange={e => setEditNoteExcerpt(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Markdown Content
              </label>
              <textarea
                rows={6}
                value={editNoteMarkdown}
                onChange={e => setEditNoteMarkdown(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNoteToEdit(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isUpdatingNote}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT VIDEO LESSON */}
      {/* =================================================================== */}
      {videoToEdit && (
        <Modal
          isOpen={!!videoToEdit}
          onClose={() => setVideoToEdit(null)}
          title={`Edit Video Lesson: ${videoToEdit.title}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleUpdateVideoSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Lesson Title
                </label>
                <input
                  type="text"
                  required
                  value={editVideoTitle}
                  onChange={e => setEditVideoTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Course / Subject
                </label>
                <input
                  type="text"
                  required
                  value={editVideoCourse}
                  onChange={e => setEditVideoCourse(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Module Name
                </label>
                <input
                  type="text"
                  value={editVideoModule}
                  onChange={e => setEditVideoModule(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Duration (mm:ss)
                </label>
                <input
                  type="text"
                  value={editVideoDuration}
                  onChange={e => setEditVideoDuration(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={editVideoStatus}
                  onChange={e => setEditVideoStatus(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                YouTube URL or 11-char Video ID
              </label>
              <input
                type="text"
                required
                value={editVideoUrl}
                onChange={e => setEditVideoUrl(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={editVideoDescription}
                onChange={e => setEditVideoDescription(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setVideoToEdit(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isUpdatingVideo}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* =================================================================== */}
      {/* CONFIRMATION DIALOGS */}
      {/* =================================================================== */}
      {noteToPublish && (
        <ConfirmDialog
          isOpen={!!noteToPublish}
          onClose={() => setNoteToPublish(null)}
          onConfirm={handlePublishNoteConfirm}
          title="Publish Study Note to Students?"
          message={`Are you sure you want to make "${noteToPublish.title}" visible and downloadable to all enrolled students?`}
          confirmText="Publish Note"
          variant="primary"
        />
      )}

      {noteToDelete && (
        <ConfirmDialog
          isOpen={!!noteToDelete}
          onClose={() => setNoteToDelete(null)}
          onConfirm={handleDeleteNoteConfirm}
          title="Permanently Delete Note?"
          message={`Are you sure you want to delete "${noteToDelete.title}"? Any attached PDF in storage will also be removed.`}
          confirmText="Delete Note"
          variant="danger"
        />
      )}

      {videoToDelete && (
        <ConfirmDialog
          isOpen={!!videoToDelete}
          onClose={() => setVideoToDelete(null)}
          onConfirm={handleDeleteVideoConfirm}
          title="Delete Video Lesson?"
          message={`Delete "${videoToDelete.title}" from the curriculum index?`}
          confirmText="Delete Video"
          variant="danger"
        />
      )}

      {assignmentToDelete && (
        <ConfirmDialog
          isOpen={!!assignmentToDelete}
          onClose={() => setAssignmentToDelete(null)}
          onConfirm={handleDeleteAssignmentConfirm}
          title="Delete Practical Assessment?"
          message={`Are you sure you want to delete "${assignmentToDelete.title}"?`}
          confirmText="Delete Assignment"
          variant="danger"
        />
      )}
    </div>
  );
};
