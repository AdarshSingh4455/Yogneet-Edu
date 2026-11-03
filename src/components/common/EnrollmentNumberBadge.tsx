import React, { useState } from 'react';
import { Hash, Copy, Check, Info } from 'lucide-react';

interface EnrollmentNumberBadgeProps {
  enrollmentNumber: string;
  size?: 'sm' | 'md' | 'lg';
  showCopy?: boolean;
  className?: string;
}

export const EnrollmentNumberBadge: React.FC<EnrollmentNumberBadgeProps> = ({
  enrollmentNumber,
  size = 'md',
  showCopy = true,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  // Extract year (first 4 digits) and sequence (remaining digits)
  const isStandardFormat = /^\d{4}\d+$/.test(enrollmentNumber);
  const yearPart = isStandardFormat ? enrollmentNumber.slice(0, 4) : '';
  const seqPart = isStandardFormat ? enrollmentNumber.slice(4) : enrollmentNumber;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(enrollmentNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5 font-mono',
  };

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-purple-200/90 dark:border-purple-800/60 bg-gradient-to-r from-purple-50/90 to-indigo-50/70 dark:from-purple-950/40 dark:to-indigo-950/30 text-purple-900 dark:text-purple-200 font-mono tracking-wider font-semibold shadow-xs select-all group relative ${sizeClasses[size]} ${className}`}
      title="Format: Admission Year + Sequential Identifier"
    >
      <Hash className="w-3.5 h-3.5 text-purple-500 shrink-0" />
      <span className="flex items-center">
        {isStandardFormat ? (
          <>
            <span className="text-purple-700 dark:text-purple-300 font-bold">{yearPart}</span>
            <span className="text-indigo-600 dark:text-cyan-400 font-extrabold">{seqPart}</span>
          </>
        ) : (
          <span>{enrollmentNumber}</span>
        )}
      </span>

      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="p-0.5 rounded hover:bg-purple-200/60 dark:hover:bg-purple-800/60 text-purple-600 dark:text-purple-400 transition-colors"
          title="Copy Enrollment ID"
          aria-label="Copy Enrollment Number"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
};
