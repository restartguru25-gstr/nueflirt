import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, size = 'default' }: { className?: string, size?: 'default' | 'large' }) {
  const sizeClasses = size === 'large' ? 'h-10 w-10' : 'h-8 w-8';
  const textSize = size === 'large' ? 'text-3xl' : 'text-2xl';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Sparkles className={cn(sizeClasses, "text-primary")} />
      <span className={cn(textSize, "font-headline font-semibold text-primary")}>
        Nue Flirt
      </span>
    </div>
  );
}
