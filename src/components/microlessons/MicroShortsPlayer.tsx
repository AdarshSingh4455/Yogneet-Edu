import React, { useState, useEffect, useRef } from 'react';
import { MicroLesson, MicroSubject } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Bookmark,
  Share2,
  ExternalLink,
  Layers,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  Play,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { toOfficialYouTubeEmbedUrl } from '../../services/microLessonsService';

interface MicroShortsPlayerProps {
  subject: MicroSubject;
  lessons: MicroLesson[];
  initialIndex?: number;
  onBackToSubjects: () => void;
}

export const MicroShortsPlayer: React.FC<MicroShortsPlayerProps> = ({
  subject,
  lessons,
  initialIndex = 0,
  onBackToSubjects,
}) => {
  const toast = useToast();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasEmbedError, setHasEmbedError] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<
    'loading' | 'unstarted' | 'buffering' | 'playing' | 'paused' | 'ended' | 'interaction_required' | 'embedding_disabled' | 'video_unavailable'
  >('loading');

  // Swipe gesture tracking
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);

  const currentLesson: MicroLesson | undefined = lessons[currentIndex];
  const totalLessons = lessons.length;

  // Reset error & player state on slide change
  useEffect(() => {
    setHasEmbedError(false);
    setIsIframeLoaded(false);
    setPlayerStatus('loading');
    if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
      try {
        ytPlayerRef.current.destroy();
      } catch {}
      ytPlayerRef.current = null;
    }
  }, [currentIndex]);

  // Load YouTube IFrame API script & bind player instance
  useEffect(() => {
    const bindPlayer = () => {
      if ((window as any).YT && (window as any).YT.Player && iframeRef.current && !ytPlayerRef.current) {
        try {
          ytPlayerRef.current = new (window as any).YT.Player(iframeRef.current, {
            events: {
              onReady: () => {
                setIsIframeLoaded(true);
                setPlayerStatus(prev => (prev === 'loading' ? 'unstarted' : prev));
              },
              onStateChange: (event: any) => {
                const state = event.data;
                if (state === 1) setPlayerStatus('playing');
                else if (state === 2) setPlayerStatus('paused');
                else if (state === 3) setPlayerStatus('buffering');
                else if (state === 0) setPlayerStatus('ended');
                else if (state === -1) setPlayerStatus('unstarted');
              },
              onError: (event: any) => {
                const code = event.data;
                if (code === 101 || code === 150) {
                  setPlayerStatus('embedding_disabled');
                  setHasEmbedError(true);
                } else {
                  setPlayerStatus('video_unavailable');
                  setHasEmbedError(true);
                }
              },
            },
          });
        } catch {}
      }
    };

    if (typeof window !== 'undefined') {
      if ((window as any).YT && (window as any).YT.Player) {
        bindPlayer();
      } else {
        const oldReady = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
          if (typeof oldReady === 'function') oldReady();
          bindPlayer();
        };
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }
      }
    }
  }, [currentIndex]);

  // PostMessage event listener for YouTube Iframe player state & error events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let msg = event.data;
        if (typeof msg === 'string') {
          try {
            msg = JSON.parse(msg);
          } catch {
            return;
          }
        }
        if (!msg) return;

        // Player ready event
        if (msg.event === 'onReady' || msg.event === 'initialDelivery') {
          setIsIframeLoaded(true);
          setPlayerStatus(prev => (prev === 'loading' ? 'unstarted' : prev));
        }

        // Player state events
        if (msg.event === 'onStateChange' || (msg.info && typeof msg.info.playerState !== 'undefined')) {
          const state = msg.info?.playerState ?? msg.data ?? msg.info;
          if (state === 1) {
            setPlayerStatus('playing');
          } else if (state === 2) {
            setPlayerStatus('paused');
          } else if (state === 3) {
            setPlayerStatus('buffering');
          } else if (state === 0) {
            setPlayerStatus('ended');
          } else if (state === -1) {
            setPlayerStatus('unstarted');
          }
        }

        // Error detection events
        if (msg.event === 'onError' || (msg.info && typeof msg.info.errorCode !== 'undefined')) {
          const code = msg.info?.errorCode ?? msg.data ?? msg.info;
          if (code === 101 || code === 150) {
            setPlayerStatus('embedding_disabled');
            setHasEmbedError(true);
          } else if (code === 100 || code === 2) {
            setPlayerStatus('video_unavailable');
            setHasEmbedError(true);
          }
        }
      } catch {
        // Non-JSON message from external window
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentIndex]);

  // Autoplay policy detection: if still unstarted or loading after 2.5s, flag interaction required
  useEffect(() => {
    const timer = setTimeout(() => {
      setPlayerStatus(prev => {
        if (prev === 'loading' || prev === 'unstarted') {
          return 'interaction_required';
        }
        return prev;
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const handlePlayClick = () => {
    setPlayerStatus('buffering');
    if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
      try {
        ytPlayerRef.current.playVideo();
      } catch {}
    }
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
    }
  };

  const goToNext = () => {
    if (currentIndex < totalLessons - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsDescExpanded(false);
    } else {
      toast.info('End of Shorts', `You have reached the last micro lesson in "${subject.name}".`);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsDescExpanded(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalLessons]);

  // Touch Swipe Handlers for vertical snap navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!touchStartY.current || !touchEndY.current) return;
    const distance = touchStartY.current - touchEndY.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      goToNext();
    } else if (distance < -minSwipeDistance) {
      goToPrev();
    }

    touchStartY.current = null;
    touchEndY.current = null;
  };

  const handleToggleBookmark = (id: string) => {
    setBookmarkedMap(prev => {
      const nextState = !prev[id];
      if (nextState) {
        toast.success('Saved to Library', 'Added to your bookmarked platform micro lessons.');
      }
      return { ...prev, [id]: nextState };
    });
  };

  const handleShare = () => {
    if (currentLesson) {
      navigator.clipboard.writeText(currentLesson.youtubeShortsUrl);
      toast.success('Link Copied', 'Original YouTube Shorts link copied to clipboard.');
    }
  };

  if (totalLessons === 0 || !currentLesson) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-slate-500">No micro lessons published in this topic yet.</p>
        <Button variant="secondary" onClick={onBackToSubjects}>
          Back to Micro Topics
        </Button>
      </div>
    );
  }

  const isBookmarked = !!bookmarkedMap[currentLesson.id];
  const embedUrl = toOfficialYouTubeEmbedUrl(currentLesson.youtubeId);

  return (
    <div className="space-y-4">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-light-border dark:border-dark-border">
        <button
          type="button"
          onClick={onBackToSubjects}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Micro Topics</span>
        </button>

        <div className="flex items-center gap-2">
          <Badge variant="purple" size="sm">
            {subject.name}
          </Badge>
          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
            {currentIndex + 1} / {totalLessons}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden"
            leftIcon={<Layers className="w-3.5 h-3.5" />}
          >
            Playlist
          </Button>
        </div>
      </div>

      {/* Main Experience Layout: Centered 9:16 Vertical Player on Desktop */}
      <div className="flex justify-center items-start gap-6 relative">
        {/* CENTER: True Vertical 9:16 Player Container */}
        <div
          ref={containerRef}
          data-player-status={playerStatus}
          data-player-loaded={isIframeLoaded}
          data-playback-active={playerStatus === 'playing'}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-full max-w-[400px] aspect-[9/16] max-h-[82vh] bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-800 dark:border-blue-900/40 flex flex-col justify-between select-none"
        >
          {/* Official YouTube Embed in 9:16 */}
          {!hasEmbedError ? (
            <>
              <iframe
                ref={iframeRef}
                key={currentLesson.id}
                src={embedUrl}
                title={currentLesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-auto"
                onLoad={() => {
                  setIsIframeLoaded(true);
                  if (iframeRef.current && iframeRef.current.contentWindow) {
                    iframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ event: 'listening' }),
                      '*'
                    );
                  }
                  if ((window as any).YT && (window as any).YT.Player && iframeRef.current) {
                    try {
                      ytPlayerRef.current = new (window as any).YT.Player(iframeRef.current, {
                        events: {
                          onReady: () => {
                            setIsIframeLoaded(true);
                            setPlayerStatus(prev => (prev === 'loading' ? 'unstarted' : prev));
                          },
                          onStateChange: (event: any) => {
                            const state = event.data;
                            if (state === 1) setPlayerStatus('playing');
                            else if (state === 2) setPlayerStatus('paused');
                            else if (state === 3) setPlayerStatus('buffering');
                            else if (state === 0) setPlayerStatus('ended');
                            else if (state === -1) setPlayerStatus('unstarted');
                          },
                          onError: (event: any) => {
                            const code = event.data;
                            if (code === 101 || code === 150) {
                              setPlayerStatus('embedding_disabled');
                              setHasEmbedError(true);
                            } else {
                              setPlayerStatus('video_unavailable');
                              setHasEmbedError(true);
                            }
                          },
                        },
                      });
                    } catch {}
                  } else {
                    setPlayerStatus(prev => (prev === 'loading' ? 'unstarted' : prev));
                  }
                }}
                onError={() => {
                  setHasEmbedError(true);
                  setPlayerStatus('embedding_disabled');
                }}
              />

              {/* User Interaction Required Overlay (when autoplay is restricted by browser) */}
              {playerStatus === 'interaction_required' && (
                <button
                  type="button"
                  onClick={handlePlayClick}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] text-white hover:bg-black/30 transition-all cursor-pointer pointer-events-auto"
                  title="Tap to Play Shorts Video"
                  aria-label="Tap to Play Video"
                >
                  <div className="w-16 h-16 rounded-full bg-red-600/95 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
                    <Play className="w-8 h-8 ml-1 fill-white text-white" />
                  </div>
                  <span className="text-xs font-bold mt-2 drop-shadow-md">Tap to Play Shorts</span>
                </button>
              )}
            </>
          ) : (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white space-y-4">
              <AlertCircle className="w-12 h-12 text-amber-400" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm">
                  {playerStatus === 'video_unavailable' ? 'Video Unavailable on YouTube' : 'Embedding Restricted by Creator'}
                </h4>
                <p className="text-xs text-slate-400">
                  {playerStatus === 'video_unavailable'
                    ? 'This YouTube video is private, restricted, or has been removed.'
                    : 'This creator has disabled third-party embedding. Watch directly on YouTube to support the creator.'}
                </p>
              </div>
              <a
                href={currentLesson.youtubeShortsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Watch Directly on YouTube</span>
              </a>
            </div>
          )}

          {/* Top overlay banner */}
          <div className="relative z-10 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
            <span className="text-[11px] font-bold text-white tracking-wide uppercase px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20">
              Shorts • 9:16 Vertical
            </span>
            <span className="text-[11px] font-mono font-bold text-cyan-300 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-cyan-500/30">
              {currentIndex + 1} of {totalLessons}
            </span>
          </div>

          {/* Right Action Rail (Shorts Floating UI) */}
          <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-3 pointer-events-auto">
            {/* Bookmark Action */}
            <button
              type="button"
              onClick={() => handleToggleBookmark(currentLesson.id)}
              className={`w-11 h-11 rounded-full flex flex-col items-center justify-center transition-all backdrop-blur-md border ${
                isBookmarked
                  ? 'bg-brand-500 border-brand-400 text-white shadow-lg shadow-brand-500/30'
                  : 'bg-black/60 border-white/20 text-white hover:bg-black/80'
              }`}
              title="Save to Library"
              aria-label="Bookmark Short"
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <span className="text-[10px] font-bold text-white drop-shadow-md">Save</span>

            {/* Share Original YouTube URL */}
            <button
              type="button"
              onClick={handleShare}
              className="w-11 h-11 rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/80 flex flex-col items-center justify-center transition-all backdrop-blur-md"
              title="Copy YouTube Link"
              aria-label="Share Link"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <span className="text-[10px] font-bold text-white drop-shadow-md">Share</span>

            {/* Watch on YouTube Button */}
            <a
              href={currentLesson.youtubeShortsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full bg-red-600/90 border border-red-400 text-white hover:bg-red-700 flex flex-col items-center justify-center transition-all backdrop-blur-md shadow-lg shadow-red-600/30"
              title="Open on YouTube to Like & Comment"
              aria-label="Open on YouTube"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <span className="text-[10px] font-bold text-white drop-shadow-md">YouTube</span>
          </div>

          {/* Bottom Title, Metadata & Description Overlay */}
          <div className="relative z-10 p-4 bg-gradient-to-t from-black/95 via-black/75 to-transparent text-white space-y-2 pointer-events-auto mt-auto pr-16">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-300">@{currentLesson.authorName}</span>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span className="text-[10px] text-white/70">{currentLesson.duration || '0:50'}</span>
            </div>

            <h3 className="text-sm font-bold leading-snug drop-shadow-sm text-white">
              {currentLesson.title}
            </h3>

            {/* Description toggle */}
            <div>
              <p
                className={`text-xs text-slate-300 leading-relaxed transition-all ${
                  isDescExpanded ? 'line-clamp-none' : 'line-clamp-2'
                }`}
              >
                {currentLesson.description}
              </p>
              {currentLesson.description && currentLesson.description.length > 70 && (
                <button
                  type="button"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 mt-0.5"
                >
                  {isDescExpanded ? 'Show Less' : '...more'}
                </button>
              )}
            </div>

            {/* Creator Engagement Notice */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-300">
              <a
                href={currentLesson.youtubeShortsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-rose-300 hover:text-rose-200 transition-colors font-semibold"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Like on YouTube</span>
              </a>
              <a
                href={currentLesson.youtubeShortsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 transition-colors font-semibold"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comment</span>
              </a>
            </div>

            {/* Segment Progress Bar */}
            <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / totalLessons) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Vertical Next/Prev Nav Buttons & Desktop Playlist */}
        <div className="hidden lg:flex flex-col gap-4 w-80">
          {/* Quick Jump Buttons */}
          <div className="p-4 rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Navigation Controls
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="flex-1"
                leftIcon={<ChevronUp className="w-4 h-4" />}
              >
                Previous
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={goToNext}
                disabled={currentIndex === totalLessons - 1}
                className="flex-1"
                rightIcon={<ChevronDown className="w-4 h-4" />}
              >
                Next Short
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              💡 Tip: Use <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-dark-bg font-mono text-[10px]">↑</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-dark-bg font-mono text-[10px]">↓</kbd> arrow keys or swipe up/down on touch screens.
            </p>
          </div>

          {/* Playlist list */}
          <div className="p-4 rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card space-y-3 max-h-[55vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-light-border dark:border-dark-border">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Shorts in this Topic ({totalLessons})
              </span>
            </div>

            <div className="space-y-2">
              {lessons.map((lesson, idx) => {
                const isSelected = idx === currentIndex;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsDescExpanded(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/80 dark:bg-blue-950/50 dark:border-cyan-500/60 shadow-xs'
                        : 'border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                        isSelected
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-200 dark:bg-dark-card text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-semibold line-clamp-1 ${
                          isSelected ? 'text-brand-900 dark:text-cyan-300' : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {lesson.title}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {lesson.authorName} • {lesson.duration || '0:50'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
