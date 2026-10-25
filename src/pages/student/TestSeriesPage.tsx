import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { TestSeriesItem } from '../../types';
import {
  CheckSquare,
  Clock,
  Trophy,
  Filter,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Award,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const TestSeriesPage: React.FC = () => {
  const [tests] = useState<TestSeriesItem[]>(() => ApiService.getTests());
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const navigate = useNavigate();

  const subjects = ['All', 'Python', 'Data Structures', 'SQL', 'Web Development'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  const filteredTests = tests.filter(test => {
    const matchesSubject = selectedSubject === 'All' || test.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'All' || test.difficulty === selectedDifficulty;
    return matchesSubject && matchesDifficulty;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="pb-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="brand" size="sm">
            Assessment Engine
          </Badge>
          <span className="text-xs text-slate-400">Timed Mock Tests & Quizzes</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <CheckSquare className="w-6 h-6 text-emerald-500" />
          Test Series & Examination Catalog
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Simulate real technical interviews and coding examinations. Practice under time constraints with our full-screen assessment engine and get detailed score analytics.
        </p>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Subject pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSubject(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSubject === s
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-cardHover'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Difficulty filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Difficulty:</span>
          {difficulties.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDifficulty(d)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedDifficulty === d
                  ? 'bg-slate-800 text-white dark:bg-slate-700'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Tests Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTests.map(test => {
          const hasAttempted = test.lastScore !== undefined;
          const isPassed = hasAttempted && (test.lastScore || 0) >= test.passPercentage;

          return (
            <Card
              key={test.id}
              padding="md"
              className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="brand" size="sm">
                      {test.subject}
                    </Badge>
                    <Badge
                      variant={
                        test.difficulty === 'Easy'
                          ? 'success'
                          : test.difficulty === 'Medium'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {test.difficulty}
                    </Badge>
                  </div>
                  <Badge variant="outline" size="sm">
                    {test.type}
                  </Badge>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {test.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {test.description}
                </p>

                {/* Metadata Pills */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-light-border dark:border-dark-border text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-card/60">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      Questions
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {test.questionCount} Qs
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-card/60">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      Duration
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {test.durationMinutes} Mins
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-card/60">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      Pass Mark
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {test.passPercentage}%
                    </span>
                  </div>
                </div>

                {/* Previous Attempt Summary Badge */}
                {hasAttempted && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-dark-card/60 border border-light-border dark:border-dark-border text-xs">
                    <div className="flex items-center gap-1.5">
                      <Award className={`w-4 h-4 ${isPassed ? 'text-emerald-500' : 'text-amber-500'}`} />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Previous Score: {test.lastScore}%
                      </span>
                    </div>
                    <Badge variant={isPassed ? 'success' : 'warning'} size="sm">
                      {isPassed ? 'Passed' : 'Review Required'}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                {hasAttempted && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/assessment/${test.id}/result`)}
                  >
                    View Result
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1"
                  onClick={() => navigate(`/assessment/${test.id}`)}
                  leftIcon={hasAttempted ? <RotateCcw className="w-3.5 h-3.5" /> : undefined}
                >
                  {hasAttempted ? 'Retake Test' : 'Start Assessment'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
