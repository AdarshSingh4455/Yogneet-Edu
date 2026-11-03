import React from 'react';

interface MetricProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  subtext?: string;
  centerText?: string;
  className?: string;
}

export const MetricProgressRing: React.FC<MetricProgressRingProps> = ({
  percentage,
  size = 110,
  strokeWidth = 9,
  color = '#3b82f6',
  trackColor,
  label,
  subtext,
  centerText,
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className={trackColor || 'text-slate-100 dark:text-dark-hover'}
          />

          {/* Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight leading-none">
            {centerText || `${Math.round(clamped)}%`}
          </span>
          {subtext && (
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
              {subtext}
            </span>
          )}
        </div>
      </div>

      {label && (
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2 text-center">
          {label}
        </span>
      )}
    </div>
  );
};
