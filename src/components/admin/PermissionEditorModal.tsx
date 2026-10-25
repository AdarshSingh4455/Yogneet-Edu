import React, { useState, useEffect } from 'react';
import { UserProfile, PermissionKey, PermissionModule } from '../../types';
import {
  PERMISSION_DEFINITIONS,
  MODULE_METADATA,
  ROLE_PRESETS,
} from '../../permissions/registry';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  RotateCcw,
  Save,
  X,
  Check,
  Video,
  FileText,
  CheckSquare,
  Users,
  MessageSquare,
  FileSpreadsheet,
  BarChart3,
  Settings,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface PermissionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UserProfile | null;
  onSaved: () => void;
}

export const PermissionEditorModal: React.FC<PermissionEditorModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSaved,
}) => {
  const { currentUser, updateUserPermissions, isAdmin } = useAuth();
  const toast = useToast();

  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<PermissionKey[]>([]);
  const [isSensitiveConfirmOpen, setIsSensitiveConfirmOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  useEffect(() => {
    if (targetUser) {
      setSelectedPermissions([...targetUser.permissions]);
      setInitialPermissions([...targetUser.permissions]);
      setSelectedPreset('');
    }
  }, [targetUser]);

  if (!targetUser) return null;

  // Authorization rule: Sub-admin cannot edit Super Admin or edit permissions if lacking permission
  const canEdit = isAdmin && targetUser.role !== 'admin';

  // Dirty state tracking
  const isDirty =
    selectedPermissions.length !== initialPermissions.length ||
    selectedPermissions.some(p => !initialPermissions.includes(p)) ||
    initialPermissions.some(p => !selectedPermissions.includes(p));

  // Check if sensitive permissions are being granted
  const hasDangerousPermissions = selectedPermissions.some(
    p =>
      (p === 'subadmins.manage' || p === 'permissions.assign' || p === 'students.suspend') &&
      !initialPermissions.includes(p)
  );

  // Group definitions by module
  const modules: PermissionModule[] = [
    'videos',
    'notes',
    'tests',
    'students',
    'community',
    'subadmins',
    'audit_logs',
    'analytics',
    'general',
  ];

  const getModuleIcon = (mod: PermissionModule) => {
    switch (mod) {
      case 'videos':
        return <Video className="w-4 h-4 text-brand-500" />;
      case 'notes':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'tests':
        return <CheckSquare className="w-4 h-4 text-amber-500" />;
      case 'students':
        return <Users className="w-4 h-4 text-cyan-500" />;
      case 'community':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'subadmins':
        return <Shield className="w-4 h-4 text-rose-500" />;
      case 'audit_logs':
        return <FileSpreadsheet className="w-4 h-4 text-blue-500" />;
      case 'analytics':
        return <BarChart3 className="w-4 h-4 text-indigo-500" />;
      default:
        return <Settings className="w-4 h-4 text-slate-400" />;
    }
  };

  // Toggle single action permission
  const handleToggle = (key: PermissionKey) => {
    if (!canEdit) return;
    setSelectedPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  // Select all within a specific module
  const handleSelectModuleAll = (module: PermissionModule) => {
    if (!canEdit) return;
    const modulePerms = PERMISSION_DEFINITIONS.filter(p => p.module === module).map(p => p.key);
    setSelectedPermissions(prev => Array.from(new Set([...prev, ...modulePerms])));
  };

  // Clear all within a specific module
  const handleClearModuleAll = (module: PermissionModule) => {
    if (!canEdit) return;
    const modulePerms = PERMISSION_DEFINITIONS.filter(p => p.module === module).map(p => p.key);
    setSelectedPermissions(prev => prev.filter(p => !modulePerms.includes(p)));
  };

  // Apply predefined role preset
  const handleApplyPreset = (presetKey: string) => {
    if (!canEdit) return;
    setSelectedPreset(presetKey);
    const preset = ROLE_PRESETS[presetKey];
    if (preset) {
      setSelectedPermissions([...preset.permissions]);
      toast.info('Role Preset Applied', `Applied template: ${preset.name}`);
    }
  };

  const handleSaveClick = () => {
    if (!isDirty) {
      onClose();
      return;
    }

    if (hasDangerousPermissions) {
      setIsSensitiveConfirmOpen(true);
    } else {
      executeSave();
    }
  };

  const executeSave = () => {
    try {
      updateUserPermissions(targetUser.id, selectedPermissions);
      toast.success(
        'Permissions Saved',
        `Successfully updated RBAC privileges for ${targetUser.name} (${selectedPermissions.length} permissions assigned).`
      );
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error('Failed to update permissions', err.message);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-purple-500" />
            <span>Fine-Grained RBAC Permission Editor</span>
          </div>
        }
        description={`Configure explicit module and action authorizations for ${targetUser.name} (${targetUser.email})`}
        maxWidth="4xl"
      >
        <div className="space-y-6">
          {/* Target Profile Summary Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border gap-4">
            <div className="flex items-center gap-3">
              <img
                src={targetUser.avatar}
                alt={targetUser.name}
                className="w-11 h-11 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-slate-700"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {targetUser.name}
                  </h4>
                  <Badge variant={targetUser.status === 'active' ? 'success' : 'danger'} size="sm">
                    {targetUser.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {targetUser.department || 'Staff Member'} • {targetUser.email}
                </p>
              </div>
            </div>

            {/* Granted count badge */}
            <div className="text-right self-end sm:self-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Permissions
              </span>
              <span className="text-base font-extrabold text-purple-600 dark:text-purple-400">
                {selectedPermissions.length} / {PERMISSION_DEFINITIONS.length} Granted
              </span>
            </div>
          </div>

          {/* Preset Selector */}
          {canEdit && (
            <div className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Apply Standard Role Template
                </span>
                <span className="text-[11px] text-slate-400">Quick preset configuration</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleApplyPreset(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedPreset === key
                        ? 'bg-purple-50 dark:bg-dark-selected text-purple-700 dark:text-blue-300 border-purple-300 dark:border-blue-500 font-bold shadow-sm'
                        : 'border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover dark:hover:text-blue-200 dark:hover:border-blue-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Unsaved changes alert */}
          {isDirty && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>You have unsaved permission changes for this sub-admin.</span>
              </div>
              <button
                onClick={() => setSelectedPermissions([...initialPermissions])}
                className="underline hover:text-amber-950 dark:hover:text-amber-100 font-medium"
              >
                Reset to initial
              </button>
            </div>
          )}

          {/* Module-by-Module Granular Action Checklist */}
          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            {modules.map(moduleKey => {
              const modulePerms = PERMISSION_DEFINITIONS.filter(p => p.module === moduleKey);
              if (modulePerms.length === 0) return null;

              const moduleMeta = MODULE_METADATA[moduleKey];
              const grantedInModule = modulePerms.filter(p =>
                selectedPermissions.includes(p.key)
              ).length;
              const allGranted = grantedInModule === modulePerms.length;

              return (
                <div
                  key={moduleKey}
                  className="rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden shadow-sm"
                >
                  {/* Module Group Header */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border">
                    <div className="flex items-center gap-2.5">
                      {getModuleIcon(moduleKey)}
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          {moduleMeta.label}
                        </h4>
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          {moduleMeta.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold text-slate-500 mr-1">
                        {grantedInModule}/{modulePerms.length}
                      </span>
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSelectModuleAll(moduleKey)}
                            className="text-[11px] font-medium text-brand-500 hover:text-brand-600 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-dark-hover dark:hover:text-blue-300 transition-colors"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <button
                            type="button"
                            onClick={() => handleClearModuleAll(moduleKey)}
                            className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-blue-200 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-dark-hover transition-colors"
                          >
                            Clear
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Individual Action Toggles Grid */}
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {modulePerms.map(perm => {
                      const isChecked = selectedPermissions.includes(perm.key);

                      return (
                        <label
                          key={perm.key}
                          className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'border-purple-300 dark:border-blue-500/80 bg-purple-50/50 dark:bg-dark-selected dark:shadow-[0_0_12px_rgba(59,130,246,0.12)]'
                              : 'border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover dark:hover:border-blue-900/30'
                          } ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggle(perm.key)}
                            disabled={!canEdit}
                            className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 dark:bg-dark-card"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {perm.label}
                              </span>
                              {perm.isDangerous && (
                                <Badge variant="danger" size="sm">
                                  Sensitive
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                              {perm.key}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {perm.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-light-border dark:border-dark-border">
            <span className="text-xs text-slate-400">
              All changes are recorded in the Admin Audit Log.
            </span>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveClick}
                disabled={!isDirty || !canEdit}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save Permissions
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Sensitive Permission Escalation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isSensitiveConfirmOpen}
        onClose={() => setIsSensitiveConfirmOpen(false)}
        onConfirm={() => {
          setIsSensitiveConfirmOpen(false);
          executeSave();
        }}
        title="Escalated Privileges Confirmation"
        message={`You are granting high-privilege administrative actions (such as Sub-Admin Management or Permission Assignment) to ${targetUser.name}. This allows this user to alter staff privileges or manage access. Do you want to proceed?`}
        confirmText="Confirm & Authorize"
        variant="warning"
      />
    </>
  );
};
