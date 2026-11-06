import React, { useState, useEffect } from 'react';
import { LeaderboardService } from '../../services/leaderboardService';
import { LeaderboardConfig, LeaderboardEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Trophy,
  Shield,
  Save,
  RefreshCw,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Sparkles,
  Gift,
} from 'lucide-react';

export const LeaderboardManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [config, setConfig] = useState<LeaderboardConfig>({
    isEnabled: true,
    eligibleCategories: ['all'],
    minAssessmentsRequired: 1,
    winnerGift: '',
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fraud Exclusion Modal
  const [isExcludeModalOpen, setIsExcludeModalOpen] = useState<boolean>(false);
  const [excludeAttemptId, setExcludeAttemptId] = useState<string>('');
  const [excludeReason, setExcludeReason] = useState<string>('');
  const [isExcluding, setIsExcluding] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [conf, list] = await Promise.all([
        LeaderboardService.getConfig(),
        LeaderboardService.getTop200Leaderboard(),
      ]);
      setConfig(conf);
      setLeaderboard(list);
    } catch (err: any) {
      toast.error('Load Failed', err.message || 'Failed to load leaderboard settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await LeaderboardService.updateConfig(config, currentUser.id);
      setConfig(updated);
      toast.success('Leaderboard Saved', 'Configuration and eligibility updated successfully.');
      loadData();
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Failed to update leaderboard configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcludeAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excludeAttemptId.trim() || !excludeReason.trim()) {
      toast.warning('Incomplete Form', 'Please provide both the Attempt ID and exclusion reason.');
      return;
    }

    setIsExcluding(true);
    try {
      await LeaderboardService.excludeAttempt(excludeAttemptId.trim(), excludeReason.trim());
      toast.success('Attempt Excluded', 'The attempt has been removed from leaderboard ranking calculations.');
      setIsExcludeModalOpen(false);
      setExcludeAttemptId('');
      setExcludeReason('');
      loadData();
    } catch (err: any) {
      toast.error('Exclusion Failed', err.message || 'Failed to exclude attempt.');
    } finally {
      setIsExcluding(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              Leaderboard Management
            </Badge>
            <span className="text-xs text-slate-400">Strict Top 200 Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0 text-amber-500">
              <Trophy className="w-5 h-5 fill-amber-500" />
            </div>
            Top 200 Student Leaderboard Admin
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsExcludeModalOpen(true)}
            leftIcon={<Ban className="w-3.5 h-3.5" />}
          >
            Exclude Fraudulent Attempt
          </Button>
        </div>
      </div>

      {/* Configuration Form Card */}
      <Card className="border border-light-border dark:border-dark-border">
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-light-border dark:border-dark-border">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-500" />
                Global Ranking Rules &amp; Visibility
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Control public leaderboard visibility and eligibility thresholds.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={e => setConfig(prev => ({ ...prev, isEnabled: e.target.checked }))}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span>Leaderboard Active</span>
              </label>
              <Button type="submit" size="sm" disabled={isSaving} leftIcon={<Save className="w-3.5 h-3.5" />}>
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Minimum Assessments Required for Ranking
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={config.minAssessmentsRequired}
                onChange={e => setConfig(prev => ({ ...prev, minAssessmentsRequired: parseInt(e.target.value, 10) || 1 }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Students with fewer completed assessments will not receive a rank.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Eligible Categories (comma-separated)
              </label>
              <input
                type="text"
                value={config.eligibleCategories.join(', ')}
                onChange={e =>
                  setConfig(prev => ({
                    ...prev,
                    eligibleCategories: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                  }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100"
                placeholder="all, Foundational, Core CS"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Use 'all' to include all verified assessments in score calculation.
              </p>
            </div>

            <div className="sm:col-span-2 pt-3 border-t border-light-border dark:border-dark-border">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-amber-500" />
                  Winner Gift (Optional)
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  {((config.winnerGift || '').length)}/120 characters
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={120}
                  value={config.winnerGift || ''}
                  onChange={e => setConfig(prev => ({ ...prev, winnerGift: e.target.value }))}
                  className="w-full px-3 py-2 pr-16 text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="e.g., ₹1,000 Amazon Gift Card or Free Premium Membership for 3 Months"
                />
                {(config.winnerGift || '').length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, winnerGift: '' }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-0.5 rounded transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Admin reward announcement for what the #1 student on the leaderboard will receive. Leave blank if no prize is currently awarded.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-card/50 border border-light-border dark:border-dark-border text-xs text-slate-500 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">Deterministic Tie-Breaking Rules:</span>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
              <li>1. Highest composite weighted score (Hard: 1.5x, Medium: 1.2x, Easy: 1.0x).</li>
              <li>2. Highest average accuracy percentage across best attempts.</li>
              <li>3. Total count of distinct assessments passed.</li>
              <li>4. Earliest completion timestamp.</li>
              <li>5. Deterministic profile UUID.</li>
            </ol>
          </div>
        </form>
      </Card>

      {/* Current Top 200 Preview Table */}
      <Card padding="none" className="border border-light-border dark:border-dark-border overflow-hidden">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Top Ranked Students Preview ({leaderboard.length} of 200)
          </h2>
          <Badge variant="brand" size="sm">
            Top 200 Cap Enforced
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-14 text-center">Rank</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4 text-center">Completed Tests</th>
                <th className="py-3 px-4 text-center">Accuracy</th>
                <th className="py-3 px-4 text-center">Streak</th>
                <th className="py-3 px-4 text-right">Composite Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading rankings...
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No students currently ranked or leaderboard disabled.
                  </td>
                </tr>
              ) : (
                leaderboard.slice(0, 50).map(entry => (
                  <tr key={entry.studentId} className="hover:bg-slate-50 dark:hover:bg-dark-cardHover/50 transition-colors">
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                      #{entry.rank}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{entry.studentName}</span>
                        {entry.isPremium && <Badge variant="brand" size="sm">PRO</Badge>}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{entry.studentId}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{entry.testsCompleted}</td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-500 font-bold">{entry.accuracyPercentage}%</td>
                    <td className="py-3 px-4 text-center font-mono">{entry.streakDays}d</td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-500">{entry.compositeScore}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Fraud Exclusion Modal */}
      {isExcludeModalOpen && (
        <Modal
          isOpen={isExcludeModalOpen}
          onClose={() => setIsExcludeModalOpen(false)}
          title="Exclude Attempt from Leaderboard"
        >
          <form onSubmit={handleExcludeAttempt} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Excluding an attempt immediately recalculates the leaderboard, removing scores obtained fraudulently or in violation of testing rules. This action is permanently audited.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assessment Attempt UUID *
              </label>
              <input
                type="text"
                required
                value={excludeAttemptId}
                onChange={e => setExcludeAttemptId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mandatory Exclusion Reason *
              </label>
              <textarea
                required
                rows={3}
                value={excludeReason}
                onChange={e => setExcludeReason(e.target.value)}
                placeholder="State verified rationale (e.g. multi-tab automated solver detected during assessment window)."
                className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsExcludeModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" type="submit" disabled={isExcluding}>
                {isExcluding ? 'Excluding...' : 'Confirm Exclusion'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
