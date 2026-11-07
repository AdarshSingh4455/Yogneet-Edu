import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { VideoLessonsService } from '../../services/videoLessonsService';
import { AssessmentAdminService } from '../../services/assessmentAdminService';
import { VideoLesson, TestSeriesItem } from '../../types';
import {
  Play,
  CheckSquare,
  Code2,
  FileText,
  Clock,
  Sparkles,
  Trophy,
  Calendar,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Users,
  Youtube,
  Crown,
  HelpCircle,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { BannerAd } from '../../components/ads/BannerAd';

export const StudentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [tests, setTests] = useState<TestSeriesItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isPremium = currentUser.accessCategory === 'pro' || (currentUser as any).isPremium === true;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      VideoLessonsService.getVideoLessons('published', true),
      AssessmentAdminService.getAssessments('available'),
    ])
      .then(([videoData, testData]) => {
        if (isMounted) {
          setVideos(videoData);
          setTests(testData);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('[StudentDashboard] Error loading curricula:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentLesson = videos.length > 0 ? videos[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-yogneet-navy via-[#12224A] to-[#0A1329] p-6 sm:p-8 text-white border border-yogneet-cyan/20 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yogneet-cyan/15 border border-yogneet-cyan/30 text-yogneet-cyan backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-yogneet-cyan" /> Tech Geek Adarsh Learning Hub
              </span>
              {isPremium && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Crown className="w-3 h-3" /> PRO TIER
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Welcome back, {currentUser.name ? currentUser.name.split(' ')[0] : 'Learner'}! 👋
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
              Continue your structured pedagogical path from foundational video lectures to timed competitive mock examinations.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-5">
              {currentLesson ? (
                <Link to={`/videos?lesson=${currentLesson.id}`}>
                  <Button size="md" className="bg-yogneet-cyan hover:bg-yogneet-cyanHover text-yogneet-navy font-bold border-none shadow-md shadow-yogneet-cyan/25" leftIcon={<Play className="w-4 h-4 fill-yogneet-navy" />}>
                    Resume Lecture
                  </Button>
                </Link>
              ) : (
                <Link to="/videos">
                  <Button size="md" className="bg-yogneet-cyan hover:bg-yogneet-cyanHover text-yogneet-navy font-bold border-none shadow-md shadow-yogneet-cyan/25" leftIcon={<Play className="w-4 h-4 fill-yogneet-navy" />}>
                    Explore Lectures
                  </Button>
                </Link>
              )}
              <Link to="/tests">
                <Button variant="secondary" size="md" className="border-slate-700 bg-white/10 hover:bg-white/20 text-white" leftIcon={<CheckSquare className="w-4 h-4 text-yogneet-orange" />}>
                  Mock Test Series
                </Button>
              </Link>
            </div>
          </div>

          {/* Dedicated Hero Phoenix Emblem */}
          <div className="flex items-center justify-center md:justify-end shrink-0 self-center">
            <div className="relative w-48 h-32 sm:w-60 sm:h-36 md:w-72 md:h-44 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-orange-500/25 blur-2xl rounded-full pointer-events-none" />
              <img
                src="/brand/yogneet-emblem.png"
                alt="Yogneet Edu Phoenix Emblem"
                className="relative max-h-28 sm:max-h-36 md:max-h-40 w-auto object-contain drop-shadow-[0_0_25px_rgba(0,200,232,0.35)] transition-transform duration-300 hover:scale-105"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Feature Pillars */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Link
          to="/videos"
          className="group rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-3.5 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 transition-all flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-red-500 dark:text-red-400">
            <Youtube className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors truncate">
              Video Lectures
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {videos.length > 0 ? `${videos.length} Lectures Available` : 'Tech Geek Adarsh'}
            </p>
          </div>
        </Link>

        <Link
          to="/notes"
          className="group rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-3.5 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-emerald-500 dark:text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors truncate">
              Study Notes &amp; PDFs
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Revision Sheets
            </p>
          </div>
        </Link>

        <Link
          to="/tests"
          className="group rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-3.5 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-amber-500">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors truncate">
              Test Series &amp; Mocks
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {tests.length > 0 ? `${tests.length} Active Tests` : 'Timed Practice'}
            </p>
          </div>
        </Link>

        <Link
          to="/feedback"
          className="group rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-3.5 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-cyan-500 dark:text-cyan-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-400 transition-colors truncate">
              Feedback &amp; Help
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Direct Admin Support
            </p>
          </div>
        </Link>
      </div>

      {/* 4-Stage Learning Journey Banner: Learn → Practice → Evaluate → Prepare */}
      <div className="rounded-3xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-cyan-300 border border-blue-300 dark:border-cyan-500/40 shadow-xs">
                Core Learning Path
              </span>
              <span className="text-xs text-slate-400">Structured 4-Stage Technical Curriculum</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
              Learn &rarr; Practice &rarr; Evaluate &rarr; Prepare for Competitive Exams
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Follow our structured pedagogical path from foundational video lectures to timed competitive mock examinations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Stage 1 */}
          <div className="p-4 rounded-2xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  Stage 1: Learn
                </span>
                <Play className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Video Lessons</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Conceptual deep dives and architecture walkthroughs by Tech Geek Adarsh.
              </p>
            </div>
            <Link to="/videos">
              <Button size="sm" variant="outline" className="w-full text-xs font-semibold justify-center">
                Continue Learning
              </Button>
            </Link>
          </div>

          {/* Stage 2 */}
          <div className="p-4 rounded-2xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Stage 2: Revise
                </span>
                <FileText className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Study Notes &amp; PDFs</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Curated markdown notes and downloadable PDF revision guides.
              </p>
            </div>
            <Link to="/notes">
              <Button size="sm" variant="outline" className="w-full text-xs font-semibold justify-center">
                Read Notes
              </Button>
            </Link>
          </div>

          {/* Stage 3 */}
          <div className="p-4 rounded-2xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                  Stage 3: Practice
                </span>
                <Code2 className="w-4 h-4 text-purple-500" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Practical Projects</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Lecture assignments, architecture challenges &amp; official rubrics.
              </p>
            </div>
            <Link to="/practical">
              <Button size="sm" variant="primary" className="w-full text-xs font-semibold justify-center !bg-purple-600 hover:!bg-purple-700 text-white">
                Practice Now
              </Button>
            </Link>
          </div>

          {/* Stage 4 */}
          <div className="p-4 rounded-2xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  Stage 4: Evaluate
                </span>
                <CheckSquare className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Test Series &amp; Mocks</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Timed competitive mock tests with instant scoring and explanations.
              </p>
            </div>
            <Link to="/tests">
              <Button size="sm" variant="outline" className="w-full text-xs font-semibold justify-center">
                Explore Test Series
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card padding="sm" className="flex items-center gap-4 border border-light-border dark:border-dark-border">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Play className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Enrolled Courses
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {currentUser.enrolledCourses?.length || 0}
            </p>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-4 border border-light-border dark:border-dark-border">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Coding Solved
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {currentUser.solvedProblemsCount || 0}
            </p>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-4 border border-light-border dark:border-dark-border">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tests Taken
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {currentUser.testsCompletedCount || 0}
            </p>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-4 border border-light-border dark:border-dark-border">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Entitlement Tier
            </p>
            <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 capitalize">
              {isPremium ? 'Premium (Pro)' : 'Standard Tier'}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Learning Continuation & Course Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Continue Learning Active Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Play className="w-5 h-5 text-brand-500" />
              Continue Learning
            </h2>
            <Link to="/videos" className="text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1">
              All Lectures <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {currentLesson ? (
            <Card padding="none" className="overflow-hidden border border-light-border dark:border-dark-border group">
              <div className="sm:flex">
                {/* Thumbnail preview */}
                <div className="sm:w-2/5 relative bg-slate-900 flex items-center justify-center overflow-hidden min-h-[160px]">
                  <img
                    src={`https://img.youtube.com/vi/${currentLesson.youtubeId}/hqdefault.jpg`}
                    alt={currentLesson.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-[11px] font-mono font-medium text-white">
                    {currentLesson.duration || 'Video'}
                  </span>
                </div>

                {/* Lesson details */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    {currentLesson.moduleName && (
                      <Badge variant="brand" size="sm" className="mb-2">
                        {currentLesson.moduleName}
                      </Badge>
                    )}
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                      {currentLesson.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {currentLesson.description || 'Watch verified conceptual lectures from Tech Geek Adarsh.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      {currentLesson.courseTitle}
                    </span>
                    <Link to={`/videos?lesson=${currentLesson.id}`}>
                      <Button size="sm">Resume</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card padding="lg" className="border-dashed border-2 border-light-border dark:border-dark-border text-center py-10">
              <Youtube className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                No video lectures published yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                New curriculum modules are being prepared by Tech Geek Adarsh. Check back soon!
              </p>
            </Card>
          )}

          {/* Additional Lectures if available */}
          {videos.length > 1 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Recent Lectures
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {videos.slice(1, 3).map(video => (
                  <Link
                    key={video.id}
                    to={`/videos?lesson=${video.id}`}
                    className="group rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-3 hover:border-brand-500 transition-all flex gap-3"
                  >
                    <div className="w-28 h-20 rounded-xl relative overflow-hidden bg-slate-900 shrink-0">
                      <img
                        src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                        {video.duration || 'Video'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <span className="text-[10px] font-semibold text-brand-500 uppercase">
                          {video.courseTitle}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-brand-500 transition-colors">
                          {video.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{video.duration || 'Lecture'}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Upcoming Assessments & Quick Notes */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                Scheduled Assessments
              </h3>
              <Link to="/tests" className="text-xs font-semibold text-brand-500 hover:text-brand-600">
                View all ({tests.length})
              </Link>
            </div>

            {tests.length === 0 ? (
              <Card padding="md" className="border-dashed border border-light-border dark:border-dark-border text-center py-6">
                <CheckSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No mock exams scheduled yet.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {tests.slice(0, 2).map(test => (
                  <Card key={test.id} padding="sm" className="space-y-2.5 border border-light-border dark:border-dark-border">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge
                          variant={test.difficulty === 'Easy' ? 'success' : test.difficulty === 'Medium' ? 'warning' : 'danger'}
                          size="sm"
                        >
                          {test.difficulty}
                        </Badge>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {test.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-light-border dark:border-dark-border">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {test.durationMinutes} mins • {test.questionCount} Qs
                      </span>
                      <Link to={`/assessment/${test.id}`}>
                        <Button size="sm">Start Exam</Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quick Study Notes Shortcut */}
          <Card padding="md" className="space-y-3 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-dark-card dark:to-blue-950/20 border-brand-200 dark:border-brand-900/40">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-500" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Handwritten Revision Notes
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Curated revision notes with diagrams, time complexities, and interview formulas prepared by Tech Geek Adarsh.
            </p>
            <Link to="/notes" className="block">
              <Button variant="outline" size="sm" className="w-full">
                Explore Notes Library
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* Competitions Section (Real empty state) */}
      <div className="space-y-3 pt-4 border-t border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Upcoming Competitions &amp; Hackathons
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live scheduled student coding competitions and hackathon events.
            </p>
          </div>
        </div>

        <Card padding="md" className="border-dashed border border-light-border dark:border-dark-border text-center py-8">
          <Trophy className="w-8 h-8 text-amber-400/60 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No live competitions scheduled at this time
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Stay tuned! Upcoming hackathons and live coding challenges will be posted here. In the meantime, benchmark your skills with our timed Test Series.
          </p>
        </Card>
      </div>
    </div>
  );
};
