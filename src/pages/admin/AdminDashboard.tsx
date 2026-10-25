import React from 'react';
import { Link } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { AuditService } from '../../services/api';
import {
  Shield,
  Users,
  Video,
  FileText,
  CheckSquare,
  FileSpreadsheet,
  BarChart3,
  TrendingUp,
  ArrowRight,
  Plus,
  AlertCircle,
  Key,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const AdminDashboard: React.FC = () => {
  const users = ApiService.getUsers();
  const subAdmins = ApiService.getSubAdmins();
  const videos = ApiService.getVideos();
  const notes = ApiService.getNotes();
  const tests = ApiService.getTests();
  const auditLogs = ApiService.getAuditLogs();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="pb-4 border-b border-light-border dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              👑 Super Admin Authority
            </Badge>
            <span className="text-xs text-slate-400">Full Platform Management Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-brand-500" />
            Yogneet Edu Administration Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Oversee platform staff, configure fine-grained RBAC permissions, audit operational compliance, and publish educational curricula.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/permissions">
            <Button size="sm" variant="primary" leftIcon={<Key className="w-4 h-4" />}>
              RBAC Permissions
            </Button>
          </Link>
          <Link to="/admin/audit-logs">
            <Button size="sm" variant="outline" leftIcon={<FileSpreadsheet className="w-4 h-4" />}>
              Audit Logs
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Sub-Admin Staff</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {subAdmins.length}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {subAdmins.filter(s => s.status === 'active').length} Active • {subAdmins.filter(s => s.status === 'suspended').length} Suspended
          </span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Video Lectures</span>
            <Video className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {videos.length}
          </p>
          <span className="text-[11px] text-brand-500 font-semibold">Tech Geek Adarsh Channel</span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Study Notes & PDFs</span>
            <FileText className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {notes.length}
          </p>
          <span className="text-[11px] text-emerald-500 font-semibold">All Published</span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Audit Trail Events</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {auditLogs.length}
          </p>
          <span className="text-[11px] text-amber-500 font-semibold">Append-Only Active</span>
        </Card>
      </div>

      {/* Main Grid: Sub-Admin Quick Table on Left, Content Operations on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sub-Admin Management Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Staff & Sub-Admin Accounts
              </h2>
              <p className="text-xs text-slate-500">Fine-grained role-based access controllers</p>
            </div>
            <Link to="/admin/subadmins" className="text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1">
              Manage Staff <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card padding="none" className="overflow-hidden border border-light-border dark:border-dark-border">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Sub-Admin</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Permissions</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {subAdmins.map(staff => (
                  <tr key={staff.id} className="hover:bg-slate-50/80 dark:hover:bg-dark-cardHover/50 transition-colors">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <img
                        src={staff.avatar}
                        alt={staff.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {staff.name}
                        </span>
                        <span className="text-[11px] text-slate-400">{staff.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {staff.department?.split(' ')[0] || 'Staff'}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={staff.status === 'active' ? 'success' : 'danger'}
                        size="sm"
                        dot
                      >
                        {staff.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400">
                        {staff.permissions.length} actions
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link to={`/admin/permissions?user=${staff.id}`}>
                        <Button size="sm" variant="outline">
                          Edit RBAC
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Right Col: Quick Administrative Shortcuts */}
        <div className="space-y-6">
          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Quick Administrative Actions
            </h3>
            <div className="space-y-2">
              <Link to="/admin/subadmins" className="block">
                <Button size="sm" variant="outline" className="w-full justify-start" leftIcon={<Shield className="w-4 h-4 text-purple-500" />}>
                  Invite New Sub-Admin
                </Button>
              </Link>
              <Link to="/subadmin/content" className="block">
                <Button size="sm" variant="outline" className="w-full justify-start" leftIcon={<FileText className="w-4 h-4 text-brand-500" />}>
                  Content Workspace (Notes & Videos)
                </Button>
              </Link>
              <Link to="/tests" className="block">
                <Button size="sm" variant="outline" className="w-full justify-start" leftIcon={<CheckSquare className="w-4 h-4 text-emerald-500" />}>
                  Manage Test Series & Exams
                </Button>
              </Link>
              <Link to="/admin/audit-logs" className="block">
                <Button size="sm" variant="outline" className="w-full justify-start" leftIcon={<FileSpreadsheet className="w-4 h-4 text-amber-500" />}>
                  Export CSV Audit Trail
                </Button>
              </Link>
            </div>
          </Card>

          {/* Recent Audit Activities preview */}
          <Card padding="md" className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Security Audits
              </h4>
              <Link to="/admin/audit-logs" className="text-[11px] text-brand-500 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              {auditLogs.slice(0, 3).map(log => (
                <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {log.action}
                    </span>
                    <Badge variant={log.outcome === 'SUCCESS' ? 'success' : 'danger'} size="sm">
                      {log.outcome}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {log.details}
                  </p>
                  <span className="text-[10px] text-slate-400 block pt-0.5">
                    By {log.actor.name.split(' ')[0]} • {log.timestamp.split(' ')[1]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
