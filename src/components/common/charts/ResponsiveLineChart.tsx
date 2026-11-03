import React, { useState } from 'react';

export interface DataPoint {
  label: string;
  value: number;
  tooltipText?: string;
  date?: string;
}

interface ResponsiveLineChartProps {
  data: DataPoint[];
  title?: string;
  yMin?: number;
  yMax?: number;
  yUnit?: string;
  lineColor?: string;
  areaColor?: string;
  height?: number;
  emptyMessage?: string;
  className?: string;
}

export const ResponsiveLineChart: React.FC<ResponsiveLineChartProps> = ({
  data,
  title,
  yMin = 0,
  yMax = 100,
  yUnit = '%',
  lineColor = '#3b82f6',
  areaColor = 'rgba(59, 130, 246, 0.15)',
  height = 200,
  emptyMessage = 'No submission data available yet.',
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className={`w-full flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-dark-bg/50 border border-dashed border-slate-200 dark:border-dark-border ${className}`}
        style={{ minHeight: height }}
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-hover flex items-center justify-center text-slate-400 mb-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-center">{emptyMessage}</p>
        <span className="text-[11px] text-slate-400 text-center mt-0.5">Complete learning modules or timed tests to record your trend.</span>
      </div>
    );
  }

  const svgWidth = 600;
  const svgHeight = height;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Calculate points
  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? paddingLeft + chartWidth / 2
        : paddingLeft + (i / (data.length - 1)) * chartWidth;
    const clampedVal = Math.max(yMin, Math.min(yMax, d.value));
    const range = yMax - yMin || 1;
    const y = paddingTop + chartHeight - ((clampedVal - yMin) / range) * chartHeight;
    return { x, y, ...d };
  });

  // Construct SVG paths
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${
          paddingTop + chartHeight
        } Z`
      : '';

  // Y-axis grid ticks (4 ticks)
  const yTicks = [0, 0.33, 0.66, 1].map(fraction => {
    const val = Math.round(yMin + fraction * (yMax - yMin));
    const y = paddingTop + chartHeight - fraction * chartHeight;
    return { val, y };
  });

  return (
    <div className={`relative w-full ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {title}
          </h4>
          {hoveredIndex !== null && (
            <span className="text-xs font-mono font-bold text-brand-600 dark:text-cyan-400 animate-in fade-in">
              {data[hoveredIndex].label}: {data[hoveredIndex].value}
              {yUnit}
            </span>
          )}
        </div>
      )}

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none overflow-visible"
          style={{ minHeight: height }}
        >
          <defs>
            <linearGradient id={`gradient-${lineColor.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={svgWidth - paddingRight}
                y2={tick.y}
                stroke="currentColor"
                className="text-slate-200 dark:text-dark-border"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
              >
                {tick.val}
                {yUnit}
              </text>
            </g>
          ))}

          {/* Area fill */}
          {points.length > 1 && (
            <path
              d={areaPath}
              fill={`url(#gradient-${lineColor.replace(/[^a-zA-Z0-9]/g, '')})`}
            />
          )}

          {/* Line stroke */}
          {points.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points and tooltips */}
          {points.map((p, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g
                key={i}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible large target for easy mobile/desktop hover */}
                <circle cx={p.x} cy={p.y} r={16} fill="transparent" />

                {/* Point dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? '#ffffff' : lineColor}
                  stroke={lineColor}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150"
                />

                {/* X-axis label */}
                <text
                  x={p.x}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  className={`text-[10px] font-mono transition-colors ${
                    isHovered
                      ? 'fill-brand-600 dark:fill-cyan-400 font-bold'
                      : 'fill-slate-400 dark:fill-slate-500'
                  }`}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Hover Tooltip details */}
      {hoveredIndex !== null && (
        <div className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          <span>{data[hoveredIndex].tooltipText || `${data[hoveredIndex].label}: ${data[hoveredIndex].value}${yUnit}`}</span>
          {data[hoveredIndex].date && (
            <span className="font-mono text-[11px] text-slate-400 ml-1.5">({data[hoveredIndex].date})</span>
          )}
        </div>
      )}
    </div>
  );
};
