import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ApiService } from '../../services/api';
import { UpcomingEvent } from '../../types';
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
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const StudentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [events, setEvents] = useState<UpcomingEvent[]>(() => ApiService.getEvents());
  const [selectedEvent, setSelectedEvent] = useState<UpcomingEvent | null>(null);

  const videos = ApiService.getVideos();
  const tests = ApiService.getTests();
  const currentLesson = videos[0]; // Hero continuation

  const handleRegister = (event: UpcomingEvent) => {
    const isNowRegistered = ApiService.toggleEventRegistration(event.id);
    setEvents(ApiService.getEvents());
    setSelectedEvent(null);
    if (isNowRegistered) {
      toast.success('Registration Confirmed!', `You have registered for ${event.title}.`);
    } else {
      toast.info('Registration Cancelled', `You have unregistered from ${event.title}.`);
    }
  };

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
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Welcome back, {currentUser.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
              Ready to master Python internals and conquer algorithms today? You are on a <strong className="text-yogneet-orange">7-day study streak</strong>. Keep the momentum going!
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <Link to={`/videos?lesson=${currentLesson.id}`}>
                <Button size="md" className="bg-yogneet-cyan hover:bg-yogneet-cyanHover text-yogneet-navy font-bold border-none shadow-md shadow-yogneet-cyan/25" leftIcon={<Play className="w-4 h-4 fill-yogneet-navy" />}>
                  Resume Lesson
                </Button>
              </Link>
              <Link to="/coding">
                <Button variant="secondary" size="md" className="border-slate-700 bg-white/10 hover:bg-white/20 text-white" leftIcon={<Code2 className="w-4 h-4 text-yogneet-orange" />}>
                  Solve Daily Problem
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
              Tech Geek Adarsh
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
          to="/coding"
          className="group rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-3.5 hover:border-yogneet-orange/50 hover:shadow-lg hover:shadow-yogneet-orange/10 transition-all flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-yogneet-orange/25 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-yogneet-orange">
            <Code2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-yogneet-orange transition-colors truncate">
              Coding Arena
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Daily Challenges
            </p>
          </div>
        </Link>

        <Link
          to="/community"
          className="group rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-3.5 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-purple-500 dark:text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-400 transition-colors truncate">
              Community Forum
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Discussions &amp; Help
            </p>
          </div>
        </Link>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card padding="sm" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Play className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Enrolled Courses
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              2 Courses
            </p>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Coding Solved
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {currentUser.solvedProblemsCount || 47} / 150
            </p>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tests Taken
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {currentUser.testsCompletedCount || 6} Tests
            </p>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Average Score
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              86%
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
              All Courses <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

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
                  {currentLesson.duration}
                </span>
              </div>

              {/* Lesson details */}
              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                <div>
                  <Badge variant="brand" size="sm" className="mb-2">
                    {currentLesson.moduleName}
                  </Badge>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {currentLesson.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {currentLesson.description}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      <span>Module Progress</span>
                      <span>65%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full w-[65%]" />
                    </div>
                  </div>
                  <Link to={`/videos?lesson=${currentLesson.id}`}>
                    <Button size="sm">Resume</Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          {/* Recently Watched Videos Row */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Recent Lectures
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Tech Geek Adarsh Channel
              </span>
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
                      {video.duration}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <span className="text-[10px] font-semibold text-brand-500 uppercase">
                        {video.courseTitle.split(' ')[0]}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-brand-500 transition-colors">
                        {video.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{video.duration}</span>
                      {video.completed && (
                        <span className="flex items-center gap-0.5 text-emerald-500 ml-auto font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Done
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Upcoming Assessments & Quick Notes */}
        <div className="space-y-6">
          {/* Upcoming Tests Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                Scheduled Assessments
              </h3>
              <Link to="/tests" className="text-xs font-semibold text-brand-500 hover:text-brand-600">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {tests.slice(0, 2).map(test => (
                <Card key={test.id} padding="sm" className="space-y-2.5">
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
                      <Button size="sm">
                        {test.lastScore !== undefined ? 'Retake' : 'Start'}
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
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
              Download curated PDF notes with diagrams, time complexities, and interview formulas prepared by Tech Geek Adarsh.
            </p>
            <Link to="/notes" className="block">
              <Button variant="outline" size="sm" className="w-full">
                Explore Notes Library
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* Upcoming Competitions & Hackathons Section */}
      <div className="space-y-4 pt-4 border-t border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Upcoming Competitions & Hackathons
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Demonstration events • Compete with peers and test your engineering skills
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map(event => (
            <Card
              key={event.id}
              padding="md"
              className="space-y-3 border-l-4 border-l-brand-500 hover:border-slate-300 dark:hover:border-blue-500/40 dark:hover:shadow-[0_4px_20px_-2px_rgba(59,130,246,0.12)] transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant="purple" size="sm">
                    {event.category}
                  </Badge>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {event.title}
                  </h3>
                </div>
                {event.registered ? (
                  <Badge variant="success" size="sm">
                    Registered
                  </Badge>
                ) : (
                  <Badge variant="outline" size="sm">
                    Open
                  </Badge>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                {event.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-light-border dark:border-dark-border">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-brand-500" /> {event.date}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> {event.participantsCount} Joined
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 ml-auto">
                  {event.prizes.split('+')[0]}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <Button
                  size="sm"
                  variant={event.registered ? 'outline' : 'primary'}
                  onClick={() => setSelectedEvent(event)}
                >
                  {event.registered ? 'View Pass / Details' : 'Register Now'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Event Details & Registration Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={selectedEvent.title}
          description={`Demo event: ${selectedEvent.category} • Scheduled for ${selectedEvent.date}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
              📌 <strong>Prototype Demonstration Notice</strong>: This event data is realistic mock data. No real payment or external registration is required in this frontend phase.
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Event Overview
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedEvent.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-y border-light-border dark:border-dark-border text-xs">
              <div>
                <span className="text-slate-400">Date & Time:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedEvent.date} ({selectedEvent.time})
                </p>
              </div>
              <div>
                <span className="text-slate-400">Duration:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedEvent.duration}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Prize Pool:</span>
                <p className="font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                  {selectedEvent.prizes}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Registered Participants:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedEvent.participantsCount} Engineers
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
              <Button
                size="sm"
                variant={selectedEvent.registered ? 'danger' : 'success'}
                onClick={() => handleRegister(selectedEvent)}
              >
                {selectedEvent.registered ? 'Cancel Registration' : 'Confirm Free Registration'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
