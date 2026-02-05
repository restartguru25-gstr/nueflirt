export interface PromptAnswer {
  prompt: string;
  answer: string;
}

export interface User {
  id: string;
  name: string;
  age: number;
  bio: string;
  images: string[];
  interests: string[];
  teaserVideoUrl?: string;
  revealedVideoUrl?: string;
  location: string;
  /** GPS latitude for distance-based discovery (optional). */
  latitude?: number;
  /** GPS longitude for distance-based discovery (optional). */
  longitude?: number;
  gender: string;
  preferences: string;
  /** Who they're interested in (orientation). */
  orientation?: string;
  /** Pronouns for display. */
  pronouns?: string;
  /** Height (e.g. range or ft/in). */
  height?: string;
  /** Education level. */
  education?: string;
  /** Job title or "Prefer not to say". */
  job?: string;
  /** Drinking habit. */
  drinking?: string;
  /** Exercise frequency. */
  exercise?: string;
  /** Discovery: min age to show (default 18). */
  ageRangeMin?: number;
  /** Discovery: max age to show (default 99). */
  ageRangeMax?: number;

  // Fields from UserProfile entity in backend.json
  userId?: string;
  language?: string;
  region?: string;
  community?: string;
  /** Optional caste (common in local apps; user can choose "Prefer not to say"). */
  caste?: string;
  avatarId?: string;
  lastSeen?: any;
  datingIntent?: string;
  promptAnswers?: PromptAnswer[];
  isVerified?: boolean;
  /** Verification status: none, pending (under review), approved, rejected. */
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  /** Selfie/photo URL submitted for verification (optional). */
  verificationPhotoUrl?: string;
  /** ID document verification: none, pending, verified. */
  idVerificationStatus?: 'none' | 'pending' | 'verified';
  trustScore?: number;
  /** User enabled browser push notifications (permission requested). */
  pushEnabled?: boolean;
  zodiac?: string;
  pets?: string;
  smoking?: string;
  kids?: string;
  boostedUntil?: any;
  explicitContentOptIn?: boolean;
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  matchedAt: any;
}

export interface Chat {
  id: string;
  participants: string[];
  typing?: { [key: string]: boolean };
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
    type?: 'text' | 'image' | 'gif' | 'voice' | 'video';
    mediaUrl?: string;
    durationSeconds?: number;
  };
  /** Optional: chat expires after this time if no activity (time-limited chat). */
  expiresAt?: any;
  /** Group chat: name and multiple participants. */
  isGroup?: boolean;
  name?: string;
}

export interface Message {
  id: string;
  senderId: string; // user.id
  receiverId: string;
  text: string;
  timestamp: any;
  /** text (default) | image | gif | voice | video */
  type?: 'text' | 'image' | 'gif' | 'voice' | 'video';
  /** URL or data URL for image/gif/voice/video. */
  mediaUrl?: string;
  /** Duration in seconds for voice/video. */
  durationSeconds?: number;
}

export interface Like {
  id: string;
  swiperId: string;
  swipedId: string;
  createdAt: any; // Firestore ServerTimestamp
  /** like (default) | super_like | rose */
  type?: 'like' | 'super_like' | 'rose';
}

export interface Subscription {
    id: string;
    userId: string;
    planType: 'free' | 'premium';
    startDate: any;
    endDate: any;
}

export interface CreditBalance {
    id: string;
    userId: string;
    balance: number;
}

export interface Report {
    id: string;
    reporterId: string;
    reportedId: string;
    reason: string;
    timestamp: any;
}

export interface Block {
    id: string;
    blockerId: string;
    blockedId: string;
    createdAt: any;
}

/** Panic/emergency: user shared location for safety. */
export interface PanicReport {
    id: string;
    userId: string;
    latitude: number;
    longitude: number;
    timestamp: any;
    note?: string;
}

/** Virtual date session between two users. */
export interface VirtualDate {
    id: string;
    user1Id: string;
    user2Id: string;
    proposedBy: string;
    scheduledAt: any;
    status: 'proposed' | 'accepted' | 'declined' | 'completed';
    createdAt: any;
    chatId?: string; // same as chat id for easy query
}

/** In-app event (meetup, activity). */
export interface AppEvent {
    id: string;
    title: string;
    description: string;
    date: any;
    location: string;
    imageUrl?: string;
    createdAt: any;
    createdBy?: string;
}

/** User's RSVP to an event. */
export interface EventRsvp {
    id: string;
    eventId: string;
    userId: string;
    status: 'interested' | 'going';
    createdAt: any;
}
