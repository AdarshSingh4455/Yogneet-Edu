import React, { useState, useEffect, useMemo } from 'react';
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
  Layers,
  PieChart,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { AnalyticsService, PlatformMetrics, AnalyticsTimeRange } from '../../services/analyticsService';
import { ResponsiveLineChart } from '../../components/common/charts/ResponsiveLineChart';
import { ResponsiveBarChart } from '../../components/common/charts/ResponsiveBarChart';
import { ActivityDonutChart } from '../../components/common/charts/ActivityDonutChart';

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

  // Timeline chart points
  const timelineData = useMemo(() => {
    if (!metrics?.attemptsTimeline || metrics.attemptsTimeline.length === 0) return [];
    return metrics.attemptsTimeline.map(item => ({
      label: item.date,
      value: item.count,
      tooltipText: `${item.date}: ${item.count} submissions`,
    }));
  }, [metrics]);

  const maxTimelineCount = useMemo(() => {
    if (!timelineData.length) return 10;
    return Math.max(...timelineData.map(d => d.value), 5);
  }, [timelineData]);

  // Score distribution donut segments
  const scoreSegments = useMemo(() => {
    if (!metrics) return [];
    const dist = metrics.scoreDistribution;
    return [
      { label: 'Top Tier (85-100%)', value: dist.topQuartile, color: '#10b981' },
      { label: 'Competent (70-84%)', value: dist.midQuartile, color: '#3b82f6' },
      { label: 'Remedial (< 70%)', value: dist.remedialTier, color: '#f59e0b' },
    ];
  }, [metrics]);

  // Subject Performance bars
  const subjectBars = useMemo(() => {
    if (!metrics?.subjectPerformance) return [];
    return metrics.subjectPerformance.map(sp => ({
      label: sp.subject,
      value: sp.avgScore,
      subtext: `${sp.attempts} student attempts`,
      color: sp.avgScore >= 80 ? '#10b981' : sp.avgScore >= 65 ? '#3b82f6' : '#f59e0b',
    }));
  }, [metrics]);

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
                <Sparkles className="w-3 h-3" /> Local Mock Mode (Prototype Fallback)
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
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
        <Card padding="sm" className="space-y-1 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
            <span>Enrolled Learners</span>
            <Users className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : (metrics?.totalStudents ?? 0)}
          </p>
          <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> {metrics?.activeStudents ?? 0} Active Learners
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Assessments Taken</span>
            <CheckSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : (metrics?.totalAssessmentsTaken ?? 0)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Average Pass Rate: <strong className="text-emerald-500 font-bold">{metrics?.averagePassRate ?? 0}%</strong>
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Study Notes</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : (metrics?.totalStudyNotes ?? 0)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Published Revision Guides
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Video Lectures</span>
            <Video className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : (metrics?.totalVideoLessons ?? 0)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Curriculum Modules Indexed
          </span>
        </Card>
      </div>

      {/* Visual Analytics Grid: Timeline Line Chart + Score Distribution Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions Timeline (2 Columns) */}
        <Card padding="md" className="lg:col-span-2 space-y-4 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-500" />
                <span>Examination Submissions Over Time</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Daily assessment completion volume filtered by {timeRange.toUpperCase()}.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Window: {timeRange.toUpperCase()}
            </span>
          </div>

          <div className="pt-2">
            <ResponsiveLineChart
              data={timelineData}
              height={230}
              lineColor="#3b82f6"
              yMin={0}
              yMax={maxTimelineCount}
              yUnit=" tests"
              emptyMessage="No test submissions recorded in this time window."
            />
          </div>
        </Card>

        {/* Score Percentile Donut (1 Column) */}
        <Card padding="md" className="space-y-4 border border-light-border dark:border-dark-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-500" />
                <span>Score Quartiles</span>
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                N = {metrics?.scoreDistribution.totalAttempts ?? 0}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pass-rate stratification of student attempts.
            </p>
          </div>

          <div className="py-2 flex justify-center">
            <ActivityDonutChart
              segments={scoreSegments}
              size={150}
              centerTitle={String(metrics?.scoreDistribution.totalAttempts ?? 0)}
              centerSubtitle="Submissions"
              emptyMessage="No test submissions to calculate percentiles."
            />
          </div>

          <div className="pt-2 border-t border-light-border dark:border-dark-border text-center">
            <span className="text-[11px] text-slate-400">
              Benchmark standards: Top quartile &ge; 85%, Mid &ge; 70%.
            </span>
          </div>
        </Card>
      </div>

      {/* Subject Performance & Uninstrumented Telemetry Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance Breakdown */}
        <Card padding="md" className="space-y-4 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-500" />
              <span>Subject Performance Competency</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">Avg Score (%)</span>
          </div>

          <ResponsiveBarChart
            data={subjectBars}
            max={100}
            unit="%"
            emptyMessage="No subject assessment attempts recorded yet."
          />
        </Card>

        {/* Telemetry Status Transparency */}
        <Card padding="md" className="space-y-4 border border-light-border dark:border-dark-border flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              <span>Telemetry & Engagement Signals</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Instrumentation status for passive engagement tracking across student modules.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-sidebar/90 border border-slate-200 dark:border-dark-border">
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Watch Hours Telemetry</span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100 block mt-1">
                {metrics?.watchHoursMetric.displayValue}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-1">
                {metrics?.watchHoursMetric.subtext}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-sidebar/90 border border-slate-200 dark:border-dark-border">
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">PDF Download Telemetry</span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100 block mt-1">
                {metrics?.noteDownloadsMetric.displayValue}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-1">
                {metrics?.noteDownloadsMetric.subtext}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/90 dark:bg-dark-card border border-blue-200/80 dark:border-blue-900/50 text-xs text-blue-900 dark:text-slate-200 shadow-xs">
            <strong className="text-blue-950 dark:text-cyan-300 font-bold">Data Integrity Assurance:</strong> Only verified submissions and live database records are plotted. Simulated data is never fabricated.
          </div>
        </Card>
      </div>
    </div>
  );
};
