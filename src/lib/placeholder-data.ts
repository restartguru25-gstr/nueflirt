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
  // Fields from UserProfile entity in backend.json
  userId?: string;
  language?: string;
  region?: string;
  community?: string;
  avatarId?: string;
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  matchedAt: any;
}

export interface Message {
  id: string;
  senderId: string; // user.id
  receiverId: string;
  text: string;
  timestamp: any;
}

export interface Like {
  id: string;
  swiperId: string;
  swipedId: string;
  createdAt: any; // Firestore ServerTimestamp
}