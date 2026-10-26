import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PermissionKey, UserProfile } from '../types';
import { ApiService } from '../services/api';
import { ProfileService, ProfileUpdatePayload } from '../services/profileService';
import { supabase, isSupabaseConfigured, getBackendMode, BackendMode } from '../services/supabaseClient';
import {
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
} from '../permissions/registry';

interface AuthContextType {
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
  updateUserPermissions: (userId: string, permissions: PermissionKey[]) => void;
  updateCurrentUserProfile: (updates: ProfileUpdatePayload) => Promise<UserProfile>;
  backendMode: BackendMode;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'yogneet_active_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const backendMode = getBackendMode();
  const [isLoading, setIsLoading] = useState<boolean>(backendMode === 'supabase');
  const [users, setUsers] = useState<UserProfile[]>(() => ApiService.getUsers());
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

  // Sync users list from service
  const refreshUsers = useCallback(() => {
    setUsers(ApiService.getUsers());
  }, []);

  // Supabase Auth Session Synchronization (when Supabase credentials are configured)
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // Check existing active Supabase session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthProvider] Error retrieving session:', error);
      }
      if (session?.user && isMounted) {
        try {
          const profile = await ProfileService.getProfile(session.user.id);
          if (profile && isMounted) {
            setActiveProfile(profile);
            setCurrentUserId(profile.id);
          }
        } catch (err) {
          console.error('[AuthProvider] Failed to fetch profile for user:', err);
        }
      }
      if (isMounted) setIsLoading(false);
    });

    // Listen to Supabase Auth state transitions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          const profile = await ProfileService.getProfile(session.user.id);
          if (profile && isMounted) {
            setActiveProfile(profile);
            setCurrentUserId(profile.id);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setActiveProfile(null);
        setCurrentUserId('usr_student_1');
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Determine active user based on mode
  const currentUser: UserProfile = activeProfile
    ? activeProfile
    : users.find(u => u.id === currentUserId) || users[0];

  const switchUser = (userId: string) => {
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

  const updateUserPermissions = (userId: string, newPermissions: PermissionKey[]) => {
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
