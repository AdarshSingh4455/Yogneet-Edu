import React, { useState, useEffect, useRef } from 'react';
import { AdService } from '../../services/adService';
import { Advertisement } from '../../types';
import { ExternalLink, X, Clock, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';

export const PostLoginAdModal: React.FC = () => {
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);
  const [canClose, setCanClose] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Only check once per session load
    const checkPostLoginAd = async () => {
      // Guard: do not show on assessment paths
      if (window.location.pathname.startsWith('/assessment')) return;

      const ads = await AdService.getActiveAdsForPlacement('popup_post_login', window.location.pathname);
      if (ads.length === 0) return;

      const targetAd = ads[0];

      // Frequency capping check via localStorage
      const now = Date.now();
      const lastShown = parseInt(localStorage.getItem(`yogneet_ad_last_${targetAd.id}`) || '0', 10);
      const minIntervalMs = (targetAd.minSecondsBetweenDisplays || 300) * 1000;

      if (now - lastShown < minIntervalMs) {
        return; // Too soon
      }

      const todayKey = `yogneet_ad_day_${targetAd.id}_${new Date().toISOString().slice(0, 10)}`;
      const dailyCount = parseInt(localStorage.getItem(todayKey) || '0', 10);
      if (dailyCount >= (targetAd.maxImpressionsPerUserPerDay || 3)) {
        return; // Daily cap reached
      }

      // Safe to show
      setAd(targetAd);
      setCountdown(Math.min(targetAd.displayDurationSeconds, 15));
      setIsOpen(true);

      localStorage.setItem(`yogneet_ad_last_${targetAd.id}`, String(now));
      localStorage.setItem(todayKey, String(dailyCount + 1));
      AdService.recordImpression(targetAd.id, window.location.pathname);
    };

    const timer = setTimeout(checkPostLoginAd, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !ad) return;

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanClose(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, ad]);

  if (!isOpen || !ad) return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleClick = () => {
    AdService.recordClick(ad.id, window.location.pathname);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Banner image creative */}
        {ad.imageUrl && (
          <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-900">
            <img
              src={ad.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md border border-white/20">
              Featured Opportunity
            </div>
          </div>
        )}

        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                Sponsored Partner
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {ad.title}
            </h3>
            {ad.description && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {ad.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-light-border dark:border-dark-border">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              {!canClose ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
                  <span>Close unlocks in {countdown}s</span>
                </>
              ) : (
                <span className="text-slate-500">You may close this notice</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={!canClose}
              >
                Skip / Close
              </Button>
              <a
                href={ad.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  handleClick();
                  handleClose();
                }}
              >
                <Button size="sm" className="bg-brand-500 hover:bg-brand-600 text-white" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Explore
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
