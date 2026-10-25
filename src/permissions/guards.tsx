import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PermissionKey } from '../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const UnauthorizedView: React.FC<{ missingPermission?: string }> = ({ missingPermission }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 sm:p-12">
      <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-5 shadow-lg shadow-rose-500/10">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
        Access Restricted by Policy
      </h1>

      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mt-2 leading-relaxed">
        Your active persona (<span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.name}</span>, role: <span className="font-semibold capitalize">{currentUser.role}</span>) does not possess the requisite RBAC authorization for this path.
      </p>

      {missingPermission && (
        <div className="mt-4 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-dark-card border border-light-border dark:border-dark-border text-xs font-mono text-slate-700 dark:text-slate-300">
          Required permission: <span className="text-rose-600 dark:text-rose-400 font-semibold">{missingPermission}</span>
        </div>
      )}

      {currentUser.status === 'suspended' && (
        <div className="mt-3 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 max-w-md">
          ⚠️ Your account is currently <strong>SUSPENDED</strong>. All action privileges are revoked until restored by Super Admin.
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        <Button variant="outline" size="sm" onClick={() => window.history.back()} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Go Back
        </Button>
        <Button size="sm" onClick={() => window.location.href = currentUser.role === 'admin' ? '/admin' : '/dashboard'}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <UnauthorizedView missingPermission="admin.super_access" />;
  }
  return <>{children}</>;
};

export const PermissionRoute: React.FC<{
  permission?: PermissionKey;
  permissions?: PermissionKey[];
  children: React.ReactNode;
}> = ({ permission, permissions, children }) => {
  const { hasPermission, hasAnyPermission, currentUser } = useAuth();

  if (currentUser.status === 'suspended') {
    return <UnauthorizedView missingPermission="active.account_status" />;
  }

  if (permission && !hasPermission(permission)) {
    return <UnauthorizedView missingPermission={permission} />;
  }

  if (permissions && !hasAnyPermission(permissions)) {
    return <UnauthorizedView missingPermission={permissions.join(' OR ')} />;
  }

  return <>{children}</>;
};
