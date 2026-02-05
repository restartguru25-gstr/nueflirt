/** Time pass options for AI Undressed Video Library access. */
import type { LibraryTimePass } from '@/types';

export const LIBRARY_TIME_PASSES: LibraryTimePass[] = [
  { id: '30min', label: '30 mins', durationMinutes: 30, priceInr: 99 },
  { id: '1hr', label: '1 hour', durationMinutes: 60, priceInr: 199 },
  { id: '24hr', label: '24 hours', durationMinutes: 24 * 60, priceInr: 499 },
];

export const LIBRARY_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'indian_traditional', label: 'Indian Traditional' },
  { id: 'modern_fantasy', label: 'Modern Fantasy' },
  { id: 'contemporary', label: 'Contemporary' },
  { id: 'classic', label: 'Classic' },
] as const;
