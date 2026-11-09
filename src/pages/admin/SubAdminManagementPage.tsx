import { useSearchParams } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../../services/api';
import { StaffAdminService } from '../../services/staffAdminService';
import { isMockFallbackAllowed } from '../../services/supabaseClient';
import { UserProfile, PermissionKey } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Shield,
  Plus,
  Search,
  Key,
  AlertOctagon,
  CheckCircle2,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  MoreVertical,
  UserCheck,
  Copy,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PermissionEditorModal } from '../../components/admin/PermissionEditorModal';
import { PasswordLifecycleModal } from '../../components/auth/PasswordLifecycleModal';
import { generateProposedYogneetEmail } from '../../services/premiumStudentService';
import { ROLE_PRESETS, getDepartments, getRolesForDepartment, DEPARTMENT_CONFIGS, VALID_DEPARTMENTS } from '../../permissions/registry';

export const SubAdminManagementPage: React.FC = () => {
  const { currentUser, isAdmin, refreshUsers } = useAuth();
  const toast = useToast();

  const [subAdmins, setSubAdmins] = useState<UserProfile[]>(() => isMockFallbackAllowed() ? ApiService.getSubAdmins() : []);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Modals state
  const [selectedForPermissions, setSelectedForPermissions] = useState<UserProfile | null>(null);
  const [userToToggleStatus, setUserToToggleStatus] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [passwordTargetStaff, setPasswordTargetStaff] = useState<UserProfile | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('user');

  useEffect(() => {
    if (targetUserId && subAdmins.length > 0) {
      const target = subAdmins.find(s => s.id === targetUserId);
      if (target) {
        setSelectedForPermissions(target);
      }
    }
  }, [targetUserId, subAdmins]);

  // New Sub-Admin Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+91 98000 12345');
  const [newDepartment, setNewDepartment] = useState('Curriculum & Video Authoring');
  const [newBio, setNewBio] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('content_creator');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisionedCredential, setProvisionedCredential] = useState<{
    name: string;
    email: string;
    department: string;
    roleName: string;
    temporaryPassword: string;
  } | null>(null);
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false);

  const handleDepartmentChange = (dept: string) => {
    setNewDepartment(dept);
    const roles = getRolesForDepartment(dept);
    if (!roles.some(r => r.key === selectedPreset)) {
      setSelectedPreset(roles[0]?.key || '');
    }
  };

  const reloadData = useCallback(async () => {
    setIsLoadingStaff(true);
    try {
      const data = await StaffAdminService.getStaffMembers();
      setSubAdmins(data);
      refreshUsers();
    } catch (err) {
      console.error('Failed to load staff members:', err);
    } finally {
      setIsLoadingStaff(false);
    }
  }, [refreshUsers]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const filteredSubAdmins = subAdmins.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.department && user.department.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleToggleStatusConfirm = async () => {
    if (!userToToggleStatus) return;
    try {
      await StaffAdminService.toggleStaffStatus(currentUser, userToToggleStatus.id);
      toast.success(
        'Account Status Updated',
        `${userToToggleStatus.name} is now ${userToToggleStatus.status === 'active' ? 'SUSPENDED' : 'ACTIVE'}.`
      );
      setUserToToggleStatus(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Operation Failed', err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      await StaffAdminService.deleteStaff(currentUser, userToDelete.id);
      toast.success('Account Terminated', `Permanently removed ${userToDelete.name} from staff.`);
      setUserToDelete(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Deletion Failed', err.message);
    }
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      toast.warning('Form Incomplete', 'Please provide a name and company email.');
      return;
    }

    const presetPerms = (ROLE_PRESETS[selectedPreset]?.permissions || []) as PermissionKey[];

    setIsSubmitting(true);
    try {
      const result = await StaffAdminService.provisionStaff(currentUser, {
        name: newName.trim(),
        email: newEmail.trim(),
        role: 'subadmin',
        department: newDepartment,
        presetKey: selectedPreset,
        phone: newPhone.trim(),
        bio: newBio,
        permissions: presetPerms,
      });

      toast.success(
        'Staff Account Provisioned',
        result.message
      );
      setIsAddModalOpen(false);

      if (result.temporaryPassword) {
        setProvisionedCredential({
          name: newName.trim(),
          email: newEmail.trim(),
          department: newDepartment,
          roleName: ROLE_PRESETS[selectedPreset]?.name || selectedPreset,
          temporaryPassword: result.temporaryPassword,
        });
        setHasCopiedPassword(false);
      }

      setNewName('');
      setNewEmail('');
      setNewBio('');
      await reloadData();
    } catch (err: any) {
      toast.error('Failed to provision account', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="purple" size="sm">
              Staff RBAC Governance
            </Badge>
            <span className="text-xs text-slate-400">Staff Directory & RBAC Governance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-purple-500" />
            Staff & Permissions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Manage educational staff accounts, enforce the principle of least privilege, grant action-specific capabilities, and audit operational access.
          </p>
        </div>

        {isAdmin && (
          <Button
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="self-start sm:self-auto"
          >
            Add Sub-Admin
          </Button>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search sub-admins by name, email, or department..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-blue-500/40 dark:focus:border-blue-400 dark:focus:bg-dark-selected/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Status:</span>
          {(['all', 'active', 'suspended'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl capitalize font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-slate-800 text-white dark:bg-dark-selected dark:text-blue-300 dark:border dark:border-blue-500 font-semibold shadow-sm'
                  : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover dark:hover:text-blue-200 dark:hover:border-blue-800/40'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Admin Staff Table */}
      <Card padding="none" className="overflow-hidden border border-light-border dark:border-dark-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Sub-Admin</th>
                <th className="py-3 px-4">Department / Specialty</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Granted Permissions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {filteredSubAdmins.map(staff => {
                const isSuspended = staff.status === 'suspended';

                return (
                  <tr
                    key={staff.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-dark-hover/70 transition-colors"
                  >
                    {/* User profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={staff.avatar}
                          alt={staff.name}
                          className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {staff.name}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                              {staff.role === 'admin' ? 'ADMIN' : 'STAFF'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">{staff.email}</span>
                          <span className="text-[10px] font-mono text-brand-600 dark:text-cyan-400 block">
                            {generateProposedYogneetEmail(staff.name, staff.id)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {staff.department || 'Curriculum Staff'}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge variant={isSuspended ? 'danger' : 'success'} size="sm" dot>
                        {staff.status.toUpperCase()}
                      </Badge>
                    </td>

                    {/* Permissions summary */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                          {staff.permissions.length} actions
                        </span>
                        <div className="hidden lg:flex flex-wrap gap-1 max-w-xs">
                          {staff.permissions.slice(0, 3).map(p => (
                            <span
                              key={p}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-sidebar border border-light-border dark:border-dark-border font-mono text-slate-500"
                            >
                              {p.split('.')[0]}
                            </span>
                          ))}
                          {staff.permissions.length > 3 && (
                            <span className="text-[9px] text-slate-400">
                              +{staff.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedForPermissions(staff)}
                          leftIcon={<Key className="w-3.5 h-3.5 text-purple-500" />}
                        >
                          RBAC
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPasswordTargetStaff(staff)}
                          leftIcon={<Lock className="w-3.5 h-3.5 text-indigo-500" />}
                          title="Reset Password & Issue Temporary Credential"
                        >
                          Password
                        </Button>

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setUserToToggleStatus(staff)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isSuspended
                                  ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                  : 'border-slate-300 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:border-dark-border dark:hover:bg-dark-card'
                              }`}
                              title={isSuspended ? 'Activate account' : 'Suspend account'}
                              aria-label={isSuspended ? 'Activate account' : 'Suspend account'}
                            >
                              {isSuspended ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => setUserToDelete(staff)}
                              className="p-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete sub-admin account"
                              aria-label="Delete sub-admin account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Fine-Grained Permissions Editor Modal */}
      <PermissionEditorModal
        isOpen={!!selectedForPermissions}
        onClose={() => setSelectedForPermissions(null)}
        targetUser={selectedForPermissions}
        onSaved={reloadData}
      />

      {/* Add Sub-Admin Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Provision New Sub-Admin Account"
        description="Add a team member to manage curriculum, test series, or moderate community."
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubAdmin} className="space-y-4">
          <Input
            label="Full Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Vikram Sharma"
            required
          />

          <Input
            label="Company Email"
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="e.g. vikram.s@yogneetedu.in"
            required
          />

          <Input
            label="Contact Phone Number (Optional)"
            type="tel"
            value={newPhone}
            onChange={e => setNewPhone(e.target.value)}
            placeholder="+91 98000 12345"
            helperText="Internal staff contact directory reference only"
          />

          {/* Security policy banner */}
          <div className="p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-[11px] text-indigo-900 dark:text-indigo-300 space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Cryptographic Temporary Credential Policy
            </span>
            <p className="text-slate-600 dark:text-slate-300">
              A cryptographically secure random 16-character temporary password will be generated and displayed to you once upon account creation. The sub-admin is required to change it on their first login.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Department / Functional Area
            </label>
            <select
              value={newDepartment}
              onChange={e => handleDepartmentChange(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {getDepartments().map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {DEPARTMENT_CONFIGS[newDepartment]?.description || ''}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Initial Role Preset
            </label>
            <select
              value={selectedPreset}
              onChange={e => setSelectedPreset(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {getRolesForDepartment(newDepartment).map(role => (
                <option key={role.key} value={role.key}>
                  {role.name} — {role.description}
                </option>
              ))}
            </select>
          </div>

          {/* Active Role Capability Preview */}
          {selectedPreset && ROLE_PRESETS[selectedPreset] && (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50/70 dark:bg-dark-sidebar/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Granted Capabilities ({ROLE_PRESETS[selectedPreset].permissions.length})
                </span>
                <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                  {ROLE_PRESETS[selectedPreset].name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {ROLE_PRESETS[selectedPreset].description}
              </p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                {ROLE_PRESETS[selectedPreset].permissions.map(perm => (
                  <span
                    key={perm}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" isLoading={isSubmitting}>
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Suspend / Activate Confirmation Dialog */}
      {userToToggleStatus && (
        <ConfirmDialog
          isOpen={!!userToToggleStatus}
          onClose={() => setUserToToggleStatus(null)}
          onConfirm={handleToggleStatusConfirm}
          title={
            userToToggleStatus.status === 'active'
              ? `Suspend Account for ${userToToggleStatus.name}?`
              : `Reactivate Account for ${userToToggleStatus.name}?`
          }
          message={
            userToToggleStatus.status === 'active'
              ? 'Suspending this sub-admin immediately revokes all module access and prevents any content authoring or moderation until reactivated.'
              : 'Reactivating will restore this sub-admin’s assigned permissions and console access.'
          }
          confirmText={userToToggleStatus.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
          variant={userToToggleStatus.status === 'active' ? 'danger' : 'primary'}
        />
      )}

      {/* Permanent Delete Confirmation Dialog */}
      {userToDelete && (
        <ConfirmDialog
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title={`Permanently Terminate Account for ${userToDelete.name}?`}
          message={`This will permanently remove ${userToDelete.name} (${userToDelete.email}) from staff. This action is irreversible.`}
          confirmText="Delete Account"
          variant="danger"
        />
      )}

      {/* One-Time Temporary Credential Display Dialog */}
      {provisionedCredential && (
        <Modal
          isOpen={!!provisionedCredential}
          onClose={() => setProvisionedCredential(null)}
          title="Temporary Credentials Generated"
          description="Deliver these initial login credentials securely to the new team member."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <span className="font-bold">One-Time Display Warning: </span>
                This temporary password is displayed exactly once and is never stored in plaintext. Copy it now. The user will be required to choose a new password upon first login.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Staff Member:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{provisionedCredential.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{provisionedCredential.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{provisionedCredential.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Role:</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">{provisionedCredential.roleName}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Temporary Password
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-xl border border-brand-200 dark:border-cyan-800/60 bg-white dark:bg-slate-900 font-mono text-sm font-bold text-brand-600 dark:text-cyan-400 tracking-wider select-all break-all">
                  {provisionedCredential.temporaryPassword}
                </div>
                <Button
                  type="button"
                  size="md"
                  variant={hasCopiedPassword ? 'secondary' : 'primary'}
                  leftIcon={hasCopiedPassword ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  onClick={() => {
                    navigator.clipboard.writeText(provisionedCredential.temporaryPassword);
                    setHasCopiedPassword(true);
                    toast.success('Credential Copied', 'Temporary password copied to clipboard.');
                  }}
                >
                  {hasCopiedPassword ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-light-border dark:border-dark-border">
              <Button
                size="sm"
                onClick={() => setProvisionedCredential(null)}
              >
                Done (I have saved the credentials)
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Password Lifecycle Modal (Module 9) */}
      {passwordTargetStaff && (
        <PasswordLifecycleModal
          isOpen={true}
          onClose={() => setPasswordTargetStaff(null)}
          userId={passwordTargetStaff.id}
          userName={passwordTargetStaff.name}
          userEmail={passwordTargetStaff.email}
          accountType="staff"
          phone="+91 98000 12345"
        />
      )}
    </div>
  );
};
