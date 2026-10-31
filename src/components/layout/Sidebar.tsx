import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  Sparkles,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, isAdmin, isSubAdmin, isStudent, hasPermission } = useAuth();
  const location = useLocation();

  // Navigation items for Super Admin
  const adminNav = [
    { label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Sub-Admins & Staff', path: '/admin/subadmins', icon: Shield },
    { label: 'RBAC & Permissions', path: '/admin/permissions', icon: Shield, badge: 'Key' },
    { label: 'Audit Trail Logs', path: '/admin/audit-logs', icon: FileSpreadsheet },
    { label: 'Students Directory', path: '/admin/students', icon: Users },
    { label: 'Content Workspace', path: '/subadmin/content', icon: FileText },
    { label: 'Test Catalog Manager', path: '/admin/tests', icon: CheckSquare },
    { label: 'Coding Arena', path: '/coding', icon: Code2 },
    { label: 'Community Forum', path: '/community', icon: MessageSquare },
    { label: 'Platform Analytics', path: '/admin/analytics', icon: BarChart3 },
  ];

  // Navigation items for Sub-Admin generated dynamically from assigned permissions
  const subAdminNav = [
    { label: 'Staff Dashboard', path: '/subadmin', icon: LayoutDashboard },
    ...(hasPermission('videos.view') || hasPermission('videos.create') || hasPermission('notes.view') || hasPermission('notes.create')
      ? [{ label: 'Content Workspace', path: '/subadmin/content', icon: FileText }]
      : []),
    ...(hasPermission('tests.view') || hasPermission('tests.create') || hasPermission('tests.edit')
      ? [{ label: 'Test Catalog Manager', path: '/admin/tests', icon: CheckSquare }]
      : []),
    ...(hasPermission('community.moderate')
      ? [{ label: 'Community Moderation', path: '/community', icon: MessageSquare, badge: 'Mod' }]
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
    { label: 'My Permissions', path: '/profile', icon: User },
  ];

  // Navigation items for Student (4 Core Learning Stages)
  const studentNav = [
    { label: 'Student Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: '1. Video Lessons', path: '/videos', icon: Video },
    { label: '2. Study Notes & PDFs', path: '/notes', icon: FileText },
    { label: '3. Practical Projects', path: '/practical', icon: Code2, badge: 'New' },
    { label: '4. Test Series & Mocks', path: '/tests', icon: CheckSquare },
    { label: 'Coding Practice Arena', path: '/coding', icon: Code2, badge: 'Hot' },
    { label: 'Community Forum', path: '/community', icon: MessageSquare },
    { label: 'My Learning Progress', path: '/progress', icon: TrendingUp },
    { label: 'Profile & Settings', path: '/profile', icon: User },
  ];

  const currentNav = isAdmin ? adminNav : isSubAdmin ? subAdminNav : studentNav;

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
        className={`fixed lg:sticky top-0 lg:top-16 z-40 lg:z-20 h-full lg:h-[calc(100vh-4rem-2.25rem)] w-64 shrink-0 border-r border-light-border dark:border-dark-border bg-light-sidebar dark:bg-dark-sidebar flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Mobile header & Nav Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
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
                Active Experience
              </span>
              <Badge
                variant={isAdmin ? 'brand' : isSubAdmin ? 'purple' : 'success'}
                size="sm"
              >
                {currentUser.role.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {currentUser.name}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {isAdmin
                ? 'Full Platform Management'
                : isSubAdmin
                ? `${currentUser.permissions.length} module actions granted`
                : 'Enrolled in 2 Courses • 47 Solved'}
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
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20 font-semibold dark:bg-blue-600 dark:text-white dark:border dark:border-blue-400/50 dark:shadow-blue-glow'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-blue-200 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:border-blue-900/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400 group-hover:dark:text-blue-300'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-brand-100 dark:bg-dark-selected dark:text-blue-300 dark:border dark:border-blue-700/50 text-brand-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
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

        {/* Footer brand footer */}
        <div className="p-3.5 border-t border-light-border dark:border-dark-border bg-slate-50/60 dark:bg-dark-card/40">
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
      </aside>
    </>
  );
};
