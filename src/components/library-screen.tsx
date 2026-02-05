'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Clock, Search, Filter, Play, Lock, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LibraryPaymentModal } from '@/components/library-payment-modal';
import { LibraryVideoPlayerModal } from '@/components/library-video-player-modal';
import { LIBRARY_CATEGORIES } from '@/lib/library-passes';
import type { LibraryVideo, LibraryTimePass } from '@/types';
import { useToast } from '@/hooks/use-toast';

export interface LibraryScreenProps {
  videos: LibraryVideo[];
  isLoading: boolean;
  canAccessFull: boolean;
  sessionExpiryMs: number | null;
  isPremium: boolean;
  onPurchasePass: (pass: LibraryTimePass) => Promise<void>;
  onRenewClick?: () => void;
  onViewTrack?: (videoId: string) => void;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '0:00';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function LibraryScreen({
  videos,
  isLoading,
  canAccessFull,
  sessionExpiryMs,
  isPremium,
  onPurchasePass,
  onRenewClick,
  onViewTrack,
}: LibraryScreenProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<LibraryVideo | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Countdown timer for session
  useEffect(() => {
    if (sessionExpiryMs == null) {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const left = sessionExpiryMs - Date.now();
      setTimeLeft(left > 0 ? left : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionExpiryMs]);

  const filteredVideos = useMemo(() => {
    let list = videos;
    if (category !== 'all') {
      list = list.filter((v) => v.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.title?.toLowerCase().includes(q) ||
          v.tags?.some((t) => t.toLowerCase().includes(q)) ||
          v.category.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  }, [videos, category, search]);

  const handlePurchase = useCallback(
    async (pass: LibraryTimePass) => {
      await onPurchasePass(pass);
      toast({ title: 'Access unlocked!', description: `You have ${pass.label} of full access.` });
    },
    [onPurchasePass, toast]
  );

  const handleVideoClick = useCallback(
    (video: LibraryVideo) => {
      setPlayingVideo(video);
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground">Loading library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timer bar */}
      {(sessionExpiryMs != null || isPremium) && (
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            {isPremium ? (
              <>
                <Crown className="h-5 w-5 text-amber-500" />
                <span className="font-medium">VIP: Unlimited access</span>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  Time left: {timeLeft != null ? formatTimeLeft(timeLeft) : '--:--'}
                </span>
              </>
            )}
          </div>
          {!isPremium && sessionExpiryMs != null && timeLeft != null && timeLeft > 0 && onRenewClick && (
            <Button size="sm" onClick={onRenewClick}>
              Renew
            </Button>
          )}
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search themes, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {LIBRARY_CATEGORIES.map((c) => (
            <Button
              key={c.id}
              variant={category === c.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(c.id)}
            >
              <Filter className="h-4 w-4 mr-1" />
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredVideos.map((video) => (
          <button
            key={video.id}
            type="button"
            onClick={() => handleVideoClick(video)}
            className="group relative aspect-[3/4] rounded-xl overflow-hidden border bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {(video.thumbnailUrl || video.teaserUrl || video.videoUrl) ? (
              <>
                <img
                  src={video.thumbnailUrl ?? video.teaserUrl ?? video.videoUrl}
                  alt={video.title ?? video.category}
                  className={cn(
                    'absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105',
                    !canAccessFull && !isPremium && 'blur-md'
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="rounded-full bg-black/60 p-3">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                </div>
                {(!canAccessFull && !isPremium) && (
                  <div className="absolute top-2 right-2">
                    <Lock className="h-5 w-5 text-white drop-shadow" />
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Play className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-2 text-left">
              <p className="text-white font-semibold text-sm truncate drop-shadow">
                {video.title ?? video.category}
              </p>
              <p className="text-white/80 text-xs truncate drop-shadow">
                {video.duration}s · {video.category}
              </p>
            </div>
          </button>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No videos found. Try different filters.</p>
        </div>
      )}

      {/* Unlock CTA when no access */}
      {!canAccessFull && !isPremium && videos.length > 0 && (
        <Card className="p-6 text-center">
          <p className="font-medium mb-2">Unlock full video playback</p>
          <p className="text-sm text-muted-foreground mb-4">
            Get a time pass (₹99/30min to ₹499/24hr) to watch all videos.
          </p>
          <Button onClick={() => setPaymentModalOpen(true)}>
            <Lock className="mr-2 h-4 w-4" />
            Unlock Access
          </Button>
        </Card>
      )}

      <LibraryPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        onPurchase={handlePurchase}
      />

      <LibraryVideoPlayerModal
        video={playingVideo}
        open={!!playingVideo}
        onOpenChange={(open) => !open && setPlayingVideo(null)}
        canPlayFull={canAccessFull || !!isPremium}
        onViewTrack={onViewTrack}
      />
    </div>
  );
}
