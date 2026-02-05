'use client';

import { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LibraryVideo } from '@/types';

export interface LibraryVideoPlayerModalProps {
  video: LibraryVideo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canPlayFull: boolean;
  onViewTrack?: (videoId: string) => void;
}

export function LibraryVideoPlayerModal({
  video,
  open,
  onOpenChange,
  canPlayFull,
  onViewTrack,
}: LibraryVideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause();
    }
  }, [open]);

  useEffect(() => {
    if (video && open && onViewTrack) {
      onViewTrack(video.id);
    }
  }, [video?.id, open, onViewTrack]);

  if (!video) return null;

  const src = canPlayFull ? video.videoUrl : video.teaserUrl ?? video.videoUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-screen h-screen p-0 overflow-hidden bg-black border-0">
        <div className="relative w-full h-full flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </Button>
          <video
            ref={videoRef}
            key={src}
            className="max-h-full max-w-full object-contain"
            src={src}
            controls
            autoPlay
            loop
            playsInline
          />
          {!canPlayFull && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
              <p className="text-white font-semibold text-lg">
                Unlock to watch full video
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
