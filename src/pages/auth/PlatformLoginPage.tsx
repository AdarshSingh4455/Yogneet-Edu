import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ref1AuthLayout, Ref1FeatureItem } from '../../components/layout/Ref1AuthLayout';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  Layers,
  CheckSquare,
  Users,
  GraduationCap,
} from 'lucide-react';

const staffFeatures: Ref1FeatureItem[] = [
  {
    title: 'Curriculum Management',
    description: 'Create, organize and maintain structured learning content with verified study material.',
    icon: Layers,
    color: 'purple',
  },
  {
    title: 'Assessment Engine',
    description: 'Conduct tests, manage question banks, and evaluate student performance.',
    icon: CheckSquare,
    color: 'cyan',
  },
  {
    title: 'Platform Governance',
    description: 'Manage staff roles, permissions, and monitor overall platform activity.',
    icon: Users,
    color: 'blue',
  },
];

export const PlatformLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithEmail, isAuthenticated, currentUser } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  // Redirect already authenticated users to their authorized dashboard
  useEffect(() => {
    if (isAuthenticated) {
      if (currentUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (currentUser.role === 'subadmin') {
        navigate('/subadmin', { replace: true });
      } else {
        // Never redirect a student into staff/admin routes
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, currentUser.role, navigate]);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Staff email address is required';
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
      const result = await signInWithEmail(email, password, 'platform');

      if (!result.success) {
        setErrors({ general: result.error || 'Invalid staff credentials' });
        toast.error('Authentication Failed', result.error || 'Please check your staff credentials.');
        setIsLoading(false);
        return;
      }

      toast.success(
        'Staff Session Authenticated',
        'Welcome to the Yogneet Edu internal platform portal.'
      );

      // Route based on verified role
      if (result.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/subadmin');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Ref1AuthLayout
      role="platform"
      badgeText="Platform Portal"
      headlinePrimary="Empower Learners."
      headlineAccent1="Shape"
      headlineAccent2="Careers."
      description="The Yogneet Edu Platform Portal provides educators, mentors, and administrators with powerful tools to design curriculum, mentor students, conduct assessments, and manage platform operations."
      features={staffFeatures}
      cardBadge="INTERNAL STAFF & ADMIN PORTAL"
      cardBadgeVariant="purple"
      cardTitle="Platform Portal"
      cardSubtitle="Restricted access for authorized faculty, subject experts, and system administrators."
      securityNotice="Staff access is monitored. Role assignments and security permissions are enforced by server-side claims in Supabase Auth."
    >
      <form onSubmit={handleSignIn} className="space-y-4" noValidate>
        {errors.general && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Staff Email */}
        <div>
          <Input
            id="platform-login-email"
            type="email"
            label="Staff / Administrator Email"
            placeholder="admin@yogneet.edu"
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
            id="platform-login-password"
            type={showPassword ? 'text' : 'password'}
            label="Platform Password"
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

        {/* Forgot Credentials notice matching Ref-1 */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Forgot internal credentials? Contact IT Security.
          </span>
          <Link
            to="/forgot-password"
            className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 transition-colors text-[11px]"
          >
            Reset Password
          </Link>
        </div>

        {/* Submit Button matching Ref-1 solid purple */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-bold shadow-lg shadow-purple-500/25 transition-all duration-150 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <span>{isLoading ? 'Authenticating...' : 'Sign In to Platform Portal'}</span>
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>

        {/* Divider matching Ref-1 */}
        <div className="relative my-3 flex items-center justify-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          <span className="absolute px-3 bg-white dark:bg-[#0E172A] text-[10px] font-bold uppercase tracking-wider text-slate-400">
            OR
          </span>
        </div>

        {/* Switch to Student Portal button matching Ref-1 */}
        <Link
          to="/login"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-dark-card hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-semibold transition-all shadow-2xs"
        >
          <GraduationCap className="w-4 h-4" />
          <span>Switch to Student Learning Portal</span>
        </Link>
      </form>
    </Ref1AuthLayout>
  );
};
