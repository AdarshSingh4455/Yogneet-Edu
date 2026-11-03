import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { PasswordStrengthMeter, analyzePassword } from './PasswordStrengthMeter';
import { Phase1NoticeBadge } from '../common/Phase1NoticeBadge';
import { useToast } from '../../context/ToastContext';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export type PasswordLifecycleMode = 'admin_reset' | 'first_login' | 'change_password';

interface PasswordLifecycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userEmail: string;
  accountType: 'staff' | 'premium_student';
  phone?: string;
  enrollmentNumber?: string;
  initialMode?: PasswordLifecycleMode;
}

export const PasswordLifecycleModal: React.FC<PasswordLifecycleModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  userEmail,
  accountType,
  phone = '+91 98000 00000',
  enrollmentNumber = '2026001',
  initialMode = 'admin_reset',
}) => {
  const toast = useToast();
  const [mode, setMode] = useState<PasswordLifecycleMode>(initialMode);

  // Admin Reset State
  const [isResetting, setIsResetting] = useState(false);
  const [resetCompleted, setResetCompleted] = useState(false);

  // Password Input States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const cleanPhone = phone.replace(/\D/g, '');
  const last4Phone = cleanPhone.slice(-4) || 'XXXX';
  const last4Enrollment = enrollmentNumber.replace(/\D/g, '').slice(-4) || 'XXXX';

  const policyHint =
    accountType === 'staff'
      ? `Last 4 digits of registered phone number (${last4Phone})`
      : `Phone [${last4Phone}] + Enrollment [${last4Enrollment}] (8 characters)`;

  const handleAdminReset = async () => {
    setIsResetting(true);
    // Simulating Phase 1 placeholder execution
    setTimeout(() => {
      setIsResetting(false);
      setResetCompleted(true);
      toast.success(
        'Temporary Credential Provisioned (Preview)',
        `Reset requested for ${userName}. Flagged for mandatory password change at first login.`
      );
    }, 600);
  };

  const handleSavePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const analysis = analyzePassword(newPassword);

    if (analysis.score < 2) {
      toast.error('Weak Password', 'Please choose a stronger password satisfying complexity requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Password Mismatch', 'The new password and confirmation password do not match.');
      return;
    }

    setIsSubmittingPassword(true);
    setTimeout(() => {
      setIsSubmittingPassword(false);
      toast.success(
        'Password Updated Successfully (Preview)',
        'Your new password has been verified and set for this session.'
      );
      onClose();
    }, 700);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {mode === 'admin_reset'
                ? 'Credential Reset & Lifecycle Management'
                : mode === 'first_login'
                ? 'Mandatory First-Login Password Setup'
                : 'Update Account Password'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {userName} ({userEmail})
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Phase 1 Isolated Preview Notice */}
        <Phase1NoticeBadge
          variant="banner"
          label="Password lifecycle interface preview. In Phase 2, passwords will be hashed with Argon2/bcrypt on the backend. No plaintext passwords are stored or displayed."
        />

        {/* Tab switch for demonstration / evaluation */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-dark-card p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('admin_reset')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              mode === 'admin_reset'
                ? 'bg-white dark:bg-dark-selected text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Admin Reset Workflow
          </button>
          <button
            type="button"
            onClick={() => setMode('first_login')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              mode === 'first_login'
                ? 'bg-white dark:bg-dark-selected text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            First-Login Flow
          </button>
          <button
            type="button"
            onClick={() => setMode('change_password')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              mode === 'change_password'
                ? 'bg-white dark:bg-dark-selected text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Change Password
          </button>
        </div>

        {/* MODE 1: ADMIN RESET WORKFLOW */}
        {mode === 'admin_reset' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-light-border dark:border-dark-border bg-slate-50/70 dark:bg-dark-card/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Target Account
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  {accountType === 'staff' ? 'Staff / Sub-Admin' : 'Premium Student'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Registered Phone</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {accountType === 'staff' ? 'Role' : 'Enrollment Number'}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {accountType === 'staff' ? 'Staff Member' : enrollmentNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Credential Policy Card */}
            <div className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-indigo-950 dark:text-indigo-200">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Phase 2 Initial Credential Policy</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                Upon reset, a deterministic temporary credential will be issued following Yogneet Edu policy:
              </p>
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-dark-card/80 border border-indigo-100 dark:border-indigo-900/50 font-mono text-xs text-indigo-900 dark:text-indigo-300">
                {policyHint}
              </div>
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-[11px] font-semibold pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Mandatory password change is strictly enforced at first sign-in.</span>
              </div>
            </div>

            {resetCompleted ? (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Temporary Credential Issued (Phase 1 Preview)</h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                    The account status has been updated with a temporary credential flag. In Phase 2, an SMS / email notification with first-login instructions will be securely dispatched.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2.5 pt-2">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  isLoading={isResetting}
                  onClick={handleAdminReset}
                  leftIcon={<KeyRound className="w-4 h-4" />}
                >
                  Generate Temporary Credential
                </Button>
              </div>
            )}
          </div>
        )}

        {/* MODE 2 & 3: PASSWORD FORM (FIRST LOGIN & CHANGE PASSWORD) */}
        {(mode === 'first_login' || mode === 'change_password') && (
          <form onSubmit={handleSavePasswordChange} className="space-y-3.5">
            {mode === 'first_login' && (
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">First Sign-In Detected: </span>
                  <span>You must choose a secure personal password before accessing course modules.</span>
                </div>
              </div>
            )}

            {mode === 'change_password' && (
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter existing password"
                required
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              />
            )}

            <div className="relative">
              <Input
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter at least 8 characters"
                required
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <PasswordStrengthMeter password={newPassword} />
            </div>

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            />

            <div className="flex justify-end gap-2.5 pt-3 border-t border-light-border dark:border-dark-border">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmittingPassword}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                {mode === 'first_login' ? 'Activate My Account' : 'Update Password'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
