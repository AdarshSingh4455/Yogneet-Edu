import React, { useState } from 'react';
import { ApiService } from '../../services/api';
import { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Search,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  Lock,
  Unlock,
  GraduationCap,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const StudentManagementPage: React.FC = () => {
  const { currentUser, hasPermission, isAdmin } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<UserProfile[]>(() =>
    ApiService.getUsers().filter(u => u.role === 'student')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToSuspend, setSelectedToSuspend] = useState<UserProfile | null>(null);

  const canSuspendStudents = hasPermission('students.suspend');

  const filteredStudents = users.filter(s => {
    return (
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleToggleSuspendConfirm = () => {
    if (!selectedToSuspend) return;
    if (!canSuspendStudents) {
      toast.error('Permission Denied', 'You lack "students.suspend" authorization.');
      setSelectedToSuspend(null);
      return;
    }

    try {
      ApiService.toggleSubAdminStatus(currentUser, selectedToSuspend.id);
      toast.success(
        'Student Status Updated',
        `${selectedToSuspend.name} is now ${selectedToSuspend.status === 'active' ? 'SUSPENDED' : 'ACTIVE'}.`
      );
      setSelectedToSuspend(null);
      setUsers(ApiService.getUsers().filter(u => u.role === 'student'));
    } catch (err: any) {
      toast.error('Failed', err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="info" size="sm">
            Student Operations
          </Badge>
          <span className="text-xs text-slate-400">Enrolled Learners Directory</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <Users className="w-6 h-6 text-brand-500" />
          Enrolled Students Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Inspect student engagement metrics, course progress, solved problems, and manage access privileges.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search students by name, email, or college..."
          className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-blue-500/40 dark:focus:border-blue-400 dark:focus:bg-dark-selected/30 transition-all"
        />
      </div>

      {/* Students List / Table */}
      {filteredStudents.length === 0 ? (
        <Card padding="lg" className="text-center py-12 border border-light-border dark:border-dark-border">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Students Found</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            No enrolled students match "{searchQuery}". Try a different name, email, or college query.
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile Student Cards (visible on mobile < md) */}
          <div className="block md:hidden space-y-3">
            {filteredStudents.map(student => {
              const isSuspended = student.status === 'suspended';

              return (
                <Card
                  key={student.id}
                  padding="md"
                  className="border border-light-border dark:border-dark-border space-y-3 shadow-xs"
                >
                  {/* Identity & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-light-border dark:ring-dark-border"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block truncate">
                          {student.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block break-all leading-tight mt-0.5">
                          {student.email}
                        </span>
                      </div>
                    </div>
                    <Badge variant={isSuspended ? 'danger' : 'success'} size="sm" dot className="shrink-0">
                      {student.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Academic Info */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-light-border dark:border-dark-border">
                    <GraduationCap className="w-4 h-4 text-brand-500 shrink-0" />
                    <span className="font-medium truncate">{student.department || 'B.Tech CS'}</span>
                  </div>

                  {/* Learning Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-sidebar/60 border border-light-border dark:border-dark-border text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Solved Problems</span>
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                        {student.solvedProblemsCount || 47} Solved
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-sidebar/60 border border-light-border dark:border-dark-border text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Tests Completed</span>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5 block">
                        {student.testsCompletedCount || 6} Tests
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-1 flex justify-end">
                    <Button
                      size="sm"
                      variant={isSuspended ? 'success' : 'outline'}
                      disabled={!canSuspendStudents}
                      onClick={() => setSelectedToSuspend(student)}
                      title={canSuspendStudents ? 'Toggle account status' : 'Requires students.suspend permission'}
                      leftIcon={isSuspended ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      className="w-full justify-center"
                    >
                      {isSuspended ? 'Reactivate Student' : 'Suspend Access'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop & Tablet Table (visible on >= md) */}
          <Card padding="none" className="hidden md:block overflow-hidden border border-light-border dark:border-dark-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 min-w-[220px]">Student Profile</th>
                    <th className="py-3 px-4 min-w-[150px]">Program / College</th>
                    <th className="py-3 px-4 whitespace-nowrap">Solved Problems</th>
                    <th className="py-3 px-4 whitespace-nowrap">Tests Completed</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border dark:divide-dark-border">
                  {filteredStudents.map(student => {
                    const isSuspended = student.status === 'suspended';

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-dark-hover/70 transition-colors"
                      >
                        <td className="py-3.5 px-4 min-w-[220px]">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={student.avatar}
                              alt={student.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                                {student.name}
                              </span>
                              <span className="text-[11px] text-slate-400 block break-all">{student.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 min-w-[150px]">
                          {student.department || 'B.Tech CS'}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {student.solvedProblemsCount || 47} Solved
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {student.testsCompletedCount || 6} Tests
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge variant={isSuspended ? 'danger' : 'success'} size="sm" dot>
                            {student.status.toUpperCase()}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant={isSuspended ? 'success' : 'outline'}
                            disabled={!canSuspendStudents}
                            onClick={() => setSelectedToSuspend(student)}
                            title={canSuspendStudents ? 'Toggle account status' : 'Requires students.suspend permission'}
                            leftIcon={isSuspended ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          >
                            {isSuspended ? 'Reactivate' : 'Suspend'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Suspend Confirmation Dialog */}
      {selectedToSuspend && (
        <ConfirmDialog
          isOpen={!!selectedToSuspend}
          onClose={() => setSelectedToSuspend(null)}
          onConfirm={handleToggleSuspendConfirm}
          title={
            selectedToSuspend.status === 'active'
              ? `Suspend Student Access for ${selectedToSuspend.name}?`
              : `Reactivate Access for ${selectedToSuspend.name}?`
          }
          message={
            selectedToSuspend.status === 'active'
              ? 'Suspending this student will immediately revoke their access to assessment submissions and coding practice.'
              : 'Reactivating will restore the student’s normal access.'
          }
          confirmText={selectedToSuspend.status === 'active' ? 'Suspend Student' : 'Reactivate'}
          variant={selectedToSuspend.status === 'active' ? 'danger' : 'primary'}
        />
      )}
    </div>
  );
};
