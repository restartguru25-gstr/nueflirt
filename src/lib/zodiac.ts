/**
 * Zodiac compatibility for India-focused dating (horoscope / rashi popular in India).
 * Simple element-based compatibility: Fire–Air, Earth–Water are often considered compatible.
 */

import { zodiacSigns } from './profile-options';

export const ZODIAC_ELEMENTS: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire',
  Taurus: 'earth',
  Gemini: 'air',
  Cancer: 'water',
  Leo: 'fire',
  Virgo: 'earth',
  Libra: 'air',
  Scorpio: 'water',
  Sagittarius: 'fire',
  Capricorn: 'earth',
  Aquarius: 'air',
  Pisces: 'water',
};

/** Element pairs that are traditionally compatible (same or complementary). */
const COMPATIBLE_ELEMENTS: Record<string, string[]> = {
  fire: ['fire', 'air'],
  earth: ['earth', 'water'],
  air: ['air', 'fire'],
  water: ['water', 'earth'],
};

/** Return zodiac signs that are generally compatible with the given sign (by element). */
export function getCompatibleSigns(sign: string): string[] {
  const element = ZODIAC_ELEMENTS[sign];
  if (!element) return [];
  const compatibleElements = COMPATIBLE_ELEMENTS[element] ?? [];
  return zodiacSigns.filter((s) => compatibleElements.includes(ZODIAC_ELEMENTS[s] ?? ''));
}

/** Simple compatibility score 0–100: same element = 90, compatible element = 70, else 50. */
export function getCompatibilityScore(sign1: string, sign2: string): number {
  const e1 = ZODIAC_ELEMENTS[sign1];
  const e2 = ZODIAC_ELEMENTS[sign2];
  if (!e1 || !e2) return 50;
  if (e1 === e2) return 90;
  if ((COMPATIBLE_ELEMENTS[e1] ?? []).includes(e2)) return 70;
  return 50;
}

/** Short horoscope-style tagline for discovery (e.g. "Best with Taurus, Leo"). */
export function getZodiacMatchTagline(sign: string): string {
  const compatible = getCompatibleSigns(sign).filter((s) => s !== sign).slice(0, 3);
  if (compatible.length === 0) return '';
  return `Best with ${compatible.join(', ')}`;
}

/** Overall compatibility 0–100: interests overlap (50%) + zodiac (50%). */
export function getOverallCompatibilityScore(
  me: { interests?: string[]; zodiac?: string },
  other: { interests?: string[]; zodiac?: string }
): number {
  let score = 0;
  const myInterests = new Set(me.interests ?? []);
  const otherInterests = other.interests ?? [];
  const common = otherInterests.filter((i) => myInterests.has(i)).length;
  const interestScore = otherInterests.length > 0 ? Math.min(100, (common / Math.max(otherInterests.length, myInterests.size)) * 100) : 50;
  const zodiacScore = me.zodiac && other.zodiac ? getCompatibilityScore(me.zodiac, other.zodiac) : 50;
  score = Math.round(interestScore * 0.5 + zodiacScore * 0.5);
  return Math.max(0, Math.min(100, score));
}
