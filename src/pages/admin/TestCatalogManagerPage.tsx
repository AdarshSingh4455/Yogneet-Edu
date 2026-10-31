import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TestSeriesItem,
  DifficultyLevel,
  TestType,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  AssessmentAdminService,
  QuestionDraft,
  JsonValidationResult,
  CreateAssessmentInput,
} from '../../services/assessmentAdminService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Eye,
  Download,
  FileCode,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  FileUp,
  X,
  Clock,
  Award,
  AlertCircle,
  HelpCircle,
  Code2,
  Layers,
  BarChart2,
} from 'lucide-react';

export const TestCatalogManagerPage: React.FC = () => {
  const { currentUser, hasPermission, isAdmin } = useAuth();
  const toast = useToast();

  const [tests, setTests] = useState<TestSeriesItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const canCreateTests = hasPermission('tests.create') || isAdmin;
  const canPublishTests = hasPermission('tests.publish') || isAdmin;
  const canEditTests = hasPermission('tests.edit') || isAdmin;

  // =========================================================================
  // Assessment Creation Stepper State
  // =========================================================================
  const [isCreateTestOpen, setIsCreateTestOpen] = useState(false);
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
      codeSnippet: '',
      codeLanguage: 'python',
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

  // =========================================================================
  // JSON Import State
  // =========================================================================
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
  const [jsonInputText, setJsonInputText] = useState('');
  const [jsonValidationResult, setJsonValidationResult] = useState<JsonValidationResult | null>(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Deletion & View State
  const [testToDelete, setTestToDelete] = useState<TestSeriesItem | null>(null);
  const [viewingTestId, setViewingTestId] = useState<string | null>(null);
  const [viewingTestDetails, setViewingTestDetails] = useState<{
    assessment: TestSeriesItem;
    questions: any[];
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // =========================================================================
  // Data Loading
  // =========================================================================
  const loadAssessments = async () => {
    setIsLoading(true);
    try {
      const data = await AssessmentAdminService.getAssessments();
      setTests(data);
    } catch (err) {
      console.error('Failed to load test catalog:', err);
      toast.error('Loading Error', 'Could not load assessments from repository.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  // Filtered Tests
  const filteredTests = tests.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (difficultyFilter !== 'all' && t.difficulty !== difficultyFilter) return false;
    if (subjectFilter !== 'all' && t.subject !== subjectFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchSubject = t.subject.toLowerCase().includes(q);
      const matchModule = t.module.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchSubject && !matchModule && !matchDesc) return false;
    }
    return true;
  });

  // Extract distinct subjects for filter
  const allSubjects = Array.from(new Set(tests.map((t) => t.subject))).filter(Boolean);

  // Metrics
  const totalCount = tests.length;
  const availableCount = tests.filter((t) => t.status === 'available').length;
  const upcomingCount = tests.filter((t) => t.status === 'upcoming').length;
  const avgPassPct =
    totalCount > 0
      ? Math.round(tests.reduce((acc, t) => acc + (t.passPercentage || 0), 0) / totalCount)
      : 50;

  // =========================================================================
  // Question Stepper Management
  // =========================================================================
  const handleAddQuestion = () => {
    setQuestionsDraft((prev) => [
      ...prev,
      {
        text: '',
        codeSnippet: '',
        codeLanguage: 'python',
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
    setCurrentQIndex(questionsDraft.length);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questionsDraft.length <= 1) return;
    setQuestionsDraft((prev) => prev.filter((_, i) => i !== idx));
    if (currentQIndex >= questionsDraft.length - 1) {
      setCurrentQIndex(Math.max(0, questionsDraft.length - 2));
    }
  };

  const updateCurrentQuestion = (patch: Partial<QuestionDraft>) => {
    setQuestionsDraft((prev) => {
      const next = [...prev];
      next[currentQIndex] = { ...next[currentQIndex], ...patch };
      return next;
    });
  };

  const updateOptionText = (optId: string, text: string) => {
    setQuestionsDraft((prev) => {
      const next = [...prev];
      const cur = next[currentQIndex];
      const nextOpts = cur.options.map((o) => (o.id === optId ? { ...o, text } : o));
      next[currentQIndex] = { ...cur, options: nextOpts };
      return next;
    });
  };

  const handleCreateTestSubmit = async () => {
    if (!canCreateTests) {
      toast.error('Permission Denied', 'You lack tests.create permission.');
      return;
    }

    setIsSubmittingTest(true);
    try {
      const payload: CreateAssessmentInput = {
        title: testTitle.trim(),
        description: testDescription.trim() || `Comprehensive assessment on ${testModule}`,
        subject: testSubject,
        module: testModule,
        durationMinutes: Number(testDuration),
        difficulty: testDifficulty,
        type: testType,
        status: testStatus,
        passPercentage: Number(testPassPercentage),
      };

      await AssessmentAdminService.saveAssessmentWithQuestions(
        currentUser,
        payload,
        questionsDraft
      );

      toast.success(
        'Assessment Created Successfully',
        `Published "${testTitle}" with ${questionsDraft.length} questions.`
      );

      setIsCreateTestOpen(false);
      resetCreateForm();
      loadAssessments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create assessment.';
      toast.error('Assessment Creation Error', msg);
    } finally {
      setIsSubmittingTest(false);
    }
  };

  const resetCreateForm = () => {
    setTestStep(1);
    setTestTitle('');
    setTestDescription('');
    setTestSubject('Python');
    setTestModule('Core Concepts');
    setTestDuration(30);
    setTestDifficulty('Medium');
    setTestType('Practice Quiz');
    setTestStatus('available');
    setTestPassPercentage(50);
    setTargetQuestionCount(2);
    setQuestionsDraft([
      {
        text: '',
        codeSnippet: '',
        codeLanguage: 'python',
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
    setCurrentQIndex(0);
  };

  // =========================================================================
  // JSON Import Management
  // =========================================================================
  const handleValidateJson = () => {
    const result = AssessmentAdminService.validateAssessmentJson(jsonInputText);
    setJsonValidationResult(result);
    if (result.isValid) {
      toast.success(
        'Schema Validation Succeeded',
        `Valid v1 assessment payload detected with ${result.questionCount} questions.`
      );
    } else {
      toast.error(
        'Validation Errors Found',
        `Found ${result.errors.length} issue(s) in JSON schema.`
      );
    }
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInputText(content);
      const result = AssessmentAdminService.validateAssessmentJson(content);
      setJsonValidationResult(result);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const template = AssessmentAdminService.getSampleJsonTemplate();
    const blob = new Blob([template], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yogneet-assessment-template.v1.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.info('Template Downloaded', 'Assessment JSON v1 template saved to your downloads.');
  };

  const handleImportJsonSubmit = async () => {
    if (!canCreateTests) {
      toast.error('Permission Denied', 'You lack tests.create permission.');
      return;
    }

    setIsSubmittingImport(true);
    try {
      const res = await AssessmentAdminService.importAssessmentFromJson(
        currentUser,
        jsonInputText
      );
      toast.success(
        'Assessment Imported',
        `Imported "${res.title}" with ${res.questionCount} questions successfully.`
      );
      setIsImportJsonOpen(false);
      setJsonInputText('');
      setJsonValidationResult(null);
      loadAssessments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed.';
      toast.error('Import Error', msg);
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // =========================================================================
  // Assessment Deletion & Status Updates
  // =========================================================================
  const handleDeleteTest = async () => {
    if (!testToDelete) return;
    try {
      await AssessmentAdminService.deleteAssessment(currentUser, testToDelete.id);
      toast.success('Assessment Deleted', `Removed "${testToDelete.title}".`);
      setTestToDelete(null);
      loadAssessments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed.';
      toast.error('Delete Failed', msg);
    }
  };

  const handleToggleStatus = async (test: TestSeriesItem) => {
    if (!canPublishTests) {
      toast.error('Permission Denied', 'You lack tests.publish permission.');
      return;
    }

    const nextStatus: 'available' | 'upcoming' | 'completed' =
      test.status === 'available'
        ? 'upcoming'
        : test.status === 'upcoming'
        ? 'completed'
        : 'available';

    try {
      await AssessmentAdminService.updateAssessmentStatus(currentUser, test.id, nextStatus);
      toast.success('Status Updated', `Changed "${test.title}" status to ${nextStatus}.`);
      loadAssessments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status.';
      toast.error('Update Error', msg);
    }
  };

  const handleOpenDetails = async (testId: string) => {
    setViewingTestId(testId);
    setIsLoadingDetails(true);
    try {
      const details = await AssessmentAdminService.getAssessmentWithQuestions(testId);
      setViewingTestDetails(details);
    } catch (err) {
      console.error('Failed to load assessment details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-light-border dark:border-dark-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Test Catalog Manager
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authoritative platform home for competitive test series, practice quizzes, and mock exams.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2.5">
          {canCreateTests && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsImportJsonOpen(true);
                  setJsonValidationResult(null);
                }}
                leftIcon={<FileUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
              >
                Import JSON
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  resetCreateForm();
                  setIsCreateTestOpen(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
                className="!bg-purple-600 hover:!bg-purple-700 text-white shadow-md shadow-purple-600/20"
              >
                Create Assessment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-white dark:bg-dark-card border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Assessments</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{totalCount}</p>
          <span className="text-[11px] text-slate-400">In platform catalog</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-dark-card border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active & Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{availableCount}</p>
          <span className="text-[11px] text-slate-400">Open for student testing</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-dark-card border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Upcoming / Scheduled</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{upcomingCount}</p>
          <span className="text-[11px] text-slate-400">Drafted or scheduled</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-dark-card border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Average Pass Mark</span>
            <BarChart2 className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl font-black text-brand-600 dark:text-cyan-400 mt-2">{avgPassPct}%</p>
          <span className="text-[11px] text-slate-400">Passing criteria</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white dark:bg-dark-card border-light-border dark:border-dark-border space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tests by title, module, subject or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Subject Filter */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Subjects</option>
              {allSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            {/* Status Pills */}
            <div className="flex items-center rounded-xl p-0.5 bg-slate-100 dark:bg-dark-bg border border-light-border dark:border-dark-border">
              {['all', 'available', 'upcoming', 'completed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-semibold capitalize rounded-lg transition-colors ${
                    statusFilter === st
                      ? 'bg-white dark:bg-dark-card text-purple-600 dark:text-purple-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Tests Catalog Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading assessments catalog...</div>
      ) : filteredTests.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-dark-border space-y-3">
          <CheckSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No assessments match your current filters.
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try resetting your search query or create a new assessment using the buttons above.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTests.map((test) => {
            const statusColor =
              test.status === 'available'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : test.status === 'upcoming'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-slate-100 text-slate-700 dark:bg-dark-bg dark:text-slate-300 border-slate-200 dark:border-dark-border';

            const difficultyColor =
              test.difficulty === 'Easy'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200'
                : test.difficulty === 'Hard'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200';

            return (
              <Card
                key={test.id}
                className="p-5 bg-white dark:bg-dark-card border-light-border dark:border-dark-border flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-800 transition-all shadow-sm"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-dark-bg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-border">
                      {test.subject} &bull; {test.module}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(test)}
                      title="Click to cycle status"
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-transform active:scale-95 ${statusColor}`}
                    >
                      {test.status}
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {test.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {test.description}
                    </p>
                  </div>

                  {/* Badges and Metadata */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-md font-medium border ${difficultyColor}`}>
                      {test.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {test.type}
                    </span>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-dark-border/60 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-dark-bg/50">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Questions</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{test.questionCount}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-dark-bg/50">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Duration</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{test.durationMinutes}m</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-dark-bg/50">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Pass %</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{test.passPercentage}%</p>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-dark-border/60">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDetails(test.id)}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    View Set
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {canEditTests && (
                      <button
                        onClick={() => handleToggleStatus(test)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-dark-bg"
                        title="Change status"
                      >
                        Change Status
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => setTestToDelete(test)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete assessment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* =================================================================== */}
      {/* Modal: Multi-Step Assessment Authoring Stepper                      */}
      {/* =================================================================== */}
      <Modal
        isOpen={isCreateTestOpen}
        onClose={() => setIsCreateTestOpen(false)}
        title="Author New Test Series Assessment"
        maxWidth="3xl"
      >
        <div className="space-y-5">
          {/* Step Progress Tracker */}
          <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-3">
            {[
              { num: 1, label: 'Metadata & Configuration' },
              { num: 2, label: `Questions (${questionsDraft.length})` },
              { num: 3, label: 'Review & Publish' },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-2 cursor-pointer ${
                  testStep === s.num
                    ? 'text-purple-600 dark:text-purple-400 font-bold'
                    : testStep > s.num
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'text-slate-400'
                }`}
                onClick={() => setTestStep(s.num as any)}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    testStep === s.num
                      ? 'bg-purple-600 text-white'
                      : testStep > s.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-dark-bg text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {s.num}
                </div>
                <span className="text-xs hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>

          {/* STEP 1: METADATA */}
          {testStep === 1 && (
            <div className="space-y-4">
              <div>
                <Input
                  label="Assessment Title"
                  placeholder="e.g. Phase 4 Full-Length Mock Exam: System Design & Concurrency"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Subject / Track
                  </label>
                  <select
                    value={testSubject}
                    onChange={(e) => setTestSubject(e.target.value)}
                    className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="Python">Python</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="PostgreSQL">PostgreSQL</option>
                    <option value="System Design">System Design</option>
                    <option value="Security">Security</option>
                    <option value="DevOps">DevOps</option>
                  </select>
                </div>

                <div>
                  <Input
                    label="Module / Topic"
                    placeholder="e.g. AsyncIO & Concurrency"
                    value={testModule}
                    onChange={(e) => setTestModule(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Type
                  </label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value as TestType)}
                    className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="Practice Quiz">Practice Quiz</option>
                    <option value="Full Mock Test">Full Mock Test</option>
                    <option value="Topic Test">Topic Test</option>
                    <option value="Daily Challenge">Daily Challenge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={testDifficulty}
                    onChange={(e) => setTestDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <Input
                    type="number"
                    label="Duration (min)"
                    value={testDuration}
                    onChange={(e) => setTestDuration(Number(e.target.value))}
                    min={5}
                    max={180}
                  />
                </div>

                <div>
                  <Input
                    type="number"
                    label="Pass Mark (%)"
                    value={testPassPercentage}
                    onChange={(e) => setTestPassPercentage(Number(e.target.value))}
                    min={10}
                    max={100}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Detailed Syllabus & Instructions
                </label>
                <textarea
                  rows={2}
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  placeholder="Outline test topics, marking criteria, negative marking rules..."
                  className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    if (!testTitle.trim()) {
                      toast.error('Validation', 'Title is required');
                      return;
                    }
                    setTestStep(2);
                  }}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  className="!bg-purple-600 hover:!bg-purple-700 text-white"
                >
                  Proceed to Questions
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: QUESTIONS AUTHORING */}
          {testStep === 2 && (
            <div className="space-y-4">
              {/* Question Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-light-border dark:border-dark-border">
                {questionsDraft.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentQIndex(idx)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors shrink-0 ${
                      currentQIndex === idx
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Q{idx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-dashed border-purple-400 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 shrink-0 inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Q
                </button>
              </div>

              {/* Active Question Editor */}
              {questionsDraft[currentQIndex] && (
                <div className="space-y-3.5 bg-slate-50 dark:bg-dark-bg/40 p-4 rounded-2xl border border-light-border dark:border-dark-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      Question #{currentQIndex + 1}
                    </span>
                    {questionsDraft.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(currentQIndex)}
                        className="text-xs text-rose-500 hover:text-rose-700 inline-flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Question
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Question Text / Problem Statement
                    </label>
                    <textarea
                      rows={2}
                      value={questionsDraft[currentQIndex].text}
                      onChange={(e) => updateCurrentQuestion({ text: e.target.value })}
                      placeholder="What is the result of the following Python expression...?"
                      className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-3 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Code Snippet (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={questionsDraft[currentQIndex].codeSnippet || ''}
                      onChange={(e) => updateCurrentQuestion({ codeSnippet: e.target.value })}
                      placeholder="async def fetch_task(): ..."
                      className="w-full font-mono text-xs rounded-xl border border-light-border dark:border-dark-border bg-slate-900 text-emerald-400 p-3 focus:outline-none"
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Options (Select the correct answer):
                    </label>
                    {questionsDraft[currentQIndex].options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${currentQIndex}`}
                          checked={questionsDraft[currentQIndex].correctAnswerId === opt.id}
                          onChange={() => updateCurrentQuestion({ correctAnswerId: opt.id })}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="w-6 text-xs font-bold uppercase text-slate-500">{opt.id})</span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => updateOptionText(opt.id, e.target.value)}
                          placeholder={`Option ${opt.id.toUpperCase()} text`}
                          className="flex-1 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Solution Explanation
                    </label>
                    <textarea
                      rows={2}
                      value={questionsDraft[currentQIndex].explanation}
                      onChange={(e) => updateCurrentQuestion({ explanation: e.target.value })}
                      placeholder="Explain why the selected option is correct..."
                      className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-3 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      label="Marks (+)"
                      value={questionsDraft[currentQIndex].marks}
                      onChange={(e) => updateCurrentQuestion({ marks: Number(e.target.value) })}
                      min={1}
                    />
                    <Input
                      type="number"
                      label="Negative Marks (-)"
                      value={questionsDraft[currentQIndex].negativeMarks}
                      onChange={(e) => updateCurrentQuestion({ negativeMarks: Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setTestStep(1)}>
                  &larr; Back to Metadata
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const invalid = questionsDraft.find((q) => !q.text.trim());
                    if (invalid) {
                      toast.error('Incomplete Question', 'All questions must have question text.');
                      return;
                    }
                    setTestStep(3);
                  }}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  className="!bg-purple-600 hover:!bg-purple-700 text-white"
                >
                  Review Assessment
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & PUBLISH */}
          {testStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2">
                <h4 className="text-sm font-bold text-purple-950 dark:text-purple-200">
                  {testTitle || 'Untitled Assessment'}
                </h4>
                <div className="flex flex-wrap gap-2 text-xs text-purple-800 dark:text-purple-300">
                  <span>Track: <strong>{testSubject}</strong></span>
                  <span>&bull;</span>
                  <span>Module: <strong>{testModule}</strong></span>
                  <span>&bull;</span>
                  <span>Duration: <strong>{testDuration}m</strong></span>
                  <span>&bull;</span>
                  <span>Pass Threshold: <strong>{testPassPercentage}%</strong></span>
                  <span>&bull;</span>
                  <span>Total Questions: <strong>{questionsDraft.length}</strong></span>
                </div>
              </div>

              {/* Questions Summary */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {questionsDraft.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Question {idx + 1}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        Correct: Option {q.correctAnswerId.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-1">{q.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setTestStep(2)}>
                  &larr; Back to Questions
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  isLoading={isSubmittingTest}
                  onClick={handleCreateTestSubmit}
                  className="!bg-purple-600 hover:!bg-purple-700 text-white"
                >
                  Publish Assessment & Questions
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* =================================================================== */}
      {/* Modal: JSON Bulk Import with v1 Validator                           */}
      {/* =================================================================== */}
      <Modal
        isOpen={isImportJsonOpen}
        onClose={() => setIsImportJsonOpen(false)}
        title="Bulk Import Test Series (JSON v1 Schema)"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-300 space-y-1">
            <p className="font-bold">Schema Version 1 Assessment Importer</p>
            <p className="text-[11px] text-purple-700 dark:text-purple-400">
              Paste a validated JSON payload containing assessment metadata and questions array. Download the authoritative template below if needed.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Download Sample JSON Template
            </Button>

            <div>
              <input
                type="file"
                ref={jsonFileInputRef}
                onChange={handleJsonFileUpload}
                accept=".json"
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => jsonFileInputRef.current?.click()}
                leftIcon={<FileUp className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Upload JSON File
              </Button>
            </div>
          </div>

          <div>
            <textarea
              rows={10}
              value={jsonInputText}
              onChange={(e) => {
                setJsonInputText(e.target.value);
                setJsonValidationResult(null);
              }}
              placeholder='{\n  "schemaVersion": 1,\n  "title": "Python Concurrency Mastery",\n  "subject": "Python",\n  "module": "AsyncIO",\n  "questions": [...]\n}'
              className="w-full font-mono text-xs rounded-xl border border-light-border dark:border-dark-border bg-slate-900 text-emerald-400 p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Validation Report */}
          {jsonValidationResult && (
            <div
              className={`p-3 rounded-xl text-xs border ${
                jsonValidationResult.isValid
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {jsonValidationResult.isValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Payload is valid! Ready to import {jsonValidationResult.questionCount} questions.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Validation Failed ({jsonValidationResult.errors.length} errors):</span>
                  </>
                )}
              </div>
              {!jsonValidationResult.isValid && (
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {jsonValidationResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidateJson}
              disabled={!jsonInputText.trim()}
            >
              Validate Schema
            </Button>

            <Button
              variant="primary"
              size="md"
              isLoading={isSubmittingImport}
              onClick={handleImportJsonSubmit}
              disabled={!jsonInputText.trim() || (jsonValidationResult !== null && !jsonValidationResult.isValid)}
              className="!bg-purple-600 hover:!bg-purple-700 text-white"
            >
              Confirm & Import Assessment
            </Button>
          </div>
        </div>
      </Modal>

      {/* =================================================================== */}
      {/* Modal: View Assessment Details & Questions                          */}
      {/* =================================================================== */}
      <Modal
        isOpen={Boolean(viewingTestId)}
        onClose={() => {
          setViewingTestId(null);
          setViewingTestDetails(null);
        }}
        title="Assessment Questions & Details"
        maxWidth="2xl"
      >
        {isLoadingDetails ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading questions...</div>
        ) : viewingTestDetails ? (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">
                {viewingTestDetails.assessment.title}
              </h4>
              <p className="text-slate-500">{viewingTestDetails.assessment.description}</p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {viewingTestDetails.questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-600 dark:text-purple-400">Question {idx + 1}</span>
                    <span className="text-[10px] text-slate-400">{q.marks} marks ({q.negativeMarks} neg)</span>
                  </div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{q.text}</p>
                  {q.codeSnippet && (
                    <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                      {q.codeSnippet}
                    </pre>
                  )}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {q.options?.map((opt: any) => (
                      <div
                        key={opt.id}
                        className={`p-2 rounded-lg border text-[11px] ${
                          opt.id === q.correctAnswerId
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-dark-bg dark:border-dark-border dark:text-slate-400'
                        }`}
                      >
                        <span className="uppercase font-bold mr-1">{opt.id})</span> {opt.text}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                      Explanation: {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        isOpen={Boolean(testToDelete)}
        title="Delete Assessment"
        message={`Are you sure you want to permanently remove "${testToDelete?.title}" and all its questions? This action cannot be undone.`}
        confirmText="Delete Assessment"
        variant="danger"
        onConfirm={handleDeleteTest}
        onClose={() => setTestToDelete(null)}
      />
    </div>
  );
};
