import React, { useState, useEffect } from 'react';
import { StudentAccessService } from '../../services/studentAccessService';
import { StudentModuleAccess } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Shield,
  Layers,
  Crown,
  User,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Info,
  ExternalLink,
  BookOpen,
  Video,
  FileText,
  Code2,
  CheckSquare,
  Film,
  MessageSquare,
  TrendingUp,
  HelpCircle,
  LayoutDashboard,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const StudentAccessManagementPage: React.FC = () => {
  const toast = useToast();
  const [modules, setModules] = useState<StudentModuleAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const fetchModules = async () => {
    setIsLoading(true);
    try {
      const data = await StudentAccessService.getModuleAccessList();
      setModules(data);
    } catch (err) {
      console.error('Failed to load module access rules:', err);
      toast.error('Load Error', 'Could not fetch student module access configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleToggle = async (
    moduleKey: string,
    tier: 'normal' | 'premium',
    currentValue: boolean
  ) => {
    const targetModule = modules.find(m => m.moduleKey === moduleKey);
    if (!targetModule) return;

    const newNormal = tier === 'normal' ? !currentValue : targetModule.normalEnabled;
    const newPremium = tier === 'premium' ? !currentValue : targetModule.premiumEnabled;

    // Optimistic UI update
    setModules(prev =>
      prev.map(m =>
        m.moduleKey === moduleKey
          ? { ...m, normalEnabled: newNormal, premiumEnabled: newPremium }
          : m
      )
    );

    setUpdatingKey(`${moduleKey}_${tier}`);
    try {
      await StudentAccessService.updateModuleAccess(moduleKey, newNormal, newPremium);
      toast.success(
        'Access Updated',
        `${targetModule.moduleName} access updated for ${tier === 'normal' ? 'Normal' : 'Premium'} Students.`
      );
    } catch (err: any) {
      // Revert optimistic update
      setModules(prev =>
        prev.map(m =>
          m.moduleKey === moduleKey
            ? { ...m, normalEnabled: targetModule.normalEnabled, premiumEnabled: targetModule.premiumEnabled }
            : m
        )
      );
      toast.error('Update Failed', err.message || 'Failed to save access configuration.');
    } finally {
      setUpdatingKey(null);
    }
  };

  const getModuleIcon = (key: string) => {
    switch (key) {
      case 'dashboard':
        return <LayoutDashboard className="w-5 h-5 text-brand-500" />;
      case 'videos':
        return <Video className="w-5 h-5 text-red-500" />;
      case 'notes':
        return <FileText className="w-5 h-5 text-emerald-500" />;
      case 'practical':
        return <Code2 className="w-5 h-5 text-purple-500" />;
      case 'tests':
        return <CheckSquare className="w-5 h-5 text-amber-500" />;
      case 'micro_lessons':
        return <Film className="w-5 h-5 text-pink-500" />;
      case 'coding':
        return <Code2 className="w-5 h-5 text-orange-500" />;
      case 'community':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'progress':
        return <TrendingUp className="w-5 h-5 text-indigo-500" />;
      case 'feedback':
        return <HelpCircle className="w-5 h-5 text-cyan-500" />;
      default:
        return <Layers className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              <Shield className="w-3 h-3 mr-1" /> Admin Authority
            </Badge>
            <span className="text-xs text-slate-400">Granular Tier Access Control</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-brand-500" />
            Student Access Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Configure platform tab accessibility for Normal vs. Premium Students in real-time. Inactive modules will be automatically hidden from student navigation and blocked on direct route URLs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchModules}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh Rules
          </Button>
        </div>
      </div>

      {/* Information Banner */}
      <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/60 flex items-start gap-3">
        <Info className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Real-Time Tier Enforcement Policy
          </p>
          <p className="leading-relaxed">
            Settings configured below are persisted directly in PostgreSQL (`public.student_module_access`). When a tab is disabled for a tier, students belonging to that tier will have the link removed from their sidebar navigation, and any direct navigation to the route will be blocked by the server-backed router guard.
          </p>
        </div>
      </div>

      {/* Access Matrix Table */}
      <Card padding="none" className="overflow-hidden border border-light-border dark:border-dark-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-dark-sidebar/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] font-bold border-b border-light-border dark:border-dark-border">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Module / Feature</th>
                <th className="py-3.5 px-4">Route</th>
                <th className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>Normal Students</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span>Premium Students</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                    Loading module access settings...
                  </td>
                </tr>
              ) : modules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No module access rules configured.
                  </td>
                </tr>
              ) : (
                modules.map(module => (
                  <tr
                    key={module.moduleKey}
                    className="hover:bg-slate-50/60 dark:hover:bg-dark-hover/40 transition-colors"
                  >
                    {/* Module Title & Description */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-light-border dark:border-dark-border shrink-0 mt-0.5">
                          {getModuleIcon(module.moduleKey)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {module.moduleName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {module.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="py-4 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-sidebar border border-slate-200 dark:border-dark-border">
                        {module.moduleRoute}
                      </span>
                    </td>

                    {/* Normal Student Toggle */}
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(module.moduleKey, 'normal', module.normalEnabled)}
                        disabled={updatingKey === `${module.moduleKey}_normal`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          module.normalEnabled
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 hover:bg-blue-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                        title={module.normalEnabled ? 'Click to disable for normal students' : 'Click to enable for normal students'}
                      >
                        {module.normalEnabled ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>Enabled</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Premium Student Toggle */}
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(module.moduleKey, 'premium', module.premiumEnabled)}
                        disabled={updatingKey === `${module.moduleKey}_premium`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          module.premiumEnabled
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                        title={module.premiumEnabled ? 'Click to disable for premium students' : 'Click to enable for premium students'}
                      >
                        {module.premiumEnabled ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Enabled</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
