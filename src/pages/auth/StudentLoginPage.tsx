import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Ref1AuthLayout, Ref1FeatureItem } from '../../components/layout/Ref1AuthLayout';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { GoogleIcon } from '../../components/common/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Info,
  ShieldAlert,
  BookOpen,
  Code2,
  TrendingUp,
} from 'lucide-react';

const studentFeatures: Ref1FeatureItem[] = [
  {
    title: 'Curriculum & Learning',
    description: 'Structured video lectures and curated study materials.',
    icon: BookOpen,
    color: 'purple',
  },
  {
    title: 'Practical Coding',
    description: 'Hands-on coding assignments and real-world projects.',
    icon: Code2,
    color: 'cyan',
  },
  {
    title: 'Assessments & Growth',
    description: 'Competitive assessments, progress tracking and skill development.',
    icon: TrendingUp,
    color: 'blue',
  },
];

export const StudentLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithEmail, signInWithGoogle, backendMode, isAuthenticated, currentUser, isLoading: isAuthLoading } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Redirect already authenticated users to their authorized destination
  useEffect(() => {
    if (isAuthenticated) {
      if (currentUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (currentUser.role === 'subadmin') {
        navigate('/subadmin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, currentUser.role, navigate]);

  // Notice for email verified callback
  useEffect(() => {
    if (searchParams.get('email_verified') === 'true') {
      toast.success('Email Verified!', 'Your email has been confirmed. Please sign in to continue.');
    }
  }, [searchParams, toast]);

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
    <Ref1AuthLayout
      role="student"
      badgeText="Student Portal"
      headlinePrimary="Learn Today."
      headlineAccent1="Build"
      headlineAccent2="Tomorrow."
      description="Build real technical skills through structured learning, practical coding and competitive assessments."
      features={studentFeatures}
      cardBadge="STUDENT LEARNING PORTAL"
      cardBadgeVariant="cyan"
      cardTitle="Student Sign In"
      cardSubtitle="Continue your structured learning journey — video lessons, study notes, practicals, and test series."
    >
      <form onSubmit={handleSignIn} className="space-y-3 lg:space-y-2 xl:space-y-3.5" noValidate>
        {errors.general && (
          <div className="p-2.5 xl:p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errors.general}</span>
          </div>
        )}

        {searchParams.get('oauth_callback') === 'true' && isAuthLoading && (
          <div className="p-2.5 xl:p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
            <span>Completing Google Single Sign-On session...</span>
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
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 xl:py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/25 transition-all duration-150 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <span>{isLoading ? 'Signing In...' : 'Sign In to Student Portal'}</span>
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>

        {/* Divider */}
        <div className="relative my-2 xl:my-2.5 flex items-center justify-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          <span className="absolute px-3 bg-white dark:bg-[#0E172A] text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Or continue with
          </span>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignInClick}
          className="w-full flex items-center justify-center gap-3 px-4 py-2 xl:py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-bg/60 hover:bg-slate-50 dark:hover:bg-dark-card hover:border-slate-300 dark:hover:border-blue-700/60 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
        >
          <GoogleIcon className="w-4 h-4 shrink-0" />
          <span>Sign in with Google</span>
        </button>

        {/* Sign Up Link */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-0.5">
          New to Yogneet Edu?{' '}
          <Link
            to="/signup"
            className="font-semibold text-brand-600 hover:text-brand-500 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            Create an account
          </Link>
        </div>

        {/* Platform Portal Link */}
        <div className="pt-2 xl:pt-3 border-t border-slate-100 dark:border-dark-border/60 text-center">
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

      {/* Google OAuth Notice Modal */}
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
                Phase 4B OAuth Integration
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Google OAuth provider keys and authorized redirect URIs are configured in the platform architecture with dynamic origin resolution.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-medium">In the meantime, you can:</p>
            <ul className="space-y-1.5 pl-4 list-disc text-slate-600 dark:text-slate-300">
              <li>Sign in using your student email and password</li>
              <li>Register a new student account using the signup form</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="primary" size="sm" onClick={() => setShowGoogleModal(false)}>
              Got it
            </Button>
          </div>
        </div>
      </Modal>
    </Ref1AuthLayout>
  );
};
