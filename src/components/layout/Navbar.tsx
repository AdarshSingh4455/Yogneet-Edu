import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  Search,
  LogOut,
  User,
  Shield,
  CheckCircle2,
  ExternalLink,
  Layers,
  LogIn,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { useClickOutside } from '../../utils/useClickOutside';
import { NotificationCenter } from './NotificationCenter';
import { DayStreakIndicator } from './DayStreakIndicator';
import { NotificationService } from '../../services/notificationService';
import { useActiveLearners } from '../../context/ActiveLearnersContext';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { currentUser, isAdmin, isSubAdmin, signOut, isAuthenticated } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { activeLearnersCount } = useActiveLearners();
  const navigate = useNavigate();
  const location = useLocation();

  // Active popover state: 'theme' | 'notifications' | 'user' | null
  const [activeMenu, setActiveMenu] = useState<'notifications' | 'user' | null>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  // Popover container refs for outside-click detection
    const notifMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch unread notification count on load & authentication
  useEffect(() => {
    if (isAuthenticated) {
      NotificationService.getUnreadCount()
        .then(count => setUnreadNotifCount(count))
        .catch(err => console.warn('[Navbar] Failed to fetch unread notification count:', err));
    } else {
      setUnreadNotifCount(0);
    }
  }, [isAuthenticated, activeMenu]);

  // Close all popovers on route change
  useEffect(() => {
    setActiveMenu(null);
  }, [location.pathname]);

  // Outside click listener closes whichever menu is active
  useClickOutside(
    [notifMenuRef, userMenuRef],
    () => setActiveMenu(null),
    activeMenu !== null
  );

  const toggleMenu = (menu: 'notifications' | 'user') => {
    setActiveMenu(current => (current === menu ? null : menu));
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-light-border dark:border-dark-border bg-light-sidebar/95 dark:bg-dark-sidebar/95 backdrop-blur-md transition-colors">
      <div className="flex items-center justify-between h-16 px-3 sm:px-6">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isSidebarOpen}
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-yogneet-navy border border-yogneet-cyan/30 flex items-center justify-center shadow-md shadow-yogneet-navy/50 group-hover:scale-105 transition-transform overflow-hidden p-1 shrink-0">
              <img
                src="/brand/yogneet-emblem.png"
                alt="Yogneet Edu Emblem"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                  YOGNEET <span className="text-yogneet-cyan">EDU</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-yogneet-cyan/10 text-yogneet-cyan border border-yogneet-cyan/30">
                  v1.0
                </span>
              </div>
              <p className="hidden xs:block text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">
                LEARN • CODE • PRACTICE • GROW
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Search input */}
        <div className="hidden lg:flex items-center max-w-md w-full mx-4 lg:mx-6">
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
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Active Learners Counter: Visible to ALL platform users (Normal, Premium, Staff, Admin) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0" title="Active Learners">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] sm:text-xs font-bold tracking-tight">
              {activeLearnersCount} <span className="font-medium text-slate-500 dark:text-slate-400 hidden xs:inline">Active Learners</span>
            </span>
          </div>

          {/* Day Streak (Authenticated only) */}
          {isAuthenticated && (
            <DayStreakIndicator className="shrink-0" />
          )}

          {/* Direct 1-Click Day / Night Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-card border border-transparent hover:border-light-border dark:hover:border-dark-border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            title={resolvedTheme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            aria-label={resolvedTheme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Notifications button (authenticated only) */}
          {isAuthenticated && (
            <div className="relative" ref={notifMenuRef}>
              <button
                onClick={() => toggleMenu('notifications')}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-card border border-transparent hover:border-light-border dark:hover:border-dark-border transition-colors relative"
                aria-label="Notifications"
                aria-expanded={activeMenu === 'notifications'}
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-dark-sidebar" />
                )}
              </button>

              <NotificationCenter
                isOpen={activeMenu === 'notifications'}
                onClose={() => setActiveMenu(null)}
                onUnreadCountChange={setUnreadNotifCount}
              />
            </div>
          )}

          {/* Authentication-aware User Controls */}
          {!isAuthenticated ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs sm:text-sm font-bold shadow-sm shadow-brand-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/signup"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-light-border dark:border-dark-border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card text-xs sm:text-sm font-semibold transition-all"
              >
                <span>Register</span>
              </Link>
            </div>
          ) : (
            /* Authenticated User profile avatar & details */
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => toggleMenu('user')}
                className="flex items-center gap-2 p-1 sm:p-1.5 sm:pl-2 rounded-xl border border-light-border dark:border-dark-border hover:bg-slate-100 dark:hover:bg-dark-card transition-colors text-left"
                aria-label="User profile menu"
                aria-expanded={activeMenu === 'user'}
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

              {activeMenu === 'user' && (
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
                      onClick={() => setActiveMenu(null)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500" />
                      <span>My Profile & Settings</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin/subadmins"
                        onClick={() => setActiveMenu(null)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover dark:hover:text-blue-200 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5 text-brand-400" />
                        <span>Staff & Permissions</span>
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
                        onClick={() => setActiveMenu(null)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5 text-brand-500" />
                        <span>Portal Selection Gateway</span>
                      </Link>
                      <button
                        onClick={async () => {
                          setActiveMenu(null);
                          await signOut();
                          navigate('/portal');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
