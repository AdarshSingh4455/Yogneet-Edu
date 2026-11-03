import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StudentModuleAccess } from '../types';
import { StudentAccessService, DEFAULT_STUDENT_MODULE_ACCESS } from '../services/studentAccessService';
import { useAuth } from './AuthContext';

interface StudentAccessContextType {
  accessList: StudentModuleAccess[];
  isLoading: boolean;
  refreshAccess: () => Promise<void>;
  isModuleAccessible: (moduleKeyOrRoute: string, isPremium?: boolean) => boolean;
}

const StudentAccessContext = createContext<StudentAccessContextType | undefined>(undefined);

export const StudentAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [accessList, setAccessList] = useState<StudentModuleAccess[]>(DEFAULT_STUDENT_MODULE_ACCESS);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccess = useCallback(async () => {
    try {
      const data = await StudentAccessService.getModuleAccessList();
      setAccessList(data);
    } catch (e) {
      console.error('[StudentAccessProvider] Error loading module access:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAccess();
  }, [refreshAccess]);

  const isModuleAccessible = useCallback(
    (moduleKeyOrRoute: string, customIsPremium?: boolean) => {
      const isPremium =
        customIsPremium !== undefined
          ? customIsPremium
          : currentUser.accessCategory === 'pro' || (currentUser as any).isPremium === true;

      return StudentAccessService.isModuleAccessible(moduleKeyOrRoute, accessList, isPremium);
    },
    [accessList, currentUser]
  );

  return (
    <StudentAccessContext.Provider
      value={{
        accessList,
        isLoading,
        refreshAccess,
        isModuleAccessible,
      }}
    >
      {children}
    </StudentAccessContext.Provider>
  );
};

export const useStudentAccess = (): StudentAccessContextType => {
  const context = useContext(StudentAccessContext);
  if (!context) {
    return {
      accessList: DEFAULT_STUDENT_MODULE_ACCESS,
      isLoading: false,
      refreshAccess: async () => {},
      isModuleAccessible: () => true,
    };
  }
  return context;
};
