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
| **Spotify/Instagram** | No profile fields or links for socials. |
| **Voice in chat** | No voice message type or recording. |
| **Video in chat** | Only image + GIF; no video message type. |
| **Panic/emergency location** | No panic button or emergency location sharing. |
| **Passport** | No travel/passport mode. |
| **Video/voice calls** | No WebRTC or in-app call UI. |
| **Voice notes** | No voice note message type. |
| **Virtual dates** | No virtual date feature. |
| **AI bio** | No AI-generated bio (there is AI avatar and profile video). |
| **BFF/group modes** | No BFF or group chat / group mode. |
| **UPI/payments/refunds/trials** | Subscribe page exists; no UPI, refunds, or trial logic. |
| **In-app events** | No events or meetups feature. |

---

## Summary

- **Done:** 21 items (auth, profile, discovery, likes, chat media, time-limited chat, block, safety, ID verification, compatibility, plus earlier i18n, offline, OAuth, push, zodiac, verification, multi-photo, cultural filters).
- **Partial:** 2 (photo/video moderation, harassment/safety in chat).
- **Not implemented:** 12 (Spotify/Instagram, voice/video in chat, panic, passport, calls, voice notes, virtual dates, AI bio, BFF/group, UPI/refunds/trials, in-app events).

If you want to implement any of the **Partial** or **Not implemented** items next, say which ones and we can do them in phases.
