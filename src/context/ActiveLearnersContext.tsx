import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ActiveLearnersService } from '../services/activeLearnersService';
import { useAuth } from './AuthContext';

interface ActiveLearnersContextType {
  activeLearnersCount: number;
  isLoading: boolean;
  refreshCount: () => Promise<void>;
}

const ActiveLearnersContext = createContext<ActiveLearnersContextType>({
  activeLearnersCount: 55,
  isLoading: false,
  refreshCount: async () => {},
});

export const ActiveLearnersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const [activeLearnersCount, setActiveLearnersCount] = useState<number>(55);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      const count = await ActiveLearnersService.getPublicActiveLearnersCount();
      setActiveLearnersCount(count);
    } catch {
      // keep current count
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await ActiveLearnersService.sendPresenceHeartbeat({
        path: window.location.pathname,
        role: currentUser.role,
      });
    } catch {
      // non-blocking
    }
  }, [isAuthenticated, currentUser.role]);

  // Initial fetch and heartbeat
  useEffect(() => {
    refreshCount();
    if (isAuthenticated) {
      sendHeartbeat();
    }
  }, [refreshCount, sendHeartbeat, isAuthenticated]);

  // Periodic heartbeat: every 45 seconds while authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      return;
    }

    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 45000);

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [isAuthenticated, sendHeartbeat]);

  // Periodic public count poll: every 30 seconds
  useEffect(() => {
    pollIntervalRef.current = setInterval(refreshCount, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshCount();
        if (isAuthenticated) sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshCount, sendHeartbeat, isAuthenticated]);

  return (
    <ActiveLearnersContext.Provider value={{ activeLearnersCount, isLoading, refreshCount }}>
      {children}
    </ActiveLearnersContext.Provider>
  );
};

export const useActiveLearners = () => useContext(ActiveLearnersContext);
