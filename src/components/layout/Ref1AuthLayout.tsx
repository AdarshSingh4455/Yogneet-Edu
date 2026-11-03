import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
  Sun,
  Moon,
  ChevronDown,
  ShieldCheck,
  Lock,
  Database,
  Users,
  BookOpen,
  TrendingUp,
} from 'lucide-react';

export interface Ref1FeatureItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'purple' | 'cyan' | 'blue';
}

interface Ref1AuthLayoutProps {
  role: 'student' | 'platform';
  badgeText: string;
  headlinePrimary: string;
  headlineAccent1: string;
  headlineAccent2: string;
  description: string;
  features: Ref1FeatureItem[];
  cardBadge: string;
  cardBadgeVariant?: 'purple' | 'cyan';
  cardTitle: string;
  cardSubtitle: string;
  securityNotice?: string;
  children: React.ReactNode;
}

/**
 * 3D-angled Dashboard Preview Illustration matching Ref-1 lower-left visual.
 * Compact and viewport-aware to eliminate unnecessary desktop scrolling.
 */
const DashboardPreviewIllustration: React.FC = () => {
  return (
    <div className="relative pt-1 xl:pt-2 w-full max-w-md mx-auto select-none pointer-events-none">
      <div
        className="rounded-xl xl:rounded-2xl border border-cyan-500/30 bg-[#0B142B]/95 p-2.5 xl:p-3.5 shadow-2xl shadow-cyan-950/60 backdrop-blur-md transform lg:-rotate-1 lg:hover:rotate-0 transition-transform duration-300"
        style={{
          boxShadow: '0 16px 32px -12px rgba(6, 182, 212, 0.25)',
        }}
      >
        {/* Tablet window bar */}
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500/80" />
            <div className="w-2 h-2 rounded-full bg-amber-500/80" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
            <span className="ml-1.5 font-semibold text-slate-300 tracking-wide text-[9px] xl:text-[10px]">
              Learning Overview
            </span>
          </div>
          <div className="flex items-center gap-1 text-[8px] xl:text-[9px] text-cyan-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE PLATFORM</span>
          </div>
        </div>

        {/* Spline line chart */}
        <div className="relative h-10 xl:h-12 w-full mb-1.5 xl:mb-2">
          <svg
            viewBox="0 0 300 70"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="60%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <path
              d="M0,55 C40,50 60,30 100,38 C140,46 170,15 210,22 C250,29 270,10 300,16 L300,70 L0,70 Z"
              fill="url(#chartGradient)"
            />
            <path
              d="M0,55 C40,50 60,30 100,38 C140,46 170,15 210,22 C250,29 270,10 300,16"
              fill="none"
              stroke="url(#lineStroke)"
              strokeWidth="2.5"
            />
            {/* Chart keypoints */}
            <circle cx="100" cy="38" r="2.5" fill="#06b6d4" className="shadow" />
            <circle cx="210" cy="22" r="2.5" fill="#3b82f6" className="shadow" />
            <circle cx="300" cy="16" r="3" fill="#a855f7" className="shadow" />
          </svg>
        </div>

        {/* 3 Metric Pills matching Ref-1 */}
        <div className="grid grid-cols-3 gap-1.5 xl:gap-2 pt-1 border-t border-white/5">
          <div className="rounded-lg xl:rounded-xl bg-white/5 border border-white/10 p-1.5 xl:p-2 flex items-center gap-1.5 xl:gap-2">
            <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-md xl:rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-3 h-3 xl:w-3.5 xl:h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] xl:text-[11px] font-bold text-white leading-tight">1,248</p>
              <p className="text-[8px] xl:text-[9px] text-slate-400 truncate">Active Learners</p>
            </div>
          </div>

          <div className="rounded-lg xl:rounded-xl bg-white/5 border border-white/10 p-1.5 xl:p-2 flex items-center gap-1.5 xl:gap-2">
            <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-md xl:rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-3 h-3 xl:w-3.5 xl:h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] xl:text-[11px] font-bold text-white leading-tight">32</p>
              <p className="text-[8px] xl:text-[9px] text-slate-400 truncate">Courses</p>
            </div>
          </div>

          <div className="rounded-lg xl:rounded-xl bg-white/5 border border-white/10 p-1.5 xl:p-2 flex items-center gap-1.5 xl:gap-2">
            <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-md xl:rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] xl:text-[11px] font-bold text-white leading-tight">96%</p>
              <p className="text-[8px] xl:text-[9px] text-slate-400 truncate">Completion</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Ref1AuthLayout: React.FC<Ref1AuthLayoutProps> = ({
  role,
  badgeText,
  headlinePrimary,
  headlineAccent1,
  headlineAccent2,
  description,
  features,
  cardBadge,
  cardBadgeVariant = 'purple',
  cardTitle,
  cardSubtitle,
  securityNotice,
  children,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen lg:h-[100dvh] flex flex-col lg:flex-row bg-[#080c1f] selection:bg-cyan-500 selection:text-white relative overflow-x-hidden lg:overflow-hidden">
      {/* =====================================================================
          LEFT BRANDING & STORYTELLING PANEL (~54% on desktop)
          ===================================================================== */}
      <div className="relative w-full lg:w-[54%] bg-gradient-to-br from-[#070b1e] via-[#0d1435] to-[#070a1a] text-white p-6 sm:p-8 lg:px-8 lg:py-5 xl:px-12 xl:py-7 flex flex-col justify-between z-10 lg:h-full lg:overflow-hidden">
        {/* Ambient background glowing orbs matching Ref-1 */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-purple-600/20 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Header: Logo Lockup */}
        <div className="relative z-10 flex items-center gap-3.5 mb-4 lg:mb-2 xl:mb-4 shrink-0">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-2xl bg-gradient-to-br from-yogneet-navy via-[#14234b] to-[#0A1329] border border-cyan-500/40 flex items-center justify-center p-1.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <img
                src="/brand/yogneet-emblem.png"
                alt="Yogneet Phoenix"
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
            <div>
              <span className="text-lg xl:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                YOGNEET <span className="text-cyan-400">EDU</span>
              </span>
              <p className="text-[9px] xl:text-[10px] font-bold text-cyan-200/80 tracking-widest uppercase">
                TECH GEEK ADARSH HUB
              </p>
            </div>
          </Link>
        </div>

        {/* Content Section: Badge, Headline, Supporting Paragraph, Feature Cards */}
        <div className="relative z-10 space-y-3.5 lg:space-y-2.5 xl:space-y-4 max-w-xl my-auto">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] xl:text-xs font-bold uppercase tracking-wider bg-purple-950/60 border border-purple-500/30 text-purple-300 backdrop-blur-md shadow-xs">
            <Lock className="w-3 h-3 text-purple-400" />
            <span>{badgeText}</span>
          </div>

          {/* Headline matching Ref-1 */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight text-white leading-[1.15]">
              {headlinePrimary}
              <br />
              <span className="text-cyan-400">{headlineAccent1} </span>
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {headlineAccent2}
              </span>
            </h1>
            <p className="text-xs xl:text-sm text-slate-300 mt-1 xl:mt-2 leading-relaxed max-w-lg">
              {description}
            </p>
          </div>

          {/* Three Feature Cards matching Ref-1 */}
          <div className="space-y-1.5 xl:space-y-2.5 pt-0.5">
            {features.map((feat, index) => {
              const Icon = feat.icon;
              const colorClasses =
                feat.color === 'purple'
                  ? 'bg-purple-600/25 border-purple-400/40 text-purple-300'
                  : feat.color === 'cyan'
                  ? 'bg-cyan-500/25 border-cyan-400/40 text-cyan-300'
                  : 'bg-blue-600/25 border-blue-400/40 text-blue-300';

              return (
                <div
                  key={index}
                  className="rounded-xl xl:rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 transition-all p-2.5 xl:p-3 flex items-center gap-3 backdrop-blur-sm"
                >
                  <div
                    className={`w-8 h-8 xl:w-9 xl:h-9 rounded-lg xl:rounded-xl border flex items-center justify-center shrink-0 shadow-inner ${colorClasses}`}
                  >
                    <Icon className="w-4 h-4 xl:w-4.5 xl:h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs xl:text-sm font-bold text-white tracking-wide">
                      {feat.title}
                    </h3>
                    <p className="text-[10px] xl:text-[11px] text-slate-300 mt-0.5 leading-snug">
                      {feat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dashboard Preview Tablet Illustration */}
          <div className="hidden lg:block pt-1 xl:pt-2 shrink-0">
            <DashboardPreviewIllustration />
          </div>
        </div>

        {/* Left Footer Tagline */}
        <div className="relative z-10 pt-2 xl:pt-3 mt-auto border-t border-white/10 flex items-center justify-between text-[10px] xl:text-[11px] text-slate-400 shrink-0">
          <span>Enterprise Technical Learning</span>
          <span className="text-cyan-400 font-semibold">Phoenix Architecture v1.0</span>
        </div>
      </div>

      {/* =====================================================================
          ORGANIC S-CURVE WAVE SEPARATOR (Desktop only, strictly matching Ref-1)
          ===================================================================== */}
      <div
        className="hidden lg:block absolute top-0 bottom-0 left-[54%] -translate-x-[4px] w-28 xl:w-36 h-full z-15 pointer-events-none select-none overflow-visible"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 100 1000"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="waveBgGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#070b1e" />
              <stop offset="50%" stopColor="#0d1435" />
              <stop offset="100%" stopColor="#070a1a" />
            </linearGradient>
            <linearGradient id="waveGlowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="35%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="65%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="waveEchoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.08" />
              <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#a855f7" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Solid Wave Fill seamlessly joining left navy panel */}
          <path
            d="M 0,0 L 25,0 C 65,130 95,270 85,420 C 75,570 38,710 22,850 C 14,920 18,970 30,1000 L 0,1000 Z"
            fill="url(#waveBgGradient)"
          />

          {/* Echo Wave Ribbon (Soft ambient wave behind primary edge) */}
          <path
            d="M 38,0 C 78,130 108,270 98,420 C 88,570 50,710 34,850 C 26,920 30,970 42,1000"
            fill="none"
            stroke="url(#waveEchoGradient)"
            strokeWidth="8"
          />

          {/* Primary Glowing Wave Edge matching Ref-1 */}
          <path
            d="M 25,0 C 65,130 95,270 85,420 C 75,570 38,710 22,850 C 14,920 18,970 30,1000"
            fill="none"
            stroke="url(#waveGlowGradient)"
            strokeWidth="2.5"
          />

          {/* Subtle crest glow point at upper inflection */}
          <circle cx="85" cy="420" r="3" fill="#06b6d4" className="opacity-80" />
        </svg>
      </div>

      {/* =====================================================================
          RIGHT AUTHENTICATION PANEL (~46% on desktop)
          ===================================================================== */}
      <div className="relative w-full lg:w-[46%] bg-[#f4f7fc] dark:bg-[#060a18] p-5 sm:p-8 lg:px-6 lg:py-4 xl:px-10 xl:py-6 flex flex-col justify-between items-center z-20 min-h-screen lg:min-h-0 lg:h-full lg:overflow-hidden">
        {/* Subtle background abstract curves in light mode */}
        <div className="absolute top-0 right-0 w-full h-80 bg-gradient-to-b from-blue-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

        {/* Top Floating Navigation Toolbar matching Ref-1 */}
        <div className="w-full max-w-md flex items-center justify-end gap-3 mb-2 lg:mb-2 xl:mb-4 shrink-0">
          <Link
            to="/portal"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-brand-500 dark:hover:text-cyan-400 shadow-xs transition-colors"
          >
            <span>Portal Selection</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-500" />
            )}
          </button>
        </div>

        {/* Floating White Authentication Card matching Ref-1 */}
        <div className="w-full max-w-md bg-white dark:bg-[#0E172A] rounded-2xl xl:rounded-3xl p-5 sm:p-6 lg:p-5 xl:p-7 shadow-2xl shadow-slate-200/60 dark:shadow-black/70 border border-slate-100 dark:border-slate-800 space-y-3.5 lg:space-y-2.5 xl:space-y-4 my-auto shrink-0">
          {/* Card Top Pill */}
          <div className="space-y-1.5 lg:space-y-1 xl:space-y-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] xl:text-[11px] font-bold uppercase tracking-wider border ${
                cardBadgeVariant === 'purple'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>{cardBadge}</span>
            </span>

            <h2 className="text-xl sm:text-2xl lg:text-2xl xl:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              {cardTitle}
            </h2>
            <p className="text-[11px] xl:text-xs text-slate-500 dark:text-slate-400 leading-snug">
              {cardSubtitle}
            </p>
          </div>

          {/* Security Notice Box (for Staff Portal matching Ref-1) */}
          {securityNotice && (
            <div className="p-2.5 xl:p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 flex items-start gap-2 text-[11px] xl:text-xs text-purple-800 dark:text-purple-200 leading-snug shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <span>{securityNotice}</span>
            </div>
          )}

          {/* Authentication Form Children */}
          <div>{children}</div>
        </div>

        {/* Security Reassurance Footer matching Ref-1 */}
        <div className="w-full max-w-md pt-2 xl:pt-3 flex items-center justify-between text-[10px] xl:text-[11px] text-slate-500 dark:text-slate-400 px-2 mt-auto shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-End Session Guard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-blue-500" />
            <span>Role-Based Access</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-purple-500" />
            <span>Secure Data (Supabase)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
