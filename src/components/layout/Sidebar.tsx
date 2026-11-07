import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStudentAccess } from '../../context/StudentAccessContext';
import {
  LayoutDashboard,
  Video,
  FileText,
  CheckSquare,
  Code2,
  MessageSquare,
  TrendingUp,
  User,
  Users,
  Shield,
  FileSpreadsheet,
  BarChart3,
  HelpCircle,
  X,
  ChevronRight,
  BookOpen,
  Film,
  Crown,
  Layers,
  Boxes,
  Trophy,
  Megaphone,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SIDEBAR_STORAGE_KEY = 'yogneet_sidebar_width';
const MIN_SIDEBAR_WIDTH = 220;
const DEFAULT_SIDEBAR_WIDTH = 296;
const MAX_SIDEBAR_WIDTH = 420;

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, isAdmin, isSubAdmin, isStudent, hasPermission, isAuthenticated } = useAuth();
  const { isModuleAccessible } = useStudentAccess();
  const location = useLocation();

  // ---------------------------------------------------------------------------
  // Resizable Sidebar State & Persistence
  // ---------------------------------------------------------------------------
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
          return parsed;
        }
      }
    } catch {
      // ignore storage access errors
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  isDraggingRef.current = isDragging;

  // Persist width when dragging completes
  const saveWidth = useCallback((width: number) => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(width));
    } catch {
      // ignore storage access errors
    }
  }, []);

  // Pointer drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, e.clientX)
      );
      setSidebarWidth(newWidth);
    };

    const handlePointerUp = (e: PointerEvent) => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      const finalWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, e.clientX)
      );
      setSidebarWidth(finalWidth);
      saveWidth(finalWidth);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, saveWidth]);

  // Keyboard accessibility on resize handle
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSidebarWidth(prev => {
        const next = Math.max(MIN_SIDEBAR_WIDTH, prev - 10);
        saveWidth(next);
        return next;
      });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSidebarWidth(prev => {
        const next = Math.min(MAX_SIDEBAR_WIDTH, prev + 10);
        saveWidth(next);
        return next;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSidebarWidth(MIN_SIDEBAR_WIDTH);
      saveWidth(MIN_SIDEBAR_WIDTH);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSidebarWidth(MAX_SIDEBAR_WIDTH);
      saveWidth(MAX_SIDEBAR_WIDTH);
    }
  }, [saveWidth]);

  // Double-click resets to default width
  const handleDoubleClickReset = useCallback(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    saveWidth(DEFAULT_SIDEBAR_WIDTH);
  }, [saveWidth]);

  const isPremium = currentUser.accessCategory === 'pro' || (currentUser as any).isPremium === true;

  // Role-based Forum navigation label
  const forumLabel = (isAdmin || hasPermission('community.moderate'))
    ? 'Forum Management'
    : 'Community Forum';

  // ---------------------------------------------------------------------------
  // Navigation items: All decorative badges removed across all roles
  // ---------------------------------------------------------------------------

  // Super Admin Navigation
  const adminNav = [
    { label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Student Access Control', path: '/admin/student-access', icon: Layers },
    { label: 'Feedback Management', path: '/admin/feedback', icon: MessageSquare },
    { label: 'Subjects', path: '/admin/subjects', icon: BookOpen },
    { label: 'Micro Lessons', path: '/admin/micro-lessons', icon: Film },
    { label: 'Icon Library', path: '/admin/icons', icon: Boxes },
    { label: 'Premium Students', path: '/admin/premium-students', icon: Crown },
    { label: 'Staff & Permissions', path: '/admin/subadmins', icon: Shield },
    { label: 'Audit Trail Logs', path: '/admin/audit-logs', icon: FileSpreadsheet },
    { label: 'Students Directory', path: '/admin/students', icon: Users },
    { label: 'Content Workspace', path: '/subadmin/content', icon: FileText },
    { label: 'Test Catalog Manager', path: '/admin/tests', icon: CheckSquare },
    { label: 'Coding Arena', path: '/coding', icon: Code2 },
    { label: 'Forum Management', path: '/community', icon: MessageSquare },
    { label: 'Platform Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Top 200 Leaderboard', path: '/admin/leaderboard', icon: Trophy },
    { label: 'Advertisements', path: '/admin/advertisements', icon: Megaphone },
  ];

  // Sub-Admin Navigation
  const subAdminNav = [
    { label: 'Staff Dashboard', path: '/subadmin', icon: LayoutDashboard },
    ...(hasPermission('subjects.view') || hasPermission('subjects.create')
      ? [{ label: 'Subjects', path: '/admin/subjects', icon: BookOpen }]
      : []),
    ...(hasPermission('microlessons.view') || hasPermission('microlessons.create')
      ? [{ label: 'Micro Lessons', path: '/admin/micro-lessons', icon: Film }]
      : []),
    ...(hasPermission('premium_students.view') || hasPermission('premium_students.manage')
      ? [{ label: 'Premium Students', path: '/admin/premium-students', icon: Crown }]
      : []),
    ...(hasPermission('videos.view') || hasPermission('videos.create') || hasPermission('notes.view') || hasPermission('notes.create')
      ? [{ label: 'Content Workspace', path: '/subadmin/content', icon: FileText }]
      : []),
    ...(hasPermission('tests.view') || hasPermission('tests.create') || hasPermission('tests.edit')
      ? [{ label: 'Test Catalog Manager', path: '/admin/tests', icon: CheckSquare }]
      : []),
    { label: forumLabel, path: '/community', icon: MessageSquare },
    ...(hasPermission('leaderboard.view') || hasPermission('leaderboard.manage')
      ? [{ label: 'Top 200 Leaderboard', path: '/admin/leaderboard', icon: Trophy }]
      : []),
    ...(hasPermission('advertisements.view') || hasPermission('advertisements.manage')
      ? [{ label: 'Advertisements', path: '/admin/advertisements', icon: Megaphone }]
      : []),
    ...(hasPermission('students.view')
      ? [{ label: 'Enrolled Students', path: '/admin/students', icon: Users }]
      : []),
    ...(hasPermission('audit_logs.view')
      ? [{ label: 'Audit Logs', path: '/admin/audit-logs', icon: FileSpreadsheet }]
      : []),
    ...(hasPermission('analytics.view')
      ? [{ label: 'Analytics', path: '/admin/analytics', icon: BarChart3 }]
      : []),
    { label: 'Coding Arena', path: '/coding', icon: Code2 },
    { label: 'Feedback & Support', path: '/feedback', icon: HelpCircle },
    { label: 'My Permissions', path: '/profile', icon: User },
  ];

  // Student Navigation
  const studentNav = [
    { label: 'Student Dashboard', path: '/dashboard', icon: LayoutDashboard, moduleKey: 'dashboard' },
    { label: '1. Video Lessons', path: '/videos', icon: Video, moduleKey: 'videos' },
    { label: '2. Study Notes & PDFs', path: '/notes', icon: FileText, moduleKey: 'notes' },
    { label: '3. Practical Projects', path: '/practical', icon: Code2, moduleKey: 'practical' },
    { label: '4. Test Series & Mocks', path: '/tests', icon: CheckSquare, moduleKey: 'tests' },
    { label: 'Top 200 Leaderboard', path: '/leaderboard', icon: Trophy, moduleKey: 'tests' },
    { label: 'Micro Lessons', path: '/micro-lessons', icon: Film, moduleKey: 'micro_lessons' },
    { label: 'Coding Arena', path: '/coding', icon: Code2, moduleKey: 'coding' },
    { label: forumLabel, path: '/community', icon: MessageSquare, moduleKey: 'community' },
    { label: 'My Learning Progress', path: '/progress', icon: TrendingUp, moduleKey: 'progress' },
    { label: 'Feedback & Support', path: '/feedback', icon: HelpCircle, moduleKey: 'feedback' },
    { label: 'Profile & Settings', path: '/profile', icon: User },
  ];

  const filteredStudentNav = studentNav.filter(item => {
    if (!item.moduleKey) return true;
    return isModuleAccessible(item.moduleKey, isPremium);
  });

  const currentNav = isAdmin ? adminNav : isSubAdmin ? subAdminNav : filteredStudentNav;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        style={{
          width: isDesktop ? `${sidebarWidth}px` : undefined,
        }}
        className={`relative fixed inset-y-0 left-0 lg:static lg:sticky top-0 lg:top-16 z-40 lg:z-20 h-[100dvh] lg:h-[calc(100dvh-4rem)] w-72 lg:w-auto shrink-0 border-r border-light-border dark:border-dark-border bg-light-sidebar dark:bg-dark-sidebar flex flex-col justify-between ${
          isDragging ? 'transition-none select-none' : 'transition-transform duration-200 ease-in-out'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Mobile header & Nav Items */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6">
          {/* Mobile close button */}
          <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border lg:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Navigation Menu
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role badge banner */}
          <div className="p-3 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isAuthenticated ? 'Active Experience' : 'Visitor Mode'}
              </span>
              <Badge
                variant={isAuthenticated ? (isAdmin ? 'brand' : isSubAdmin ? 'purple' : 'success') : 'default'}
                size="sm"
              >
                {isAuthenticated ? currentUser.role.toUpperCase() : 'GUEST'}
              </Badge>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {isAuthenticated ? currentUser.name : 'Welcome to Yogneet Edu'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {isAuthenticated
                ? (isAdmin
                  ? 'Full Platform Management'
                  : isSubAdmin
                  ? `${currentUser.permissions.length} module actions granted`
                  : `${currentUser.accessCategory === 'pro' || (currentUser as any).isPremium ? 'Premium Student' : 'Standard Student'} • Active Learner`)
                : 'Sign in to access personalized progress & tests'}
            </p>
          </div>

          {/* Navigation group */}
          <nav className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
              {isAdmin ? 'Administration' : isSubAdmin ? 'Staff Operations' : 'Learning Navigation'}
            </p>
            {currentNav.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && item.path !== '/dashboard' && item.path !== '/admin' && location.pathname.startsWith(item.path));

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  title={item.label}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20 font-semibold dark:bg-blue-600 dark:text-white dark:border dark:border-blue-400/50 dark:shadow-blue-glow'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-blue-200 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:border-blue-900/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 w-full">
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400 group-hover:dark:text-blue-300'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          {/* Quick link to Student View for Staff & Admins */}
          {!isStudent && (
            <div className="pt-2 border-t border-light-border dark:border-dark-border space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
                Student Learning Preview
              </p>
              <NavLink
                to="/dashboard"
                onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-blue-200 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
              >
                <span>View Student Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </NavLink>
            </div>
          )}
        </div>

        {/* Footer brand banner */}
        <div className="mt-auto shrink-0 p-3.5 border-t border-light-border dark:border-dark-border bg-slate-50/60 dark:bg-dark-card/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yogneet-navy border border-yogneet-cyan/20 flex items-center justify-center shrink-0 p-1">
              <img
                src="/brand/yogneet-emblem.png"
                alt="Yogneet Edu"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  YOGNEET <span className="text-yogneet-cyan">EDU</span>
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              </div>
              <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                LEARN • CODE • GROW
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Resize Handle on right border */}
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuenow={sidebarWidth}
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleDoubleClickReset}
          className="hidden lg:block absolute top-0 -right-1.5 bottom-0 w-3 cursor-col-resize z-30 group touch-none select-none"
          title="Drag to resize sidebar (Double-click to reset, Left/Right arrow keys)"
        >
          {/* Subtle line indicator */}
          <div
            className={`w-1 h-full mx-auto transition-colors duration-150 rounded-full ${
              isDragging
                ? 'bg-brand-500 dark:bg-cyan-400 shadow-sm'
                : 'bg-transparent group-hover:bg-brand-400/60 dark:group-hover:bg-cyan-500/50 group-focus:bg-brand-500'
            }`}
          />
        </div>
      </aside>
    </>
  );
};
