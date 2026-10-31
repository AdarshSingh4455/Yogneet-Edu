import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Sun, Moon, ShieldCheck, Lock, AlertOctagon } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  portalTitle: string;
  portalSubtitle?: string;
  badgeText?: string;
  badgeVariant?: 'brand' | 'purple' | 'success';
  storytellingPanel?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  portalTitle,
  portalSubtitle,
  badgeText,
  badgeVariant = 'brand',
  storytellingPanel,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isFatalConfigError, configError } = useAuth();

  const badgeColorClass =
    badgeVariant === 'purple'
      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      : badgeVariant === 'success'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-dark-text transition-colors duration-150 relative selection:bg-brand-500 selection:text-white">
      {/* Background Decorative Mesh Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-yogneet-navy via-[#12224A] to-[#0A1329] border border-yogneet-cyan/30 flex items-center justify-center shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform p-1">
            <img
              src="/brand/yogneet-emblem.png"
              alt="Yogneet Phoenix"
              className="w-7 h-7 object-contain drop-shadow"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-yogneet-cyan via-blue-400 to-yogneet-orange bg-clip-text text-transparent">
              YOGNEET EDU
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase -mt-0.5">
              Tech Geek Adarsh Hub
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Portal Switcher Shortcut */}
          <Link
            to="/portal"
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-cyan-400 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-dark-card transition-colors"
          >
            Portal Selection
          </Link>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-dark-card transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
        {storytellingPanel ? (
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Panel: Branding & Storytelling */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              {storytellingPanel}
            </div>

            {/* Right Panel: Authentication Form Card */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="w-full max-w-lg mx-auto space-y-5">
                {/* Card Header */}
                <div className="text-left space-y-2">
                  {badgeText && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border shadow-2xs ${badgeColorClass}`}
                    >
                      <Lock className="w-3 h-3" />
                      {badgeText}
                    </span>
                  )}
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    {portalTitle}
                  </h1>
                  {portalSubtitle && (
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {portalSubtitle}
                    </p>
                  )}
                </div>

                {/* Form Card */}
                <div className="rounded-3xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-6 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/40">
                  {isFatalConfigError && (
                    <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-2xs">
                      <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-rose-900 dark:text-rose-100">
                          Configuration Safety Lock Engaged
                        </p>
                        <p className="leading-relaxed">
                          {configError || 'Platform credentials are not configured for this production deployment. Authentication actions are locked to prevent unauthorized access.'}
                        </p>
                      </div>
                    </div>
                  )}
                  {children}
                </div>

                {/* Security Assurance Footer Note */}
                <div className="flex items-center justify-center gap-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>End-to-End Session Guard • Strict Role-Based Access Isolation</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-6">
            {/* Card Header */}
            <div className="text-center space-y-2">
              {badgeText && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border shadow-2xs ${badgeColorClass}`}
                >
                  <Lock className="w-3 h-3" />
                  {badgeText}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {portalTitle}
              </h1>
              {portalSubtitle && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {portalSubtitle}
                </p>
              )}
            </div>

            {/* Form Card */}
            <div className="rounded-3xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-6 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/40">
              {isFatalConfigError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-2xs">
                  <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-rose-900 dark:text-rose-100">
                      Configuration Safety Lock Engaged
                    </p>
                    <p className="leading-relaxed">
                      {configError || 'Platform credentials are not configured for this production deployment. Authentication actions are locked to prevent unauthorized access.'}
                    </p>
                  </div>
                </div>
              )}
              {children}
            </div>

            {/* Security Assurance Footer Note */}
            <div className="flex items-center justify-center gap-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>End-to-End Session Guard • Strict Role-Based Access Isolation</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-light-border/60 dark:border-dark-border/40">
        &copy; {new Date().getFullYear()} Yogneet Edu. Technical Learning, Practical Engineering &amp; Assessment Engine.
      </footer>
    </div>
  );
};
