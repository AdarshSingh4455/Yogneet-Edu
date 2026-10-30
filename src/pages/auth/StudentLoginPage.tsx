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
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Info,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

export const StudentLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithGoogle, switchUser, backendMode } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const result = await signInWithEmail(email, password, 'student');
      if (!result.success) {
        setErrors({ general: result.error || 'Invalid email or password' });
        toast.error('Sign In Failed', result.error || 'Please check your credentials.');
        return;
      }

      toast.success('Welcome Back!', 'Successfully signed in to your learning dashboard.');
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoStudent = () => {
    setEmail('student@yogneet.edu');
    setPassword('student123');
    switchUser('usr_student_1');
    toast.info(
      'Demo Student Session Initialized',
      'Entering student learning journey in prototype mode.'
    );
    navigate('/dashboard');
  };

  const handleGoogleSignInClick = async () => {
    if (backendMode === 'supabase') {
      setIsLoading(true);
      const res = await signInWithGoogle();
      if (!res.success) {
        toast.error('Google OAuth Error', res.error || 'Failed to initiate Google sign-in.');
        setIsLoading(false);
      }
      return;
    }
    setShowGoogleModal(true);
  };

  return (
    <AuthLayout
      portalTitle="Student Sign In"
      portalSubtitle="Continue your structured learning journey — video lessons, study notes, practicals, and test series."
      badgeText="Student Portal"
      badgeVariant="brand"
    >
      <form onSubmit={handleSignIn} className="space-y-4" noValidate>
        {errors.general && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Email Address */}
        <div>
          <Input
            id="student-login-email"
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
            id="student-login-password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="••••••••"
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
            autoComplete="current-password"
            required
          />
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-bg"
            />
            <span>Remember me</span>
          </label>
          <Link
            to="/forgot-password"
            className="font-medium text-brand-600 hover:text-brand-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Primary Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full justify-center shadow-md shadow-brand-500/20"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Sign In to Student Portal
        </Button>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-slate-200 dark:border-dark-border" />
          <span className="absolute px-3 bg-white dark:bg-dark-card text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Or continue with
          </span>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignInClick}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-bg/60 hover:bg-slate-50 dark:hover:bg-dark-card hover:border-slate-300 dark:hover:border-blue-700/60 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
        >
          <GoogleIcon className="w-4 h-4 shrink-0" />
          <span>Sign in with Google</span>
        </button>

        {/* Prototype / Demo Quick Access */}
        {backendMode === 'local-mock' && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleQuickDemoStudent}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-brand-700 dark:text-cyan-300 bg-brand-50 dark:bg-cyan-950/30 hover:bg-brand-100 dark:hover:bg-cyan-950/50 border border-brand-200 dark:border-cyan-800/40 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-500 dark:text-cyan-400" />
              <span>Explore as Demo Student (Instant Access)</span>
            </button>
          </div>
        )}

        {/* Sign Up Link */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
          New to Yogneet Edu?{' '}
          <Link
            to="/signup"
            className="font-semibold text-brand-600 hover:text-brand-500 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            Create an account
          </Link>
        </div>

        {/* Platform Portal Link */}
        <div className="pt-4 border-t border-slate-100 dark:border-dark-border/60 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Internal faculty, staff, or administrator?{' '}
            <Link
              to="/platform/login"
              className="font-semibold text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 inline-flex items-center gap-1"
            >
              Access Platform Portal &rarr;
            </Link>
          </p>
        </div>
      </form>

      {/* Google OAuth Phase 4B Notice Modal */}
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
                Google OAuth provider keys and authorized redirect URIs are configured in the platform architecture. Direct OAuth token exchange will be activated in Phase 4B with live Supabase authentication.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-medium">In the meantime, you can:</p>
            <ul className="space-y-1.5 pl-4 list-disc text-slate-600 dark:text-slate-300">
              <li>Sign in using your student email and password</li>
              <li>Use the one-click demo student access button to preview the full student portal</li>
              <li>Register a new student account using the signup form</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowGoogleModal(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowGoogleModal(false);
                handleQuickDemoStudent();
              }}
            >
              Continue as Demo Student
            </Button>
          </div>
        </div>
      </Modal>
    </AuthLayout>
  );
};
