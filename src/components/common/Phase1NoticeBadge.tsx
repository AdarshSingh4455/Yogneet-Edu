import React from 'react';
import { Sparkles, Info, ShieldAlert } from 'lucide-react';

interface Phase1NoticeBadgeProps {
  label?: string;
  variant?: 'subtle' | 'banner' | 'card';
  moduleName?: string;
}

export const Phase1NoticeBadge: React.FC<Phase1NoticeBadgeProps> = ({
  label,
  variant = 'subtle',
  moduleName = 'Phase 1 Frontend Preview',
}) => {
  if (variant === 'banner') {
    return (
      <div className="flex items-start sm:items-center gap-3 p-3.5 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-xs shadow-sm">
        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wide uppercase text-[10px] bg-blue-200/80 dark:bg-blue-800/80 text-blue-800 dark:text-blue-100 px-2 py-0.5 rounded-full">
              Phase 1 Preview Fixture
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Frontend Only • Non-Authoritative State
            </span>
          </div>
          <p className="mt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
            {label || `${moduleName} is operating in isolated preview mode. Mutations are evaluated in frontend reactive memory without executing Supabase migrations or backend writes.`}
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs">
        <div className="flex items-center gap-2 font-bold mb-1">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Phase 2 Integration Placeholder</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          {label || 'This operation interface is prepared for Phase 2 backend orchestration. No privilege elevation or direct session switching is performed in this preview phase.'}
        </p>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
      <Sparkles className="w-3 h-3 text-cyan-500" />
      <span>{label || 'Phase 1 Preview'}</span>
    </span>
  );
};
