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
  const students = users.filter(u => u.role === 'student');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Authority Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-yogneet-navy via-[#12224A] to-[#0A1329] p-6 sm:p-8 text-white border border-yogneet-cyan/20 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yogneet-cyan/15 border border-yogneet-cyan/30 text-yogneet-cyan backdrop-blur-sm">
                👑 Super Admin Authority • Full Platform Console
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              YOGNEET <span className="text-yogneet-cyan">EDU</span> Administration Portal
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
              Oversee platform staff, configure fine-grained RBAC permissions, audit operational compliance, and manage technical education curricula.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <Link to="/admin/permissions">
                <Button size="md" className="bg-yogneet-cyan hover:bg-yogneet-cyanHover text-yogneet-navy font-bold border-none shadow-md shadow-yogneet-cyan/25" leftIcon={<Key className="w-4 h-4 fill-yogneet-navy" />}>
                  RBAC Permissions
                </Button>
              </Link>
              <Link to="/admin/audit-logs">
                <Button variant="secondary" size="md" className="border-slate-700 bg-white/10 hover:bg-white/20 text-white" leftIcon={<FileSpreadsheet className="w-4 h-4 text-yogneet-orange" />}>
                  Audit Logs
                </Button>
              </Link>
              <Link to="/admin/subadmins">
                <Button variant="secondary" size="md" className="border-slate-700 bg-white/10 hover:bg-white/20 text-white" leftIcon={<Shield className="w-4 h-4 text-purple-400" />}>
                  Manage Staff
                </Button>
              </Link>
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

      {/* Primary KPI Row - 6 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-card/90 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Staff / Sub-Admins</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {subAdmins.length}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
            {subAdmins.filter(s => s.status === 'active').length} Active • {subAdmins.filter(s => s.status === 'suspended').length} Suspended
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-card/90 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Video Lectures</span>
            <Video className="w-4 h-4 text-yogneet-cyan" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {videos.length}
          </p>
          <span className="text-[10px] text-yogneet-cyan font-semibold block truncate">
            Tech Geek Adarsh
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-card/90 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Study Notes</span>
            <FileText className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {notes.length}
          </p>
          <span className="text-[10px] text-emerald-500 font-semibold block truncate">
            100% Published
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-card/90 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Assessment Series</span>
            <CheckSquare className="w-4 h-4 text-yogneet-orange" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {tests.length}
          </p>
          <span className="text-[10px] text-yogneet-orange font-semibold block truncate">
            Active Test Catalog
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-card/90 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {students.length}
          </p>
          <span className="text-[10px] text-blue-500 font-semibold block truncate">
            Active Learners
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-card/90 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Audit Trail</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {auditLogs.length}
          </p>
          <span className="text-[10px] text-amber-500 font-semibold block truncate">
            Append-Only Verified
          </span>
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

          <Card padding="none" className="overflow-hidden border border-light-border dark:border-dark-border shadow-sm">
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
                  <tr key={staff.id} className="hover:bg-slate-50/80 dark:hover:bg-dark-hover/70 transition-colors">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <img
                        src={staff.avatar}
                        alt={staff.name}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-yogneet-cyan/30"
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
                <Button size="sm" variant="outline" className="w-full justify-start gap-2" leftIcon={<img src="/brand/features/feature-notes.png" alt="Content Workspace" className="w-4 h-4 object-contain inline-block" />}>
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
