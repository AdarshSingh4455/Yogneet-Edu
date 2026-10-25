import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { User, Shield, Moon, Sun, Laptop, CheckCircle2, Key, Info } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const StudentProfilePage: React.FC = () => {
  const { currentUser, isAdmin, isSubAdmin } = useAuth();
  const { mode, resolvedTheme, setMode } = useTheme();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-light-border dark:border-dark-border">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <User className="w-6 h-6 text-brand-500" />
          Account Profile & System Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your educational profile, appearance preferences, and view active platform permissions.
        </p>
      </div>

      {/* User Information Card */}
      <Card padding="lg" className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-brand-500/20 shadow-md"
          />

          <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                {currentUser.name}
              </h2>
              <Badge
                variant={isAdmin ? 'brand' : isSubAdmin ? 'purple' : 'success'}
                size="sm"
              >
                {currentUser.role.toUpperCase()}
              </Badge>
              {currentUser.status === 'suspended' && (
                <Badge variant="danger" size="sm">
                  SUSPENDED
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser.email}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {currentUser.department || 'Enrolled Student'}
            </p>

            {currentUser.bio && (
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 leading-relaxed max-w-xl">
                {currentUser.bio}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-light-border dark:border-dark-border text-xs">
          <div>
            <span className="text-slate-400 block">Account Status:</span>
            <span className="font-bold capitalize text-slate-800 dark:text-slate-200 mt-0.5 block">
              {currentUser.status}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Member Since:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Last Active Session:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {currentUser.lastActive}
            </span>
          </div>
        </div>
      </Card>

      {/* Appearance / Dual-Theme System Settings Card */}
      <Card padding="md" className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Interface Appearance & Theme
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose your preferred theme mode. Changes persist automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setMode('light')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              mode === 'light'
                ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 ring-2 ring-brand-500'
                : 'border-light-border dark:border-dark-border bg-white dark:bg-dark-card hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Sun className="w-5 h-5 text-amber-500" />
              {mode === 'light' && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Light Mode</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Clean high-contrast theme</span>
          </button>

          <button
            onClick={() => setMode('dark')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              mode === 'dark'
                ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 ring-2 ring-brand-500'
                : 'border-light-border dark:border-dark-border bg-white dark:bg-dark-card hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Moon className="w-5 h-5 text-brand-400" />
              {mode === 'dark' && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Dark Mode</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Default dark developer theme</span>
          </button>

          <button
            onClick={() => setMode('system')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              mode === 'system'
                ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 ring-2 ring-brand-500'
                : 'border-light-border dark:border-dark-border bg-white dark:bg-dark-card hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Laptop className="w-5 h-5 text-slate-400" />
              {mode === 'system' && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">System Default</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Matches OS preference</span>
          </button>
        </div>
      </Card>

      {/* Permissions Breakdown (For Sub-Admins or Admins) */}
      {(isAdmin || isSubAdmin) && (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-500" />
                Active RBAC Permissions Summary
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAdmin
                  ? 'As Super Admin, you have unrestricted access to all platform actions.'
                  : `You have ${currentUser.permissions.length} granular module actions assigned.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {isAdmin ? (
              <Badge variant="brand" size="md">
                👑 Full Authority (*.*)
              </Badge>
            ) : currentUser.permissions.length > 0 ? (
              currentUser.permissions.map(perm => (
                <span
                  key={perm}
                  className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-dark-sidebar border border-light-border dark:border-dark-border text-slate-700 dark:text-slate-300"
                >
                  {perm}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">No active permissions assigned.</span>
            )}
          </div>
        </Card>
      )}

      {/* Demonstration Banner */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-dark-card border border-light-border dark:border-dark-border text-xs text-slate-500 dark:text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-700 dark:text-slate-300">Phase 1 Development Notice:</strong> This frontend uses realistic mock data for learning progress and accounts. Production authentication and identity provider integration will be deployed in subsequent phases.
        </div>
      </div>
    </div>
  );
};
