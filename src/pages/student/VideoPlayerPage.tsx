import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { VideoLesson, VideoResource } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Play,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Code,
  Link as LinkIcon,
  MessageSquare,
  Send,
  Sparkles,
  Info,
  Youtube,
  BookOpen,
  FileCode,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';

export const VideoPlayerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const [videos, setVideos] = useState<VideoLesson[]>(() => ApiService.getVideos());
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'discussion' | 'upnext'>('overview');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([
    {
      id: 'c1',
      author: 'Sneha Rao',
      time: '2 hours ago',
      text: 'The explanation of Python cyclic garbage collection around 14:20 was crystal clear! Thank you Adarsh sir.',
    },
    {
      id: 'c2',
      author: 'Ravi Kumar',
      time: '1 day ago',
      text: 'Are we getting free-threaded GIL benchmarks in the next lecture as well?',
    },
  ]);

  const lessonIdFromUrl = searchParams.get('lesson');
  const activeLesson = videos.find(v => v.id === lessonIdFromUrl) || videos[0];
  const activeIndex = videos.findIndex(v => v.id === activeLesson.id);

  const prevLesson = activeIndex > 0 ? videos[activeIndex - 1] : null;
  const nextLesson = activeIndex < videos.length - 1 ? videos[activeIndex + 1] : null;

  const handleSelectLesson = (lesson: VideoLesson) => {
    setSearchParams({ lesson: lesson.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleCompletion = () => {
    const isNowDone = ApiService.toggleLessonCompletion(activeLesson.id);
    setVideos(ApiService.getVideos());
    if (isNowDone) {
      toast.success('Lesson Completed!', `"${activeLesson.title}" marked as complete.`);
    } else {
      toast.info('Lesson Marked Incomplete');
    }
  };

  const handleDownloadResource = (res: VideoResource) => {
    if (!res.hasDownload) {
      if (res.url) {
        window.open(res.url, '_blank');
      }
      return;
    }
    toast.success('Downloading Resource', `Downloading "${res.title}" (${res.size || 'PDF'})...`);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([
      {
        id: `c_${Date.now()}`,
        author: 'You (Alex Rivera)',
        time: 'Just now',
        text: newComment.trim(),
      },
      ...comments,
    ]);
    setNewComment('');
    toast.success('Comment Posted', 'Your question has been shared with the class.');
  };

  const completedCount = videos.filter(v => v.completed).length;
  const progressPct = Math.round((completedCount / videos.length) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Course Context Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-500 uppercase tracking-wider">
            <Youtube className="w-4 h-4 text-red-500 inline-block" />
            <span>{activeLesson.courseTitle}</span>
            <span>•</span>
            <span>{activeLesson.moduleName}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {activeLesson.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant={activeLesson.completed ? 'success' : 'outline'}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
            onClick={handleToggleCompletion}
          >
            {activeLesson.completed ? 'Completed' : 'Mark as Complete'}
          </Button>
        </div>
      </div>

      {/* Main Grid: Player on left, Course Playlist on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Responsive Video Player + Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Responsive 16:9 YouTube Container */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-light-border dark:border-dark-border">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${activeLesson.youtubeId}?rel=0&modestbranding=1`}
              title={activeLesson.title}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Navigation Controls: Prev / Next */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-dark-card border border-light-border dark:border-dark-border">
            <Button
              size="sm"
              variant="outline"
              disabled={!prevLesson}
              onClick={() => prevLesson && handleSelectLesson(prevLesson)}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous Lesson
            </Button>

            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Lesson {activeIndex + 1} of {videos.length}
            </span>

            <Button
              size="sm"
              variant="primary"
              disabled={!nextLesson}
              onClick={() => nextLesson && handleSelectLesson(nextLesson)}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next Lesson
            </Button>
          </div>

          {/* Tabs Navigation */}
          <div>
            <div className="flex items-center border-b border-light-border dark:border-dark-border gap-2 sm:gap-6 text-sm font-semibold">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-brand-500 text-brand-500 dark:text-blue-400 dark:border-blue-500 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-blue-200'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'resources'
                    ? 'border-brand-500 text-brand-500 dark:text-blue-400 dark:border-blue-500 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-blue-200'
                }`}
              >
                Resources & Notes
                <Badge variant="brand" size="sm">
                  {activeLesson.resources.length}
                </Badge>
              </button>
              <button
                onClick={() => setActiveTab('discussion')}
                className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'discussion'
                    ? 'border-brand-500 text-brand-500 dark:text-blue-400 dark:border-blue-500 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-blue-200'
                }`}
              >
                Discussion
                <Badge variant="default" size="sm">
                  {comments.length}
                </Badge>
              </button>
              <button
                onClick={() => setActiveTab('upnext')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'upnext'
                    ? 'border-brand-500 text-brand-500 dark:text-blue-400 dark:border-blue-500 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-blue-200'
                }`}
              >
                Up Next
              </button>
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="pt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Lesson Description
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {activeLesson.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Key Topics Covered
                  </h3>
                  <ul className="space-y-2">
                    {activeLesson.overview.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 4-Stage Next Steps Callout */}
                <div className="p-4 rounded-2xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-cyan-400">
                      Next Steps in Your Learning Journey
                    </span>
                    <span className="text-[10px] text-slate-400">Learn &rarr; Revise &rarr; Practice &rarr; Evaluate</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Link
                      to="/notes"
                      className="p-3 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border hover:border-emerald-400 transition-colors flex items-center gap-2.5"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Step 2</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Read Notes</p>
                      </div>
                    </Link>

                    <Link
                      to="/practical"
                      className="p-3 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border hover:border-purple-400 transition-colors flex items-center gap-2.5"
                    >
                      <FileCode className="w-4 h-4 text-purple-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Step 3</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Practice Coding</p>
                      </div>
                    </Link>

                    <Link
                      to="/tests"
                      className="p-3 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border hover:border-amber-400 transition-colors flex items-center gap-2.5"
                    >
                      <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Step 4</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Take Test Series</p>
                      </div>
                    </Link>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-card border border-light-border dark:border-dark-border text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-brand-500 shrink-0" />
                  <span>
                    Embedded directly via YouTube privacy-enhanced mode. Video hosted by <strong>Tech Geek Adarsh</strong>.
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: Resources & Downloadable Notes */}
            {activeTab === 'resources' && (
              <div className="pt-4 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Attached revision notes, source code repositories, and references for this lesson:
                </p>

                <div className="space-y-2">
                  {activeLesson.resources.map(res => (
                    <div
                      key={res.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card hover:border-slate-300 dark:hover:border-blue-700/50 dark:hover:bg-dark-hover/60 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          {res.type === 'pdf' ? (
                            <FileText className="w-4 h-4" />
                          ) : res.type === 'code' ? (
                            <Code className="w-4 h-4" />
                          ) : (
                            <LinkIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                            {res.title}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {res.type.toUpperCase()} {res.size ? `• ${res.size}` : ''}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={res.hasDownload ? 'outline' : 'ghost'}
                        onClick={() => handleDownloadResource(res)}
                        leftIcon={res.hasDownload ? <Download className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                      >
                        {res.hasDownload ? 'Download' : 'Open Link'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Discussion */}
            {activeTab === 'discussion' && (
              <div className="pt-4 space-y-5">
                <form onSubmit={handlePostComment} className="space-y-3">
                  <textarea
                    rows={3}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Ask a question or share a thought on this lecture..."
                    className="w-full p-3 text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" type="submit" leftIcon={<Send className="w-3.5 h-3.5" />}>
                      Post Comment
                    </Button>
                  </div>
                </form>

                <div className="space-y-3">
                  {comments.map(c => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card/60 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {c.author}
                        </span>
                        <span className="text-[11px] text-slate-400">{c.time}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        {c.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Up Next */}
            {activeTab === 'upnext' && (
              <div className="pt-4 space-y-3">
                {nextLesson ? (
                  <Card padding="md" className="space-y-3 border-l-4 border-l-brand-500">
                    <span className="text-xs font-semibold text-brand-500 uppercase tracking-wider">
                      Next in Course
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {nextLesson.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {nextLesson.description}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-slate-500">Duration: {nextLesson.duration}</span>
                      <Button size="sm" onClick={() => handleSelectLesson(nextLesson)}>
                        Start Next Lesson
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    🎉 You have reached the final lesson in this module! Check out the Test Series to assess your knowledge.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Course Playlist & Progress */}
        <div className="space-y-6">
          <Card padding="md" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Course Progress
                </h3>
                <span className="text-xs font-bold text-brand-500">{progressPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                {completedCount} of {videos.length} lessons completed
              </p>
            </div>

            {/* Playlist Item List */}
            <div className="space-y-2 pt-2 border-t border-light-border dark:border-dark-border">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Lessons in this module
              </p>
              {videos.map((lesson, idx) => {
                const isSelected = lesson.id === activeLesson.id;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/70 dark:bg-dark-selected dark:border-blue-500 dark:shadow-[0_0_12px_rgba(59,130,246,0.18)]'
                        : 'border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover dark:hover:border-blue-900/40'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-400 shrink-0 mt-0.5">
                      {idx + 1}.
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold line-clamp-2 ${isSelected ? 'text-brand-600 dark:text-blue-300' : 'text-slate-900 dark:text-slate-100'}`}>
                        {lesson.title}
                      </p>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                        {lesson.duration}
                      </span>
                    </div>

                    {lesson.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
