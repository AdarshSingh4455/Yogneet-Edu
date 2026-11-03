import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { X, UserPlus, ArrowRight } from 'lucide-react';
import { Button } from './Button';

const DISMISS_KEY = 'yogneet_welcome_toast_dismissed';

export const WelcomeToast: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  const authRoutes = [
    '/login',
    '/signup',
    '/portal',
    '/forgot-password',
    '/reset-password',
    '/platform/login',
  ];

  const isAuthRoute =
    authRoutes.includes(location.pathname) ||
    location.pathname.startsWith('/auth/');

  useEffect(() => {
    // Do not show while loading, if user is authenticated, if on auth routes, or if previously dismissed in session
    if (isLoading || isAuthenticated || isAuthRoute) {
      setIsVisible(false);
      return;
    }

    try {
      if (sessionStorage.getItem(DISMISS_KEY) === 'true') {
        setIsVisible(false);
        return;
      }
    } catch {
      // ignore
    }

    // Delay appearance slightly for a gentle, inviting entrance
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, isAuthRoute]);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const handleSignIn = () => {
    handleDismiss();
    navigate('/login');
  };

  const handleSignUp = () => {
    handleDismiss();
    navigate('/signup');
  };

  if (!isVisible || isAuthenticated || isAuthRoute) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Welcome Invitation"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:max-w-md animate-welcome-bounce"
    >
      <div className="relative rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl shadow-blue-500/15 dark:shadow-black/70 p-4 sm:p-5 backdrop-blur-md">
        {/* Accent top gradient bar */}
        <div className="absolute top-0 left-6 right-6 h-1 rounded-t-2xl bg-gradient-to-r from-yogneet-cyan via-blue-500 to-yogneet-orange" />

        {/* Dismiss close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
          aria-label="Dismiss welcome notification"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yogneet-navy to-[#12224A] border border-yogneet-cyan/40 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 text-yogneet-cyan p-1">
            <img
              src="/brand/yogneet-emblem.png"
              alt="Yogneet Phoenix"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-1.5">
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Your next big skill starts here!</span>
              <span className="text-sm">🚀</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Sign in or create your free account to explore lessons, practice coding and track your learning journey.
            </p>
          </div>
        </div>

        {/* Action CTAs with visual emphasis on Sign In */}
        <div className="mt-3.5 pt-3 border-t border-light-border dark:border-dark-border/60 flex items-center gap-2.5 justify-end">
          <button
            onClick={handleDismiss}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Later
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSignUp}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Create Account
          </Button>
          <button
            type="button"
            onClick={handleSignIn}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-bold shadow-md shadow-cyan-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] animate-welcome-cta-pulse"
          >
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
