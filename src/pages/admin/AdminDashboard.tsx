import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured, isMockFallbackAllowed } from '../../services/supabaseClient';
import { ApiService } from '../../services/api';
import { UserProfile } from '../../types';
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
  Layers,
  MessageSquare,
  BookOpen,
  Film,
  Crown,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ActiveLearnersControlCard } from '../../components/admin/ActiveLearnersControlCard';
import { Badge } from '../../components/common/Badge';

export const AdminDashboard: React.FC = () => {
  const [subAdmins, setSubAdmins] = useState<UserProfile[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    subAdmins: 0,
    activeSubAdmins: 0,
    suspendedSubAdmins: 0,
    videos: 0,
    notes: 0,
    tests: 0,
    students: 0,
    auditLogs: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured() || !supabase) {
      if (isMockFallbackAllowed()) {
        const localUsers = ApiService.getUsers();
        const localSubAdmins = ApiService.getSubAdmins();
        const localVideos = ApiService.getVideos();
        const localNotes = ApiService.getNotes();
        const localTests = ApiService.getTests();
        const localAuditLogs = ApiService.getAuditLogs();
        const localStudents = localUsers.filter(u => u.role === 'student');

        setSubAdmins(localSubAdmins);
        setRecentLogs(localAuditLogs.slice(0, 4));
        setCounts({
          subAdmins: localSubAdmins.length,
          activeSubAdmins: localSubAdmins.filter(s => s.status === 'active').length,
          suspendedSubAdmins: localSubAdmins.filter(s => s.status === 'suspended').length,
          videos: localVideos.length,
          notes: localNotes.length,
          tests: localTests.length,
          students: localStudents.length,
          auditLogs: localAuditLogs.length,
        });
      } else {
        setSubAdmins([]);
        setRecentLogs([]);
        setCounts({
          subAdmins: 0,
          activeSubAdmins: 0,
          suspendedSubAdmins: 0,
          videos: 0,
          notes: 0,
          tests: 0,
          students: 0,
          auditLogs: 0,
        });
      }
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch sub-admins with assigned permissions
      const { data: staffRows } = await supabase
        .from('profiles')
        .select(`
          id, name, email, avatar_url, role, status, department, bio, created_at, last_active,
          permissions:user_permissions(permission_key)
        `)
        .eq('role', 'subadmin')
        .order('created_at', { ascending: false });

      const mappedStaff: UserProfile[] = ((staffRows as any[]) || []).map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        avatar: p.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
        role: 'subadmin',
        status: p.status || 'active',
        department: p.department || 'Curriculum Staff',
        bio: p.bio || '',
        permissions: (p.permissions || []).map((perm: any) => perm.permission_key),
        createdAt: p.created_at,
        lastActive: p.last_active,
      }));
      setSubAdmins(mappedStaff);

      // 2. Fetch live table counts concurrently
      const [
        studentsRes,
        videosRes,
        notesRes,
        testsRes,
        auditLogsRes,
        recentLogsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('video_lessons').select('id', { count: 'exact', head: true }),
        supabase.from('study_notes').select('id', { count: 'exact', head: true }),
        supabase.from('assessments').select('id', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(4),
      ]);

      setCounts({
        subAdmins: mappedStaff.length,
        activeSubAdmins: mappedStaff.filter(s => s.status === 'active').length,
        suspendedSubAdmins: mappedStaff.filter(s => s.status === 'suspended').length,
        students: studentsRes.count || 0,
        videos: videosRes.count || 0,
        notes: notesRes.count || 0,
        tests: testsRes.count || 0,
        auditLogs: auditLogsRes.count || 0,
      });

      setRecentLogs((recentLogsRes.data as any[]) || []);
    } catch (err) {
      console.error('[AdminDashboard] Failed to fetch live platform metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
              YOGNEET <span className="text-yogneet-cyan">EDU</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
              Oversee staff members, configure student tier access rules, respond to user feedback, and manage technical curricula.
            </p>
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
            {isLoading ? '...' : counts.subAdmins}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
            {counts.activeSubAdmins} Active • {counts.suspendedSubAdmins} Suspended
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-card/90 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Video Lectures</span>
            <Video className="w-4 h-4 text-yogneet-cyan" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : counts.videos}
          </p>
          <span className="text-[10px] text-yogneet-cyan font-semibold block truncate">
            {counts.videos > 0 ? 'Published Curricula' : 'No Lectures Published'}
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-card/90 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Study Notes</span>
            <FileText className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : counts.notes}
          </p>
          <span className="text-[10px] text-emerald-500 font-semibold block truncate">
            {counts.notes > 0 ? 'Verified Guides' : 'No Notes Yet'}
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-card/90 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Assessment Series</span>
            <CheckSquare className="w-4 h-4 text-yogneet-orange" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : counts.tests}
          </p>
          <span className="text-[10px] text-yogneet-orange font-semibold block truncate">
            {counts.tests > 0 ? 'Active Test Catalog' : 'No Tests Created'}
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-card/90 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : counts.students}
          </p>
          <span className="text-[10px] text-blue-500 font-semibold block truncate">
            Registered Accounts
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-card/90 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Audit Trail</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : counts.auditLogs}
          </p>
          <span className="text-[10px] text-amber-500 font-semibold block truncate">
            Immutable Audit Events
          </span>
        </Card>
      </div>

      {/* Feature 1: Active Learners Control Center */}
      <ActiveLearnersControlCard onUpdated={fetchDashboardData} />

      {/* Main Grid: Sub-Admin Quick Table on Left, Content Operations on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sub-Admin Management Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Staff &amp; Sub-Admin Accounts
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
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-500" />
                      Loading staff records...
                    </td>
                  </tr>
                ) : subAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No sub-admin accounts created yet.
                    </td>
                  </tr>
                ) : (
                  subAdmins.map(staff => (
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
                          <span className="text-[11px] text-slate-400 font-mono">{staff.email}</span>
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
                        <Link to={`/admin/subadmins?user=${staff.id}`}>
                          <Button size="sm" variant="outline">
                            Edit RBAC
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Right Col: Quick Administrative Shortcuts & Recent Audits */}
        <div className="space-y-6">
          <Card padding="md" className="space-y-4 border border-light-border dark:border-dark-border">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Quick Administrative Actions
            </h3>
            <div className="space-y-2">
              <Link to="/admin/student-access" className="block">
                <Button size="sm" variant="outline" className="w-full justify-start" leftIcon={<Layers className="w-4 h-4 text-brand-500" />}>
                  Student Tab Access Control
                </Button>
              </Link>
              <Link to="/admin/feedback" className="block">
                <Button size="sm" variant="outline" className="w-full justify-start" leftIcon={<MessageSquare className="w-4 h-4 text-cyan-500" />}>
                  Feedback &amp; Issue Triage
                </Button>
              </Link>
              <Link to="/admin/subjects" className="block">
                <Button size="sm" variant="outline" className="w-full justify-start" leftIcon={<BookOpen className="w-4 h-4 text-indigo-500" />}>
                  Subject Curriculum Management
                </Button>
              </Link>
              <Link to="/admin/micro-lessons" className="block">
                <Button size="sm" variant="outline" className="w-full justify-start" leftIcon={<Film className="w-4 h-4 text-pink-500" />}>
                  Micro Lessons Shorts
                </Button>
              </Link>
              <Link to="/admin/premium-students" className="block">
                <Button size="sm" variant="outline" className="w-full justify-start" leftIcon={<Crown className="w-4 h-4 text-amber-500" />}>
                  Premium Students (2026 Batch)
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
          <Card padding="md" className="space-y-3 border border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Security Audits
              </h4>
              <Link to="/admin/audit-logs" className="text-[11px] text-brand-500 hover:underline">
                View all ({counts.auditLogs})
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              {recentLogs.length === 0 ? (
                <p className="text-slate-400 text-xs py-2">No audit events recorded yet.</p>
              ) : (
                recentLogs.map((log: any) => (
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
                      By {log.actor_name || log.actor?.name || 'System'} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
