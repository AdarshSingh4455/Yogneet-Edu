import React, { useState } from 'react';

export interface BarDataPoint {
  label: string;
  value: number;
  subtext?: string;
  color?: string;
  badge?: string;
}

interface ResponsiveBarChartProps {
  data: BarDataPoint[];
  title?: string;
  max?: number;
  unit?: string;
  emptyMessage?: string;
  className?: string;
  showValues?: boolean;
}

export const ResponsiveBarChart: React.FC<ResponsiveBarChartProps> = ({
  data,
  title,
  max = 100,
  unit = '%',
  emptyMessage = 'No module progress recorded yet.',
  className = '',
  showValues = true,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className={`p-6 rounded-2xl bg-slate-50 dark:bg-dark-bg/50 border border-dashed border-slate-200 dark:border-dark-border text-center ${className}`}>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  const effectiveMax = Math.max(max, ...data.map(d => d.value), 1);

  return (
    <div className={`space-y-3.5 ${className}`}>
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {title}
          </h4>
        </div>
      )}

      <div className="space-y-3">
        {data.map((item, idx) => {
          const percentage = Math.min(100, Math.max(0, Math.round((item.value / effectiveMax) * 100)));
          const isHovered = hoveredIdx === idx;
          const barColor = item.color || '#3b82f6';

          return (
            <div
              key={idx}
              className="space-y-1.5 p-2 rounded-xl transition-colors hover:bg-slate-50/80 dark:hover:bg-dark-hover/40"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Header: Label & Value */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className={`font-semibold truncate transition-colors ${
                    isHovered ? 'text-brand-600 dark:text-cyan-400 font-bold' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-dark-hover font-mono text-slate-500">
                      {item.badge}
                    </span>
                  )}
                </div>

                {showValues && (
                  <span className="font-mono text-xs font-bold shrink-0 text-slate-700 dark:text-slate-300">
                    {item.value}{unit}
                  </span>
                )}
              </div>

              {/* Bar track and progress fill */}
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-dark-hover overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>

              {item.subtext && (
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>{item.subtext}</span>
                  {isHovered && (
                    <span className="font-mono text-slate-400">{percentage}% completion</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
