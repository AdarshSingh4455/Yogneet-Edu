import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import {
  User,
  Shield,
  Moon,
  Sun,
  Laptop,
  CheckCircle2,
  Key,
  Info,
  Edit3,
  Save,
  X,
  Database,
  Upload,
  Camera,
  RotateCcw,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  Check,
  Award,
  Layers,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { EnrollmentNumberBadge } from '../../components/common/EnrollmentNumberBadge';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { ProfileService } from '../../services/profileService';

export const StudentProfilePage: React.FC = () => {
  const { currentUser, isAdmin, isSubAdmin, updateCurrentUserProfile, backendMode } = useAuth();
  const { mode, setMode } = useTheme();
  const toast = useToast();

  // Active section tab: 'overview' | 'edit' | 'security' | 'account' | 'appearance'
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'security' | 'account' | 'appearance'>('overview');

  // Edit Profile Form State
  const [name, setName] = useState(currentUser.name);
  const [department, setDepartment] = useState(currentUser.department || '');
  const [institution, setInstitution] = useState(currentUser.institution || '');
  const [program, setProgram] = useState(currentUser.program || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarPreview, setAvatarPreview] = useState<string>(currentUser.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if currentUser changes
  useEffect(() => {
    setName(currentUser.name);
    setDepartment(currentUser.department || '');
    setInstitution(currentUser.institution || '');
    setProgram(currentUser.program || '');
    setBio(currentUser.bio || '');
    setAvatarPreview(currentUser.avatar);
    setAvatarFile(null);
    setHasUnsavedChanges(false);
  }, [currentUser]);

  // Track unsaved changes
  useEffect(() => {
    const isDirty =
      name !== currentUser.name ||
      department !== (currentUser.department || '') ||
      institution !== (currentUser.institution || '') ||
      program !== (currentUser.program || '') ||
      bio !== (currentUser.bio || '') ||
      avatarPreview !== currentUser.avatar ||
      avatarFile !== null;
    setHasUnsavedChanges(isDirty);
  }, [name, department, institution, program, bio, avatarPreview, avatarFile, currentUser]);

  // Security / Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Password Requirements Check
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Password Strength Score (0 to 4)
  const strengthScore = [
    hasMinLength,
    hasUppercase && hasLowercase,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (newPassword.length === 0) return { label: 'None', color: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-400' };
    if (strengthScore <= 1) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-500' };
    if (strengthScore === 2) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-500' };
    if (strengthScore === 3) return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-500' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500' };
  };

  // Avatar Upload Handler
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Invalid File', 'Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.warning('File Too Large', 'Avatar image must be smaller than 2MB.');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetAvatar = () => {
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}&backgroundColor=0E1B3D`;
    setAvatarFile(null);
    setAvatarPreview(defaultAvatar);
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Name Required', 'Please enter your full name.');
      return;
    }

    setIsSavingProfile(true);
    try {
      let finalAvatarUrl = avatarPreview;
      if (avatarFile) {
        try {
          finalAvatarUrl = await ProfileService.uploadAvatar(currentUser.id, avatarFile);
        } catch (uploadErr) {
          console.warn('[StudentProfilePage] Avatar storage upload warning:', uploadErr);
        }
      }

      await updateCurrentUserProfile({
        name: name.trim(),
        department: department.trim(),
        institution: institution.trim(),
        program: program.trim(),
        bio: bio.trim(),
        avatar: finalAvatarUrl,
      });
      setAvatarFile(null);
      setHasUnsavedChanges(false);
      toast.success('Profile Saved', 'Your profile information has been synchronized successfully.');
      setActiveTab('overview');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      toast.error('Update Failed', msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMinLength || !passwordsMatch) {
      toast.warning('Validation Error', 'Please ensure all password requirements are met and passwords match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password Updated', 'Your security credentials have been updated.');
      setActiveTab('overview');
    } catch (err: any) {
      toast.error('Password Update Failed', err.message || 'Unable to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Format Dates Safely
  const memberSince = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active Term';

  const lastActiveFormatted = currentUser.lastActive
    ? new Date(currentUser.lastActive).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Current Session';

  const enrollmentNumber = (currentUser as any)?.enrollmentNumber || (currentUser as any)?.enrollment_number;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Top Header */}
      <div className="pb-4 border-b border-light-border dark:border-dark-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              <ShieldCheck className="w-3 h-3 mr-1" /> Account Security &amp; Settings
            </Badge>
            <span className="text-xs text-slate-400">Yogneet Edu Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <User className="w-6 h-6 text-brand-500" />
            Profile &amp; Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Manage your personal profile, security credentials, appearance preferences, and view platform entitlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={backendMode === 'supabase' ? 'success' : 'brand'}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Database className="w-3 h-3" />
            {backendMode === 'supabase' ? 'Supabase Live' : 'Local Sandbox'}
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-light-border dark:border-dark-border">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-card'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('edit')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 relative ${
            activeTab === 'edit'
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-card'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Edit Details</span>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'security'
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-card'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Security &amp; Password</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'account'
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-card'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Account &amp; RBAC</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'appearance'
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-card'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Theme &amp; Display</span>
        </button>
      </div>

      {/* Unsaved Changes Alert Banner */}
      {hasUnsavedChanges && activeTab !== 'edit' && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>You have unsaved edits in your profile form.</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setActiveTab('edit')}>
            Review Edits
          </Button>
        </div>
      )}

      {/* TAB 1: PROFILE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card padding="lg" className="border border-light-border dark:border-dark-border">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="relative group shrink-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-brand-500/20 shadow-md shadow-brand-500/10"
                />
                <button
                  onClick={() => setActiveTab('edit')}
                  className="absolute bottom-1 right-1 p-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-md transition-transform hover:scale-110"
                  title="Change avatar"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Identity & Badges */}
              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {currentUser.name}
                  </h2>
                  <Badge
                    variant={isAdmin ? 'brand' : isSubAdmin ? 'purple' : 'success'}
                    size="sm"
                  >
                    {currentUser.role.toUpperCase()}
                  </Badge>
                  {currentUser.status === 'active' ? (
                    <Badge variant="success" size="sm">Active Account</Badge>
                  ) : (
                    <Badge variant="danger" size="sm">Suspended</Badge>
                  )}
                  {enrollmentNumber && (
                    <EnrollmentNumberBadge enrollmentNumber={enrollmentNumber} size="sm" />
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {currentUser.email}
                </p>

                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  Track: {currentUser.department || 'Software Engineering & Computer Science'}
                </p>

                {currentUser.bio ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 leading-relaxed max-w-2xl">
                    {currentUser.bio}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic pt-1">
                    No bio provided. Click &quot;Edit Profile&quot; to add learning goals.
                  </p>
                )}

                <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('edit')}
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                  >
                    Edit Profile Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('security')}
                    leftIcon={<Key className="w-3.5 h-3.5" />}
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Key Metrics / Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="md" className="space-y-1 border border-light-border dark:border-dark-border">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                <Calendar className="w-4 h-4 text-brand-500" />
                <span>Member Since</span>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                {memberSince}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Enrolled platform member</p>
            </Card>

            <Card padding="md" className="space-y-1 border border-light-border dark:border-dark-border">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>Last Session</span>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                {lastActiveFormatted}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Authenticated activity</p>
            </Card>

            <Card padding="md" className="space-y-1 border border-light-border dark:border-dark-border">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                <Award className="w-4 h-4 text-purple-500" />
                <span>Access Tier</span>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                {currentUser.accessCategory === 'pro' || (currentUser as any).isPremium ? 'Premium (Pro)' : 'Standard Tier'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Verified platform entitlements</p>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: EDIT PROFILE */}
      {activeTab === 'edit' && (
        <Card padding="lg" className="border border-light-border dark:border-dark-border space-y-6 max-w-3xl">
          <div className="pb-3 border-b border-light-border dark:border-dark-border">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Edit Account Profile
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update your display name, department track, biography, and avatar. Role and administrative access are managed by Super Admins.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Avatar Editing Section */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50/60 dark:bg-dark-sidebar/40 border border-light-border dark:border-dark-border">
              <img
                src={avatarPreview}
                alt="Avatar Preview"
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-brand-500/30 shrink-0"
              />

              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  Profile Photo
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upload a new photo (PNG, JPG, WebP up to 2MB) or reset to standard initials avatar.
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <input
                    type="file"
                    ref={avatarFileInputRef}
                    onChange={handleAvatarFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => avatarFileInputRef.current?.click()}
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                  >
                    Upload Photo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleResetAvatar}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Reset to Default
                  </Button>
                </div>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <Input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                maxLength={80}
              />
            </div>

            {/* Email (Read-Only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address (Verified)
              </label>
              <Input
                type="email"
                value={currentUser.email}
                disabled
                helperText="Primary email cannot be modified directly. Contact platform administrator to request an email update."
              />
            </div>

            {/* Department / Track */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Track or Department
              </label>
              <Input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science, AI/ML, Full-Stack Development"
                maxLength={100}
              />
            </div>

            {/* Institution / College */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Institution or University
              </label>
              <Input
                type="text"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                placeholder="e.g. National Institute of Technology, Delhi"
                maxLength={120}
              />
            </div>

            {/* Program / Degree */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Degree or Program
              </label>
              <Input
                type="text"
                value={program}
                onChange={e => setProgram(e.target.value)}
                placeholder="e.g. B.Tech Computer Science & Engineering"
                maxLength={120}
              />
            </div>

            {/* Bio & Goals */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Learning Objectives &amp; Bio
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Share your technical interests, algorithms you are practicing, or competitive exam preparation goals..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
                maxLength={500}
              />
              <span className="text-[10px] text-slate-400 block text-right mt-0.5">
                {bio.length} / 500 characters
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => {
                  setName(currentUser.name);
                  setDepartment(currentUser.department || '');
                  setInstitution(currentUser.institution || '');
                  setProgram(currentUser.program || '');
                  setBio(currentUser.bio || '');
                  setAvatarPreview(currentUser.avatar);
                  setAvatarFile(null);
                  setActiveTab('overview');
                }}
                disabled={isSavingProfile}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="md"
                isLoading={isSavingProfile}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 3: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <Card padding="lg" className="border border-light-border dark:border-dark-border space-y-6 max-w-3xl">
          <div className="pb-3 border-b border-light-border dark:border-dark-border">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-brand-500" />
              Change Password &amp; Credential Security
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update your account password. For maximum security, use at least 8 characters combining letters, numbers, and symbols.
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <div className="mt-2 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Password Strength:</span>
                    <span className={`text-[11px] font-bold ${getStrengthLabel().text}`}>
                      {getStrengthLabel().label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthLabel().color}`}
                      style={{ width: `${Math.max(15, (strengthScore / 4) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password to verify"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Requirements Checklist */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-sidebar/40 border border-light-border dark:border-dark-border space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
                Password Requirement Checklist
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUppercase && hasLowercase ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasUppercase && hasLowercase ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
                  <span>Upper &amp; lowercase letters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
                  <span>At least one number (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasSpecial ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
                  <span>At least one special character</span>
                </div>
                <div className={`flex items-center gap-1.5 sm:col-span-2 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${passwordsMatch ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
                  <span>Passwords match</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setActiveTab('overview');
                }}
                disabled={isUpdatingPassword}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="md"
                isLoading={isUpdatingPassword}
                disabled={!hasMinLength || !passwordsMatch}
                leftIcon={<Key className="w-4 h-4" />}
              >
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 4: ACCOUNT INFORMATION & RBAC */}
      {activeTab === 'account' && (
        <div className="space-y-6 max-w-3xl">
          <Card padding="lg" className="border border-light-border dark:border-dark-border space-y-5">
            <div className="pb-3 border-b border-light-border dark:border-dark-border">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-500" />
                Account Authority &amp; System Metadata
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Technical account configuration, RBAC permissions, and access tier classification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-sidebar/40 border border-light-border dark:border-dark-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">User Role</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 capitalize block">
                  {currentUser.role}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  {isAdmin ? 'Unrestricted Administrative Authority' : isSubAdmin ? 'Delegated Department Authority' : 'Standard Student Learner'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-sidebar/40 border border-light-border dark:border-dark-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Account Status</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 capitalize">
                    {currentUser.status}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  {currentUser.status === 'active' ? 'Eligible for all enabled course modules' : 'Actions restricted by security policy'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-sidebar/40 border border-light-border dark:border-dark-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Access Category</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 capitalize block">
                  {currentUser.accessCategory === 'pro' || (currentUser as any).isPremium ? 'Pro / Premium Tier' : 'Standard Tier'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Tier-based access enforced by router guards
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-sidebar/40 border border-light-border dark:border-dark-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Account Reference ID</span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block truncate">
                  {currentUser.id.slice(0, 16)}...
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Cryptographically verified Supabase UUID
                </span>
              </div>
            </div>

            {/* Permissions List */}
            <div className="pt-2 space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
                Assigned Platform Permissions ({currentUser.permissions?.length || 0})
              </span>
              {isAdmin ? (
                <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-700 dark:text-cyan-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-500 shrink-0" />
                  <span>Super Admin account carries implicit, unrestricted access to all system APIs and catalog modules.</span>
                </div>
              ) : currentUser.permissions && currentUser.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-dark-sidebar/30 border border-light-border dark:border-dark-border">
                  {currentUser.permissions.map(perm => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-slate-700 dark:text-slate-300"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Standard student account with default catalog learning access.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: THEME & DISPLAY */}
      {activeTab === 'appearance' && (
        <Card padding="lg" className="border border-light-border dark:border-dark-border space-y-6 max-w-3xl">
          <div className="pb-3 border-b border-light-border dark:border-dark-border">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-brand-500" />
              Theme &amp; Display Preferences
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize the platform color scheme. Yogneet Edu supports WCAG AA high-contrast light and dark modes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Light Mode Tile */}
            <div
              onClick={() => setMode('light')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                mode === 'light'
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-dark-card shadow-md shadow-brand-500/10'
                  : 'border-light-border dark:border-dark-border hover:border-slate-400'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <Sun className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Light Mode</span>
                {mode === 'light' && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Crisp, high-contrast light interface designed for well-lit classrooms and workspaces.
              </p>
            </div>

            {/* Dark Mode Tile */}
            <div
              onClick={() => setMode('dark')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                mode === 'dark'
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-dark-card shadow-md shadow-brand-500/10'
                  : 'border-light-border dark:border-dark-border hover:border-slate-400'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 text-blue-400 flex items-center justify-center mb-3">
                <Moon className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Dark Mode</span>
                {mode === 'dark' && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Deep navy &amp; slate theme tailored for nocturnal study sessions and coding marathons.
              </p>
            </div>

            {/* System Default Tile */}
            <div
              onClick={() => setMode('system')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                mode === 'system'
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-dark-card shadow-md shadow-brand-500/10'
                  : 'border-light-border dark:border-dark-border hover:border-slate-400'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-sidebar text-slate-500 flex items-center justify-center mb-3">
                <Laptop className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>System Sync</span>
                {mode === 'system' && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Automatically matches your device operating system display preferences.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
