import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  FileText,
  Video,
  CheckSquare,
  MessageSquare,
  Users,
  Key,
  ArrowRight,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const SubAdminDashboard: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();

  const isSuspended = currentUser.status === 'suspended';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="purple" size="sm">
            Staff Portal
          </Badge>
          <span className="text-xs text-slate-400">Authorized Educational Operations</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-purple-500" />
          Welcome, {currentUser.name}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Assigned Department: <strong>{currentUser.department || 'Curriculum Staff'}</strong>
        </p>
      </div>

      {/* Suspended Alert */}
      {isSuspended && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Account Access Suspended</h4>
            <p className="text-xs mt-1 leading-relaxed">
              Your sub-admin account is currently suspended by the platform administrator. All content publishing, editing, and moderation privileges are paused. Contact Super Admin Adarsh to restore active status.
            </p>
          </div>
        </div>
      )}

      {/* Granted Permissions Card */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Key className="w-4 h-4 text-purple-500" />
            Your Assigned RBAC Privileges ({currentUser.permissions.length})
          </h2>
          <span className="text-[11px] text-slate-400">Granted by Super Admin</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentUser.permissions.map(perm => (
            <span
              key={perm}
              className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-dark-sidebar border border-light-border dark:border-dark-border text-slate-800 dark:text-slate-200"
            >
              ✓ {perm}
            </span>
          ))}
        </div>
      </Card>

      {/* Operational Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Notes & Video Workspace */}
        {(hasPermission('notes.view') || hasPermission('videos.view')) && (
          <Card padding="md" className="space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Content Workspace
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Author new revision sheets, update video lectures, and submit notes for editorial review.
              </p>
            </div>
            <Link to="/subadmin/content">
              <Button size="sm" variant="outline" className="w-full">
                Open Workspace
              </Button>
            </Link>
          </Card>
        )}

        {/* Test Series */}
        {hasPermission('tests.view') && (
          <Card padding="md" className="space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Assessment Catalog
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Review scheduled exams, question banks, and student percentile score distributions.
              </p>
            </div>
            <Link to="/tests">
              <Button size="sm" variant="outline" className="w-full">
                Review Tests
              </Button>
            </Link>
          </Card>
        )}

        {/* Community Moderation */}
        {hasPermission('community.moderate') && (
          <Card padding="md" className="space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Community Moderation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Monitor student discussions, pin helpful answers, and moderate forum topics.
              </p>
            </div>
            <Link to="/community">
              <Button size="sm" variant="outline" className="w-full">
                Moderate Forum
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
};
