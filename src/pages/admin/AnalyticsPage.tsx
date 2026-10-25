import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckSquare,
  Video,
  FileText,
  Award,
  ArrowUpRight,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="brand" size="sm">
            Platform Metrics
          </Badge>
          <span className="text-xs text-slate-400">Aggregated Learner & Staff Analytics</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-brand-500" />
          Platform Performance & Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Monitor learner retention, video watch completions, test score distributions, and platform-wide growth trends.
        </p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Active Learners</span>
            <Users className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            1,248
          </p>
          <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> +18.4% this month
          </span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Video Watch Hours</span>
            <Video className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            4,820 hrs
          </p>
          <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> +12.1% watch-time
          </span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Assessments Taken</span>
            <CheckSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            892 Mocks
          </p>
          <span className="text-[11px] text-slate-400">Average Pass: 78%</span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Notes Downloaded</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            3,410 PDFs
          </p>
          <span className="text-[11px] text-amber-500 font-semibold">High Engagement</span>
        </Card>
      </div>

      {/* Visual Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md" className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Course Completion & Retention Rates
          </h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Python Mastery for High-Scale Systems</span>
                <span className="text-brand-500">82% Completion</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full w-[82%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>DSA & Algorithmic Problem Solving</span>
                <span className="text-brand-500">74% Completion</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full w-[74%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>SQL & Relational Architecture</span>
                <span className="text-brand-500">88% Completion</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[88%]" />
              </div>
            </div>
          </div>
        </Card>

        <Card padding="md" className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Assessment Score Percentile Distribution
          </h2>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100">Top Quartile (85% - 100%)</span>
                <p className="text-[11px] text-slate-400">High-tier benchmark ready for top tech SDE interviews</p>
              </div>
              <Badge variant="success" size="sm">34% of Students</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100">Mid Quartile (70% - 84%)</span>
                <p className="text-[11px] text-slate-400">Meeting course criteria; reviewing edge cases</p>
              </div>
              <Badge variant="brand" size="sm">48% of Students</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100">Remedial Tier (&lt; 70%)</span>
                <p className="text-[11px] text-slate-400">Recommended study notes review and retakes</p>
              </div>
              <Badge variant="warning" size="sm">18% of Students</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
