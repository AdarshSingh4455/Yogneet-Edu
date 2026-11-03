import React, { useState, useEffect, useMemo } from 'react';
import { PremiumStudentService, formatEnrollmentNumber, generateProposedYogneetEmail } from '../../services/premiumStudentService';
import { PremiumStudent, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Crown,
  Search,
  Filter,
  CheckCircle2,
  AlertOctagon,
  Plus,
  UserCheck,
  UserX,
  Eye,
  KeyRound,
  Sparkles,
  Phone,
  GraduationCap,
  Calendar,
  Building,
  ShieldAlert,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EnrollmentNumberBadge } from '../../components/common/EnrollmentNumberBadge';
import { AccountInspectionModal } from '../../components/admin/AccountInspectionModal';
import { PasswordLifecycleModal } from '../../components/auth/PasswordLifecycleModal';

export const PremiumStudentManagementPage: React.FC = () => {
  const { currentUser, isAdmin, hasPermission } = useAuth();
  const toast = useToast();

  const [students, setStudents] = useState<PremiumStudent[]>(() =>
    PremiumStudentService.getPremiumStudentsSync()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [eligibleNormalStudents, setEligibleNormalStudents] = useState<UserProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [upgradeAdmissionYear, setUpgradeAdmissionYear] = useState(2026);
  const [upgradePhone, setUpgradePhone] = useState('+91 98765 43210');
  const [upgradeDepartment, setUpgradeDepartment] = useState('Computer Science & Engineering');
  const [upgradeProgram, setUpgradeProgram] = useState('B.Tech CSE');
  const [upgradeInstitution, setUpgradeInstitution] = useState('Delhi Technological University');
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  // Status Toggle & Deactivation State
  const [studentToToggleStatus, setStudentToToggleStatus] = useState<PremiumStudent | null>(null);

  // Inspection Modal State
  const [inspectedStudentId, setInspectedStudentId] = useState<string | null>(null);

  // Password Lifecycle Modal State
  const [passwordTargetStudent, setPasswordTargetStudent] = useState<PremiumStudent | null>(null);

  const canManage = isAdmin || hasPermission('premium_students.manage');

  const reloadStudents = async () => {
    setIsLoading(true);
    try {
      const data = await PremiumStudentService.getPremiumStudents();
      setStudents(data);
    } catch (err) {
      console.error('Failed to load premium students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadStudents();
  }, []);

  const handleOpenUpgrade = async () => {
    const list = await PremiumStudentService.getEligibleNormalStudents();
    setEligibleNormalStudents(list);
    if (list.length > 0) {
      setSelectedStudentId(list[0].id);
    }
    setIsUpgradeModalOpen(true);
  };

  const handleConfirmUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error('Selection Required', 'Please select an existing student account to upgrade.');
      return;
    }

    setIsSubmittingUpgrade(true);
    try {
      const created = await PremiumStudentService.upgradeNormalStudent({
        userId: selectedStudentId,
        admissionYear: upgradeAdmissionYear,
        phone: upgradePhone,
        department: upgradeDepartment,
        program: upgradeProgram,
        institution: upgradeInstitution,
      });

      toast.success(
        'Student Upgraded to Premium (Preview)',
        `${created.name} upgraded with Enrollment #${created.enrollmentNumber} & ${created.yogneetEmail}.`
      );
      setIsUpgradeModalOpen(false);
      await reloadStudents();
    } catch (err: any) {
      toast.error('Upgrade Failed', err.message);
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  const handleToggleStatusConfirm = async () => {
    if (!studentToToggleStatus) return;
    try {
      const updated = await PremiumStudentService.togglePremiumStatus(studentToToggleStatus.id);
      toast.success(
        'Access Status Updated (Preview)',
        `${studentToToggleStatus.name} premium entitlement is now ${
          updated.isPremiumActive ? 'ACTIVE' : 'DEACTIVATED'
        }.`
      );
      setStudentToToggleStatus(null);
      await reloadStudents();
    } catch (err: any) {
      toast.error('Update Failed', err.message);
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.enrollmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.yogneetEmail && s.yogneetEmail.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && s.isPremiumActive) ||
        (statusFilter === 'suspended' && !s.isPremiumActive);

      const matchesYear =
        yearFilter === 'all' || String(s.admissionYear) === yearFilter;

      return matchesSearch && matchesStatus && matchesYear;
    });
  }, [students, searchQuery, statusFilter, yearFilter]);

  // Admission year options
  const admissionYears = useMemo(() => {
    const years = Array.from(new Set(students.map(s => String(s.admissionYear)))).sort();
    return ['all', ...years];
  }, [students]);

  // Selected student preview info in modal
  const selectedNormalStudent = eligibleNormalStudents.find(u => u.id === selectedStudentId);
  const previewEnrollment = formatEnrollmentNumber(upgradeAdmissionYear, 1002);
  const previewProposedEmail = selectedNormalStudent
    ? generateProposedYogneetEmail(selectedNormalStudent.name, selectedNormalStudent.id)
    : 'username@yogneet.edu';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="purple" size="sm">
              Premium Tier Entitlements
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Crown className="w-6 h-6 text-amber-500" />
            Premium Student Management & Provisioning
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Upgrade existing Google-login students, administer enrollment numbers (YEAR + SEQUENTIAL), view proposed yogneet.edu conventions, and inspect learning progress.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            onClick={handleOpenUpgrade}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shrink-0"
          >
            Upgrade Student to Premium
          </Button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Premium Students
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{students.length}</p>
        </Card>
        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Active Entitlements
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {students.filter(s => s.isPremiumActive).length}
          </p>
        </Card>
        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Deactivated / Suspended
          </span>
          <p className="text-2xl font-black text-rose-500">
            {students.filter(s => !s.isPremiumActive).length}
          </p>
        </Card>
        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Converted from Google
          </span>
          <p className="text-2xl font-black text-purple-600 dark:text-cyan-400">
            {students.filter(s => s.origin === 'google_converted').length}
          </p>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or enrollment ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="text-xs text-slate-400 font-semibold">Admission Year:</span>
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs p-1.5 text-slate-900 dark:text-slate-100"
          >
            {admissionYears.map(year => (
              <option key={year} value={year}>
                {year === 'all' ? 'All Years' : `Class of ${year}`}
              </option>
            ))}
          </select>

          <span className="text-xs text-slate-400 font-semibold ml-2">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs p-1.5 text-slate-900 dark:text-slate-100"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Table & Cards Layout */}
      <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-light-border dark:border-dark-border bg-slate-50/70 dark:bg-dark-card/50 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Student & Identity</th>
                <th className="p-3.5">Enrollment Number</th>
                <th className="p-3.5">Proposed Yogneet Email</th>
                <th className="p-3.5">Academic Program</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    No premium students found matching the selected search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-dark-hover transition-colors"
                  >
                    {/* Student Name & Email */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {student.name}
                          </p>
                          <p className="text-slate-400 text-[11px]">{student.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Enrollment Number (Module 7: Variable Length) */}
                    <td className="p-3.5 whitespace-nowrap">
                      <EnrollmentNumberBadge
                        enrollmentNumber={student.enrollmentNumber}
                        size="md"
                      />
                    </td>

                    {/* Proposed Email Convention */}
                    <td className="p-3.5 font-mono text-[11px] text-brand-600 dark:text-cyan-400 whitespace-nowrap">
                      {student.yogneetEmail || generateProposedYogneetEmail(student.name)}
                    </td>

                    {/* Academic Program & Year */}
                    <td className="p-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {student.department}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {student.program} • Class of {student.admissionYear}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 whitespace-nowrap">
                      <Badge variant={student.isPremiumActive ? 'success' : 'danger'} size="sm">
                        {student.isPremiumActive ? 'ACTIVE' : 'DEACTIVATED'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectedStudentId(student.id)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          title="Inspect Student Progress & Assessment Records"
                        >
                          Inspect
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPasswordTargetStudent(student)}
                          leftIcon={<KeyRound className="w-3.5 h-3.5" />}
                          title="Reset Password & Issue Temporary Credential"
                        >
                          Password
                        </Button>

                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStudentToToggleStatus(student)}
                            className={
                              student.isPremiumActive
                                ? 'text-amber-600 hover:text-amber-700'
                                : 'text-emerald-600 hover:text-emerald-700'
                            }
                            title={
                              student.isPremiumActive ? 'Deactivate Premium' : 'Reactivate Premium'
                            }
                          >
                            {student.isPremiumActive ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPGRADE STUDENT TO PREMIUM MODAL */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <span>Upgrade Student to Premium Status</span>
          </div>
        }
      >
        <form onSubmit={handleConfirmUpgrade} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Select Existing Student Account
            </label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm p-2.5 text-slate-900 dark:text-slate-100"
              required
            >
              {eligibleNormalStudents.length === 0 ? (
                <option value="" disabled>
                  No eligible standard students available
                </option>
              ) : (
                eligibleNormalStudents.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Real-time Preview Banner */}
          {selectedNormalStudent && (
            <div className="p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-indigo-900 dark:text-indigo-300 tracking-wider block">
                Provisioning Preview (Format: YEAR + SEQUENTIAL)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Enrollment Number</span>
                  <EnrollmentNumberBadge enrollmentNumber={previewEnrollment} size="sm" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Proposed Yogneet Email</span>
                  <span className="font-mono text-brand-600 dark:text-cyan-400 font-bold">
                    {previewProposedEmail}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Admission Year"
              type="number"
              min={2024}
              max={2030}
              value={upgradeAdmissionYear}
              onChange={e => setUpgradeAdmissionYear(Number(e.target.value))}
              helperText="Prefixed to enrollment number"
            />

            <Input
              label="Phone Number"
              value={upgradePhone}
              onChange={e => setUpgradePhone(e.target.value)}
              placeholder="+91 98765 43210"
              helperText="Used for initial credential policy"
            />
          </div>

          <Input
            label="Department"
            value={upgradeDepartment}
            onChange={e => setUpgradeDepartment(e.target.value)}
            placeholder="e.g. Computer Science & Engineering"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Program / Degree"
              value={upgradeProgram}
              onChange={e => setUpgradeProgram(e.target.value)}
              placeholder="e.g. B.Tech CSE"
            />
            <Input
              label="Institution"
              value={upgradeInstitution}
              onChange={e => setUpgradeInstitution(e.target.value)}
              placeholder="e.g. Delhi Technological University"
            />
          </div>

          {/* Security Disclaimer */}
          <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 text-[11px] text-amber-900 dark:text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Privilege Authorization Policy</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Do not use email domain alone to decide privileges. The actual role and premium access are determined strictly by verified database entitlements.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-light-border dark:border-dark-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsUpgradeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmittingUpgrade}
              leftIcon={<Crown className="w-4 h-4" />}
            >
              Confirm Premium Upgrade
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM TOGGLE STATUS DIALOG */}
      {studentToToggleStatus && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setStudentToToggleStatus(null)}
          onConfirm={handleToggleStatusConfirm}
          title={
            studentToToggleStatus.isPremiumActive
              ? 'Deactivate Premium Entitlement'
              : 'Reactivate Premium Entitlement'
          }
          message={`Are you sure you want to ${
            studentToToggleStatus.isPremiumActive ? 'deactivate' : 'reactivate'
          } premium access for ${studentToToggleStatus.name} (${
            studentToToggleStatus.enrollmentNumber
          })?`}
          confirmText={
            studentToToggleStatus.isPremiumActive
              ? 'Yes, Deactivate Access'
              : 'Yes, Reactivate Access'
          }
          variant={studentToToggleStatus.isPremiumActive ? 'danger' : 'primary'}
        />
      )}

      {/* ACCOUNT INSPECTION MODAL (MODULE 8) */}
      {inspectedStudentId && (
        <AccountInspectionModal
          isOpen={true}
          onClose={() => setInspectedStudentId(null)}
          studentId={inspectedStudentId}
        />
      )}

      {/* PASSWORD LIFECYCLE MODAL (MODULE 9) */}
      {passwordTargetStudent && (
        <PasswordLifecycleModal
          isOpen={true}
          onClose={() => setPasswordTargetStudent(null)}
          userId={passwordTargetStudent.userId}
          userName={passwordTargetStudent.name}
          userEmail={passwordTargetStudent.email}
          accountType="premium_student"
          phone={passwordTargetStudent.phone}
          enrollmentNumber={passwordTargetStudent.enrollmentNumber}
        />
      )}
    </div>
  );
};
