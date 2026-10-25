import React, { useState } from 'react';
import { ApiService } from '../../services/api';
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
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PermissionEditorModal } from '../../components/admin/PermissionEditorModal';
import { ROLE_PRESETS } from '../../permissions/registry';

export const SubAdminManagementPage: React.FC = () => {
  const { currentUser, isAdmin, refreshUsers } = useAuth();
  const toast = useToast();

  const [subAdmins, setSubAdmins] = useState<UserProfile[]>(() => ApiService.getSubAdmins());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Modals state
  const [selectedForPermissions, setSelectedForPermissions] = useState<UserProfile | null>(null);
  const [userToToggleStatus, setUserToToggleStatus] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Sub-Admin Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('Curriculum & Video Authoring');
  const [newBio, setNewBio] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('content_creator');

  const reloadData = () => {
    setSubAdmins(ApiService.getSubAdmins());
    refreshUsers();
  };

  const filteredSubAdmins = subAdmins.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.department && user.department.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleToggleStatusConfirm = () => {
    if (!userToToggleStatus) return;
    try {
      ApiService.toggleSubAdminStatus(currentUser, userToToggleStatus.id);
      toast.success(
        'Account Status Updated',
        `${userToToggleStatus.name} is now ${userToToggleStatus.status === 'active' ? 'SUSPENDED' : 'ACTIVE'}.`
      );
      setUserToToggleStatus(null);
      reloadData();
    } catch (err: any) {
      toast.error('Operation Failed', err.message);
    }
  };

  const handleDeleteConfirm = () => {
    if (!userToDelete) return;
    try {
      ApiService.deleteSubAdmin(currentUser, userToDelete.id);
      toast.success('Account Terminated', `Permanently removed ${userToDelete.name} from staff.`);
      setUserToDelete(null);
      reloadData();
    } catch (err: any) {
      toast.error('Deletion Failed', err.message);
    }
  };

  const handleCreateSubAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      toast.warning('Form Incomplete', 'Please provide a name and company email.');
      return;
    }

    const presetPerms = ROLE_PRESETS[selectedPreset]?.permissions || [];

    try {
      const created = ApiService.addSubAdmin(currentUser, {
        name: newName.trim(),
        email: newEmail.trim(),
        department: newDepartment,
        bio: newBio,
        permissions: presetPerms,
      });

      toast.success(
        'Sub-Admin Created',
        `Account for ${created.name} provisioned with ${presetPerms.length} permissions.`
      );
      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewBio('');
      reloadData();
    } catch (err: any) {
      toast.error('Failed to create account', err.message);
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
            <span className="text-xs text-slate-400">Sub-Admin Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-purple-500" />
            Sub-Admin Management & Delegation
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
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                  ? 'bg-slate-800 text-white dark:bg-slate-700'
                  : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-light-border dark:border-dark-border hover:bg-slate-50'
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
                    className="hover:bg-slate-50/80 dark:hover:bg-dark-cardHover/60 transition-colors"
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
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">
                            {staff.name}
                          </span>
                          <span className="text-[11px] text-slate-400">{staff.email}</span>
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
                          Edit RBAC
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Department / Specialty
            </label>
            <select
              value={newDepartment}
              onChange={e => setNewDepartment(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="Curriculum & Video Authoring">Curriculum & Video Authoring</option>
              <option value="Assessment & Test Series">Assessment & Test Series</option>
              <option value="Community Moderation">Community Moderation</option>
              <option value="Platform Compliance & Audit">Platform Compliance & Audit</option>
            </select>
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
              <option value="content_creator">Content Creator (Videos & Notes draft/edit)</option>
              <option value="content_manager">Senior Content Lead (Full author + publish)</option>
              <option value="test_evaluator">Assessment Coordinator (Tests & Grading)</option>
              <option value="community_moderator">Community Moderator (Forums & Threads)</option>
              <option value="auditor">Compliance Auditor (Read-only)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit">
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
    </div>
  );
};
