import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiService } from '../../services/api';
import {
  AssessmentQuestion,
  TestSeriesItem,
  QuestionStatus,
  TestAttemptResult,
} from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Clock,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Send,
  HelpCircle,
  Menu,
  X,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const AssessmentPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const test = ApiService.getTestById(testId || 'test_py_201');
  const questions: AssessmentQuestion[] = ApiService.getTestQuestions(testId || 'test_py_201');

  // Assessment session states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    return (test?.durationMinutes || 15) * 60;
  });
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isPaletteOpenMobile, setIsPaletteOpenMobile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const currentQuestion = questions[currentIndex] || questions[0];

  // Accurate countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Option selection
  const handleSelectOption = (optionId: string) => {
    const qId = currentQuestion.id;
    const isCurrentlyMarked = questionStatuses[qId] === 'marked' || questionStatuses[qId] === 'marked_answered';

    setUserAnswers(prev => ({
      ...prev,
      [qId]: optionId,
    }));

    setQuestionStatuses(prev => ({
      ...prev,
      [qId]: isCurrentlyMarked ? 'marked_answered' : 'answered',
    }));
  };

  // Clear answer
  const handleClearSelection = () => {
    const qId = currentQuestion.id;
    setUserAnswers(prev => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });

    const isMarked = questionStatuses[qId] === 'marked_answered' || questionStatuses[qId] === 'marked';
    setQuestionStatuses(prev => ({
      ...prev,
      [qId]: isMarked ? 'marked' : 'unanswered',
    }));
  };

  // Toggle mark for review
  const handleToggleMarkForReview = () => {
    const qId = currentQuestion.id;
    const currentStatus = questionStatuses[qId] || 'unanswered';
    const hasAnswer = !!userAnswers[qId];

    if (currentStatus === 'marked' || currentStatus === 'marked_answered') {
      // Unmark
      setQuestionStatuses(prev => ({
        ...prev,
        [qId]: hasAnswer ? 'answered' : 'unanswered',
      }));
    } else {
      // Mark
      setQuestionStatuses(prev => ({
        ...prev,
        [qId]: hasAnswer ? 'marked_answered' : 'marked',
      }));
    }
  };

  // Save and Next
  const handleSaveAndNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsSubmitModalOpen(true);
    }
  };

  // Stats calculation
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = questions.length - answeredCount;
  const markedCount = Object.values(questionStatuses).filter(
    s => s === 'marked' || s === 'marked_answered'
  ).length;

  // Final submission logic
  const handleConfirmSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Compute deterministic score
    let scoreObtained = 0;
    let maxScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;

    questions.forEach(q => {
      maxScore += q.marks;
      const selectedOptionId = userAnswers[q.id];
      if (selectedOptionId) {
        if (selectedOptionId === q.correctAnswerId) {
          scoreObtained += q.marks;
          correctCount++;
        } else {
          scoreObtained -= q.negativeMarks;
          incorrectCount++;
        }
      }
    });

    scoreObtained = Math.max(0, scoreObtained);
    const percentage = Math.round((scoreObtained / maxScore) * 100);
    const passed = percentage >= (test?.passPercentage || 70);
    const timeSpentSeconds = (test ? test.durationMinutes * 60 : 900) - secondsRemaining;

    const result: TestAttemptResult = {
      attemptId: `att_${Date.now()}`,
      testId: test?.id || 'test_py_201',
      testTitle: test?.title || 'Assessment',
      subject: test?.subject || 'Computer Science',
      submittedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      timeSpentSeconds,
      totalQuestions: questions.length,
      answeredCount,
      unansweredCount,
      markedCount,
      correctCount,
      incorrectCount,
      scoreObtained,
      maxScore,
      percentage,
      passed,
      userAnswers,
      questionStatuses,
    };

    ApiService.submitTestAttempt(result);
    toast.success('Assessment Submitted!', `Score: ${scoreObtained}/${maxScore} (${percentage}%)`);
    navigate(`/assessment/${test?.id || 'test_py_201'}/result`);
  };

  const handleAutoSubmit = () => {
    toast.warning('Time Expired!', 'Auto-submitting your examination answers now.');
    handleConfirmSubmit();
  };

  if (!test) {
    return (
      <div className="p-12 text-center text-slate-500">
        Assessment test not found.
      </div>
    );
  }

  const isLowTime = secondsRemaining < 180; // Under 3 mins

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text flex flex-col font-sans transition-colors">
      {/* Distraction-Free Assessment Header */}
      <header className="sticky top-0 z-30 h-16 border-b border-light-border dark:border-dark-border bg-light-sidebar dark:bg-dark-sidebar px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="brand" size="sm">
            Assessment Mode
          </Badge>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-md">
              {test.title}
            </h1>
            <span className="text-[10px] text-slate-400">
              Positive: +{currentQuestion.marks} • Negative: -{currentQuestion.negativeMarks}
            </span>
          </div>
        </div>

        {/* Center/Right Timer & Submission */}
        <div className="flex items-center gap-3">
          {/* Countdown Clock */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm tracking-wide transition-colors ${
              isLowTime
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-slate-100 dark:bg-dark-card border-light-border dark:border-dark-border text-slate-800 dark:text-slate-200'
            }`}
          >
            <Clock className={`w-4 h-4 ${isLowTime ? 'text-rose-500' : 'text-brand-500'}`} />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          {/* Palette Toggle on Mobile */}
          <button
            onClick={() => setIsPaletteOpenMobile(!isPaletteOpenMobile)}
            className="lg:hidden p-2 rounded-xl border border-light-border dark:border-dark-border text-slate-600 dark:text-slate-300"
            aria-label="Toggle Question Palette"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Button
            size="sm"
            variant="success"
            onClick={() => setIsSubmitModalOpen(true)}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Submit Test
          </Button>
        </div>
      </header>

      {/* Main Assessment Body: Left Question Workspace, Right Question Palette */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full p-4 sm:p-6 gap-6">
        {/* Left Side: Question Pane */}
        <div className="flex-1 min-w-0 flex flex-col justify-between rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-5 sm:p-8 shadow-sm">
          <div className="space-y-6">
            {/* Question Counter & Meta */}
            <div className="flex items-center justify-between pb-4 border-b border-light-border dark:border-dark-border">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-500">
                Question {currentIndex + 1} of {questions.length}
              </span>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  +{currentQuestion.marks} Mark
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs font-medium text-rose-500">
                  -{currentQuestion.negativeMarks} Neg
                </span>
              </div>
            </div>

            {/* Question Statement */}
            <div className="space-y-4">
              <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                {currentQuestion.text}
              </p>

              {/* Formatted Code Block if provided */}
              {currentQuestion.codeSnippet && (
                <div className="rounded-xl overflow-hidden border border-slate-700/60 bg-[#0d1117] text-slate-200 text-xs sm:text-sm font-mono p-4">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <span>{currentQuestion.codeLanguage || 'Code'} Snippet</span>
                  </div>
                  <pre className="overflow-x-auto leading-relaxed">
                    <code>{currentQuestion.codeSnippet}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* Multiple Choice Options */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Select your answer:
              </p>

              <div className="space-y-2.5">
                {currentQuestion.options.map((option, optIdx) => {
                  const isSelected = userAnswers[currentQuestion.id] === option.id;
                  const optionLetters = ['A', 'B', 'C', 'D'];

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(option.id)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/70 dark:bg-dark-selected dark:border-blue-500 shadow-sm ring-1 ring-brand-500 dark:ring-blue-400'
                          : 'border-light-border dark:border-dark-border bg-white dark:bg-dark-card hover:bg-slate-50 dark:hover:bg-dark-hover dark:hover:border-blue-700/50'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-brand-500 dark:bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {optionLetters[optIdx]}
                      </div>

                      <div className={`flex-1 text-xs sm:text-sm font-medium leading-snug ${isSelected ? 'text-brand-900 dark:text-blue-100 font-semibold' : 'text-slate-800 dark:text-slate-200'}`}>
                        {option.text}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons Bar */}
          <div className="pt-6 mt-8 border-t border-light-border dark:border-dark-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>

              <Button
                size="sm"
                variant="ghost"
                disabled={!userAnswers[currentQuestion.id]}
                onClick={handleClearSelection}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Clear Selection
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={
                  questionStatuses[currentQuestion.id] === 'marked' ||
                  questionStatuses[currentQuestion.id] === 'marked_answered'
                    ? 'secondary'
                    : 'outline'
                }
                onClick={handleToggleMarkForReview}
                leftIcon={<Bookmark className="w-3.5 h-3.5 text-amber-500" />}
              >
                {questionStatuses[currentQuestion.id] === 'marked' ||
                questionStatuses[currentQuestion.id] === 'marked_answered'
                  ? 'Unmark Review'
                  : 'Mark for Review'}
              </Button>

              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveAndNext}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                {currentIndex === questions.length - 1 ? 'Save & Review' : 'Save & Next'}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side / Drawer: Question Navigation Palette */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-80 bg-light-sidebar dark:bg-dark-sidebar border-l border-light-border dark:border-dark-border p-5 flex flex-col justify-between shadow-2xl transition-transform lg:static lg:z-10 lg:shadow-none lg:w-72 lg:rounded-2xl lg:border lg:flex ${
            isPaletteOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Question Palette
              </h3>
              <button
                onClick={() => setIsPaletteOpenMobile(false)}
                className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-200"
                aria-label="Close palette"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Palette Summary Counters */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                <span>Answered</span>
                <span className="font-extrabold">{answeredCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Unanswered</span>
                <span className="font-extrabold">{unansweredCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-between col-span-2">
                <span>Marked for Review</span>
                <span className="font-extrabold">{markedCount}</span>
              </div>
            </div>

            {/* Questions Palette Grid */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Questions
              </p>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const status = questionStatuses[q.id] || 'unanswered';
                  const isCurrent = idx === currentIndex;
                  const isAnswered = status === 'answered';
                  const isMarked = status === 'marked';
                  const isMarkedAnswered = status === 'marked_answered';

                  let bgClasses =
                    'bg-slate-100 dark:bg-dark-card text-slate-600 dark:text-slate-400 border-light-border dark:border-dark-border dark:hover:bg-dark-hover dark:hover:border-blue-500/50 dark:hover:text-blue-200';
                  if (isAnswered) {
                    bgClasses = 'bg-emerald-500 text-white border-emerald-600';
                  } else if (isMarked) {
                    bgClasses = 'bg-amber-500 text-white border-amber-600';
                  } else if (isMarkedAnswered) {
                    bgClasses = 'bg-purple-600 text-white border-purple-700';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsPaletteOpenMobile(false);
                      }}
                      className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center border transition-all relative ${bgClasses} ${
                        isCurrent
                          ? 'ring-2 ring-brand-500 dark:ring-blue-400 ring-offset-2 dark:ring-offset-dark-sidebar dark:border-blue-400 scale-105 shadow-sm dark:shadow-blue-glow'
                          : 'hover:scale-105'
                      }`}
                    >
                      {idx + 1}
                      {isMarkedAnswered && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Legend at bottom */}
          <div className="pt-4 border-t border-light-border dark:border-dark-border space-y-1.5 text-[10px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>Unanswered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Marked for Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <span>Answered & Marked</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Confirmation Submit Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Assessment?"
        description="Are you sure you want to finish and submit your answers?"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-card border border-light-border dark:border-dark-border text-center text-xs">
            <div>
              <span className="text-slate-400">Total Questions:</span>
              <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {questions.length}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Attempted / Answered:</span>
              <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {answeredCount}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Unanswered Questions:</span>
              <p className="text-base font-extrabold text-slate-500 mt-0.5">
                {unansweredCount}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Marked for Review:</span>
              <p className="text-base font-extrabold text-amber-500 mt-0.5">
                {markedCount}
              </p>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                You have {unansweredCount} unanswered questions remaining. You can go back and review before final submission.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={isSubmitting}
            >
              Back to Test
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleConfirmSubmit}
              isLoading={isSubmitting}
            >
              Confirm Submission
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
