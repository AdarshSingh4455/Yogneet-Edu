import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { User, Shield, Moon, Sun, Laptop, CheckCircle2, Key, Info, Edit3, Save, X, Database } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const StudentProfilePage: React.FC = () => {
  const { currentUser, isAdmin, isSubAdmin, updateCurrentUserProfile, backendMode } = useAuth();
  const { mode, setMode } = useTheme();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [department, setDepartment] = useState(currentUser.department || '');
  const [bio, setBio] = useState(currentUser.bio || '');

  const handleStartEdit = () => {
    setName(currentUser.name);
    setDepartment(currentUser.department || '');
    setBio(currentUser.bio || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateCurrentUserProfile({
        name: name.trim() || currentUser.name,
        department: department.trim(),
        bio: bio.trim(),
      });
      setIsEditing(false);
      toast.success('Profile Updated', 'Your profile details have been securely synchronized.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      toast.error('Update Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-light-border dark:border-dark-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <User className="w-6 h-6 text-brand-500" />
            Account Profile & System Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your educational profile, appearance preferences, and view active platform permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={backendMode === 'supabase' ? 'success' : 'brand'}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Database className="w-3 h-3" />
            Backend: {backendMode === 'supabase' ? 'Supabase Live' : 'Local Mock'}
          </Badge>
        </div>
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

          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              className="mt-2 sm:mt-0"
            >
              Edit Profile
            </Button>
          )}
        </div>

        {/* Inline Profile Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="pt-4 border-t border-light-border dark:border-dark-border space-y-4 animate-in fade-in duration-150">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Edit Account Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-sidebar text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Department / Track
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & AI"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-sidebar text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Bio & Academic Interests
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                placeholder="Brief summary of your learning objectives..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-sidebar text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                leftIcon={<X className="w-3.5 h-3.5" />}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSaving}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}

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
                ? 'border-brand-500 bg-brand-50/70 dark:bg-dark-selected dark:border-blue-500 ring-2 ring-brand-500 dark:ring-blue-400 dark:shadow-blue-glow'
                : 'border-light-border dark:border-dark-border bg-white dark:bg-dark-card hover:border-slate-300 dark:hover:border-blue-700/50 dark:hover:bg-dark-hover'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Sun className="w-5 h-5 text-amber-500" />
              {mode === 'light' && <CheckCircle2 className="w-4 h-4 text-brand-500 dark:text-blue-400" />}
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Light Mode</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Clean high-contrast theme</span>
          </button>

          <button
            onClick={() => setMode('dark')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              mode === 'dark'
                ? 'border-brand-500 bg-brand-50/70 dark:bg-dark-selected dark:border-blue-500 ring-2 ring-brand-500 dark:ring-blue-400 dark:shadow-blue-glow'
                : 'border-light-border dark:border-dark-border bg-white dark:bg-dark-card hover:border-slate-300 dark:hover:border-blue-700/50 dark:hover:bg-dark-hover'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Moon className="w-5 h-5 text-brand-400" />
              {mode === 'dark' && <CheckCircle2 className="w-4 h-4 text-brand-500 dark:text-blue-400" />}
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Dark Mode</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Default dark developer theme</span>
          </button>

          <button
            onClick={() => setMode('system')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              mode === 'system'
                ? 'border-brand-500 bg-brand-50/70 dark:bg-dark-selected dark:border-blue-500 ring-2 ring-brand-500 dark:ring-blue-400 dark:shadow-blue-glow'
                : 'border-light-border dark:border-dark-border bg-white dark:bg-dark-card hover:border-slate-300 dark:hover:border-blue-700/50 dark:hover:bg-dark-hover'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Laptop className="w-5 h-5 text-slate-400" />
              {mode === 'system' && <CheckCircle2 className="w-4 h-4 text-brand-500 dark:text-blue-400" />}
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
          <strong className="text-slate-700 dark:text-slate-300">Phase 2 Backend Foundation:</strong> Supporting dual-mode operation: active local mock data with immediate prototype interactivity, and full Supabase PostgreSQL + Auth + RLS integration when environment variables are supplied.
        </div>
      </div>
    </div>
  );
};
