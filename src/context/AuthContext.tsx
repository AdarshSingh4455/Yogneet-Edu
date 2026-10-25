import React, { createContext, useContext, useState, useEffect } from 'react';
import { PermissionKey, UserProfile, UserRole } from '../types';
import { ApiService } from '../services/api';
import { hasPermission as checkPermission, hasAnyPermission as checkAnyPermission, hasAllPermissions as checkAllPermissions } from '../permissions/registry';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'yogneet_active_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => ApiService.getUsers());
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_KEY);
      if (saved && ApiService.getUserById(saved)) return saved;
    } catch {
      // ignore
    }
    // Default to student or admin persona
    return 'usr_student_1'; // Student experience by default, easy to switch to Admin via sticky switcher
  });

  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  const refreshUsers = () => {
    setUsers(ApiService.getUsers());
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      setCurrentUserId(userId);
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
