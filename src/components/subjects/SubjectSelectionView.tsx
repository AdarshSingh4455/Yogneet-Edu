import React, { useState, useEffect, useMemo } from 'react';
import { SubjectService } from '../../services/subjectService';
import { Subject } from '../../types';
import {
  Code,
  Database,
  Globe,
  Brain,
  Cpu,
  Server,
  BookOpen,
  Terminal,
  Layers,
  Search,
  ArrowRight,
  Sparkles,
  Video,
  FileText,
  FileCode,
  CheckSquare,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export interface SubjectSelectionViewProps {
  moduleTitle: string;
  moduleSubtitle: string;
  moduleType: 'videos' | 'notes' | 'practical' | 'tests';
  onSelectSubject: (subject: Subject) => void;
  selectedSubjectName?: string;
}

export function getSubjectIcon(iconName: string): React.ComponentType<{ className?: string }> {
  switch (iconName?.toLowerCase()) {
    case 'code':
      return Code;
    case 'database':
    case 'dbms':
      return Database;
    case 'globe':
    case 'web':
      return Globe;
    case 'brain':
    case 'ai':
      return Brain;
    case 'cpu':
    case 'dsa':
      return Cpu;
    case 'server':
    case 'cloud':
      return Server;
    case 'terminal':
      return Terminal;
    case 'layers':
      return Layers;
    case 'bookopen':
    default:
      return BookOpen;
  }
}

export const SubjectSelectionView: React.FC<SubjectSelectionViewProps> = ({
  moduleTitle,
  moduleSubtitle,
  moduleType,
  onSelectSubject,
  selectedSubjectName,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>(() => SubjectService.getActiveSubjectsSync());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    SubjectService.getActiveSubjects()
      .then(list => {
        if (isMounted) {
          setSubjects(list);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const q = searchQuery.toLowerCase();
    return subjects.filter(
      s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }, [subjects, searchQuery]);

  const getContentBadge = (subject: Subject) => {
    switch (moduleType) {
      case 'videos':
        return `${subject.contentCounts.videos || 6}+ Lessons`;
      case 'notes':
        return `${subject.contentCounts.notes || 10}+ Notes & PDFs`;
      case 'practical':
        return `${subject.contentCounts.assignments || 4}+ Projects`;
      case 'tests':
        return `${subject.contentCounts.testSeries || 5}+ Mock Exams`;
      default:
        return 'Available Content';
    }
  };

  const getModuleIcon = () => {
    switch (moduleType) {
      case 'videos':
        return <Video className="w-5 h-5 text-brand-500" />;
      case 'notes':
        return <FileText className="w-5 h-5 text-brand-500" />;
      case 'practical':
        return <FileCode className="w-5 h-5 text-brand-500" />;
      case 'tests':
        return <CheckSquare className="w-5 h-5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Module Subject Selection Hero */}
      <div className="rounded-3xl border border-light-border dark:border-dark-border bg-gradient-to-r from-brand-500/10 via-purple-500/10 to-brand-500/5 dark:from-blue-950/40 dark:via-purple-950/30 dark:to-blue-950/20 p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-cyan-300 border border-blue-300 dark:border-cyan-500/40 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" /> Subject-Wise Learning Pathway
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
              {getModuleIcon()}
              <span>{moduleTitle}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {moduleSubtitle}
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-72">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search curriculum subjects..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card/90 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Subject Cards */}
      {filteredSubjects.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            No subjects matched "{searchQuery}"
          </h3>
          <p className="text-xs text-slate-500">Try searching with a different term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map(subject => {
            const Icon = getSubjectIcon(subject.icon);
            const isSelected = selectedSubjectName === subject.name;

            return (
              <Card
                key={subject.id}
                hoverable
                onClick={() => onSelectSubject(subject)}
                className={`group cursor-pointer transition-all duration-200 border-2 ${
                  isSelected
                    ? 'border-brand-500 dark:border-cyan-400 ring-2 ring-brand-500/20'
                    : 'border-light-border dark:border-dark-border hover:border-brand-400 dark:hover:border-cyan-500/60'
                }`}
              >
                <div className="space-y-4">
                  {/* Card top banner with icon */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 dark:from-brand-500/20 dark:to-purple-500/20 border border-brand-500/20 text-brand-600 dark:text-cyan-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>

                    <Badge variant="brand" size="sm">
                      {getContentBadge(subject)}
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-cyan-300 transition-colors">
                      {subject.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {subject.description}
                    </p>
                  </div>

                  {/* Card Footer Action */}
                  <div className="pt-2 flex items-center justify-between border-t border-light-border dark:border-dark-border text-xs font-semibold text-brand-600 dark:text-cyan-400">
                    <span>Explore Subject Curriculum</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
