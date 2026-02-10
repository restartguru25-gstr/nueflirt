'use client';

import { motion } from 'framer-motion';
import { Film, Heart, MessageCircle, Shield, Video, Zap, Users, Languages } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FeatureTileItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const tileVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

export function FeatureTile({
  feature,
  index = 0,
  compact = false,
}: {
  feature: FeatureTileItem;
  index?: number;
  compact?: boolean;
}) {
  const Icon = feature.icon;
  return (
    <motion.div
      variants={tileVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-24px' }}
      custom={index}
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
      className="group rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 shadow-soft hover:shadow-glow-primary hover:border-primary/30 transition-shadow duration-300"
    >
      <div className="flex gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-200">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground">{feature.title}</h3>
          <p className={compact ? 'text-xs text-muted-foreground mt-0.5' : 'text-sm text-muted-foreground mt-1.5 leading-relaxed'}>
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function FeatureTilesGrid({
  features,
  compact = false,
  columns = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
}: {
  features: FeatureTileItem[];
  compact?: boolean;
  columns?: string;
}) {
  return (
    <div className={`grid ${columns} gap-4`}>
      {features.map((f, i) => (
        <FeatureTile key={f.title} feature={f} index={i} compact={compact} />
      ))}
    </div>
  );
}

export const DETAILED_FEATURES: FeatureTileItem[] = [
  {
    icon: Video,
    title: 'AI profile videos & reveals',
    description: 'Create standout profile videos with AI. Unlock playful interactive reveals for your matches.',
  },
  {
    icon: Heart,
    title: 'Swipe, match & Super Like',
    description: 'Discover people with smart filters—language, region, zodiac. Super Like to stand out.',
  },
  {
    icon: MessageCircle,
    title: 'Chat, voice & video calls',
    description: 'Real-time chat with photos, GIFs and voice notes. Voice and video calls when you’re ready.',
  },
  {
    icon: Shield,
    title: 'Legacy mode & safety',
    description: 'Discreet Legacy Mode for privacy. Safety Center, block and report when you need it.',
  },
  {
    icon: Languages,
    title: 'हिन्दी, తెలుగు, தமிழ் & more',
    description: 'Use the app in English, Hindi, Telugu, Tamil and more. Built for India.',
  },
  {
    icon: Zap,
    title: 'Vibes, events & virtual dates',
    description: 'Fluid Vibes Zone, in-app events and virtual dates. Offline mode and PWA install.',
  },
  {
    icon: Users,
    title: 'Virtual dates & events',
    description: 'Join virtual mixers, zodiac nights and community events without leaving the app.',
  },
  {
    icon: Film,
    title: 'Interactive reveals',
    description: 'Break the ice with consensual video reveals. A fun way to connect with matches.',
  },
];
