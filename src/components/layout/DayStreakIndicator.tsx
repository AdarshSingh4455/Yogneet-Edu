import React, { useState, useEffect } from 'react';
import { Flame, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StreakService, StreakSummary } from '../../services/streakService';

interface DayStreakIndicatorProps {
  className?: string;
}

export const DayStreakIndicator: React.FC<DayStreakIndicatorProps> = ({ className = '' }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [showTooltip, setShowTooltip] = useState(false);
  const [streakData, setStreakData] = useState<StreakSummary | null>(null);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      StreakService.getMyStreakSummary()
        .then(summary => setStreakData(summary))
        .catch(err => console.warn('[DayStreakIndicator] Error fetching streak summary:', err));
    }
  }, [isAuthenticated, currentUser?.id]);

  const rawStreak = streakData?.currentStreak ?? (currentUser as any)?.dayStreak ?? (currentUser as any)?.streakCount ?? 0;
  const streak = typeof rawStreak === 'number' && !isNaN(rawStreak) && rawStreak > 0 ? rawStreak : 0;
  const isStreakActive = streak > 0;
  const hasActivityToday = streakData?.hasActivityToday ?? false;
  const longestStreak = streakData?.longestStreak ?? streak;

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      role="status"
      aria-label={`Daily Learning Streak: ${streak} days`}
    >
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer ${
          isStreakActive
            ? 'bg-gradient-to-r from-orange-500/15 to-amber-500/15 border-orange-500/40 text-orange-600 dark:text-orange-400 shadow-xs hover:border-orange-500'
            : 'bg-slate-100/70 dark:bg-dark-card border-light-border dark:border-dark-border text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
      >
        <Flame
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform ${
            isStreakActive
              ? 'text-orange-500 animate-pulse fill-orange-500/20'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        />
        <span className="font-extrabold tracking-tight text-[11px] sm:text-xs">
          {streak}
        </span>
        <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-semibold opacity-75">
          {streak === 1 ? 'Day' : 'Days'}
        </span>
      </div>

      {/* Hover/Focus Tooltip */}
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-56 p-3 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xl z-50 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                Daily Study Streak
              </span>
            </div>
            {hasActivityToday && (
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Done Today
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {isStreakActive
              ? `Great job! You've maintained a ${streak}-day active study habit on Yogneet Edu.`
              : 'Complete a lesson, practice test, or coding problem today to begin your streak.'}
          </p>
          <div className="pt-1.5 border-t border-light-border/60 dark:border-dark-border/60 flex items-center justify-between text-[9px] text-slate-400">
            <span>Longest Streak: <strong className="text-slate-700 dark:text-slate-300">{longestStreak}d</strong></span>
            <span>Active Days: <strong className="text-slate-700 dark:text-slate-300">{streakData?.totalActiveDays ?? 0}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
