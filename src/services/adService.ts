/**
 * Advertisement & Monetization Management Service for Yogneet Edu.
 *
 * Implements:
 *   1. Campaign scheduling, placements, and frequency capping.
 *   2. Reliable impression and anti-fraud click tracking.
 *   3. Real-time monetization analytics (Impressions, Clicks, CTR, Performance).
 *   4. Safe fallback in offline mode.
 */

import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { Advertisement, AdAnalyticsSummary, AdStatus, AdPlacement } from '../types';

let mockAds: Advertisement[] = [
  {
    id: 'ad_cloud_bootcamp',
    title: 'Cloud Architecture & DevOps Fellowship',
    description: 'Master Kubernetes, Terraform, and AWS CI/CD pipelines with industry engineers.',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
    destinationUrl: 'https://yogneet-edu.vercel.app/notes',
    placement: 'banner',
    targetPages: ['all', 'dashboard', 'notes'],
    startDate: new Date(Date.now() - 86400000 * 7).toISOString(),
    displayDurationSeconds: 12,
    status: 'active',
    maxImpressionsPerUserPerDay: 5,
    minSecondsBetweenDisplays: 180,
    priority: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ad_faang_interview',
    title: 'FAANG DSA Mastery & Mock Interviews',
    description: '1-on-1 system design reviews and algorithmic interview preparation.',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800',
    destinationUrl: 'https://yogneet-edu.vercel.app/coding',
    placement: 'popup_post_login',
    targetPages: ['all'],
    startDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    displayDurationSeconds: 8,
    status: 'active',
    maxImpressionsPerUserPerDay: 2,
    minSecondsBetweenDisplays: 300,
    priority: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const AdService = {
  /**
   * Retrieves active, scheduled advertisements matching placement and page.
   */
  async getActiveAdsForPlacement(placement: AdPlacement, pageUrl: string = 'dashboard'): Promise<Advertisement[]> {
    if (!isSupabaseConfigured() || !supabase) {
      const now = new Date();
      return mockAds.filter(
        ad =>
          ad.status === 'active' &&
          ad.placement === placement &&
          (ad.targetPages.includes('all') || ad.targetPages.some(p => pageUrl.includes(p))) &&
          new Date(ad.startDate) <= now &&
          (!ad.endDate || new Date(ad.endDate) > now)
      );
    }

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('advertisements' as any)
        .select('*')
        .eq('status', 'active')
        .eq('placement', placement)
        .lte('start_date', now)
        .order('priority', { ascending: false });

      if (error || !data) {
        return [];
      }

      const activeList = (data as any[]).filter(ad => {
        if (ad.end_date && new Date(ad.end_date) <= new Date()) return false;
        if (ad.target_pages && !ad.target_pages.includes('all') && !ad.target_pages.some((p: string) => pageUrl.includes(p))) {
          return false;
        }
        return true;
      });

      return activeList.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description || '',
        imageUrl: row.image_url,
        destinationUrl: row.destination_url,
        placement: row.placement,
        targetPages: row.target_pages || ['all'],
        startDate: row.start_date,
        endDate: row.end_date,
        displayDurationSeconds: Number(row.display_duration_seconds) || 10,
        status: row.status,
        maxImpressionsPerUserPerDay: Number(row.max_impressions_per_user_per_day) || 3,
        minSecondsBetweenDisplays: Number(row.min_seconds_between_displays) || 300,
        priority: Number(row.priority) || 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
      }));
    } catch (err) {
      console.warn('[AdService] Failed to load ads for placement:', err);
      return [];
    }
  },

  /**
   * Records an impression event.
   */
  async recordImpression(adId: string, pageUrl: string = window.location.pathname): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await (supabase as any).rpc('record_ad_event', {
        p_ad_id: adId,
        p_event_type: 'impression',
        p_page_url: pageUrl,
      });
    } catch {
      // non-blocking telemetry
    }
  },

  /**
   * Records a click event with anti-spam deduplication.
   */
  async recordClick(adId: string, pageUrl: string = window.location.pathname): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await (supabase as any).rpc('record_ad_event', {
        p_ad_id: adId,
        p_event_type: 'click',
        p_page_url: pageUrl,
      });
    } catch {
      // non-blocking
    }
  },

  /**
   * Admin / Manager: Retrieves all advertisements across statuses.
   */
  async getAllAds(): Promise<Advertisement[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [...mockAds];
    }

    try {
      const { data, error } = await supabase
        .from('advertisements' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return [...mockAds];
      }

      return (data as any[]).map(row => ({
        id: row.id,
        title: row.title,
        description: row.description || '',
        imageUrl: row.image_url,
        destinationUrl: row.destination_url,
        placement: row.placement,
        targetPages: row.target_pages || ['all'],
        startDate: row.start_date,
        endDate: row.end_date,
        displayDurationSeconds: Number(row.display_duration_seconds) || 10,
        status: row.status,
        maxImpressionsPerUserPerDay: Number(row.max_impressions_per_user_per_day) || 3,
        minSecondsBetweenDisplays: Number(row.min_seconds_between_displays) || 300,
        priority: Number(row.priority) || 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
      }));
    } catch {
      return [...mockAds];
    }
  },

  /**
   * Admin / Manager: Creates or updates an advertisement.
   */
  async saveAd(ad: Partial<Advertisement>, adminId: string): Promise<Advertisement> {
    const payload: any = {
      title: ad.title?.trim(),
      description: ad.description?.trim() || '',
      image_url: ad.imageUrl?.trim(),
      destination_url: ad.destinationUrl?.trim(),
      placement: ad.placement || 'dashboard',
      target_pages: ad.targetPages || ['all'],
      start_date: ad.startDate || new Date().toISOString(),
      end_date: ad.endDate || null,
      display_duration_seconds: ad.displayDurationSeconds || 10,
      status: ad.status || 'active',
      max_impressions_per_user_per_day: ad.maxImpressionsPerUserPerDay || 3,
      min_seconds_between_displays: ad.minSecondsBetweenDisplays || 300,
      priority: ad.priority || 1,
      updated_at: new Date().toISOString(),
    };

    if (!ad.id) {
      payload.created_by = adminId;
      payload.created_at = new Date().toISOString();
    }

    if (!isSupabaseConfigured() || !supabase) {
      if (ad.id) {
        mockAds = mockAds.map(a => (a.id === ad.id ? { ...a, ...payload } : a));
        return mockAds.find(a => a.id === ad.id)!;
      } else {
        const newAd: Advertisement = {
          id: `ad_${Date.now()}`,
          ...payload,
        };
        mockAds.unshift(newAd);
        return newAd;
      }
    }

    try {
      if (ad.id) {
        const { data, error } = await (supabase as any)
          .from('advertisements')
          .update(payload)
          .eq('id', ad.id)
          .select()
          .single();

        if (error) throw new Error(formatSupabaseError(error));
        return {
          id: data.id,
          title: data.title,
          description: data.description,
          imageUrl: data.image_url,
          destinationUrl: data.destination_url,
          placement: data.placement,
          targetPages: data.target_pages,
          startDate: data.start_date,
          endDate: data.end_date,
          displayDurationSeconds: data.display_duration_seconds,
          status: data.status,
          maxImpressionsPerUserPerDay: data.max_impressions_per_user_per_day,
          minSecondsBetweenDisplays: data.min_seconds_between_displays,
          priority: data.priority,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          createdBy: data.created_by,
        };
      } else {
        const { data, error } = await (supabase as any)
          .from('advertisements')
          .insert(payload)
          .select()
          .single();

        if (error) throw new Error(formatSupabaseError(error));
        return {
          id: data.id,
          title: data.title,
          description: data.description,
          imageUrl: data.image_url,
          destinationUrl: data.destination_url,
          placement: data.placement,
          targetPages: data.target_pages,
          startDate: data.start_date,
          endDate: data.end_date,
          displayDurationSeconds: data.display_duration_seconds,
          status: data.status,
          maxImpressionsPerUserPerDay: data.max_impressions_per_user_per_day,
          minSecondsBetweenDisplays: data.min_seconds_between_displays,
          priority: data.priority,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          createdBy: data.created_by,
        };
      }
    } catch (err: any) {
      console.error('[AdService] Failed to save ad:', err);
      throw err;
    }
  },

  /**
   * Admin / Manager: Pauses, activates, or archives an ad.
   */
  async updateAdStatus(id: string, status: AdStatus): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      mockAds = mockAds.map(a => (a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a));
      return;
    }

    const { error } = await (supabase as any)
      .from('advertisements')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(formatSupabaseError(error));
  },

  /**
   * Admin / Manager: Retrieves analytics summary.
   */
  async getAnalyticsSummary(): Promise<AdAnalyticsSummary> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        totalImpressions: 1240,
        uniqueViewers: 320,
        totalClicks: 88,
        ctr: 7.1,
        activeCampaigns: 2,
        pausedCampaigns: 0,
        expiredCampaigns: 0,
        campaigns: [
          {
            id: 'ad_cloud_bootcamp',
            title: 'Cloud Architecture & DevOps Fellowship',
            placement: 'banner',
            status: 'active',
            startDate: new Date(Date.now() - 86400000 * 7).toISOString(),
            impressions: 820,
            clicks: 64,
            ctr: 7.8,
          },
          {
            id: 'ad_faang_interview',
            title: 'FAANG DSA Mastery & Mock Interviews',
            placement: 'popup_post_login',
            status: 'active',
            startDate: new Date(Date.now() - 86400000 * 3).toISOString(),
            impressions: 420,
            clicks: 24,
            ctr: 5.71,
          },
        ],
        pageWise: [
          { page: '/dashboard', impressions: 710, clicks: 52 },
          { page: '/notes', impressions: 320, clicks: 22 },
          { page: '/coding', impressions: 210, clicks: 14 },
        ],
      };
    }

    try {
      const { data, error } = await (supabase as any).rpc('get_ad_analytics_summary');
      if (error) throw new Error(formatSupabaseError(error));

      const res = data as any;
      return {
        totalImpressions: Number(res.total_impressions) || 0,
        uniqueViewers: Number(res.unique_viewers) || 0,
        totalClicks: Number(res.total_clicks) || 0,
        ctr: Number(res.ctr) || 0.0,
        activeCampaigns: Number(res.active_campaigns) || 0,
        pausedCampaigns: Number(res.paused_campaigns) || 0,
        expiredCampaigns: Number(res.expired_campaigns) || 0,
        campaigns: res.campaigns || [],
        pageWise: res.page_wise || [],
      };
    } catch (err: any) {
      console.error('[AdService] Failed to load ad analytics:', err);
      throw err;
    }
  },
};
