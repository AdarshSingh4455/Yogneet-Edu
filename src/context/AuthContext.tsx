import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PermissionKey, UserProfile, UserRole } from '../types';
import { ApiService } from '../services/api';
import { ProfileService, ProfileUpdatePayload } from '../services/profileService';
import { supabase, isSupabaseConfigured, getBackendMode, BackendMode, supabaseConfig, formatSupabaseError } from '../services/supabaseClient';
import {
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
} from '../permissions/registry';

export type PortalType = 'student' | 'platform';

export interface AuthContextType {
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  switchUser: (userId: string) => void;
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  hasAllPermissions: (permissions: PermissionKey[]) => boolean;
  isAdmin: boolean;
  isSubAdmin: boolean;
  isStudent: boolean;
  refreshUsers: () => void;
  updateUserPermissions: (userId: string, permissions: PermissionKey[]) => Promise<void> | void;
  updateCurrentUserProfile: (updates: ProfileUpdatePayload) => Promise<UserProfile>;
  backendMode: BackendMode;
  isLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  isAuthenticated: boolean;
  isRecoverySession: boolean;
  isFatalConfigError: boolean;
  configError?: string;

  // Phase 4B Real Authentication Operations
  signInWithEmail: (email: string, password: string, portal: PortalType) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  signUpStudent: (name: string, email: string, password: string) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string; user?: UserProfile }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  completePasswordReset: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'yogneet_active_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const backendMode = getBackendMode();
  const [isLoading, setIsLoading] = useState<boolean>(backendMode === 'supabase');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRecoverySession, setIsRecoverySession] = useState<boolean>(false);
  const [users, setUsers] = useState<UserProfile[]>(() => ApiService.getUsers());

  // Track async request sequence to prevent race conditions and stale overwrites
  const requestSequenceRef = useRef<number>(0);

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_KEY);
      if (saved && ApiService.getUserById(saved)) return saved;
    } catch {
      // ignore
    }
    return 'usr_student_1'; // Student experience by default in mock mode
  });

  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [isMockAuthenticated, setIsMockAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yogneet_auth_session') === 'true';
    } catch {
      return false;
    }
  });

  const isAuthenticated = backendMode === 'supabase' ? activeProfile !== null : isMockAuthenticated;

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Sync users list from service
  const refreshUsers = useCallback(() => {
    setUsers(ApiService.getUsers());
  }, []);

  // Safe profile loader that discards stale async responses
  const loadProfileForUser = useCallback(async (userId: string): Promise<UserProfile | null> => {
    const sequenceId = ++requestSequenceRef.current;
    try {
      const profile = await ProfileService.getProfile(userId);
      // Only commit if this request is still the newest
      if (sequenceId === requestSequenceRef.current && profile) {
        setActiveProfile(profile);
        setCurrentUserId(profile.id);
        return profile;
      }
      return profile;
    } catch (err) {
      console.error('[AuthProvider] Failed to load user profile:', err);
      return null;
    }
  }, []);

  // Supabase Auth Session Synchronization
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Initial Session Retrieval
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error('[AuthProvider] Error retrieving session:', error);
      }
      if (session?.user) {
        await loadProfileForUser(session.user.id);
      }
      if (isMounted) setIsLoading(false);
    });

    // 2. Auth State Transition Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoverySession(true);
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          await loadProfileForUser(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setActiveProfile(null);
        setIsMockAuthenticated(false);
        setCurrentUserId('usr_student_1');
        setIsRecoverySession(false);
        try {
          localStorage.removeItem('yogneet_auth_session');
        } catch {
          // ignore
        }
      }

      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfileForUser]);

  // Determine active user based on mode
  const currentUser: UserProfile = activeProfile
    ? activeProfile
    : users.find(u => u.id === currentUserId) || users[0];

  const switchUser = (userId: string) => {
    // In live Supabase mode, switching personas is not allowed to bypass real authentication
    if (backendMode === 'supabase' || activeProfile) {
      console.warn('[AuthProvider] Persona switching is disabled when authenticated with real Supabase credentials.');
      return;
    }

    if (supabaseConfig.isFatalConfigError || Boolean((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.PROD)) {
      console.warn('[AuthProvider] Persona switching is blocked in production fail-closed mode.');
      return;
    }

    const target = users.find(u => u.id === userId);
    if (target) {
      setCurrentUserId(userId);
      setActiveProfile(null);
      try {
        localStorage.setItem(CURRENT_USER_KEY, userId);
      } catch {
        // ignore
      }
    }
  };

  const updateUserPermissions = async (userId: string, newPermissions: PermissionKey[]): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      // 1. Delete existing permissions from Supabase user_permissions table
      const { error: delErr } = await (supabase as any)
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      if (delErr) {
        throw new Error(formatSupabaseError(delErr));
      }

      // 2. Insert updated permissions
      if (newPermissions.length > 0) {
        const rows = newPermissions.map(p => ({
          user_id: userId,
          permission_key: p,
        }));
        const { error: insErr } = await (supabase as any)
          .from('user_permissions')
          .insert(rows);

        if (insErr) {
          throw new Error(formatSupabaseError(insErr));
        }
      }

      if (activeProfile && activeProfile.id === userId) {
        setActiveProfile({
          ...activeProfile,
          permissions: newPermissions,
        });
      }
    }

    ApiService.updateUserPermissions(currentUser, userId, newPermissions);
    refreshUsers();
  };

  const updateCurrentUserProfile = async (updates: ProfileUpdatePayload): Promise<UserProfile> => {
    const updated = await ProfileService.updateProfile(currentUser.id, updates);
    setActiveProfile(updated);
    refreshUsers();
    return updated;
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    return checkPermission(currentUser, permission);
  };

  const hasAnyPermission = (permissions: PermissionKey[]): boolean => {
    return checkAnyPermission(currentUser, permissions);
  };

  const hasAllPermissions = (permissions: PermissionKey[]): boolean => {
    return checkAllPermissions(currentUser, permissions);
  };

  // =========================================================================
  // Phase 4B Auth Operations
  // =========================================================================

  /**
   * Signs in with email and password, enforcing portal-specific role and status policies.
   */
  const signInWithEmail = async (
    email: string,
    password: string,
    portal: PortalType
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> => {
    setAuthError(null);
    const normalizedEmail = email.trim().toLowerCase();

    // 0. Fail-Closed Production Configuration Guard
    if (supabaseConfig.isFatalConfigError) {
      const err = supabaseConfig.configError || 'Platform authentication is unconfigured in production mode.';
      setAuthError(err);
      return { success: false, error: err };
    }

    // 1. Live Supabase Mode
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          const safeMessage = error.message.includes('Invalid login credentials')
            ? 'Invalid email or password.'
            : error.message;
          setAuthError(safeMessage);
          return { success: false, error: safeMessage };
        }

        if (!data.user) {
          const err = 'Authentication failed: No user returned.';
          setAuthError(err);
          return { success: false, error: err };
        }

        // Fetch verified profile from database
        const profile = await ProfileService.getProfile(data.user.id);
        if (!profile) {
          await supabase.auth.signOut();
          const err = 'Account profile not found. Please contact support.';
          setAuthError(err);
          return { success: false, error: err };
        }

        // Account status check
        if (profile.status === 'suspended') {
          await supabase.auth.signOut();
          const err = 'Your account has been suspended. Please contact platform administration.';
          setAuthError(err);
          return { success: false, error: err };
        }

        // Portal-specific role authorization
        if (portal === 'platform') {
          if (profile.role !== 'admin' && profile.role !== 'subadmin') {
            await supabase.auth.signOut();
            const err = 'Access Denied: This platform portal is restricted to authorized faculty and administrative staff.';
            setAuthError(err);
            return { success: false, error: err };
          }
        }

        setActiveProfile(profile);
        setCurrentUserId(profile.id);
        return { success: true, user: profile };
      } catch (err: any) {
        const msg = err.message || 'An unexpected error occurred during sign-in.';
        setAuthError(msg);
        return { success: false, error: msg };
      }
    }

    // 2. Local Mock / Demo Mode
    const targetUser = users.find(u => u.email.toLowerCase() === normalizedEmail) ||
      (normalizedEmail.includes('admin') ? users.find(u => u.role === 'admin') : null) ||
      (normalizedEmail.includes('faculty') || normalizedEmail.includes('staff') ? users.find(u => u.role === 'subadmin') : null) ||
      users.find(u => u.role === 'student');

    if (!targetUser) {
      const err = 'Invalid email or password.';
      setAuthError(err);
      return { success: false, error: err };
    }

    if (targetUser.status === 'suspended') {
      const err = 'Your account has been suspended. Please contact platform administration.';
      setAuthError(err);
      return { success: false, error: err };
    }

    if (portal === 'platform') {
      if (targetUser.role !== 'admin' && targetUser.role !== 'subadmin') {
        const err = 'Access Denied: This platform portal is restricted to authorized faculty and administrative staff.';
        setAuthError(err);
        return { success: false, error: err };
      }
    }

    setCurrentUserId(targetUser.id);
    setActiveProfile(targetUser);
    setIsMockAuthenticated(true);
    try {
      localStorage.setItem(CURRENT_USER_KEY, targetUser.id);
      localStorage.setItem('yogneet_auth_session', 'true');
    } catch {
      // ignore
    }

    return { success: true, user: targetUser };
  };

  /**
   * Registers a new student account. Newly registered users are strictly assigned the 'student' role.
   */
  const signUpStudent = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string; user?: UserProfile }> => {
    setAuthError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!normalizedEmail || !password || !trimmedName) {
      return { success: false, error: 'All fields are required.' };
    }

    // 0. Fail-Closed Production Configuration Guard
    if (supabaseConfig.isFatalConfigError) {
      const err = supabaseConfig.configError || 'Platform authentication is unconfigured in production mode.';
      setAuthError(err);
      return { success: false, error: err };
    }

    // Live Supabase Mode
    if (isSupabaseConfigured() && supabase) {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const emailRedirectTo = origin ? `${origin}/login?email_verified=true` : undefined;

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name: trimmedName,
            },
            emailRedirectTo,
          },
        });

        if (error) {
          setAuthError(error.message);
          return { success: false, error: error.message };
        }

        if (data.session && data.user) {
          const profile = await ProfileService.getProfile(data.user.id);
          if (profile) {
            setActiveProfile(profile);
            setCurrentUserId(profile.id);
          }
          return { success: true, requiresEmailConfirmation: false, user: profile || undefined };
        }

        // Email confirmation required configuration
        return { success: true, requiresEmailConfirmation: true };
      } catch (err: any) {
        const msg = err.message || 'An error occurred during student registration.';
        setAuthError(msg);
        return { success: false, error: msg };
      }
    }

    // Local Mock Mode
    const newStudent: UserProfile = {
      id: `usr_student_${Date.now()}`,
      name: trimmedName,
      email: normalizedEmail,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      role: 'student',
      status: 'active',
      permissions: [],
      department: 'Enrolled Student',
      enrolledCourses: [],
      solvedProblemsCount: 0,
      testsCompletedCount: 0,
      accessCategory: 'standard',
      createdAt: new Date().toISOString(),
      lastActive: 'Just now',
    };

    setUsers(prev => [newStudent, ...prev]);
    setCurrentUserId(newStudent.id);
    setActiveProfile(newStudent);
    setIsMockAuthenticated(true);
    try {
      localStorage.setItem('yogneet_auth_session', 'true');
    } catch {
      // ignore
    }
    return { success: true, requiresEmailConfirmation: false, user: newStudent };
  };

  /**
   * Initiates Google OAuth authentication flow.
   */
  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);

    // 0. Fail-Closed Production Configuration Guard
    if (supabaseConfig.isFatalConfigError) {
      const err = supabaseConfig.configError || 'Platform authentication is unconfigured in production mode.';
      setAuthError(err);
      return { success: false, error: err };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/login?oauth_callback=true`,
          },
        });

        if (error) {
          setAuthError(error.message);
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (err: any) {
        const msg = err.message || 'Google OAuth authentication failed to initialize.';
        setAuthError(msg);
        return { success: false, error: msg };
      }
    }

    // Mock Mode fallback
    const studentUser = users.find(u => u.role === 'student') || users[0];
    setCurrentUserId(studentUser.id);
    setActiveProfile(studentUser);
    return { success: true };
  };

  /**
   * Requests a password reset email.
   */
  const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    const normalizedEmail = email.trim().toLowerCase();

    // 0. Fail-Closed Production Configuration Guard
    if (supabaseConfig.isFatalConfigError) {
      const err = supabaseConfig.configError || 'Platform authentication is unconfigured in production mode.';
      setAuthError(err);
      return { success: false, error: err };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          setAuthError(error.message);
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (err: any) {
        const msg = err.message || 'Failed to send password recovery instructions.';
        setAuthError(msg);
        return { success: false, error: msg };
      }
    }

    // Mock Mode: always succeeds
    return { success: true };
  };

  /**
   * Completes password reset with the new password.
   */
  const completePasswordReset = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);

    // 0. Fail-Closed Production Configuration Guard
    if (supabaseConfig.isFatalConfigError) {
      const err = supabaseConfig.configError || 'Platform authentication is unconfigured in production mode.';
      setAuthError(err);
      return { success: false, error: err };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          setAuthError(error.message);
          return { success: false, error: error.message };
        }

        setIsRecoverySession(false);
        return { success: true };
      } catch (err: any) {
        const msg = err.message || 'Failed to update password.';
        setAuthError(msg);
        return { success: false, error: msg };
      }
    }

    // Mock Mode
    setIsRecoverySession(false);
    return { success: true };
  };

  /**
   * Terminates active session.
   */
  const signOut = async (): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('[AuthProvider] Error signing out:', err);
      }
    }

    setActiveProfile(null);
    setIsMockAuthenticated(false);
    setCurrentUserId('usr_student_1');
    setIsRecoverySession(false);
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem('yogneet_auth_session');
    } catch {
      // ignore
    }
  };

  /**
   * Manually refreshes the active session profile.
   */
  const refreshSession = async (): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfileForUser(session.user.id);
      }
    }
  };

  const isAdmin = currentUser.role === 'admin';
  const isSubAdmin = currentUser.role === 'subadmin';
  const isStudent = currentUser.role === 'student';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        availableUsers: users,
        switchUser,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
        isSubAdmin,
        isStudent,
        refreshUsers,
        updateUserPermissions,
        updateCurrentUserProfile,
        backendMode,
        isLoading,
        isAuthenticated,
        authError,
        clearAuthError,
        isRecoverySession,
        isFatalConfigError: supabaseConfig.isFatalConfigError,
        configError: supabaseConfig.configError,
        signInWithEmail,
        signUpStudent,
        signInWithGoogle,
        requestPasswordReset,
        completePasswordReset,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
