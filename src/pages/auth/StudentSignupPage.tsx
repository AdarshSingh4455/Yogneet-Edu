import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { GoogleIcon } from '../../components/common/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Info,
  CheckCircle2,
} from 'lucide-react';

export const StudentSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUpStudent } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    general?: string;
  }>({});
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeTerms) {
      newErrors.terms = 'You must accept the terms to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const result = await signUpStudent(fullName, email, password);

      if (!result.success) {
        const errorMsg = result.error || 'Could not complete registration.';
        setErrors({ general: errorMsg });
        toast.error('Registration Error', errorMsg);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      if (result.requiresEmailConfirmation) {
        toast.success(
          'Confirmation Email Sent',
          'Please verify your email address before signing in.'
        );
      } else {
        toast.success(
          'Account Created',
          'Account created and signed in successfully!'
        );
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      portalTitle="Create Student Account"
      portalSubtitle="Join Yogneet Edu to learn via video lessons, study notes, practical projects, and competitive test series."
      badgeText="Student Portal"
      badgeVariant="brand"
    >
      {isSuccess ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Welcome to Yogneet Edu!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Your student profile has been registered. You are ready to start learning.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/dashboard')}
              className="w-full justify-center"
            >
              Go to Student Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSignUp} className="space-y-3.5" noValidate>
          {errors.general && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <Input
              id="student-signup-name"
              type="text"
              label="Full Name"
              placeholder="e.g. Adarsh Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={errors.fullName}
              leftIcon={<User className="w-4 h-4" />}
              autoComplete="name"
              required
            />
          </div>

          {/* Email Address */}
          <div>
            <Input
              id="student-signup-email"
              type="email"
              label="Email Address"
              placeholder="name@student.yogneet.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />
          </div>

          {/* Password */}
          <div>
            <Input
              id="student-signup-password"
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="new-password"
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <Input
              id="student-signup-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 focus:outline-none"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="new-password"
              required
            />
          </div>

          {/* Terms & Conditions */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300 select-none">
              <input
                id="student-signup-terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-bg"
              />
              <span>
                I agree to the{' '}
                <a href="#terms" className="text-brand-600 dark:text-cyan-400 underline hover:no-underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#privacy" className="text-brand-600 dark:text-cyan-400 underline hover:no-underline">
                  Privacy Policy
                </a>
              </span>
            </label>
            {errors.terms && <p className="text-xs text-rose-500 mt-1">{errors.terms}</p>}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full justify-center shadow-md shadow-brand-500/20 mt-2"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Create Student Account
          </Button>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="w-full border-t border-slate-200 dark:border-dark-border" />
            <span className="absolute px-3 bg-white dark:bg-dark-card text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Or sign up with
            </span>
          </div>

          {/* Google Sign Up */}
          <button
            type="button"
            onClick={() => setShowGoogleModal(true)}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-bg/60 hover:bg-slate-50 dark:hover:bg-dark-card hover:border-slate-300 dark:hover:border-blue-700/60 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
          >
            <GoogleIcon className="w-4 h-4 shrink-0" />
            <span>Sign up with Google</span>
          </button>

          {/* Sign In Link */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
            Already registered?{' '}
            <Link
              to="/login"
              className="font-semibold text-brand-600 hover:text-brand-500 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              Sign in to your account
            </Link>
          </div>

          {/* Platform Portal Link */}
          <div className="pt-4 border-t border-slate-100 dark:border-dark-border/60 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Staff or administrator?{' '}
              <Link
                to="/platform/login"
                className="font-semibold text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 inline-flex items-center gap-1"
              >
                Access Platform Portal &rarr;
              </Link>
            </p>
          </div>
        </form>
      )}

      {/* Google OAuth Phase 4B Modal */}
      <Modal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        title="Google Single Sign-On"
        maxWidth="md"
      >
        <div className="space-y-4 text-slate-700 dark:text-slate-200">
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                Phase 4B OAuth Integration In Progress
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Google Single Sign-On for fast 1-click registration is scheduled for Phase 4B deployment with live Supabase authentication.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            For now, please complete the standard student signup form or sign in with your email and password.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowGoogleModal(false)}>
              Got it
            </Button>
          </div>
        </div>
      </Modal>
    </AuthLayout>
  );
};
