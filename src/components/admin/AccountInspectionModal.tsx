import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EnrollmentNumberBadge } from '../common/EnrollmentNumberBadge';
import { PremiumStudentService } from '../../services/premiumStudentService';
import { AccountInspection } from '../../types';
import {
  User,
  GraduationCap,
  Award,
  Video,
  FileText,
  Clock,
  CheckCircle2,
  BookOpen,
  Calendar,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  BarChart3,
  TrendingUp,
  XCircle,
} from 'lucide-react';

interface AccountInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
}

export const AccountInspectionModal: React.FC<AccountInspectionModalProps> = ({
  isOpen,
  onClose,
  studentId,
}) => {
  const [data, setData] = useState<AccountInspection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showImpersonationDisclaimer, setShowImpersonationDisclaimer] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setShowImpersonationDisclaimer(false);
    PremiumStudentService.getStudentInspectionData(studentId)
      .then(res => {
        setData(res);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load inspection data:', err);
        setIsLoading(false);
      });
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-cyan-300 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Student Account Inspection & Learning Metrics
              </h3>
              <Badge variant="purple" size="sm">
                READ-ONLY AUDIT
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inspect student progression, enrolled subjects, and assessment records.
            </p>
          </div>
        </div>
      }
    >
      {isLoading || !data ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Loading student inspection records...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Student Profile Header Card */}
          <div className="p-4 rounded-2xl border border-light-border dark:border-dark-border bg-slate-50/70 dark:bg-dark-card/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-100 border-2 border-brand-500/20 shrink-0">
                <img
                  src={
                    (data.student as any).avatar ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={data.student.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {data.student.name}
                  </h4>
                  <Badge variant="success" size="sm">
                    {data.student.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {data.student.email}
                  {(data.student as any).yogneetEmail && (
                    <span className="text-brand-600 dark:text-cyan-400 font-mono ml-2">
                      • {(data.student as any).yogneetEmail}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Right: Enrollment and Actions */}
            <div className="flex items-center gap-2.5">
              {data.enrollmentNumber && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Enrollment ID
                  </span>
                  <EnrollmentNumberBadge enrollmentNumber={data.enrollmentNumber} size="md" />
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImpersonationDisclaimer(true)}
                leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                View as Student
              </Button>
            </div>
          </div>

          {/* Impersonation Disclaimer Modal / Banner */}
          {showImpersonationDisclaimer && (
            <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Security Boundary: View as Student Inspection</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImpersonationDisclaimer(false)}
                  className="text-amber-700 hover:text-amber-900 font-bold"
                >
                  ✕
                </button>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                In accordance with security and isolation constraints, active session switching, cookie manipulation, and privilege escalation are disabled.
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                Student data inspection is presented in read-only mode backed by verified database records and compliance audit logs.
              </p>
            </div>
          )}

          {/* Metric Meters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Course Progress
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-brand-600 dark:text-cyan-400">
                  {data.learningProgress.completionPercentage}%
                </span>
                <span className="text-xs text-slate-400">completed</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Lessons Watched
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  {data.learningProgress.videosWatched}
                </span>
                <span className="text-xs text-slate-400">/ {data.learningProgress.totalVideos}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Watch Time
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
                  {data.learningProgress.watchHours}
                </span>
                <span className="text-xs text-slate-400">hours</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Notes & PDFs
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {data.notesSummary.pdfsDownloaded}
                </span>
                <span className="text-xs text-slate-400">downloaded</span>
              </div>
            </div>
          </div>

          {/* Enrolled Subjects & Assessment History Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Enrolled Subjects */}
            <div className="p-4 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-light-border dark:border-dark-border">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-brand-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Enrolled Subjects
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">{data.enrolledSubjects.length} enrolled</span>
              </div>

              <div className="space-y-3">
                {data.enrolledSubjects.map(subj => (
                  <div key={subj.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{subj.name}</span>
                      <span className="text-slate-500 text-[11px]">{subj.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-dark-bg h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 dark:bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${subj.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">Last accessed {subj.lastAccessed}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessment History */}
            <div className="p-4 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-light-border dark:border-dark-border">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Assessment Scores
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">{data.assessmentHistory.length} completed</span>
              </div>

              <div className="space-y-2.5">
                {data.assessmentHistory.map(test => (
                  <div
                    key={test.id}
                    className="p-2.5 rounded-lg border border-light-border dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{test.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(test.submittedAt).toLocaleDateString()} • {test.percentile}th percentile
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`font-bold ${
                          test.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                        }`}
                      >
                        {test.score}/{test.maxScore} ({test.percentage}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="p-4 rounded-xl border border-light-border dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/50 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Recent Activity Audit Summary
            </span>
            <div className="space-y-2">
              {data.activityTimeline.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                  <div className="flex-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.action}: </span>
                    <span className="text-slate-600 dark:text-slate-400">{item.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{item.timestamp}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-light-border dark:border-dark-border">
            <Button variant="secondary" onClick={onClose}>
              Close Inspection
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
