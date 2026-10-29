import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  VideoLesson,
  StudyNote,
  TestSeriesItem,
  ContentStatus,
  PracticalAssignment,
  AssignmentRubricItem,
  DifficultyLevel,
  TestType,
  AssessmentImportQuestion,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StudyNotesService } from '../../services/studyNotesService';
import { AssessmentAdminService, QuestionDraft, JsonValidationResult } from '../../services/assessmentAdminService';
import { VideoLessonsService, extractYouTubeId } from '../../services/videoLessonsService';
import { PracticalAssignmentsService } from '../../services/practicalAssignmentsService';
import { validatePdfFile, formatBytes } from '../../services/storageService';
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
  Download,
  FileCode,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  FileUp,
  X,
  Clock,
  Award,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

type WorkspaceTab = 'notes' | 'videos' | 'tests' | 'assignments';

export const ContentWorkspacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, hasPermission, isAdmin } = useAuth();
  const toast = useToast();

  const tabFromUrl = (searchParams.get('tab') as WorkspaceTab) || 'notes';
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(tabFromUrl);

  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [tests, setTests] = useState<TestSeriesItem[]>([]);
  const [assignments, setAssignments] = useState<PracticalAssignment[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Permission checkers
  const canCreateNotes = hasPermission('notes.create');
  const canPublishNotes = hasPermission('notes.publish');
  const canDeleteNotes = hasPermission('notes.delete');

  const canCreateVideos = hasPermission('videos.create');
  const canPublishVideos = hasPermission('videos.publish');
  const canDeleteVideos = hasPermission('videos.delete');

  const canCreateTests = hasPermission('tests.create');
  const canPublishTests = hasPermission('tests.publish');
  const canEditTests = hasPermission('tests.edit');

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

  // =========================================================================
  // Assessment Creation & JSON Import State
  // =========================================================================
  const [isCreateTestOpen, setIsCreateTestOpen] = useState(false);
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<TestSeriesItem | null>(null);

  // Manual Question Authoring Stepper State
  const [testStep, setTestStep] = useState<1 | 2 | 3>(1); // 1: Meta, 2: Questions, 3: Review
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testSubject, setTestSubject] = useState('Python');
  const [testModule, setTestModule] = useState('Core Concepts');
  const [testDuration, setTestDuration] = useState(30);
  const [testDifficulty, setTestDifficulty] = useState<DifficultyLevel>('Medium');
  const [testType, setTestType] = useState<TestType>('Practice Quiz');
  const [testStatus, setTestStatus] = useState<'available' | 'upcoming' | 'completed'>('available');
  const [testPassPercentage, setTestPassPercentage] = useState(50);
  const [targetQuestionCount, setTargetQuestionCount] = useState(2);

  const [questionsDraft, setQuestionsDraft] = useState<QuestionDraft[]>([
    {
      text: '',
      options: [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' },
      ],
      correctAnswerId: 'a',
      explanation: '',
      marks: 4,
      negativeMarks: 1,
    },
  ]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);

  // JSON Import State
  const [jsonInputText, setJsonInputText] = useState('');
  const [jsonValidationResult, setJsonValidationResult] = useState<JsonValidationResult | null>(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);

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
      const [fetchedNotes, fetchedVideos, fetchedTests, fetchedAsgs] = await Promise.all([
        StudyNotesService.getNotes(undefined, false),
        VideoLessonsService.getVideoLessons(undefined, false),
        AssessmentAdminService.getAssessments(),
        PracticalAssignmentsService.getAssignments(undefined, false),
      ]);
      setNotes(fetchedNotes);
      setVideos(fetchedVideos);
      setTests(fetchedTests);
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
    setActiveTab(tab);
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
      const created = await StudyNotesService.createNote(
        currentUser,
        {
          title: newTitle.trim(),
          subject: newSubject.trim(),
          category: 'Study Guide',
          tags: [newSubject.trim(), 'Notes'],
          excerpt: newExcerpt.trim() || `Comprehensive revision guide for ${newTitle.trim()}.`,
          fullMarkdown: newMarkdown.trim() || `# ${newTitle.trim()}\n\nOfficial study notes by ${currentUser.name}.`,
          status: newInitialStatus,
        },
        selectedNoteFile || undefined
      );

      toast.success(
        'Study Note Created',
        `"${created.title}" saved successfully with status "${created.status}".`
      );
      setIsAddNoteOpen(false);
      setNewTitle('');
      setNewExcerpt('');
      setNewMarkdown('');
      setSelectedNoteFile(null);
      setFileValidationError(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Creation Failed', err.message || 'Could not save note.');
    } finally {
      setIsSubmittingNote(false);
    }
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
      toast.success('Note Deleted', `"${noteToDelete.title}" removed permanently.`);
      setNoteToDelete(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    }
  };

  // =========================================================================
  // Handlers: Video Lessons
  // =========================================================================
  const handleCreateVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateVideos) {
      toast.error('Permission Denied', 'You lack "videos.create" authorization.');
      return;
    }

    const yId = extractYouTubeId(videoUrl);
    if (!yId) {
      toast.error('Invalid URL', 'Please enter a valid YouTube video link or 11-char ID.');
      return;
    }

    setIsSubmittingVideo(true);
    try {
      const topicsArr = videoTopics.split(',').map(s => s.trim()).filter(Boolean);
      await VideoLessonsService.createVideoLesson(currentUser, {
        title: videoTitle.trim(),
        courseTitle: videoCourse.trim(),
        moduleName: videoModule.trim(),
        videoUrl: videoUrl.trim(),
        duration: videoDuration.trim() || '15:00',
        description: videoDescription.trim(),
        overview: topicsArr,
        status: videoStatus,
      });

      toast.success('Video Lesson Added', `"${videoTitle}" registered successfully.`);
      setIsAddVideoOpen(false);
      setVideoTitle('');
      setVideoUrl('');
      setVideoDescription('');
      await reloadData();
    } catch (err: any) {
      toast.error('Video Creation Failed', err.message);
    } finally {
      setIsSubmittingVideo(false);
    }
  };

  const handleDeleteVideoConfirm = async () => {
    if (!videoToDelete) return;
    try {
      await VideoLessonsService.deleteVideoLesson(currentUser, videoToDelete.id);
      toast.success('Video Lesson Deleted', `"${videoToDelete.title}" removed.`);
      setVideoToDelete(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Failed to Delete Video', err.message);
    }
  };

  // =========================================================================
  // Handlers: Test Series & Assessment Questions
  // =========================================================================
  const openNewAssessmentModal = () => {
    setTestStep(1);
    setTestTitle('');
    setTestDescription('');
    setTestSubject('Python');
    setTestModule('Core Architecture');
    setTestDuration(30);
    setTestDifficulty('Medium');
    setTestType('Practice Quiz');
    setTestStatus('available');
    setTestPassPercentage(50);
    setTargetQuestionCount(2);

    const initialQs: QuestionDraft[] = [];
    for (let i = 0; i < 2; i++) {
      initialQs.push({
        text: '',
        options: [
          { id: 'a', text: '' },
          { id: 'b', text: '' },
          { id: 'c', text: '' },
          { id: 'd', text: '' },
        ],
        correctAnswerId: 'a',
        explanation: '',
        marks: 4,
        negativeMarks: 1,
      });
    }
    setQuestionsDraft(initialQs);
    setCurrentQIndex(0);
    setIsCreateTestOpen(true);
  };

  const handleTargetCountChange = (count: number) => {
    const safeCount = Math.max(1, Math.min(50, count));
    setTargetQuestionCount(safeCount);
    setQuestionsDraft(prev => {
      const next = [...prev];
      while (next.length < safeCount) {
        next.push({
          text: '',
          options: [
            { id: 'a', text: '' },
            { id: 'b', text: '' },
            { id: 'c', text: '' },
            { id: 'd', text: '' },
          ],
          correctAnswerId: 'a',
          explanation: '',
          marks: 4,
          negativeMarks: 1,
        });
      }
      return next.slice(0, safeCount);
    });
  };

  const handleUpdateCurrentQuestion = (fields: Partial<QuestionDraft>) => {
    setQuestionsDraft(prev => {
      const next = [...prev];
      next[currentQIndex] = { ...next[currentQIndex], ...fields };
      return next;
    });
  };

  const handleUpdateOptionText = (optId: string, text: string) => {
    setQuestionsDraft(prev => {
      const next = [...prev];
      const q = next[currentQIndex];
      const newOpts = q.options.map(o => (o.id === optId ? { ...o, text } : o));
      next[currentQIndex] = { ...q, options: newOpts };
      return next;
    });
  };

  const handleSaveAssessmentSubmit = async () => {
    if (!testTitle.trim()) {
      toast.error('Title Required', 'Assessment title cannot be empty.');
      setTestStep(1);
      return;
    }

    // Validate all drafted questions
    for (let i = 0; i < questionsDraft.length; i++) {
      const q = questionsDraft[i];
      if (!q.text.trim()) {
        toast.error('Incomplete Question', `Question ${i + 1} text is empty.`);
        setCurrentQIndex(i);
        setTestStep(2);
        return;
      }
      for (const opt of q.options) {
        if (!opt.text.trim()) {
          toast.error('Incomplete Options', `Question ${i + 1}, Option ${opt.id.toUpperCase()} text is empty.`);
          setCurrentQIndex(i);
          setTestStep(2);
          return;
        }
      }
    }

    setIsSubmittingTest(true);
    try {
      const res = await AssessmentAdminService.saveAssessmentWithQuestions(
        currentUser,
        {
          title: testTitle.trim(),
          description: testDescription.trim() || `Technical assessment on ${testSubject}.`,
          subject: testSubject.trim(),
          module: testModule.trim(),
          durationMinutes: testDuration,
          difficulty: testDifficulty,
          type: testType,
          status: testStatus,
          passPercentage: testPassPercentage,
          tags: [testSubject.trim(), testModule.trim()],
        },
        questionsDraft
      );

      toast.success(
        'Assessment Created',
        `"${testTitle}" with ${res.questionCount} questions saved to Supabase.`
      );
      setIsCreateTestOpen(false);
      await reloadData();
    } catch (err: any) {
      toast.error('Failed to Save Assessment', err.message);
    } finally {
      setIsSubmittingTest(false);
    }
  };

  const handleDeleteTestConfirm = async () => {
    if (!testToDelete) return;
    try {
      await AssessmentAdminService.deleteAssessment(currentUser, testToDelete.id);
      toast.success('Assessment Deleted', `"${testToDelete.title}" removed.`);
      setTestToDelete(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Failed to Delete', err.message);
    }
  };

  // JSON Import Handlers
  const handleJsonInputChange = (text: string) => {
    setJsonInputText(text);
    if (!text.trim()) {
      setJsonValidationResult(null);
      return;
    }
    const val = AssessmentAdminService.validateJsonImport(text);
    setJsonValidationResult(val);
  };

  const handleJsonFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      if (content) {
        handleJsonInputChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadJsonTemplate = () => {
    const template = AssessmentAdminService.generateJsonTemplate();
    const blob = new Blob([template], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yogneet-assessment-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteJsonImport = async () => {
    if (!jsonValidationResult?.isValid || !jsonValidationResult.payload) {
      toast.error('Validation Error', 'Please correct all format errors before importing.');
      return;
    }

    setIsSubmittingImport(true);
    try {
      const { assessment, questions } = jsonValidationResult.payload;
      const formattedQuestions: QuestionDraft[] = questions.map((q: AssessmentImportQuestion, idx: number) => ({
        text: q.text || q.question_text || `Question ${idx + 1}`,
        codeSnippet: q.code_snippet,
        codeLanguage: q.code_language,
        options: q.options,
        correctAnswerId: q.correct_answer_id,
        explanation: q.explanation || '',
        marks: q.marks || 4,
        negativeMarks: q.negative_marks ?? 1,
      }));

      await AssessmentAdminService.saveAssessmentWithQuestions(
        currentUser,
        {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description || '',
          subject: assessment.subject,
          module: assessment.module || 'Core',
          durationMinutes: assessment.duration_minutes || 30,
          difficulty: assessment.difficulty,
          type: assessment.type,
          status: assessment.status || 'available',
          passPercentage: assessment.pass_percentage || 50,
          tags: assessment.tags || [assessment.subject],
        },
        formattedQuestions
      );

      toast.success(
        'JSON Import Succeeded',
        `Imported "${assessment.title}" with ${formattedQuestions.length} questions.`
      );
      setIsImportJsonOpen(false);
      setJsonInputText('');
      setJsonValidationResult(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Import Failed', err.message);
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // =========================================================================
  // Handlers: Practical Assessments
  // =========================================================================
  const handleCreateAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asgTitle.trim()) {
      toast.error('Title Required', 'Please enter an assignment title.');
      return;
    }
    if (!asgProblem.trim()) {
      toast.error('Problem Statement Required', 'Please describe the practical assignment problem.');
      return;
    }

    setIsSubmittingAssignment(true);
    try {
      const topicsArr = asgTopics.split(',').map(s => s.trim()).filter(Boolean);
      const delivArr = asgDeliverables.split(',').map(s => s.trim()).filter(Boolean);

      const created = await PracticalAssignmentsService.createAssignment(currentUser, {
        title: asgTitle.trim(),
        subject: asgSubject.trim(),
        module: asgModule.trim() || 'General',
        problemStatement: asgProblem.trim(),
        instructions: asgInstructions.trim(),
        topics: topicsArr,
        deliverables: delivArr,
        totalMarks: asgTotalMarks,
        deadline: asgDeadline ? new Date(asgDeadline).toISOString() : undefined,
        rubric: asgRubric,
        status: asgStatus,
      });

      toast.success('Assignment Saved', `"${created.title}" registered successfully.`);
      setIsAddAssignmentOpen(false);
      setAsgTitle('');
      setAsgProblem('');
      setAsgInstructions('');
      await reloadData();
    } catch (err: any) {
      toast.error('Assignment Creation Failed', err.message);
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleDeleteAssignmentConfirm = async () => {
    if (!assignmentToDelete) return;
    try {
      await PracticalAssignmentsService.deleteAssignment(currentUser, assignmentToDelete.id);
      toast.success('Assignment Deleted', `"${assignmentToDelete.title}" removed.`);
      setAssignmentToDelete(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Deletion Failed', err.message);
    }
  };

  // =========================================================================
  // Filtered lists
  // =========================================================================
  const filteredNotes = notes.filter(n => {
    const matchSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || n.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredVideos = videos.filter(v => {
    return (
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.moduleName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredTests = tests.filter(t => {
    const matchSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredAssignments = assignments.filter(a => {
    const matchSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              Staff Workspace
            </Badge>
            <span className="text-xs text-slate-400">Content Authoring, Assessments & Editorial Control</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-brand-500" />
            Curriculum Content Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Manage educational notes, video lessons, timed assessments, and practical assignments backed by verified Supabase storage and database security.
          </p>
        </div>

        {/* Dynamic Action Buttons depending on tab */}
        <div className="flex flex-wrap items-center gap-2.5">
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

          {activeTab === 'tests' && (
            <div className="flex items-center gap-2">
              <Button
                size="md"
                variant="outline"
                disabled={!canCreateTests}
                onClick={() => {
                  setJsonInputText('');
                  setJsonValidationResult(null);
                  setIsImportJsonOpen(true);
                }}
                leftIcon={<FileUp className="w-4 h-4 text-brand-500" />}
              >
                Import JSON
              </Button>
              <Button
                size="md"
                disabled={!canCreateTests}
                onClick={openNewAssessmentModal}
                leftIcon={<Plus className="w-4 h-4" />}
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
              >
                Create Assessment
              </Button>
            </div>
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

      {/* Tabs */}
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
          onClick={() => handleTabChange('tests')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl shrink-0 transition-colors ${
            activeTab === 'tests'
              ? 'bg-brand-500 dark:bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-hover'
          }`}
        >
          <CheckSquare className="w-4 h-4 shrink-0" />
          <span>Test Series & Quizzes ({tests.length})</span>
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
      {/* TAB 2: TEST SERIES & ASSESSMENT QUESTIONS */}
      {/* =================================================================== */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          {filteredTests.length === 0 ? (
            <Card padding="lg" className="text-center py-12 border border-light-border dark:border-dark-border">
              <CheckSquare className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Assessments Found</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Create a timed quiz or import a batch JSON question package using the actions above.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTests.map(test => {
                return (
                  <Card key={test.id} padding="md" className="border border-light-border dark:border-dark-border flex flex-col justify-between space-y-3 shadow-xs">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant={test.status === 'available' ? 'success' : test.status === 'upcoming' ? 'info' : 'default'}
                          size="sm"
                        >
                          {test.status.toUpperCase()}
                        </Badge>
                        <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
                          {test.subject}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-2 line-clamp-2">
                        {test.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {test.description}
                      </p>

                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-light-border dark:border-dark-border text-center">
                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-dark-sidebar/60 border border-light-border dark:border-dark-border">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Questions</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{test.questionCount}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-dark-sidebar/60 border border-light-border dark:border-dark-border">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Duration</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{test.durationMinutes}m</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-dark-sidebar/60 border border-light-border dark:border-dark-border">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Pass %</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{test.passPercentage}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-light-border dark:border-dark-border">
                      <Link to={`/assessment/${test.id}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" leftIcon={<ExternalLink className="w-3.5 h-3.5 text-brand-500" />}>
                          Preview
                        </Button>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setTestToDelete(test)}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete assessment"
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
      {/* TAB 3: VIDEO LESSONS */}
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
                      <button
                        onClick={() => setVideoToDelete(video)}
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete video lesson"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: PRACTICAL ASSESSMENTS */}
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
      {/* MODAL: CREATE NOTE / UPLOAD STUDY MATERIAL */}
      {/* =================================================================== */}
      <Modal
        isOpen={isAddNoteOpen}
        onClose={() => setIsAddNoteOpen(false)}
        title="Author Study Note / Attach PDF"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateNoteSubmit} className="space-y-4">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-dark-sidebar p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setNoteMode('markdown')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                noteMode === 'markdown'
                  ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Text / Markdown Note
            </button>
            <button
              type="button"
              onClick={() => setNoteMode('pdf')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                noteMode === 'pdf'
                  ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Upload PDF Revision Guide
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Note Title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Memory Management & Garbage Collection"
              required
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Python">Python</option>
                <option value="DSA">Data Structures & Algorithms</option>
                <option value="SQL">SQL & Database Architecture</option>
                <option value="System Design">System Design</option>
                <option value="DevOps">Cloud & DevOps</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Initial Publication Status
            </label>
            <select
              value={newInitialStatus}
              onChange={e => setNewInitialStatus(e.target.value as ContentStatus)}
              className="w-full text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="draft">Draft (Visible to staff only)</option>
              <option value="in_review">In Review (Editorial inspection)</option>
              <option value="published" disabled={!canPublishNotes}>
                Published {!canPublishNotes ? '(Requires notes.publish permission)' : '(Live for students)'}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Short Summary / Excerpt
            </label>
            <textarea
              value={newExcerpt}
              onChange={e => setNewExcerpt(e.target.value)}
              placeholder="Brief summary of key concepts covered..."
              rows={2}
              className="w-full text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* PDF File Upload Dropzone */}
          {noteMode === 'pdf' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                PDF File Attachment (.pdf, max 25MB)
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,application/pdf"
                onChange={handleNoteFileSelect}
                className="hidden"
              />

              {selectedNoteFile ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {selectedNoteFile.name}
                    </span>
                    <span className="text-slate-500 text-[11px]">({formatBytes(selectedNoteFile.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNoteFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 text-slate-400 hover:text-rose-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-slate-300 dark:border-dark-border rounded-2xl text-center cursor-pointer hover:border-brand-500 transition-colors bg-slate-50/50 dark:bg-dark-sidebar/30"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click to browse or drag and drop your PDF revision guide here
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Strictly verified as application/pdf</p>
                </div>
              )}

              {fileValidationError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fileValidationError}</span>
                </div>
              )}
            </div>
          )}

          {/* Markdown Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Markdown Content (In-Browser Reader)
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
      {/* MODAL: MANUAL ASSESSMENT & QUESTION AUTHORING (STEPPER) */}
      {/* =================================================================== */}
      <Modal
        isOpen={isCreateTestOpen}
        onClose={() => setIsCreateTestOpen(false)}
        title={`Author Assessment — Step ${testStep} of 3`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Step Indicators */}
          <div className="flex items-center justify-between text-xs font-bold border-b border-light-border dark:border-dark-border pb-2">
            <span className={testStep === 1 ? 'text-brand-500' : 'text-slate-400'}>1. Assessment Details</span>
            <span className={testStep === 2 ? 'text-brand-500' : 'text-slate-400'}>2. Question Authoring</span>
            <span className={testStep === 3 ? 'text-brand-500' : 'text-slate-400'}>3. Final Review & Save</span>
          </div>

          {/* STEP 1: ASSESSMENT METADATA */}
          {testStep === 1 && (
            <div className="space-y-3">
              <Input
                label="Assessment Title"
                value={testTitle}
                onChange={e => setTestTitle(e.target.value)}
                placeholder="e.g. Python Asynchronous Programming & Concurrency"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject
                  </label>
                  <select
                    value={testSubject}
                    onChange={e => setTestSubject(e.target.value)}
                    className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Python">Python</option>
                    <option value="DSA">Data Structures & Algorithms</option>
                    <option value="SQL">SQL & Database Architecture</option>
                    <option value="System Design">System Design</option>
                  </select>
                </div>

                <Input
                  label="Module / Topic"
                  value={testModule}
                  onChange={e => setTestModule(e.target.value)}
                  placeholder="e.g. AsyncIO Engine"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Questions Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={targetQuestionCount}
                    onChange={e => handleTargetCountChange(parseInt(e.target.value) || 1)}
                    className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={testDuration}
                    onChange={e => setTestDuration(parseInt(e.target.value) || 30)}
                    className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pass Percentage
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={100}
                    value={testPassPercentage}
                    onChange={e => setTestPassPercentage(parseInt(e.target.value) || 50)}
                    className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={testDifficulty}
                    onChange={e => setTestDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assessment Type
                  </label>
                  <select
                    value={testType}
                    onChange={e => setTestType(e.target.value as TestType)}
                    className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Practice Quiz">Practice Quiz</option>
                    <option value="Mock Exam">Mock Exam</option>
                    <option value="Module Test">Module Test</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  onClick={() => {
                    if (!testTitle.trim()) {
                      toast.error('Title Required', 'Please enter a title for this assessment.');
                      return;
                    }
                    setTestStep(2);
                  }}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
                >
                  Next: Enter Questions
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: QUESTION STEPPER */}
          {testStep === 2 && questionsDraft[currentQIndex] && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-light-border dark:border-dark-border">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Question {currentQIndex + 1} of {questionsDraft.length}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex(prev => prev - 1)}
                    leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentQIndex === questionsDraft.length - 1}
                    onClick={() => setCurrentQIndex(prev => prev + 1)}
                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Next
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Question Text
                </label>
                <textarea
                  value={questionsDraft[currentQIndex].text}
                  onChange={e => handleUpdateCurrentQuestion({ text: e.target.value })}
                  placeholder="e.g. Which Python function creates a generator iterator?"
                  rows={2}
                  className="w-full text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* 4 Options Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Options & Correct Answer
                </label>

                {questionsDraft[currentQIndex].options.map(opt => {
                  const isCorrect = questionsDraft[currentQIndex].correctAnswerId === opt.id;

                  return (
                    <div
                      key={opt.id}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-light-border dark:border-dark-border'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`correct_opt_${currentQIndex}`}
                        checked={isCorrect}
                        onChange={() => handleUpdateCurrentQuestion({ correctAnswerId: opt.id })}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        title="Mark as correct answer"
                      />
                      <span className="font-bold text-xs uppercase text-slate-400 w-4">
                        {opt.id}
                      </span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={e => handleUpdateOptionText(opt.id, e.target.value)}
                        placeholder={`Option ${opt.id.toUpperCase()} text...`}
                        className="flex-1 text-xs bg-transparent border-none text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Explanation (Shown to students only after submission)
                </label>
                <input
                  type="text"
                  value={questionsDraft[currentQIndex].explanation}
                  onChange={e => handleUpdateCurrentQuestion({ explanation: e.target.value })}
                  placeholder="Detailed rationale for the correct answer..."
                  className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-light-border dark:border-dark-border">
                <Button variant="ghost" onClick={() => setTestStep(1)}>
                  Back to Details
                </Button>
                <Button
                  onClick={() => setTestStep(3)}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
                >
                  Next: Final Review
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: FINAL REVIEW & SAVE */}
          {testStep === 3 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{testTitle}</h4>
                <p className="text-slate-500 dark:text-slate-400">
                  {testSubject} &bull; {testModule} &bull; {testDuration} Minutes &bull; {questionsDraft.length} Questions
                </p>
                <p className="text-[11px] text-slate-400">
                  Pass Percentage: {testPassPercentage}% | Difficulty: {testDifficulty} | Type: {testType}
                </p>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {questionsDraft.map((q, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Q{idx + 1}: {q.text || <em className="text-rose-500">Missing text</em>}
                    </span>
                    <div className="grid grid-cols-2 gap-1 mt-1.5 text-[11px] text-slate-500">
                      {q.options.map(o => (
                        <span key={o.id} className={o.id === q.correctAnswerId ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                          {o.id.toUpperCase()}) {o.text || '---'} {o.id === q.correctAnswerId ? '✓' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-light-border dark:border-dark-border">
                <Button variant="ghost" onClick={() => setTestStep(2)}>
                  Back to Questions
                </Button>
                <Button
                  onClick={handleSaveAssessmentSubmit}
                  disabled={isSubmittingTest}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmittingTest ? 'Saving to Database...' : 'Save & Publish Assessment'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL: JSON BULK IMPORT */}
      {/* =================================================================== */}
      <Modal
        isOpen={isImportJsonOpen}
        onClose={() => setIsImportJsonOpen(false)}
        title="Import Questions via JSON Template"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Standardized Schema (Version 1)</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Download the documented schema template, populate your questions, and import.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleDownloadJsonTemplate} leftIcon={<Download className="w-3.5 h-3.5" />}>
              Download Template
            </Button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select JSON File or Paste Document
            </label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleJsonFilePick}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600 cursor-pointer mb-2"
            />
            <textarea
              value={jsonInputText}
              onChange={e => handleJsonInputChange(e.target.value)}
              placeholder="Paste JSON document here..."
              rows={8}
              className="w-full text-xs font-mono rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Validation Feedback */}
          {jsonValidationResult && (
            <div className="space-y-2">
              {jsonValidationResult.isValid ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Valid JSON format detected. Ready to import <strong>{jsonValidationResult.questionCount} questions</strong> for "{jsonValidationResult.payload?.assessment.title}".
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Validation Failed ({jsonValidationResult.errors.length} errors found)</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                    {jsonValidationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border">
            <Button variant="ghost" onClick={() => setIsImportJsonOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExecuteJsonImport}
              disabled={!jsonValidationResult?.isValid || isSubmittingImport}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
            >
              {isSubmittingImport ? 'Importing...' : 'Confirm & Import to Supabase'}
            </Button>
          </div>
        </div>
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
              {isSubmittingVideo ? 'Saving...' : 'Save Video Lesson'}
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
        title="Author Practical Assessment"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateAssignmentSubmit} className="space-y-3">
          <Input
            label="Assessment Title"
            value={asgTitle}
            onChange={e => setAsgTitle(e.target.value)}
            placeholder="e.g. Distributed Task Queue & Worker Pool"
            required
          />

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Subject"
              value={asgSubject}
              onChange={e => setAsgSubject(e.target.value)}
              placeholder="Python"
              required
            />
            <Input
              label="Module"
              value={asgModule}
              onChange={e => setAsgModule(e.target.value)}
              placeholder="Networking"
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Marks
              </label>
              <input
                type="number"
                value={asgTotalMarks}
                onChange={e => setAsgTotalMarks(parseInt(e.target.value) || 100)}
                className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Problem Statement (Core Engineering Challenge)
            </label>
            <textarea
              value={asgProblem}
              onChange={e => setAsgProblem(e.target.value)}
              placeholder="Describe the architectural and algorithmic challenge..."
              rows={3}
              className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Detailed Instructions & Steps
            </label>
            <textarea
              value={asgInstructions}
              onChange={e => setAsgInstructions(e.target.value)}
              placeholder="1. Create asynchronous queue... 2. Handle SIGTERM..."
              rows={3}
              className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Topics Tested (Comma separated)"
              value={asgTopics}
              onChange={e => setAsgTopics(e.target.value)}
            />
            <Input
              label="Deliverables (Comma separated)"
              value={asgDeliverables}
              onChange={e => setAsgDeliverables(e.target.value)}
            />
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
              {isSubmittingAssignment ? 'Saving...' : 'Save Practical Assessment'}
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
          title={previewAssignment.title}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-light-border dark:border-dark-border">
              <span className="font-semibold text-slate-500">
                {previewAssignment.subject} &bull; Total Marks: {previewAssignment.totalMarks}
              </span>
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
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
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

      {testToDelete && (
        <ConfirmDialog
          isOpen={!!testToDelete}
          onClose={() => setTestToDelete(null)}
          onConfirm={handleDeleteTestConfirm}
          title="Delete Assessment?"
          message={`Are you sure you want to delete "${testToDelete.title}" and its questions?`}
          confirmText="Delete Assessment"
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
