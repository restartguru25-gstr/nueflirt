import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className, size = 'default' }: { className?: string, size?: 'default' | 'large' }) {
  const iconSize = size === 'large' ? 40 : 32;
  const textSize = size === 'large' ? 'text-2xl' : 'text-xl';

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/icons/icon-192x192.png"
        alt="Nue Flirt"
        width={iconSize}
        height={iconSize}
        className="rounded-md shrink-0"
        unoptimized
      />
      <span className={cn(textSize, "font-brand font-semibold tracking-tight text-foreground")}>
        Nue Flirt
      </span>
    </div>
  );
}
