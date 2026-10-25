import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  padding = 'md',
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={`rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text shadow-sm transition-all duration-200 ${
        hoverable ? 'hover:border-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-dark-card/95 hover:shadow-md dark:hover:shadow-[0_4px_20px_-2px_rgba(59,130,246,0.12)]' : ''
      } ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
