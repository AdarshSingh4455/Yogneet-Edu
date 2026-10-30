import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
  GraduationCap,
  Shield,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Lock,
  Layers,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const PortalSelectionPage: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-dark-text transition-colors duration-150 relative selection:bg-brand-500 selection:text-white">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-yogneet-navy via-[#12224A] to-[#0A1329] border border-yogneet-cyan/30 flex items-center justify-center shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform">
            <img
              src="/brand/yogneet-emblem.png"
              alt="Yogneet Phoenix"
              className="w-8 h-8 object-contain drop-shadow"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-yogneet-cyan via-blue-400 to-yogneet-orange bg-clip-text text-transparent">
              YOGNEET EDU
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase -mt-0.5">
              Portal Access Gateway
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-cyan-400 px-3 py-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-dark-card transition-colors hidden sm:inline-block"
          >
            Direct Prototype Dashboard &rarr;
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-dark-card transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Choice Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 max-w-5xl mx-auto w-full">
        {/* Intro */}
        <div className="text-center space-y-3 mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-cyan-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Select Your Gateway</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Welcome to Yogneet Edu
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Choose the dedicated portal matching your learning or administrative role. Each portal is isolated with specialized security and workspace tools.
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Card 1: Student Portal */}
          <div className="rounded-3xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-slate-900/5 dark:shadow-black/30 hover:border-blue-400/60 dark:hover:border-blue-500/50 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <Badge variant="brand" size="sm">
                  Learners &amp; Aspirants
                </Badge>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Student Portal
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Your primary learning hub for video lectures, lecture notes, hands-on practical assignments, and timed competitive exam simulations.
                </p>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-light-border dark:border-dark-border">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Interactive Video Lectures by Tech Geek Adarsh</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Curated Study Material &amp; PDF Downloads</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Lecture-wise Practical Coding Assignments</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Competitive Exam Series &amp; Timed Mock Tests</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-4 space-y-2.5">
              <Link to="/login" className="block">
                <Button
                  size="lg"
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-md shadow-blue-500/20"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Enter Student Portal
                </Button>
              </Link>
              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                New learner?{' '}
                <Link to="/signup" className="font-bold text-brand-500 hover:text-brand-600 dark:text-cyan-400">
                  Create student account
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Platform Portal */}
          <div className="rounded-3xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-slate-900/5 dark:shadow-black/30 hover:border-purple-400/60 dark:hover:border-purple-500/50 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Shield className="w-7 h-7" />
                </div>
                <Badge variant="purple" size="sm">
                  Restricted • Staff &amp; Admin
                </Badge>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Platform Portal
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Dedicated administrative and curriculum operations workspace for verified educators, content creators, and platform managers.
                </p>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-light-border dark:border-dark-border">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Curriculum Content Workspace (Notes, Videos &amp; Rubrics)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Dedicated Test Catalog Manager &amp; Question Authoring</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Student Directory Pre-Provisioning &amp; Batch Imports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Real-Time Audit Trail &amp; Aggregated Platform Analytics</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-4 space-y-2.5">
              <Link to="/platform/login" className="block">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full font-bold border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Staff &amp; Admin Sign In
                </Button>
              </Link>
              <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Invite-only administrative access. Self-registration disabled.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Prototype Simulator Disclaimer Banner */}
        <div className="mt-8 p-3 rounded-2xl bg-slate-100 dark:bg-dark-card/60 border border-light-border dark:border-dark-border text-xs text-slate-500 dark:text-slate-400 max-w-xl text-center leading-relaxed">
          <p>
            <strong>Phase 4A Architecture Note:</strong> Authentication forms provide strict validation, UI flow separation, and security boundaries. Full Supabase Auth session token exchanges and Google OAuth callbacks are active in Phase 4B.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-light-border/60 dark:border-dark-border/40">
        &copy; {new Date().getFullYear()} Yogneet Edu. Technical Learning, Practical Engineering &amp; Assessment Engine.
      </footer>
    </div>
  );
};
