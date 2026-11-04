import React, { useState, useEffect } from 'react';
import { AdService } from '../../services/adService';
import { Advertisement, AdAnalyticsSummary, AdStatus, AdPlacement } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Archive,
  BarChart3,
  MousePointerClick,
  Eye,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Edit2,
  Calendar,
  Clock,
  Layers,
} from 'lucide-react';

export const AdvertisementManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [ads, setAds] = useState<Advertisement[]>([]);
  const [analytics, setAnalytics] = useState<AdAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Edit / Create Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAd, setEditingAd] = useState<Partial<Advertisement>>({
    title: '',
    description: '',
    imageUrl: '',
    destinationUrl: '',
    placement: 'dashboard',
    targetPages: ['all'],
    displayDurationSeconds: 10,
    status: 'active',
    maxImpressionsPerUserPerDay: 3,
    minSecondsBetweenDisplays: 300,
    priority: 1,
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allAds, summary] = await Promise.all([
        AdService.getAllAds(),
        AdService.getAnalyticsSummary(),
      ]);
      setAds(allAds);
      setAnalytics(summary);
    } catch (err: any) {
      toast.error('Load Failed', err.message || 'Failed to load advertisements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingAd({
      title: '',
      description: '',
      imageUrl: '',
      destinationUrl: '',
      placement: 'dashboard',
      targetPages: ['all'],
      displayDurationSeconds: 10,
      status: 'active',
      maxImpressionsPerUserPerDay: 3,
      minSecondsBetweenDisplays: 300,
      priority: 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ad: Advertisement) => {
    setEditingAd({ ...ad });
    setIsModalOpen(true);
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd.title?.trim() || !editingAd.imageUrl?.trim() || !editingAd.destinationUrl?.trim()) {
      toast.warning('Incomplete Form', 'Please provide a Title, Banner Image URL, and Destination URL.');
      return;
    }

    setIsSaving(true);
    try {
      await AdService.saveAd(editingAd, currentUser.id);
      toast.success(
        editingAd.id ? 'Campaign Updated' : 'Campaign Created',
        'Advertisement has been saved securely to Supabase.'
      );
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Failed to save advertisement campaign.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: AdStatus) => {
    try {
      await AdService.updateAdStatus(id, newStatus);
      toast.success('Status Updated', `Campaign status changed to ${newStatus}.`);
      loadData();
    } catch (err: any) {
      toast.error('Status Change Failed', err.message || 'Failed to update campaign status.');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              Monetization &amp; Ads
            </Badge>
            <span className="text-xs text-slate-400">Campaign Management Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 text-emerald-500">
              <Megaphone className="w-5 h-5" />
            </div>
            Advertisement &amp; Monetization Manager
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
          <Button size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Analytics KPI Row */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card padding="sm" className="space-y-1 border border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Total Impressions</span>
              <Eye className="w-4 h-4 text-brand-500" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {analytics.totalImpressions.toLocaleString()}
            </p>
            <span className="text-[10px] text-slate-400 block">
              {analytics.uniqueViewers.toLocaleString()} Unique Viewers
            </span>
          </Card>

          <Card padding="sm" className="space-y-1 border border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Total Clicks</span>
              <MousePointerClick className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {analytics.totalClicks.toLocaleString()}
            </p>
            <span className="text-[10px] text-emerald-500 font-semibold block">
              Verified User Clicks
            </span>
          </Card>

          <Card padding="sm" className="space-y-1 border border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Click-Through Rate (CTR)</span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-extrabold text-amber-500">
              {analytics.ctr}%
            </p>
            <span className="text-[10px] text-slate-400 block">Conversion Performance</span>
          </Card>

          <Card padding="sm" className="space-y-1 border border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Active Campaigns</span>
              <BarChart3 className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {analytics.activeCampaigns}
            </p>
            <span className="text-[10px] text-slate-400 block">
              {analytics.pausedCampaigns} Paused • {analytics.expiredCampaigns} Expired
            </span>
          </Card>
        </div>
      )}

      {/* Campaigns Table */}
      <Card padding="none" className="border border-light-border dark:border-dark-border overflow-hidden">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Ad Campaigns ({ads.length})
          </h2>
          <span className="text-xs text-slate-400">Scheduled Placements &amp; Targets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Campaign Creative</th>
                <th className="py-3 px-4">Placement &amp; Pages</th>
                <th className="py-3 px-4">Duration &amp; Capping</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading campaigns...
                  </td>
                </tr>
              ) : ads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No advertisement campaigns configured yet. Click "Create Campaign" to add your first ad.
                  </td>
                </tr>
              ) : (
                ads.map(ad => (
                  <tr key={ad.id} className="hover:bg-slate-50 dark:hover:bg-dark-cardHover/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {ad.imageUrl && (
                          <img
                            src={ad.imageUrl}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover shrink-0 border border-light-border dark:border-dark-border"
                          />
                        )}
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-xs">
                            {ad.title}
                          </span>
                          <a
                            href={ad.destinationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-brand-500 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-xs"
                          >
                            <span>{ad.destinationUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="purple" size="sm" className="capitalize mb-1">
                        {ad.placement.replace('_', ' ')}
                      </Badge>
                      <span className="text-[10px] text-slate-400 block">
                        Pages: {ad.targetPages.join(', ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      <div>{ad.displayDurationSeconds}s display</div>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        Max {ad.maxImpressionsPerUserPerDay}/day • {ad.minSecondsBetweenDisplays}s cooldown
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={
                          ad.status === 'active'
                            ? 'success'
                            : ad.status === 'paused'
                            ? 'warning'
                            : 'default'
                        }
                        size="sm"
                        className="uppercase"
                      >
                        {ad.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(ad)}
                          title="Edit Campaign"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {ad.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(ad.id, 'paused')}
                            title="Pause Campaign"
                          >
                            <Pause className="w-3.5 h-3.5 text-amber-500" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(ad.id, 'active')}
                            title="Activate Campaign"
                          >
                            <Play className="w-3.5 h-3.5 text-emerald-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(ad.id, 'archived')}
                          title="Archive Campaign"
                        >
                          <Archive className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Campaign Create/Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingAd.id ? 'Edit Advertisement Campaign' : 'Create Advertisement Campaign'}
        >
          <form onSubmit={handleSaveAd} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Campaign Title *
              </label>
              <input
                type="text"
                required
                value={editingAd.title || ''}
                onChange={e => setEditingAd(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Cloud DevOps Certification Masterclass"
                className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description / Pitch
              </label>
              <textarea
                rows={2}
                value={editingAd.description || ''}
                onChange={e => setEditingAd(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief educational value proposition..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Creative Image Banner URL *
                </label>
                <input
                  type="url"
                  required
                  value={editingAd.imageUrl || ''}
                  onChange={e => setEditingAd(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Destination URL *
                </label>
                <input
                  type="url"
                  required
                  value={editingAd.destinationUrl || ''}
                  onChange={e => setEditingAd(prev => ({ ...prev, destinationUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Placement Format
                </label>
                <select
                  value={editingAd.placement || 'dashboard'}
                  onChange={e => setEditingAd(prev => ({ ...prev, placement: e.target.value as AdPlacement }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100"
                >
                  <option value="dashboard">Dashboard Card</option>
                  <option value="banner">In-Page Banner</option>
                  <option value="popup_post_login">Post-Login Modal</option>
                  <option value="sidebar_sponsored">Sidebar Sponsored</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Display Duration (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={editingAd.displayDurationSeconds || 10}
                  onChange={e => setEditingAd(prev => ({ ...prev, displayDurationSeconds: parseInt(e.target.value, 10) || 10 }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Max Impressions Per User / Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={editingAd.maxImpressionsPerUserPerDay || 3}
                  onChange={e => setEditingAd(prev => ({ ...prev, maxImpressionsPerUserPerDay: parseInt(e.target.value, 10) || 3 }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Min Seconds Between Displays
                </label>
                <input
                  type="number"
                  min="30"
                  max="3600"
                  value={editingAd.minSecondsBetweenDisplays || 300}
                  onChange={e => setEditingAd(prev => ({ ...prev, minSecondsBetweenDisplays: parseInt(e.target.value, 10) || 300 }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : editingAd.id ? 'Save Changes' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
