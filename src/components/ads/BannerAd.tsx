import React, { useState, useEffect, useRef } from 'react';
import { AdService } from '../../services/adService';
import { Advertisement } from '../../types';
import { ExternalLink, X, Sparkles } from 'lucide-react';

interface BannerAdProps {
  pageUrl?: string;
  className?: string;
}

export const BannerAd: React.FC<BannerAdProps> = ({ pageUrl = window.location.pathname, className = '' }) => {
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const recordedRef = useRef<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    AdService.getActiveAdsForPlacement('banner', pageUrl).then(ads => {
      if (isMounted && ads.length > 0) {
        setAd(ads[0]);
        if (!recordedRef.current) {
          recordedRef.current = true;
          AdService.recordImpression(ads[0].id, pageUrl);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [pageUrl]);

  if (!ad || isDismissed) return null;

  const handleClick = () => {
    AdService.recordClick(ad.id, pageUrl);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-light-border dark:border-dark-border bg-gradient-to-r from-slate-50 via-white to-blue-50/20 dark:from-dark-card dark:via-dark-cardHover/60 dark:to-blue-950/20 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          {ad.imageUrl && (
            <img
              src={ad.imageUrl}
              alt=""
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-light-border dark:border-dark-border shadow-sm"
            />
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Sponsored
              </span>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {ad.title}
              </h4>
            </div>
            {ad.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                {ad.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <a
            href={ad.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-colors"
          >
            <span>Learn More</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Dismiss advertisement"
            aria-label="Dismiss advertisement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
