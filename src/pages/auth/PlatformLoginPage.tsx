import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  Building2,
} from 'lucide-react';

export const PlatformLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithEmail } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

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
        navigate('/admin/dashboard');
      } else {
        navigate('/subadmin/dashboard');
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
      portalTitle="Platform Portal"
      portalSubtitle="Restricted access for authorized faculty, subject experts, and system administrators."
      badgeText="Internal Staff & Admin Portal"
      badgeVariant="purple"
    >
      <form onSubmit={handleSignIn} className="space-y-4" noValidate>
        {errors.general && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Security Notice */}
        <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 flex items-start gap-2.5">
          <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed">
            Staff access is monitored. Role assignments and security permissions are enforced by server-side claims in Supabase Auth.
          </p>
        </div>

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

        {/* Forgot Credentials notice */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Forgot internal credentials? Contact IT Security.
          </span>
          <Link
            to="/forgot-password"
            className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 transition-colors text-[11px]"
          >
            Reset
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full justify-center !bg-purple-600 hover:!bg-purple-700 shadow-md shadow-purple-600/20 text-white"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Sign In to Platform Portal
        </Button>

        {/* Self-registration disabled warning */}
        <div className="pt-3 border-t border-slate-100 dark:border-dark-border/60 text-center space-y-1">
          <p className="text-[11px] text-slate-400">
            Internal accounts are provisioned via administrative invitation. Self-registration is disabled for platform security.
          </p>
          <div className="pt-1">
            <Link
              to="/login"
              className="text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-cyan-400 dark:hover:text-cyan-300 inline-flex items-center gap-1"
            >
              &larr; Switch to Student Learning Portal
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
};
