import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
  GraduationCap,
  Shield,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  PlayCircle,
  FileText,
  Code2,
  BarChart3,
  BookOpen,
  CheckSquare,
  Users,
  Activity,
  Lock,
  Cloud,
  Database,
  HelpCircle,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';

export const PortalSelectionPage: React.FC = () => {
  const { mode, resolvedTheme, setMode } = useTheme();
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col justify-between relative selection:bg-brand-500 selection:text-white bg-[#060B18] text-slate-100 overflow-x-hidden">
      {/* 1. Large Institutional Campus Background matching Ref-2 */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transform scale-105"
        style={{
          backgroundImage: "url('/brand/campus-bg.jpg')",
        }}
        aria-hidden="true"
      />

      {/* 2. Atmospheric Navy/Blue Vignette Overlay matching Ref-2 */}
      <div
        className="fixed inset-0 z-0 bg-gradient-to-b from-[#060c1c]/90 via-[#071126]/80 to-[#040814]/95 backdrop-blur-[1.5px] pointer-events-none"
        aria-hidden="true"
      />

      {/* 3. Top Header Bar matching Ref-2 */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        {/* Left: Phoenix Logo Lockup */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yogneet-navy via-[#14234b] to-[#0A1329] border border-cyan-500/40 flex items-center justify-center p-1.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <img
              src="/brand/yogneet-emblem.png"
              alt="Yogneet Phoenix"
              className="w-full h-full object-contain drop-shadow"
            />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              YOGNEET <span className="text-cyan-400">EDU</span>
            </span>
            <p className="text-[10px] font-bold text-cyan-200/80 tracking-widest uppercase -mt-0.5">
              PORTAL ACCESS GATEWAY
            </p>
          </div>
        </Link>

        {/* Right: Theme Toggle Pill & Help Button matching Ref-2 */}
        <div className="flex items-center gap-3">
          {/* Dual Sun/Moon Pill Toggle */}
          <div className="flex items-center bg-black/40 border border-white/15 rounded-xl p-1 backdrop-blur-md">
            <button
              onClick={() => setMode('light')}
              className={`p-1.5 rounded-lg transition-colors ${
                mode === 'light'
                  ? 'bg-white/20 text-amber-300'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Light Mode"
              aria-label="Light Mode"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode('dark')}
              className={`p-1.5 rounded-lg transition-colors ${
                mode === 'dark' || (mode === 'system' && resolvedTheme === 'dark')
                  ? 'bg-cyan-500/25 text-cyan-300'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Dark Mode"
              aria-label="Dark Mode"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>

          {/* Need Help Link */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors backdrop-blur-md"
          >
            <span>Need Help?</span>
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </header>

      {/* 4. Main Choice Section matching Ref-2 */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-10 max-w-5xl mx-auto w-full">
        {/* Hero Title Block */}
        <div className="text-center space-y-3 mb-8 sm:mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/50 text-cyan-300 border border-cyan-500/30 backdrop-blur-md shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>SELECT YOUR GATEWAY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-md">
            Welcome to <span className="text-cyan-400">Yogneet</span>{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Edu
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
            Choose the dedicated portal matching your learning or administrative role.
            <br />
            Each portal is isolated with specialized security and workspace tools.
          </p>
        </div>

        {/* Two Large Portal Cards Side by Side matching Ref-2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full">
          {/* Card 1: Student Portal (Cyan Accent Identity) */}
          <div className="rounded-3xl border border-cyan-500/50 bg-[#091228]/90 backdrop-blur-md p-7 sm:p-8 flex flex-col justify-between shadow-2xl shadow-cyan-950/60 hover:border-cyan-400 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold border border-cyan-500/40 text-cyan-300 bg-cyan-950/40 backdrop-blur-sm">
                  Learners &amp; Aspirants
                </span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Student Portal
                </h2>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Your primary learning hub for video lectures, lecture notes, hands-on practical assignments, and timed competitive exam simulations.
                </p>
              </div>

              {/* 4 Feature Checklist with Circular Icons */}
              <ul className="space-y-2.5 text-xs text-slate-200 pt-3 border-t border-cyan-500/20">
                <li className="flex items-center gap-2.5">
                  <PlayCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Interactive Video Lectures by Tech Geek Adarsh</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Curated Study Material &amp; PDF Downloads</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Code2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Lecture-wise Practical Coding Assignments</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Competitive Exam Series &amp; Timed Mock Tests</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-4 space-y-2.5">
              <Link to="/login" className="block">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold text-sm shadow-lg shadow-cyan-500/30 transition-all duration-150"
                >
                  <span>Enter Student Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <div className="text-center text-xs text-slate-400">
                New learner?{' '}
                <Link
                  to="/signup"
                  className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  Create student account
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Platform Portal (Purple Accent Identity) */}
          <div className="rounded-3xl border border-purple-500/50 bg-[#0e0f26]/90 backdrop-blur-md p-7 sm:p-8 flex flex-col justify-between shadow-2xl shadow-purple-950/60 hover:border-purple-400 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-purple-950/70 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                  <Shield className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold border border-purple-500/40 text-purple-300 bg-purple-950/40 backdrop-blur-sm">
                  Restricted • Staff &amp; Admin
                </span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Platform Portal
                </h2>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Dedicated administrative and curriculum operations workspace for verified educators, content creators, and platform managers.
                </p>
              </div>

              {/* 4 Feature Checklist with Circular Icons */}
              <ul className="space-y-2.5 text-xs text-slate-200 pt-3 border-t border-purple-500/20">
                <li className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Curriculum Content Workspace (Notes, Videos &amp; Rubrics)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Dedicated Test Catalog Manager &amp; Question Authoring</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Student Directory Pre-Provisioning &amp; Batch Imports</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Real-Time Audit Trail &amp; Aggregated Platform Analytics</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-4 space-y-2.5">
              <Link to="/platform/login" className="block">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-sm shadow-lg shadow-purple-500/30 transition-all duration-150"
                >
                  <span>Staff &amp; Admin Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Invite-only administrative access. Self-registration disabled.</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Bottom Information Strip matching Ref-2 */}
        <div className="mt-8 sm:mt-10 bg-[#070e22]/85 border border-white/10 rounded-2xl px-6 py-3 backdrop-blur-md flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-300 shadow-xl">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <p className="font-bold text-white text-[11px] leading-tight">Campus Cloud Architecture</p>
              <p className="text-[10px] text-slate-400">End-to-end role isolation</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <p className="font-bold text-white text-[11px] leading-tight">Secure Data (Supabase)</p>
              <p className="text-[10px] text-slate-400">Encrypted &amp; access controlled</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <p className="font-bold text-white text-[11px] leading-tight">Granular RBAC</p>
              <p className="text-[10px] text-slate-400">Role-based permissions</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-slate-400 border-t border-white/10">
        &copy; {new Date().getFullYear()} Yogneet Edu. Technical Learning, Practical Engineering &amp; Assessment Engine.
      </footer>

      {/* Help Modal */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="Yogneet Edu Portal Guidance"
        maxWidth="md"
      >
        <div className="space-y-4 text-slate-700 dark:text-slate-200 text-xs">
          <p className="leading-relaxed">
            Welcome to Yogneet Edu. Select the portal matching your account credentials:
          </p>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-1">
            <p className="font-bold text-blue-900 dark:text-blue-200">Student Portal</p>
            <p className="text-slate-600 dark:text-slate-300">
              For learners enrolled in courses, accessing video lectures, downloading study notes, working on coding problems, and taking timed test series.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 space-y-1">
            <p className="font-bold text-purple-900 dark:text-purple-200">Platform Portal</p>
            <p className="text-slate-600 dark:text-slate-300">
              Restricted workspace for internal staff, faculty, content editors, and platform administrators. Access is provisioned via administrative invitation.
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" variant="primary" onClick={() => setShowHelpModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
