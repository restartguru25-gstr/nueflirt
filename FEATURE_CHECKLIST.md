# Feature Implementation Checklist

Verification of features from your original "Missing" list. Each item is marked **Done**, **Partial**, or **Not implemented**.

---

## ✅ IMPLEMENTED

| Feature | Where | Notes |
|--------|-------|--------|
| **Phone/OTP** | Login page, `firebase/non-blocking-login.tsx` | `createPhoneRecaptcha`, `sendPhoneOtp`, `confirmPhoneOtp`; phone step → OTP step with Verify. |
| **Apple sign-in** | Login + Signup pages, `non-blocking-login.tsx` | `initiateAppleSignIn`; Apple button on both auth pages. |
| **Orientation/pronouns** | Types, `profile-options.ts`, Signup, Profile | `orientationOptions`, `pronounOptions`; User fields; signup + profile Lifestyle section. |
| **Height/education/job/drinking/exercise** | Types, `profile-options.ts`, Signup, Profile | Options + User fields; signup form + profile Lifestyle (Select/Input). |
| **GPS/distance** | `lib/geo.ts`, Profile, Dashboard | `getCurrentPosition`, `distanceKm`, `DISTANCE_OPTIONS_KM`; profile "Use my location"; dashboard Distance filter. |
| **Age-range preferences** | Types, Profile, Dashboard | `ageRangeMin`/`ageRangeMax`; profile Discovery card (min/max age); dashboard filters discovery by age. |
| **Daily like limit** | `lib/limits.ts`, Dashboard | `DAILY_LIKE_LIMIT_FREE` (10); today's likes counted; "X likes left today"; enforce for free users. |
| **Super Like/Rose** | Types, `limits.ts`, Dashboard | Like `type`: 'like' \| 'super_like' \| 'rose'; Super Like (1/day free), Rose (1 credit); buttons + credits. |
| **GIFs/photo in chat** | Types, `chat-gifs.ts`, Chat [id] | Message `type` + `mediaUrl`; image attach (file); GIF picker (`CHAT_GIF_OPTIONS`); render media in bubbles. |
| **Time-limited chats** | Types, `limits.ts`, Chat [id], Chat list | `Chat.expiresAt`, `CHAT_EXPIRY_DAYS` (7); set/extend on send; expired banner + disabled input; "Expired" on list. |
| **Block user** | Types, Dashboard, Chat [id], Chat list, Safety | `Block` interface; `blocks` collection; dashboard excludes blocked; chat "Block User" → /safety; list hides blocked; Safety unblock. |
| **Safety center** | `/safety` page, Nav | Blocked users list + Unblock; safety tips; ID verification link; nav "Safety Center" in header dropdown. |
| **ID verification** | Types, Profile | `idVerificationStatus`: none \| pending \| verified; profile Verification card "Verify with ID" (basic pending flow). |
| **Compatibility %** | `lib/zodiac.ts`, Dashboard, Chat [id] | `getOverallCompatibilityScore` (interests + zodiac); dashboard "X% match" on cards; chat header "X% match". |
| **Verification (selfie)** | Profile | `verificationStatus`, `verificationPhotoUrl`; submit selfie, pending/approved/rejected; trust score. |
| **Multi-photo (profile)** | Profile | Up to 6 images; add/remove; sync to `user_profiles`. |
| **Regional language (i18n)** | `lib/i18n.ts`, `contexts/locale-context`, `locales/` | en, hi, te, ta; `t()`; LanguageSwitcher. |
| **Cultural filters** | `profile-options.ts`, Dashboard, Profile, Signup | Caste/community; filters + profile/signup. |
| **Offline mode** | `lib/offline-cache.ts`, `hooks/use-offline.ts` | IndexedDB cache; offline profiles/chats/messages. |
| **Google/Facebook OAuth** | Login, Signup, `non-blocking-login.tsx` | Buttons + minimal profile creation for new OAuth users. |
| **Web push notifications** | `hooks/use-push-notifications.ts`, Profile | Permission request; `pushEnabled` on profile; Push card on profile. |
| **Zodiac compatibility** | `lib/zodiac.ts`, Dashboard, Profile | Zodiac sign; compatibility score + tagline on cards. |
| **Voice in chat** | Chat [id], `hooks/use-voice-recorder.ts` | Message type `voice`; voice recording; "Voice note" label; playback in bubbles. |
| **Video in chat** | Chat [id], types | Message type `video`; video file attach; `handleVideoSelect`; playback in bubbles. |
| **Voice notes** | Same as Voice in chat | Voice recording + message type `voice`. |
| **Video/voice calls** | Chat [id], `hooks/use-webrtc-call.ts` | WebRTC voice & video calls; call modal (incoming/outgoing/connected); mute camera/mic. |
| **Panic/emergency location** | `/safety` page, types | Panic button; `panic_reports` collection; PanicReport type; share location with safety team. |
| **Virtual dates** | Chat [id], types | VirtualDate type; `virtual_dates` collection; propose/accept/decline; "Join virtual date" → video call. |
| **AI bio** | Profile, `ai/flows/ai-bio-suggestion.ts` | `suggestBio()`; Sparkles button on profile bio; AI-generated tagline from profile. |
| **BFF/group modes** | Chat page, Chat [id], types | Group chat: `Chat.isGroup`, `chat/group-{id}`; create group; GroupChatListItem; multi-participant messages. |
| **In-app events** | `/events` page, types | AppEvent, EventRsvp, EventType (virtual_mixer, zodiac_night, legacy_meetup); RSVP interested/going. |

---

## ⚠️ PARTIAL / LIGHT

| Feature | Status | Notes |
|--------|--------|--------|
| **Photo/video moderation** | Partial | AI flows (e.g. avatar, video) use `HARM_CATEGORY_HARASSMENT` in Gemini; no dedicated moderation pipeline for user-uploaded photo/video. |
| **Harassment / safety in chat** | Partial | `SENSITIVE_KEYWORDS` + safety warning banner in chat; no dedicated harassment detection AI. |

---

## ❌ NOT IMPLEMENTED

| Feature | Notes |
|--------|--------|
| **Spotify/Instagram** | No profile fields or links for socials (e.g. Spotify/Instagram URL). |
| **Passport** | No travel/passport mode (e.g. show profile in another city temporarily). |
| **UPI/payments/refunds/trials** | Subscribe page and library time-pass exist; payment is simulated. No Razorpay/UPI integration, no refunds, no trial logic. |

---

## Summary

- **Done:** 31 items (auth, profile, discovery, likes, chat media, voice/video in chat, voice notes, time-limited chat, block, safety, panic, ID verification, compatibility, video/voice calls, virtual dates, AI bio, group chat, in-app events, plus i18n, offline, OAuth, push, zodiac, verification, multi-photo, cultural filters).
- **Partial:** 2 (photo/video moderation, harassment/safety in chat).
- **Not implemented:** 3 (Spotify/Instagram, Passport, real UPI/payments/refunds/trials).

If you want to implement any of the **Partial** or **Not implemented** items next, say which ones and we can do them in phases.
