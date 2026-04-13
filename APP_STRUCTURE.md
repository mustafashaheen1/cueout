# CueOut — App Structure & Behaviour

## What the App Does
CueOut lets users schedule fake AI-generated phone calls, texts, or emails to themselves — to escape awkward situations. The user picks a persona, timing, voice, and context note. The app then triggers a real AI call to their verified phone number via the Luron API backend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router DOM v7 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Auth & Database | Supabase (email/password + Apple OAuth) |
| Backend (AI Calls) | Luron API (`luron-api.onrender.com`) |
| Mobile Wrapper | Capacitor (iOS, app ID: `com.cueout.app`) |
| Platform SDK | Base44 SDK |
| Forms | React Hook Form + Zod |

---

## Project Directory Structure

```
cueout/
├── src/
│   ├── api/                  # All API integrations
│   │   ├── auth.js           # Supabase auth + user profile CRUD
│   │   ├── calls.js          # Supabase upcoming calls & history CRUD
│   │   ├── callerIds.js      # Supabase caller ID CRUD
│   │   ├── personas.js       # Supabase persona + config CRUD
│   │   ├── quickSchedules.js # Supabase quick presets CRUD
│   │   ├── subscriptions.js  # Subscription/plan data
│   │   ├── voices.js         # Voice list
│   │   ├── luronApi.js       # External AI call backend
│   │   ├── verification.js   # Phone OTP verification
│   │   ├── integrations.js   # Other integrations
│   │   └── index.js          # Central re-export
│   │
│   ├── components/
│   │   ├── AuthContext.jsx       # Global auth state
│   │   ├── AppContext.jsx        # Global app data (calls, history, etc.)
│   │   ├── PersonaContext.jsx    # Persona & config state
│   │   ├── PersonaCard.jsx       # Persona selector card
│   │   ├── VoiceCard.jsx         # Voice selector card
│   │   ├── TimeChip.jsx          # Time option chip (Now/3min/5min/Custom)
│   │   ├── ContactMethodSelector.jsx  # Call/Text/Email selector
│   │   ├── CallerIDSelector.jsx  # Fake caller ID picker
│   │   ├── UpcomingCallBanner.jsx # Countdown banner for scheduled call
│   │   ├── CallHistoryItem.jsx   # Single history row
│   │   ├── EditScheduleModal.jsx # Quick preset editor
│   │   ├── constants.jsx         # timeOptions, realisticVoices, characterVoices
│   │   └── ui/                   # Full shadcn/ui component library
│   │
│   ├── pages/
│   │   ├── index.jsx         # Router + InitialRoute logic
│   │   ├── Layout.jsx        # App shell + floating tab bar
│   │   ├── Onboarding.jsx    # 3-slide intro carousel
│   │   ├── Auth.jsx          # Login / Signup screen
│   │   ├── PhoneVerification.jsx  # OTP phone verification
│   │   ├── Home.jsx          # Main scheduling screen
│   │   ├── History.jsx       # Past calls + quick presets
│   │   ├── Account.jsx       # Profile, plan, settings
│   │   ├── PersonaSettings.jsx    # Edit persona config
│   │   └── Paywall.jsx       # Upgrade to Plus
│   │
│   ├── lib/
│   │   ├── supabase.js       # Supabase client init
│   │   └── utils.js          # cn() utility
│   │
│   ├── hooks/
│   │   └── use-mobile.jsx    # Mobile breakpoint hook
│   │
│   └── utils/
│       └── index.ts
│
├── ios/                      # Capacitor iOS native project
├── capacitor.config.ts       # Capacitor config (webDir: dist)
├── .env                      # Supabase credentials (gitignored)
└── vite.config.js
```

---

## App Entry Flow

```
main.jsx
  └── App.jsx
        └── AuthProvider          ← wraps everything, restores session on load
              └── Pages (Router)
                    └── Layout    ← wraps every page
                          ├── AppProvider       ← global data store
                          ├── PersonaProvider   ← persona state
                          └── <Page />          ← current route
```

---

## Context Providers (Global State)

### AuthContext
- Calls Supabase `getUser()` on mount to restore session
- Subscribes to `onAuthStateChange` for live auth updates
- Exposes: `user`, `isAuthenticated`, `signIn`, `signUp`, `signInWithApple`, `signOut`, `updateEmail`, `updatePassword`, `resetPassword`

### AppContext
- On mount: checks auth → loads from **Supabase** if logged in, **localStorage** if not
- Always writes back to localStorage as an offline backup
- Manages: `upcomingCalls`, `history`, `callerIDs`, `quickSchedules`, `unreadHistoryCount`
- Holds `userId` (from localStorage) for Luron API calls
- Exposes `syncHistoryWithAPI()` to pull real call history from Luron

### PersonaContext
- On mount: loads personas and their configs from Supabase (or defaults if not logged in)
- Default personas: Manager, Coordinator, Reminder, Friend, Mom, Doctor, Boss
- Each persona has a config: `{ tone, background, customPhrases, duration }`
- All mutations are optimistic — local state updates first, Supabase syncs in background

---

## Pages

### Onboarding
- 3-slide intro carousel with animated mockups
- Slide 1: "Your call, exactly when you need it"
- Slide 2: Schedule UI mockup
- Slide 3: "Built for TikTok moments"
- On finish: sets `localStorage.onboardingComplete = true` → goes to Auth

### Auth
- Email/password login and signup via Supabase
- Apple Sign In via Supabase OAuth
- On success → navigates to Home

### PhoneVerification
- OTP-based phone number verification
- Saves `phone_number` + `country_code` to Supabase `users` table
- Required before any call can be scheduled (Luron API needs a real phone number)

### Home (Main Screen)
Step-by-step scheduling UI:
1. **Contact method** — Call / Text / Email
2. **Timing** — Now (5s) / 3 min / 5 min / Custom datetime
3. **Persona** — horizontally scrollable cards (Manager, Friend, Mom, etc.), + "Add" custom
4. **Context note** — free text up to 150 chars ("sound like my boss")
5. **Advanced** — voice selector (Realistic or Character) + Caller ID picker
6. **"Schedule Escape"** button

On submit:
1. Validates user has a verified phone number
2. Adds call to `upcomingCalls` immediately (optimistic update, instant UI)
3. Shows success toast
4. Fires `luronApi.scheduleCall()` in the background (non-blocking)
5. Luron backend schedules the real AI call

Upcoming calls are shown as banners with a live countdown timer. Each can be edited or cancelled.

### PersonaSettings
- Edit persona name, icon, tone, background sound, call duration, custom phrases
- Changes saved via `PersonaContext.updatePersonaConfig()`

### History
- On mount: calls `syncHistoryWithAPI()` to pull real Luron call history
- Shows stats: total calls + calls this week
- **Quick Presets** horizontal scroll — saved call setups for 1-tap reuse
- Tap any history item → detail modal with duration, status, context
- "Repeat this setup" → pre-fills Home with same settings
- "Add to Quick Schedule" → saves as a quick preset

### Account
- Profile: email (editable) + verified phone number
- Plan: Free (2 calls) or Plus (upgrade via Paywall)
- Caller ID manager: rename preset fake numbers
- Creator Mode: optimizes UI for screen recording, optional watermark
- Notifications toggle + Ringtone selector
- Log out

### Paywall
- Subscription upgrade screen
- Free plan: 2 calls
- Plus plan: unlimited calls + premium features

---

## Data Flow (Core Loop)

```
User taps "Schedule Escape"
        ↓
AppContext.addUpcomingCall()     ← instant, optimistic UI update
        ↓
luronApi.scheduleCall()          ← fires in background, non-blocking
        ↓
Luron backend queues AI call
        ↓
In X minutes → user's real phone rings with AI voice
        ↓
User opens History tab
        ↓
luronApi.getHistory()            ← fetches real records from Luron
        ↓
AppContext.syncHistoryWithAPI()  ← maps to app format, updates state
```

---

## Luron API Reference

Base URL: `https://luron-api.onrender.com`

| Endpoint | Method | Purpose |
|---|---|---|
| `/schedule` | POST | Schedule an AI call/text/email |
| `/history` | GET | Get call history for a user (`?user_id=`) |
| `/history/:callId` | GET | Get details of one call (incl. transcript) |
| `/users/:userId/stats` | GET | Get user call statistics |
| `/health` | GET | API health check |

### Schedule Request Body
```json
{
  "user_id": "user_xxx",
  "type": "call",
  "when": "2026-04-02T15:05:00Z",
  "persona_type": "manager",
  "custom_instruction": "sound like my boss",
  "phone_number": "+15551234567",
  "advanced_settings": {
    "tone": "formal",
    "voice": "emma",
    "caller_id": "+15559876543",
    "duration": 30,
    "custom_phrases": "let's sync up, quick call"
  }
}
```

---

## Supabase Tables

| Table | Purpose |
|---|---|
| `users` | User profile: `phone_number`, `country_code`, `creator_mode_enabled`, `notifications_enabled`, `selected_ringtone` |
| `upcoming_calls` | Scheduled calls per user |
| `call_history` | Completed call records |
| `caller_ids` | Fake caller ID presets per user |
| `personas` | Custom personas per user |
| `persona_configs` | Config per persona (tone, background, duration, phrases) |
| `quick_schedules` | Saved quick preset shortcuts |

---

## Mobile (Capacitor iOS)

- `npm run build` → outputs to `dist/`
- `npx cap sync ios` → copies `dist/` into `ios/App/App/public/`
- Native iOS shell renders the web app in a `WKWebView`
- App ID: `com.cueout.app`, App Name: `Cueout`
- Uses `env(safe-area-inset-bottom)` for iPhone notch/home bar spacing

---

## Personas & Voices

### Default Personas
| ID | Name | Icon | Tone |
|---|---|---|---|
| manager | Manager | 💼 | formal |
| coordinator | Coordinator | 📋 | casual |
| service | Reminder | 🔔 | friendly |
| friend | Friend | 💬 | casual |
| mom | Mom | ❤️ | concerned |
| doctor | Doctor | ⚕️ | formal |
| boss | Boss | 👔 | formal |

### Voice Categories
- **Realistic**: Emma, James, Sophia, Alex, Morgan, Jordan
- **Character**: Various personality-based voices
