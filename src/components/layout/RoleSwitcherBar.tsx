import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ApiService } from '../../services/api';
import { Shield, Sparkles, RefreshCw, UserCheck, AlertOctagon } from 'lucide-react';
import { Badge } from '../common/Badge';

export const RoleSwitcherBar: React.FC = () => {
  const { currentUser, availableUsers, switchUser, refreshUsers } = useAuth();
  const toast = useToast();

  const handleResetData = () => {
    if (window.confirm('Reset all mock state, test attempts, notes, and audit logs to initial default demo data?')) {
      ApiService.resetAllData();
      refreshUsers();
      toast.success('Demo environment reset', 'Mock state restored to initial demo seeds.');
    }
  };

  return (
    <aside
      aria-label="Demo Role & RBAC Simulator"
      className="bg-slate-900 text-slate-200 border-b border-slate-800 text-xs py-2 px-3 sm:px-6 flex flex-wrap items-center justify-between gap-2.5 z-40 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 font-semibold text-brand-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Demo Role & RBAC Simulator</span>
        </span>
        <span className="hidden md:inline-block text-slate-500">|</span>
        <span className="hidden md:inline-block text-slate-400">
          Frontend prototype demonstration mode (Backend API mock layer)
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label htmlFor="persona-select" className="text-slate-400 font-medium">Switch Persona:</label>
        <div className="relative">
          <select
            id="persona-select"
            value={currentUser.id}
            onChange={e => {
              switchUser(e.target.value);
              const target = availableUsers.find(u => u.id === e.target.value);
              if (target) {
                toast.info(`Switched to ${target.name}`, `Role: ${target.role.toUpperCase()} (${target.status})`);
              }
            }}
            className="bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 hover:border-blue-500/50 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-blue-400 cursor-pointer transition-colors"
          >
            {availableUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.role === 'admin'
                  ? `👑 ${user.name} (Super Admin)`
                  : user.role === 'subadmin'
                  ? `🛡️ ${user.name} (${user.department?.split(' ')[0] || 'Sub-Admin'}) ${user.status === 'suspended' ? '[SUSPENDED]' : ''}`
                  : `🎓 ${user.name} (Student)`}
              </option>
            ))}
          </select>
        </div>

        {currentUser.status === 'suspended' ? (
          <Badge variant="danger" size="sm" dot>
            <AlertOctagon className="w-3 h-3 mr-1 inline" /> Suspended
          </Badge>
        ) : (
          <Badge
            variant={currentUser.role === 'admin' ? 'brand' : currentUser.role === 'subadmin' ? 'purple' : 'success'}
            size="sm"
            dot
          >
            {currentUser.role.toUpperCase()}
          </Badge>
        )}

        <button
          onClick={handleResetData}
          title="Reset demo data to seeds"
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors ml-1"
          aria-label="Reset prototype data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
