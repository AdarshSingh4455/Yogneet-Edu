import React, { useState } from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  subtext?: string;
}

interface ActivityDonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerTitle?: string;
  centerSubtitle?: string;
  emptyMessage?: string;
  className?: string;
}

export const ActivityDonutChart: React.FC<ActivityDonutChartProps> = ({
  segments,
  size = 140,
  strokeWidth = 14,
  centerTitle,
  centerSubtitle,
  emptyMessage = 'No activity logged yet',
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0 || segments.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 text-center ${className}`}>
        <div
          className="rounded-full border-4 border-dashed border-slate-200 dark:border-dark-border flex items-center justify-center text-slate-300 dark:text-slate-600 mb-2"
          style={{ width: size, height: size }}
        >
          <span className="text-xs font-mono font-bold">0</span>
        </div>
        <p className="text-xs text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const renderedArcs = segments.map((seg, idx) => {
    const fraction = seg.value / total;
    const dashLength = fraction * circumference;
    const offset = currentOffset;
    currentOffset += dashLength;

    return {
      ...seg,
      dashLength,
      offset,
      fraction,
    };
  });

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {renderedArcs.map((arc, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={arc.color}
                strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
                strokeDashoffset={-arc.offset}
                fill="transparent"
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
          {hoveredIndex !== null ? (
            <>
              <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                {segments[hoveredIndex].value}
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">
                {segments[hoveredIndex].label}
              </span>
            </>
          ) : (
            <>
              <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                {centerTitle || total}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {centerSubtitle || 'Total Items'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full text-xs">
        {segments.map((seg, i) => {
          const isHovered = hoveredIndex === i;
          const percent = Math.round((seg.value / total) * 100);
          return (
            <div
              key={i}
              className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                isHovered ? 'bg-slate-100 dark:bg-dark-hover font-bold' : ''
              }`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate text-slate-700 dark:text-slate-300 text-[11px]">
                  {seg.label}
                </span>
              </div>
              <span className="font-mono text-slate-400 text-[11px] shrink-0">
                {percent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
