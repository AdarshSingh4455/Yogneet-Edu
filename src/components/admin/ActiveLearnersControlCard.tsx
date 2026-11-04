import React, { useState, useEffect } from 'react';
import { ActiveLearnersService } from '../../services/activeLearnersService';
import { ActiveLearnersMetrics } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { useToast } from '../../context/ToastContext';
import { Users, Sparkles, RefreshCw, Save, ShieldAlert, Activity } from 'lucide-react';

export const ActiveLearnersControlCard: React.FC<{ onUpdated?: () => void }> = ({ onUpdated }) => {
  const toast = useToast();
  const [metrics, setMetrics] = useState<ActiveLearnersMetrics>({
    actualActiveLearners: 5,
    configuredBaseCounter: 50,
    displayedActiveLearners: 55,
  });
  const [baseInput, setBaseInput] = useState<string>('50');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await ActiveLearnersService.getAdminActiveLearnersMetrics();
      setMetrics(data);
      setBaseInput(String(data.configuredBaseCounter));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch active learners metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(baseInput.trim(), 10);
    if (isNaN(parsed) || parsed < 0) {
      toast.warning('Invalid Input', 'Please enter a valid non-negative integer for the base counter.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await ActiveLearnersService.updateBaseCounter(parsed);
      setMetrics(updated);
      toast.success(
        'Base Counter Updated',
        `Active Learners base counter updated to ${parsed}. Final displayed: ${updated.displayedActiveLearners}.`
      );
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Failed to update base counter in Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border border-light-border dark:border-dark-border bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 dark:from-dark-card dark:via-dark-card/90 dark:to-emerald-950/20 overflow-hidden shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Active Learners Management
              </h2>
              <Badge variant="brand" size="sm">
                Super Admin Only
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formula: Actual Active Learners + Admin Configured Base Counter = Displayed Active Learners
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={isLoading || isSaving}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3 Metric Comparison Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
        {/* Metric 1: Actual */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card/80 border border-light-border dark:border-dark-border space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>1. Actual Active</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {isLoading ? '...' : metrics.actualActiveLearners}
          </p>
          <span className="text-[10px] text-slate-400 block">Authenticated in last 2 mins</span>
        </div>

        {/* Metric 2: Base Counter */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card/80 border border-light-border dark:border-dark-border space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>2. Configured Base</span>
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-brand-600 dark:text-brand-400">
            {isLoading ? '...' : metrics.configuredBaseCounter}
          </p>
          <span className="text-[10px] text-slate-400 block">Admin configured baseline</span>
        </div>

        {/* Metric 3: Final Displayed */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            <span>3. Final Displayed Count</span>
            <Badge variant="success" size="sm">
              Public View
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {isLoading ? '...' : metrics.displayedActiveLearners}
          </p>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 block">
            Actual ({metrics.actualActiveLearners}) + Base ({metrics.configuredBaseCounter})
          </span>
        </div>
      </div>

      {/* Admin Edit Controls Form */}
      <form onSubmit={handleSave} className="mt-5 pt-4 border-t border-light-border dark:border-dark-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-sm">
          <label htmlFor="baseCounterInput" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Update Base Counter Value
          </label>
          <div className="flex items-center gap-2">
            <input
              id="baseCounterInput"
              type="number"
              min="0"
              step="1"
              value={baseInput}
              onChange={e => setBaseInput(e.target.value)}
              placeholder="e.g. 50"
              className="w-36 px-3 py-1.5 text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
              disabled={isSaving}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || parseInt(baseInput.trim(), 10) === metrics.configuredBaseCounter}
              leftIcon={<Save className="w-3.5 h-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm"
            >
              {isSaving ? 'Saving...' : 'Apply Base Counter'}
            </Button>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-dark-card/50 text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Privacy Guarantee:</span> Public users, students, and sub-admins see only the single final number (<strong>{metrics.displayedActiveLearners} Active Learners</strong>) with zero breakdown exposure.
        </div>
      </form>
    </Card>
  );
};
