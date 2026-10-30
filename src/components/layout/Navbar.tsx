import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import {
  Menu,
  Sun,
  Moon,
  Laptop,
  Bell,
  Search,
  BookOpen,
  LogOut,
  User,
  Shield,
  CheckCircle2,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { currentUser, isAdmin, isSubAdmin } = useAuth();
  const { mode, resolvedTheme, setMode } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-light-border dark:border-dark-border bg-light-sidebar/95 dark:bg-dark-sidebar/95 backdrop-blur-md transition-colors">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isSidebarOpen}
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-yogneet-navy border border-yogneet-cyan/30 flex items-center justify-center shadow-md shadow-yogneet-navy/50 group-hover:scale-105 transition-transform overflow-hidden p-1 shrink-0">
              <img
                src="/brand/yogneet-emblem.png"
                alt="Yogneet Edu Emblem"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                  YOGNEET <span className="text-yogneet-cyan">EDU</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-yogneet-cyan/10 text-yogneet-cyan border border-yogneet-cyan/30">
                  v1.0
                </span>
              </div>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">
                LEARN • CODE • PRACTICE • GROW
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Search input */}
        <div className="hidden md:flex items-center max-w-md w-full mx-6">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search lectures, study notes, coding problems..."
              onClick={() => navigate('/notes')}
              className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-blue-500/50 dark:focus:border-blue-400 dark:focus:bg-dark-selected/50 focus:bg-white dark:hover:border-blue-800/60 transition-all"
            />
            <kbd className="hidden lg:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
              /
            </kbd>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Portal Gateway Shortcut */}
          <Link
            to="/portal"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-500 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-brand-500 dark:text-cyan-400" />
            <span>Portals</span>
          </Link>

          {/* Theme Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowThemeMenu(!showThemeMenu);
                setShowUserMenu(false);
                setShowNotifications(false);
              }}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-card border border-transparent hover:border-light-border dark:hover:border-dark-border transition-colors"
              title="Change theme"
              aria-label="Theme selector"
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-brand-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-40 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <p className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Theme Mode
                </p>
                <button
                  onClick={() => {
                    setMode('light');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    mode === 'light'
                      ? 'bg-brand-50 dark:bg-dark-selected text-brand-600 dark:text-blue-300 font-semibold border border-transparent dark:border-blue-700/60'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Light</span>
                  {mode === 'light' && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-brand-500 dark:text-blue-400" />}
                </button>
                <button
                  onClick={() => {
                    setMode('dark');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    mode === 'dark'
                      ? 'bg-brand-50 dark:bg-dark-selected text-brand-600 dark:text-blue-300 font-semibold border border-transparent dark:border-blue-700/60'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Dark</span>
                  {mode === 'dark' && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-brand-500 dark:text-blue-400" />}
                </button>
                <button
                  onClick={() => {
                    setMode('system');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    mode === 'system'
                      ? 'bg-brand-50 dark:bg-dark-selected text-brand-600 dark:text-blue-300 font-semibold border border-transparent dark:border-blue-700/60'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                  <span>System Default</span>
                  {mode === 'system' && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-brand-500 dark:text-blue-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Notifications button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowThemeMenu(false);
                setShowUserMenu(false);
              }}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-card border border-transparent hover:border-light-border dark:hover:border-dark-border transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-dark-sidebar" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-light-border dark:border-dark-border">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Platform Notifications
                  </h4>
                  <Badge variant="brand" size="sm">2 New</Badge>
                </div>
                <div className="mt-3 space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-cardHover/60 border border-light-border dark:border-dark-border">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Winter CodeFest 2026 is LIVE
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Registration closes in 4 days. Test your algorithmic skills!
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-cardHover/60 border border-light-border dark:border-dark-border">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      New Study Notes Published
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Python 3.13 internals and DSA Trees guide available for download.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User profile avatar & details */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowThemeMenu(false);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1.5 pl-2 rounded-xl border border-light-border dark:border-dark-border hover:bg-slate-100 dark:hover:bg-dark-card transition-colors text-left"
              aria-label="User profile menu"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-300 dark:ring-slate-700"
              />
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {currentUser.name.split(' ')[0]}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium capitalize leading-none">
                  {currentUser.role}
                </p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-dark-cardHover/50 border border-light-border dark:border-dark-border mb-2">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {currentUser.email}
                    </p>
                    <Badge
                      variant={isAdmin ? 'brand' : isSubAdmin ? 'purple' : 'success'}
                      size="sm"
                      className="mt-1"
                    >
                      {currentUser.role.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <Link
                    to="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200 transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500" />
                    <span>My Profile & Settings</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin/permissions"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200 transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-brand-400" />
                      <span>RBAC & Permissions Editor</span>
                    </Link>
                  )}

                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tech Geek Adarsh Channel</span>
                    </span>
                  </a>

                  <div className="pt-2 mt-2 border-t border-light-border dark:border-dark-border space-y-1">
                    <Link
                      to="/portal"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-brand-500" />
                      <span>Portal Selection Gateway</span>
                    </Link>
                    <Link
                      to="/login"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Student Portal Sign In</span>
                    </Link>
                    <Link
                      to="/platform/login"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-purple-500" />
                      <span>Platform Staff Sign In</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
