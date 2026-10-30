import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PracticalAssignment } from '../../types';
import { PracticalAssignmentsService } from '../../services/practicalAssignmentsService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  FileCode,
  Download,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  Award,
  ArrowRight,
  BookOpen,
  Video,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

export const PracticalAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<PracticalAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState<PracticalAssignment | null>(null);

  useEffect(() => {
    const loadAssignments = async () => {
      setIsLoading(true);
      try {
        const data = await PracticalAssignmentsService.getAssignments(undefined, true);
        setAssignments(data);
      } catch (err) {
        console.error('Failed to load practical assignments:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAssignments();
  }, []);

  const subjects = Array.from(new Set(assignments.map((a) => a.subject))).filter(Boolean);

  const filteredAssignments = assignments.filter((a) => {
    if (subjectFilter !== 'all' && a.subject !== subjectFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchSubject = a.subject.toLowerCase().includes(q);
      const matchModule = a.module.toLowerCase().includes(q);
      const matchProblem = a.problemStatement.toLowerCase().includes(q);
      if (!matchTitle && !matchSubject && !matchModule && !matchProblem) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 4-Step Learning Journey Banner */}
      <div className="rounded-3xl border border-light-border dark:border-dark-border bg-gradient-to-r from-brand-500/10 via-purple-500/10 to-brand-500/5 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-cyan-300 border border-brand-200 dark:border-brand-800">
              <Sparkles className="w-3 h-3" /> Step 3: Practical Projects & Assignments
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Lecture-Wise Practical Assignments
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Hands-on coding challenges and real-world implementation projects designed to bridge theoretical concepts and exam readiness. Complete with official rubrics and downloadable PDFs.
            </p>
          </div>

          <Link to="/tests">
            <Button
              variant="outline"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs shrink-0 font-semibold"
            >
              Step 4: Test Series
            </Button>
          </Link>
        </div>

        {/* 4 Steps Quick Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-dark-border/60 text-xs">
          <Link
            to="/videos"
            className="p-2.5 rounded-xl bg-white/60 dark:bg-dark-card/60 border border-light-border dark:border-dark-border flex items-center gap-2 hover:border-brand-400 transition-colors"
          >
            <Video className="w-4 h-4 text-brand-500 shrink-0" />
            <div className="truncate">
              <p className="text-[10px] text-slate-400 uppercase font-bold">1. Learn</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">Video Lessons</p>
            </div>
          </Link>

          <Link
            to="/notes"
            className="p-2.5 rounded-xl bg-white/60 dark:bg-dark-card/60 border border-light-border dark:border-dark-border flex items-center gap-2 hover:border-brand-400 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="truncate">
              <p className="text-[10px] text-slate-400 uppercase font-bold">2. Revise</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">Study Notes</p>
            </div>
          </Link>

          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <div className="truncate">
              <p className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-bold">3. Practice</p>
              <p className="font-bold text-purple-900 dark:text-purple-200 truncate">Practical Coding</p>
            </div>
          </div>

          <Link
            to="/tests"
            className="p-2.5 rounded-xl bg-white/60 dark:bg-dark-card/60 border border-light-border dark:border-dark-border flex items-center gap-2 hover:border-brand-400 transition-colors"
          >
            <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="truncate">
              <p className="text-[10px] text-slate-400 uppercase font-bold">4. Evaluate</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">Test Series & Mocks</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white dark:bg-dark-card border-light-border dark:border-dark-border">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search practical assignments by problem, subject, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-auto"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Assignments List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading assignments...</div>
      ) : filteredAssignments.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-dark-border space-y-2">
          <FileCode className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No practical assignments found.
          </p>
          <p className="text-xs text-slate-400">
            Try adjusting your search filter or check back later as faculty post new assignments.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((asg) => (
            <Card
              key={asg.id}
              className="p-5 bg-white dark:bg-dark-card border-light-border dark:border-dark-border flex flex-col justify-between hover:border-brand-400 dark:hover:border-blue-700 transition-all shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-cyan-950/40 text-brand-700 dark:text-cyan-300 border border-brand-200 dark:border-cyan-800">
                    {asg.subject} &bull; {asg.module}
                  </span>
                  <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">
                    {asg.totalMarks} Marks
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {asg.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {asg.problemStatement}
                  </p>
                </div>

                {asg.topics && asg.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {asg.topics.slice(0, 3).map((topic, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-400"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 dark:border-dark-border/60 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => PracticalAssignmentsService.downloadPdf(asg)}
                  leftIcon={<Download className="w-3.5 h-3.5 text-brand-500" />}
                  className="text-xs"
                >
                  Download PDF
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedAssignment(asg)}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Details & Rubric Modal */}
      {selectedAssignment && (
        <Modal
          isOpen={Boolean(selectedAssignment)}
          onClose={() => setSelectedAssignment(null)}
          title={`Practical Assignment: ${selectedAssignment.title}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
              <div>
                <span className="font-extrabold text-sm text-purple-950 dark:text-purple-200">
                  {selectedAssignment.subject} &bull; {selectedAssignment.module}
                </span>
                <p className="text-purple-700 dark:text-purple-400">Total Marks: {selectedAssignment.totalMarks}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => PracticalAssignmentsService.downloadPdf(selectedAssignment)}
                leftIcon={<Download className="w-3.5 h-3.5 text-purple-600" />}
                className="bg-white dark:bg-dark-card"
              >
                Official PDF Guide
              </Button>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">
                1. Architectural Problem Statement
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-dark-bg p-3 rounded-xl border border-light-border dark:border-dark-border">
                {selectedAssignment.problemStatement}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">
                2. Step-by-Step Instructions & Deliverables
              </h4>
              <div className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-dark-bg p-3 rounded-xl border border-light-border dark:border-dark-border whitespace-pre-wrap font-mono text-[11px]">
                {selectedAssignment.instructions}
              </div>
            </div>

            {selectedAssignment.rubric && selectedAssignment.rubric.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">
                  3. Official Evaluation Rubric
                </h4>
                <div className="space-y-1.5">
                  {selectedAssignment.rubric.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border"
                    >
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{r.criteria}</span>
                      <span className="font-bold text-brand-600 dark:text-cyan-400">{r.marks} Marks</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
              <span className="text-blue-800 dark:text-blue-300 font-medium">
                Finished practicing? Benchmark your performance with timed mock exams.
              </span>
              <Link to="/tests">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Go to Test Series
                </Button>
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
