import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/api';
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
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const SubAdminDashboard: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const auditLogs = ApiService.getAuditLogs();

  const isSuspended = currentUser.status === 'suspended';
  const recentLogs = auditLogs.slice(0, 4);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Staff Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-yogneet-navy via-[#12224A] to-[#0A1329] p-6 sm:p-8 text-white border border-yogneet-cyan/20 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yogneet-cyan/15 border border-yogneet-cyan/30 text-yogneet-cyan backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-yogneet-cyan" /> Staff Operations Portal
              </span>
              <Badge variant={isSuspended ? 'danger' : 'success'} size="sm" dot>
                {isSuspended ? 'Suspended' : 'Active Staff'}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Welcome, {currentUser.name}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
              Assigned Department: <strong className="text-white font-semibold">{currentUser.department || 'Curriculum Staff'}</strong>. Operational workspace configured with your verified RBAC privileges.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-5">
              {(hasPermission('notes.view') || hasPermission('videos.view')) && (
                <Link to="/subadmin/content">
                  <Button size="md" className="bg-yogneet-cyan hover:bg-yogneet-cyanHover text-yogneet-navy font-bold border-none shadow-md shadow-yogneet-cyan/25" leftIcon={<FileText className="w-4 h-4 text-yogneet-navy" />}>
                    Content Workspace
                  </Button>
                </Link>
              )}
              {hasPermission('tests.view') && (
                <Link to="/tests">
                  <Button variant="secondary" size="md" className="border-slate-700 bg-white/10 hover:bg-white/20 text-white" leftIcon={<CheckSquare className="w-4 h-4 text-yogneet-orange" />}>
                    Assessment Catalog
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Dedicated Hero Phoenix Emblem */}
          <div className="flex items-center justify-center md:justify-end shrink-0 self-center">
            <div className="relative w-48 h-32 sm:w-60 sm:h-36 md:w-72 md:h-44 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-orange-500/25 blur-2xl rounded-full pointer-events-none" />
              <img
                src="/brand/yogneet-emblem.png"
                alt="Yogneet Edu Phoenix Emblem"
                className="relative max-h-28 sm:max-h-36 md:max-h-40 w-auto object-contain drop-shadow-[0_0_25px_rgba(0,200,232,0.35)] transition-transform duration-300 hover:scale-105"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Suspended Alert */}
      {isSuspended && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-sm">
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
      <Card padding="md" className="space-y-4 border border-light-border dark:border-dark-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-light-border dark:border-dark-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Your Assigned RBAC Privileges ({currentUser.permissions.length})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Authorized by Super Admin • Enforced via Server-Side Database RPC &amp; RLS
              </p>
            </div>
          </div>
          <Badge variant="purple" size="sm">
            {currentUser.permissions.length} Active Privileges
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {currentUser.permissions.map(perm => (
            <span
              key={perm}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-dark-sidebar border border-slate-200 dark:border-dark-border text-slate-800 dark:text-slate-200 hover:border-yogneet-cyan/50 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{perm}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* Operational Workspaces Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Assigned Workspaces
          </h2>
          <span className="text-xs text-slate-400">Action modules configured for your role</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Notes & Video Workspace */}
          {(hasPermission('notes.view') || hasPermission('videos.view')) && (
            <Card padding="md" className="space-y-4 flex flex-col justify-between border border-light-border dark:border-dark-border hover:border-yogneet-cyan/40 transition-all shadow-sm">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-yogneet-cyan/25 flex items-center justify-center p-2">
                  <img src="/brand/features/feature-notes.png" alt="Content Workspace" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Content Workspace
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    Author new study notes, update video lectures, and submit curriculum materials for editorial review.
                  </p>
                </div>
              </div>
              <Link to="/subadmin/content">
                <Button size="sm" variant="outline" className="w-full justify-between" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Open Workspace
                </Button>
              </Link>
            </Card>
          )}

          {/* Test Series */}
          {hasPermission('tests.view') && (
            <Card padding="md" className="space-y-4 flex flex-col justify-between border border-light-border dark:border-dark-border hover:border-emerald-500/40 transition-all shadow-sm">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Assessment Catalog
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    Review scheduled exams, question banks, and student percentile score distributions.
                  </p>
                </div>
              </div>
              <Link to="/tests">
                <Button size="sm" variant="outline" className="w-full justify-between" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Review Tests
                </Button>
              </Link>
            </Card>
          )}

          {/* Community Moderation */}
          {hasPermission('community.moderate') && (
            <Card padding="md" className="space-y-4 flex flex-col justify-between border border-light-border dark:border-dark-border hover:border-purple-500/40 transition-all shadow-sm">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-500/25 flex items-center justify-center p-2">
                  <img src="/brand/features/feature-community.png" alt="Community Moderation" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Community Moderation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    Monitor student discussions, pin helpful answers, and moderate educational forum threads.
                  </p>
                </div>
              </div>
              <Link to="/community">
                <Button size="sm" variant="outline" className="w-full justify-between" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Moderate Forum
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* Operational Activity Stream */}
      <Card padding="md" className="space-y-4 border border-light-border dark:border-dark-border shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yogneet-cyan" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Operational Activity &amp; Audit Timeline
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Real-Time Event Stream</span>
        </div>

        <div className="space-y-2.5">
          {recentLogs.map(log => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {log.action}
                  </span>
                  <Badge variant={log.outcome === 'SUCCESS' ? 'success' : 'danger'} size="sm">
                    {log.outcome}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {log.details}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block font-mono">
                  {log.timestamp}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Actor: {log.actor.name.split(' ')[0]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
