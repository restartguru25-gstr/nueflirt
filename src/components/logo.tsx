import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className, size = 'default' }: { className?: string, size?: 'default' | 'large' }) {
  const iconSize = size === 'large' ? 40 : 32;
  const textSize = size === 'large' ? 'text-3xl' : 'text-2xl';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/icons/icon-192x192.png"
        alt="Nue Flirt"
        width={iconSize}
        height={iconSize}
        className="rounded-md"
        unoptimized
      />
      <span className={cn(textSize, "font-headline font-semibold text-primary")}>
        Nue Flirt
      </span>
    </div>
  );
}
