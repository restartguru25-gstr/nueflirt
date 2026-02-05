'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { LIBRARY_TIME_PASSES } from '@/lib/library-passes';
import type { LibraryTimePass } from '@/types';

export interface LibraryPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchase: (pass: LibraryTimePass) => Promise<void>;
  isLoading?: boolean;
}

export function LibraryPaymentModal({
  open,
  onOpenChange,
  onPurchase,
  isLoading = false,
}: LibraryPaymentModalProps) {
  const [selectedPass, setSelectedPass] = useState<LibraryTimePass | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (!selectedPass) return;
    setPurchasing(true);
    try {
      await onPurchase(selectedPass);
      onOpenChange(false);
    } catch (e) {
      // Caller may throw; keep modal open
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unlock Library Access</DialogTitle>
          <DialogDescription>
            Choose a time pass to unlock full video playback. Pay via UPI (Razorpay).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-3">
            {LIBRARY_TIME_PASSES.map((pass) => (
              <button
                key={pass.id}
                type="button"
                onClick={() => setSelectedPass(pass)}
                className={`flex items-center justify-between rounded-lg border-2 p-4 text-left transition-colors ${
                  selectedPass?.id === pass.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <div>
                  <p className="font-semibold">{pass.label}</p>
                  <p className="text-sm text-muted-foreground">
                    Full access to all videos
                  </p>
                </div>
                <p className="text-xl font-bold text-primary">₹{pass.priceInr}</p>
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={!selectedPass || purchasing || isLoading}
          >
            {purchasing || isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Pay ₹{selectedPass?.priceInr ?? 0}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
