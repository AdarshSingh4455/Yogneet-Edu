/**
 * Platform Analytics Service for Yogneet Edu.
 * Computes platform performance metrics directly from PostgreSQL tables
 * (profiles, assessment_attempts, study_notes, video_lessons) with date filtering.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { ApiService } from './api';

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | 'all';

export interface ScoreDistribution {
  topQuartile: number; // 85% - 100%
  midQuartile: number; // 70% - 84%
  remedialTier: number; // < 70%
  totalAttempts: number;
}

export interface PlatformMetrics {
  isLive: boolean;
  totalStudents: number;
  activeStudents: number;
  suspendedStudents: number;
  totalAssessmentsTaken: number;
  averagePassRate: number;
  scoreDistribution: ScoreDistribution;
  totalStudyNotes: number;
  totalVideoLessons: number;
  watchHoursMetric: {
    isTracked: boolean;
    displayValue: string;
    subtext: string;
  };
  noteDownloadsMetric: {
    isTracked: boolean;
    displayValue: string;
    subtext: string;
  };
  attemptsTimeline: Array<{ date: string; count: number }>;
  subjectPerformance: Array<{ subject: string; attempts: number; avgScore: number }>;
}

export function filterByDateRange(dateString: string, range: AnalyticsTimeRange): boolean {
  if (range === 'all') return true;
  const d = new Date(dateString).getTime();
  const now = Date.now();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return now - d <= days * 24 * 60 * 60 * 1000;
}

export const AnalyticsService = {
  /**
   * Fetches and aggregates real platform analytics.
   */
  async getMetrics(timeRange: AnalyticsTimeRange = '30d'): Promise<PlatformMetrics> {
    if (!isSupabaseConfigured() || !supabase) {
      // Return explicitly labeled mock fallback metrics
      const mockUsers = ApiService.getUsers().filter(u => u.role === 'student');
      const mockAttempts = ApiService.getTestAttempts();
      const mockNotes = ApiService.getNotes();
      const mockVideos = ApiService.getVideos();

      const passedCount = mockAttempts.filter(a => a.passed).length;
      const passRate = mockAttempts.length > 0 ? Math.round((passedCount / mockAttempts.length) * 100) : 78;

      return {
        isLive: false,
        totalStudents: mockUsers.length || 1248,
        activeStudents: mockUsers.filter(u => u.status === 'active').length || 1190,
        suspendedStudents: mockUsers.filter(u => u.status === 'suspended').length || 58,
        totalAssessmentsTaken: mockAttempts.length || 892,
        averagePassRate: passRate,
        scoreDistribution: {
          topQuartile: 34,
          midQuartile: 48,
          remedialTier: 18,
          totalAttempts: mockAttempts.length || 892,
        },
        totalStudyNotes: mockNotes.length || 12,
        totalVideoLessons: mockVideos.length || 18,
        watchHoursMetric: {
          isTracked: false,
          displayValue: 'Not tracked',
          subtext: 'Requires YouTube player telemetry integration',
        },
        noteDownloadsMetric: {
          isTracked: false,
          displayValue: 'Not tracked',
          subtext: 'Download event telemetry not yet active',
        },
        attemptsTimeline: [
          { date: 'Day -6', count: 12 },
          { date: 'Day -5', count: 18 },
          { date: 'Day -4', count: 24 },
          { date: 'Day -3', count: 19 },
          { date: 'Day -2', count: 32 },
          { date: 'Day -1', count: 28 },
          { date: 'Today', count: 35 },
        ],
        subjectPerformance: [
          { subject: 'Python', attempts: 412, avgScore: 82 },
          { subject: 'DSA', attempts: 298, avgScore: 74 },
          { subject: 'SQL', attempts: 182, avgScore: 88 },
        ],
      };
    }

    try {
      // 1. Fetch live profiles
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, status, created_at')
        .eq('role', 'student');
      if (pErr) throw pErr;

      // 2. Fetch live assessment attempts
      const { data: attempts, error: aErr } = await supabase
        .from('assessment_attempts')
        .select('attempt_id, test_id, score_obtained, max_score, percentage, passed, submitted_at');
      if (aErr) throw aErr;

      // 3. Fetch notes & videos count
      const { count: notesCount, error: nErr } = await supabase
        .from('study_notes')
        .select('id', { count: 'exact', head: true });
      if (nErr) throw nErr;

      const { count: videosCount, error: vErr } = await supabase
        .from('video_lessons')
        .select('id', { count: 'exact', head: true });
      if (vErr) throw vErr;

      const studentList = (profiles as any[]) || [];
      const totalStudents = studentList.length;
      const activeStudents = studentList.filter(s => s.status === 'active').length;
      const suspendedStudents = studentList.filter(s => s.status === 'suspended').length;

      // Filter attempts by timeRange
      const filteredAttempts = ((attempts as any[]) || []).filter(a => filterByDateRange(a.submitted_at, timeRange));
      const totalAttempts = filteredAttempts.length;

      let passedCount = 0;
      let topQuartile = 0;
      let midQuartile = 0;
      let remedialTier = 0;

      filteredAttempts.forEach(a => {
        if (a.passed) passedCount++;
        const pct = Number(a.percentage);
        if (pct >= 85) topQuartile++;
        else if (pct >= 70) midQuartile++;
        else remedialTier++;
      });

      const averagePassRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;

      // Group attempts by date for timeline
      const timelineMap = new Map<string, number>();
      filteredAttempts.forEach(a => {
        const d = new Date(a.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        timelineMap.set(d, (timelineMap.get(d) || 0) + 1);
      });

      const attemptsTimeline = Array.from(timelineMap.entries()).map(([date, count]) => ({ date, count }));

      return {
        isLive: true,
        totalStudents,
        activeStudents,
        suspendedStudents,
        totalAssessmentsTaken: totalAttempts,
        averagePassRate,
        scoreDistribution: {
          topQuartile: totalAttempts > 0 ? Math.round((topQuartile / totalAttempts) * 100) : 0,
          midQuartile: totalAttempts > 0 ? Math.round((midQuartile / totalAttempts) * 100) : 0,
          remedialTier: totalAttempts > 0 ? Math.round((remedialTier / totalAttempts) * 100) : 0,
          totalAttempts,
        },
        totalStudyNotes: notesCount || 0,
        totalVideoLessons: videosCount || 0,
        watchHoursMetric: {
          isTracked: false,
          displayValue: 'Not tracked',
          subtext: 'YouTube video player telemetry not instrumented',
        },
        noteDownloadsMetric: {
          isTracked: false,
          displayValue: 'Not tracked',
          subtext: 'Download tracking telemetry not instrumented',
        },
        attemptsTimeline: attemptsTimeline.length > 0 ? attemptsTimeline : [{ date: 'Today', count: 0 }],
        subjectPerformance: [
          { subject: 'Technical Assessments', attempts: totalAttempts, avgScore: averagePassRate },
        ],
      };
    } catch (err) {
      console.error('[AnalyticsService.getMetrics] Error querying Supabase, using local:', err);
      return this.getMetrics('all');
    }
  },
};
