import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckSquare,
  Video,
  FileText,
  Award,
  ArrowUpRight,
  Clock,
  Filter,
  AlertCircle,
  Sparkles,
  Database,
  Calendar,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { AnalyticsService, PlatformMetrics, AnalyticsTimeRange } from '../../services/analyticsService';

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    AnalyticsService.getMetrics(timeRange)
      .then(data => {
        if (isMounted) {
          setMetrics(data);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load metrics:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [timeRange]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              Platform Metrics
            </Badge>
            {metrics?.isLive ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Database className="w-3 h-3" /> Live Supabase PostgreSQL Metrics
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <Sparkles className="w-3 h-3" /> Demo Persona Mode (Local Fallback)
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-brand-500" />
            Platform Performance & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Monitor real learner enrollment, verified examination submissions, score distributions, and curriculum activity.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as AnalyticsTimeRange)}
            className="text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Top Metrics KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Enrolled Learners</span>
            <Users className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : (metrics?.totalStudents ?? 0)}
          </p>
          <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> {metrics?.activeStudents ?? 0} Active Learners
          </span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Assessments Taken</span>
            <CheckSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : (metrics?.totalAssessmentsTaken ?? 0)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Average Pass Rate: <strong className="text-emerald-500 font-bold">{metrics?.averagePassRate ?? 0}%</strong>
          </span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Study Notes</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : (metrics?.totalStudyNotes ?? 0)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Published Revision Guides
          </span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Video Lectures</span>
            <Video className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : (metrics?.totalVideoLessons ?? 0)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Curriculum Modules Indexed
          </span>
        </Card>
      </div>

      {/* Visual Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Percentile Breakdown */}
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Assessment Score Percentile Distribution
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              N = {metrics?.scoreDistribution.totalAttempts ?? 0} Attempts
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100">Top Quartile (85% - 100%)</span>
                <Badge variant="success" size="sm">{metrics?.scoreDistribution.topQuartile ?? 0}%</Badge>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${metrics?.scoreDistribution.topQuartile ?? 0}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">Exemplary technical mastery; top-tier benchmark ready.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100">Mid Quartile (70% - 84%)</span>
                <Badge variant="brand" size="sm">{metrics?.scoreDistribution.midQuartile ?? 0}%</Badge>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: `${metrics?.scoreDistribution.midQuartile ?? 0}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">Meets curriculum competency criteria; reviewing complex edge-cases.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100">Remedial Tier (&lt; 70%)</span>
                <Badge variant="warning" size="sm">{metrics?.scoreDistribution.remedialTier ?? 0}%</Badge>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${metrics?.scoreDistribution.remedialTier ?? 0}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">Recommending foundational study notes and module practice.</p>
            </div>
          </div>
        </Card>

        {/* Assessment Attempts Activity Timeline */}
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Examination Submissions Over Time
            </h2>
            <span className="text-[11px] text-slate-400">Filtered: {timeRange.toUpperCase()}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border space-y-3">
            {metrics?.attemptsTimeline && metrics.attemptsTimeline.length > 0 ? (
              <div className="space-y-2">
                {metrics.attemptsTimeline.map((item, idx) => {
                  const maxCount = Math.max(...metrics.attemptsTimeline.map(t => t.count), 1);
                  const barWidth = Math.max(8, Math.round((item.count / maxCount) * 100));

                  return (
                    <div key={idx} className="flex items-center gap-3 text-xs">
                      <span className="w-16 font-mono text-slate-400 text-[11px] shrink-0 truncate">
                        {item.date}
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="w-8 font-mono text-right font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                        {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No test submissions in this time window.</p>
            )}
          </div>

          {/* Uninstrumented Telemetry Transparency */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Watch Hours</span>
              <span className="text-sm font-extrabold text-slate-400 block mt-0.5">
                {metrics?.watchHoursMetric.displayValue}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {metrics?.watchHoursMetric.subtext}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">PDF Download Telemetry</span>
              <span className="text-sm font-extrabold text-slate-400 block mt-0.5">
                {metrics?.noteDownloadsMetric.displayValue}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {metrics?.noteDownloadsMetric.subtext}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
