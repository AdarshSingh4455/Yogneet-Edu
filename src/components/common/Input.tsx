import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input_${Math.random().toString(36).substr(2, 4)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none shrink-0">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full rounded-xl border bg-white dark:bg-dark-card/90 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-blue-500/40 dark:focus:border-blue-400 dark:focus:bg-dark-selected/50 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightIcon ? 'pr-10' : 'pr-3.5'} py-2.5 ${
            error
              ? 'border-rose-500 focus:ring-rose-500'
              : 'border-light-border dark:border-dark-border hover:border-slate-300 dark:hover:border-blue-800/60'
          } ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 text-slate-400 shrink-0">
            {rightIcon}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-rose-500 mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
