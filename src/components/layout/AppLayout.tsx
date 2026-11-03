import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // If session and profile are actively being resolved, render minimal spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mandatory Password Change Route Guard:
  // If user is authenticated but mustChangePassword is true,
  // prevent accessing protected application workflows and redirect to reset password.
  if (isAuthenticated && currentUser?.mustChangePassword) {
    return <Navigate to="/reset-password?mandatory=true" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text selection:bg-brand-500 selection:text-white transition-colors duration-150">
      {/* Main navigation header */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Main body area with sidebar & outlet */}
      <div className="flex-1 flex w-full">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
