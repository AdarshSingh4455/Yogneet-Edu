import React, { useEffect, useState } from 'react';
import { SubjectService } from '../../services/subjectService';
import { Subject } from '../../types';
import { BookOpen, ChevronDown, Check } from 'lucide-react';

interface SubjectSelectorProps {
  value: string;
  onChange: (subjectName: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  allowAll?: boolean;
  allLabel?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  value,
  onChange,
  label = 'Select Subject',
  error,
  helperText,
  allowAll = false,
  allLabel = 'All Subjects',
  required = false,
  placeholder = 'Choose a curriculum subject...',
  className = '',
  id,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>(() => SubjectService.getActiveSubjectsSync());
  const selectId = id || `subj_select_${Math.random().toString(36).substr(2, 5)}`;

  useEffect(() => {
    let isMounted = true;
    SubjectService.getActiveSubjects().then(list => {
      if (isMounted) setSubjects(list);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <BookOpen className="w-4 h-4" />
        </div>

        <select
          id={selectId}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          className={`w-full appearance-none rounded-xl border bg-white dark:bg-dark-card/90 text-slate-900 dark:text-slate-100 text-sm pl-10 pr-10 py-2.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-blue-500/40 dark:focus:border-blue-400 cursor-pointer ${
            error
              ? 'border-rose-500 focus:ring-rose-500'
              : 'border-light-border dark:border-dark-border hover:border-slate-300 dark:hover:border-blue-800/60'
          }`}
        >
          {placeholder && !allowAll && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}

          {allowAll && <option value="All">{allLabel}</option>}

          {subjects.map(s => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error ? (
        <p className="text-xs text-rose-500 mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
