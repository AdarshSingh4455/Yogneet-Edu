import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MicroLessonsService } from '../../services/microLessonsService';
import { MicroSubject, MicroLesson } from '../../types';
import { MicroShortsPlayer } from '../../components/microlessons/MicroShortsPlayer';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Film,
  Play,
  Sparkles,
  ArrowRight,
  Search,
  BookOpen,
  Layers,
  Flame,
} from 'lucide-react';

export const MicroLessonsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [microSubjects, setMicroSubjects] = useState<MicroSubject[]>(() =>
    MicroLessonsService.getActiveMicroSubjectsSync()
  );
  const [allLessons, setAllLessons] = useState<MicroLesson[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<MicroSubject | null>(null);
  const [subjectLessons, setSubjectLessons] = useState<MicroLesson[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const subjectParam = searchParams.get('subject');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    Promise.all([
      MicroLessonsService.getActiveMicroSubjects(),
      MicroLessonsService.getAllLessons(),
    ]).then(([subjects, lessons]) => {
      if (isMounted) {
        setMicroSubjects(subjects);
        setAllLessons(lessons);

        // Check if query param subject is present
        if (subjectParam) {
          const matched = subjects.find((s: MicroSubject) => s.id === subjectParam || s.slug === subjectParam);
          if (matched) {
            setSelectedSubject(matched);
            setSubjectLessons(lessons.filter((l: MicroLesson) => l.microSubjectId === matched.id));
          }
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [subjectParam]);

  const handleSelectSubject = (subj: MicroSubject) => {
    setSelectedSubject(subj);
    setSubjectLessons(allLessons.filter(l => l.microSubjectId === subj.id));
    setSearchParams({ subject: subj.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setSubjectLessons([]);
    setSearchParams({});
  };

  // If a subject is selected, render the vertical 9:16 Shorts Player!
  if (selectedSubject) {
    return (
      <MicroShortsPlayer
        subject={selectedSubject}
        lessons={subjectLessons}
        onBackToSubjects={handleBackToSubjects}
      />
    );
  }

  // Filter subjects for the selection screen
  const filteredSubjects = microSubjects.filter(
    s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Banner */}
      <div className="rounded-3xl border border-light-border dark:border-dark-border bg-gradient-to-r from-purple-500/10 via-brand-500/10 to-indigo-500/10 p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <Flame className="w-3.5 h-3.5 text-rose-500" /> 9:16 Vertical Shorts Experience
              </span>
              <span className="text-xs text-slate-400 font-semibold">• 60-Second Mastery</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
              <Film className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              <span>Micro Lessons & Quick Code Tricks</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Bite-sized, vertical YouTube Shorts designed for rapid recall, algorithmic shortcuts, interview tips, and modern programming patterns.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search micro topics..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Micro Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSubjects.map(subj => {
          const shortsInTopic = allLessons.filter(l => l.microSubjectId === subj.id);
          const count = shortsInTopic.length || subj.videoCount || 3;

          return (
            <Card
              key={subj.id}
              hoverable
              onClick={() => handleSelectSubject(subj)}
              className="cursor-pointer overflow-hidden border-2 border-light-border dark:border-dark-border hover:border-purple-500/60 dark:hover:border-purple-400/50 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* 16:9 Cover preview with 9:16 badge */}
                <div className="relative h-44 -mx-5 -mt-5 mb-4 overflow-hidden bg-slate-900">
                  <img
                    src={subj.coverImage}
                    alt={subj.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Badges on cover */}
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-full border border-white/20">
                      Vertical Shorts
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <div className="flex items-center gap-1.5 text-xs font-bold drop-shadow">
                      <Film className="w-4 h-4 text-purple-400" />
                      <span>{count} Shorts Lessons</span>
                    </div>

                    <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                    {subj.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {subj.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
                <span>Launch Shorts Player (9:16)</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
