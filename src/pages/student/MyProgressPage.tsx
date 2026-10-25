import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/api';
import {
  TrendingUp,
  Award,
  CheckSquare,
  Code2,
  Play,
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const MyProgressPage: React.FC = () => {
  const { currentUser } = useAuth();
  const testAttempts = ApiService.getTestAttempts();
  const videos = ApiService.getVideos();
  const problems = ApiService.getCodingProblems();

  const solvedProblems = problems.filter(p => p.status === 'solved');
  const completedLessons = videos.filter(v => v.completed);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-light-border dark:border-dark-border">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-brand-500" />
          My Learning Progress & Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Track your course completion rate, assessment scores, and coding mastery milestones.
        </p>
      </div>

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Solved</span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {solvedProblems.length + (currentUser.solvedProblemsCount || 0)}
          </p>
          <span className="text-[11px] text-emerald-500 font-semibold">+4 this week</span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Lessons Finished</span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {completedLessons.length}
          </p>
          <span className="text-[11px] text-brand-500 font-semibold">Of {videos.length} Lectures</span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Assessments Taken</span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {Math.max(testAttempts.length, currentUser.testsCompletedCount || 6)}
          </p>
          <span className="text-[11px] text-purple-500 font-semibold">Avg Score: 86%</span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Active Study Streak</span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            7 Days 🔥
          </p>
          <span className="text-[11px] text-amber-500 font-semibold">Consistency Record</span>
        </Card>
      </div>

      {/* Topic Mastery Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="md" className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Topic Mastery Progress
          </h2>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Python Core & Memory</span>
                <span className="text-brand-500">85%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full w-[85%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Data Structures (Trees & Graphs)</span>
                <span className="text-brand-500">68%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full w-[68%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Dynamic Programming</span>
                <span className="text-brand-500">52%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full w-[52%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>SQL & Relational Indexing</span>
                <span className="text-brand-500">92%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[92%]" />
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Assessment Attempts Table */}
        <Card padding="md" className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Recent Assessment Scores
          </h2>

          <div className="space-y-2">
            {testAttempts.length > 0 ? (
              testAttempts.slice(0, 4).map(att => (
                <div
                  key={att.attemptId}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-sidebar text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-xs">
                      {att.testTitle}
                    </p>
                    <span className="text-[10px] text-slate-400">{att.submittedAt}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {att.percentage}%
                    </span>
                    <Badge variant={att.passed ? 'success' : 'warning'} size="sm">
                      {att.passed ? 'Passed' : 'Review'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">
                You have not completed any timed assessments in this session yet. Take a test from the Test Series catalog!
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
