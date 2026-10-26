import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { AssessmentQuestion, TestAttemptResult } from '../../types';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  BookOpen,
  ArrowLeft,
  Check,
  X,
  Award,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const AssessmentResultPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const test = ApiService.getTestById(testId || 'test_py_201');
  const questions: AssessmentQuestion[] = ApiService.getTestQuestions(testId || 'test_py_201');
  const latestAttempt: TestAttemptResult | undefined = ApiService.getLatestAttempt(testId || 'test_py_201');

  const [filterMode, setFilterMode] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');

  if (!latestAttempt) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-slate-500">No recent attempt found for this assessment.</p>
        <Link to="/tests">
          <Button size="sm">Go to Test Catalog</Button>
        </Link>
      </div>
    );
  }

  const isPassed = latestAttempt.passed;
  const accuracy = Math.round((latestAttempt.correctCount / Math.max(1, latestAttempt.answeredCount)) * 100);

  const filteredQuestions = questions.filter(q => {
    const selectedOpt = latestAttempt.userAnswers[q.id];
    const isAnswered = !!selectedOpt;
    const isCorrect = selectedOpt === q.correctAnswerId;

    if (filterMode === 'correct') return isCorrect;
    if (filterMode === 'incorrect') return isAnswered && !isCorrect;
    if (filterMode === 'unanswered') return !isAnswered;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-light-border dark:border-dark-border">
        <Link to="/tests" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Test Series</span>
        </Link>

        <span className="text-xs text-slate-400">
          Submitted on {latestAttempt.submittedAt}
        </span>
      </div>

      {/* Main Scorecard Banner */}
      <div className={`rounded-3xl border p-6 sm:p-8 relative overflow-hidden transition-colors ${
        isPassed
          ? 'bg-gradient-to-br from-emerald-50/90 via-white to-slate-50 border-emerald-200/90 shadow-subtle-light dark:from-emerald-950/40 dark:via-dark-card dark:to-dark-card dark:border-emerald-500/40 dark:shadow-xl'
          : 'bg-gradient-to-br from-amber-50/90 via-white to-slate-50 border-amber-200/90 shadow-subtle-light dark:from-amber-950/40 dark:via-dark-card dark:to-dark-card dark:border-amber-500/40 dark:shadow-xl'
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200/80 dark:bg-white/10 dark:text-amber-300 dark:border-white/10 backdrop-blur-sm">
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Assessment Summary</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {latestAttempt.testTitle}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              {isPassed
                ? 'Congratulations! You met and exceeded the cutoff benchmark score. Keep sharpening your skills!'
                : 'Good effort! Review the detailed answer explanations below to strengthen your conceptual foundation.'}
            </p>
          </div>

          {/* Large Score Circle / Badge */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-dark-sidebar/90 border border-slate-200/80 dark:border-dark-border shadow-md shrink-0">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100">
              {latestAttempt.percentage}%
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              {latestAttempt.scoreObtained} / {latestAttempt.maxScore} Marks
            </span>
            <Badge
              variant={isPassed ? 'success' : 'warning'}
              size="sm"
              className="mt-2 font-bold uppercase tracking-wider"
            >
              {isPassed ? 'Passed' : 'Needs Review'}
            </Badge>
          </div>
        </div>

        {/* Stats Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
          <div className="p-3.5 rounded-xl bg-white/90 dark:bg-dark-card/60 border border-slate-200/80 dark:border-dark-border shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Correct Answers</span>
            <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
              {latestAttempt.correctCount} / {latestAttempt.totalQuestions}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/90 dark:bg-dark-card/60 border border-slate-200/80 dark:border-dark-border shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Incorrect Answers</span>
            <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
              {latestAttempt.incorrectCount}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/90 dark:bg-dark-card/60 border border-slate-200/80 dark:border-dark-border shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Accuracy</span>
            <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
              {accuracy}%
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/90 dark:bg-dark-card/60 border border-slate-200/80 dark:border-dark-border shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Time Spent</span>
            <span className="text-lg font-extrabold text-slate-800 dark:text-slate-200">
              {Math.floor(latestAttempt.timeSpentSeconds / 60)}m {latestAttempt.timeSpentSeconds % 60}s
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white dark:bg-dark-selected dark:text-blue-300 dark:border dark:border-blue-500 font-semibold shadow-sm'
                : 'bg-white dark:bg-dark-card text-slate-700 dark:text-slate-300 border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover dark:hover:text-blue-200 dark:hover:border-blue-800/40'
            }`}
          >
            All Questions ({questions.length})
          </button>
          <button
            onClick={() => setFilterMode('correct')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterMode === 'correct'
                ? 'bg-emerald-600 text-white dark:border dark:border-emerald-500 font-semibold shadow-sm'
                : 'bg-white dark:bg-dark-card text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-dark-border hover:bg-emerald-50/50 dark:hover:bg-dark-hover'
            }`}
          >
            Correct ({latestAttempt.correctCount})
          </button>
          <button
            onClick={() => setFilterMode('incorrect')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterMode === 'incorrect'
                ? 'bg-rose-600 text-white dark:border dark:border-rose-500 font-semibold shadow-sm'
                : 'bg-white dark:bg-dark-card text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-dark-border hover:bg-rose-50/50 dark:hover:bg-dark-hover'
            }`}
          >
            Incorrect ({latestAttempt.incorrectCount})
          </button>
          <button
            onClick={() => setFilterMode('unanswered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterMode === 'unanswered'
                ? 'bg-slate-700 text-white dark:bg-dark-selected dark:text-blue-300 dark:border dark:border-blue-500 font-semibold shadow-sm'
                : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-400 border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover dark:hover:text-blue-200 dark:hover:border-blue-800/40'
            }`}
          >
            Unanswered ({latestAttempt.unansweredCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/assessment/${testId}`}>
            <Button size="sm" variant="outline" leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
              Retake Test
            </Button>
          </Link>
          <Link to="/notes">
            <Button size="sm" variant="secondary" leftIcon={<BookOpen className="w-3.5 h-3.5" />}>
              Read Study Notes
            </Button>
          </Link>
        </div>
      </div>

      {/* Question-by-Question Detailed Review */}
      <div className="space-y-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          In-Depth Question Analysis & Explanations
        </h2>

        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const userSelectedOptId = latestAttempt.userAnswers[q.id];
            const isAnswered = !!userSelectedOptId;
            const isCorrect = userSelectedOptId === q.correctAnswerId;

            return (
              <Card
                key={q.id}
                padding="md"
                className={`space-y-4 border-l-4 ${
                  !isAnswered
                    ? 'border-l-slate-400'
                    : isCorrect
                    ? 'border-l-emerald-500'
                    : 'border-l-rose-500'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-light-border dark:border-dark-border text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-slate-400">Q{q.questionNumber}.</span>
                    {isCorrect ? (
                      <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Correct (+{q.marks} marks)
                      </span>
                    ) : isAnswered ? (
                      <span className="text-rose-500 flex items-center gap-1 font-semibold">
                        <XCircle className="w-4 h-4" /> Incorrect (-{q.negativeMarks} marks)
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <HelpCircle className="w-4 h-4" /> Unanswered (0 marks)
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Statement */}
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {q.text}
                </p>

                {/* Code Snippet */}
                {q.codeSnippet && (
                  <pre className="p-3 rounded-xl bg-[#0d1117] text-slate-200 text-xs font-mono overflow-x-auto">
                    <code>{q.codeSnippet}</code>
                  </pre>
                )}

                {/* Options Review */}
                <div className="space-y-2 pt-1">
                  {q.options.map((opt, optIndex) => {
                    const isSelectedByUser = userSelectedOptId === opt.id;
                    const isCorrectAnswer = opt.id === q.correctAnswerId;

                    let optClasses =
                      'border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card/50 text-slate-700 dark:text-slate-300';

                    if (isCorrectAnswer) {
                      optClasses =
                        'border-emerald-300 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
                    } else if (isSelectedByUser && !isCorrectAnswer) {
                      optClasses =
                        'border-rose-300 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${optClasses}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {['A', 'B', 'C', 'D'][optIndex]}
                          </span>
                          <span>{opt.text}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelectedByUser && (
                            <Badge variant={isCorrectAnswer ? 'success' : 'danger'} size="sm">
                              Your Selection
                            </Badge>
                          )}
                          {isCorrectAnswer && (
                            <Badge variant="success" size="sm">
                              Correct Answer
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* In-depth Explanation Card */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs space-y-1">
                  <span className="font-bold text-brand-700 dark:text-brand-400 block">
                    Explanation:
                  </span>
                  <p className="text-slate-800 dark:text-slate-300 leading-relaxed">
                    {q.explanation}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
