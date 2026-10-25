import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/20 focus:ring-brand-500 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus:ring-offset-dark-bg focus:ring-offset-light-bg',
    secondary:
      'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-dark-card dark:hover:bg-dark-hover dark:hover:border-blue-700/50 dark:hover:text-blue-200 dark:text-dark-text border border-light-border dark:border-dark-border focus:ring-brand-500',
    outline:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-dark-selected dark:hover:border-blue-500/60 dark:hover:text-blue-200 text-slate-700 dark:text-slate-200 border border-light-border dark:border-dark-border focus:ring-brand-500',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-300 text-slate-600 hover:text-slate-900 dark:text-slate-300 focus:ring-brand-500',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20 focus:ring-rose-500',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 focus:ring-emerald-500',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
