# CueOut — Technical Implementation Brief

Internal document for the development team.
All issues have been verified against the live codebase and Luron API dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + Framer Motion |
| Mobile wrapper | Capacitor (iOS) |
| Auth + Database | Supabase |
| AI Call Service | Luron API |
| Language | JavaScript (JSX) |

---

## Infrastructure Overview

### Luron API

| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/v1/schedule` | POST | ✅ Integrated | Handles voice, SMS, and email via `type` field |
| `/api/v1/verify` | POST | ❌ Not integrated | Dedicated OTP delivery — must replace current workaround |
| Trigger Call | POST | ❌ Not integrated | Instant call trigger — must replace `now + 5s` hack |
| `/api/v1/history` | GET | ✅ Integrated | Returns full call history |
| `/api/v1/history/:callId` | GET | ✅ Integrated | Single call detail |
| `/api/v1/users/:userId/stats` | GET | ✅ Integrated | Per-user usage stats |
| `/api/v1/health` | GET | ✅ Integrated | Health check |

**Note:** Confirm the correct production `BASE_URL` with the client before Phase 2 work begins. Current value in `src/api/luronApi.js` is `https://luron-api.onrender.com`. Dashboard shows `https://api.luron.ai/api/v1`.

### Supabase Tables

| Table | Purpose |
|---|---|
| `users` | Auth + profile data, preferences |
| `subscriptions` | Plan tier, call limits, usage counter |
| `upcoming_calls` | Scheduled call records |
| `call_history` | Completed call records |
| `caller_ids` | Preset fake caller ID numbers per user — shown on the user's phone screen when AI calls arrive, to make the escape look legitimate (e.g. "Mom calling") |
| `personas` | Persona definitions |
| `persona_configs` | Per-user persona configuration |
| `quick_schedules` | Quick preset configurations |
| `phone_verifications` | OTP verification records |

### Key Source Files

| File | Role |
|---|---|
| `src/components/AppContext.jsx` | Global state — auth check, call history, upcoming calls |
| `src/components/AuthContext.jsx` | Supabase auth session wrapper |
| `src/api/luronApi.js` | All Luron API calls |
| `src/api/verification.js` | Phone OTP verification flow |
| `src/components/constants.jsx` | Persona IDs, voice IDs, app constants |
| `src/pages/Home.jsx` | Main scheduling screen |
| `src/pages/History.jsx` | Call history screen |
| `src/pages/Account.jsx` | Account, preferences, plan |
| `src/pages/Paywall.jsx` | Subscription/upgrade screen |
| `src/pages/PhoneVerification.jsx` | Phone number verification screen |
| `src/pages/Layout.jsx` | Shell layout + bottom tab bar |
| `src/lib/supabase.js` | Supabase client initialisation |

---

## Phase 1 — Account, Login & Data

### Issue 1 — Data Never Saves to Account (Blocks all of Phase 1)

**Current behaviour:** Changes made in the app — scheduled calls, quick presets, preferences — appear to work within a session. After closing and reopening the app, data is missing or reset. The app behaves as if no user is logged in even when one is.

**How it currently works:** In `src/components/AppContext.jsx`, an `isAuthenticated` boolean is used to gate all Supabase write operations. If `isAuthenticated` is `false`, every save action silently exits without writing to the database.

**Root cause:** There is a logic conflict in how `isAuthenticated` is derived. It always evaluates to `false`, causing all writes to be skipped silently. No error is thrown — the app appears to work but writes nothing.

**Fix (UI — `src/components/AppContext.jsx`):**
Correct the auth state logic so `isAuthenticated` accurately reflects whether a live Supabase session exists. All downstream save operations will unblock automatically once this is fixed.

**Priority: Fix this first.** Issues 3, 4, and 13–16 all depend on this being resolved.

---

### Issue 2 — New User Sees Previous User's History (Privacy — Critical)

**Current behaviour:** When a second person signs up or logs in on the same device, they can see the previous user's full call history — including past calls, scheduled times, and context notes. Confirmed in testing.

**How it currently works:** `getUserId()` in `src/api/luronApi.js` generates a random anonymous ID on first launch and stores it in `localStorage('CueOut_user_id')`. This ID is sent to Luron as the `user_id` for all API requests. When a new user logs in on the same device, `getUserId()` finds the existing ID in localStorage and reuses it — so Luron associates all their calls with the previous user's history. AppContext also never clears in-memory call data when a different user logs in.

**Root cause:** User identity is device-based, not account-based.

**Fix (Backend):** Store a Luron-specific user ID in the Supabase `users` table, linked to the Supabase user UUID. Use this stored ID as the `user_id` in all Luron API calls.

**Fix (UI — `src/api/luronApi.js`, `src/components/AppContext.jsx`):**
1. Remove the `localStorage('CueOut_user_id')` approach entirely.
2. On login, read the Luron `user_id` from the Supabase `users` record for the authenticated user.
3. On logout, clear all in-memory call data from AppContext state so no data leaks to the next user.

---

### Issue 3 — Email Address Changes Not Saved

**Current behaviour:** User edits their email in Account settings and taps Save. The new email appears on screen for the current session. After restarting the app, the old email is back.

**How it currently works:** The save button in `src/pages/Account.jsx` updates the component's local state only. `supabase.auth.updateUser()` is never called, so the Supabase account is never changed.

**Root cause:** Missing API call on save.

**Fix (UI — `src/pages/Account.jsx`):**
Call `supabase.auth.updateUser({ email: newEmail })` when the user taps Save. Handle the confirmation email flow — Supabase sends a confirmation to the new address before the change takes effect. Show appropriate feedback ("Check your email to confirm the change").

---

### Issue 4 — Preferences Reset on Every Restart

**Current behaviour:** The Account screen has three preference controls — a Notifications toggle, a Ringtone & Vibration selector, and a Creator Mode toggle. Each one appears to work when tapped. After closing and reopening the app, all three revert to their defaults.

**What these controls actually do right now:**

- **Notifications toggle:** Flips a local React state boolean (`notificationsEnabled`). Nothing else. There is no push notification system integrated — no Capacitor Push Notifications plugin, no APNs registration, no push token stored anywhere. The toggle is purely decorative.
- **Ringtone selector:** Shows five options — Default, Classic, Modern, Gentle, Urgent. These are string labels only. There are no audio files in the project, no audio playback implemented, and no connection to the device's ringtone system. Selecting a ringtone stores the label string in component state and nothing more.
- **Creator Mode toggle:** Same — local state only, never persisted.

**Root cause:** All three use `useState` with no Supabase write on change and no Supabase read on mount.

**Fix — Notifications (best practice for Capacitor iOS):**
1. Install `@capacitor/push-notifications`.
2. When the user enables the toggle for the first time, call `PushNotifications.requestPermissions()`.
3. On permission granted, call `PushNotifications.register()` to receive the APNs device token.
4. Store the token in the `users` table (`push_token` column — add if not present).
5. Save the `notifications_enabled` boolean to the `users` table on every toggle.
6. Read the saved value from `users` on Account screen mount.
7. Sending the actual push notification (e.g. "Your call is arriving") is triggered from a Supabase edge function or Luron webhook when a call is scheduled/fired.

**Fix — Ringtone (two options — confirm with client):**
- **Option A (Recommended):** Remove the ringtone selector entirely for now. There is no audio system in place and no clear product spec for what selecting a ringtone should do. Add it back as a proper feature in a later phase once audio requirements are defined.
- **Option B:** Keep the selector as a stored preference only (save label to `users` table). If the intent is to play a sound when a push notification arrives, configure the notification sound in the APNs payload at send time — map the stored preference to an audio file bundled in the iOS project.

**Fix — Creator Mode:**
- Save the boolean to `users` table on toggle.
- Read it on Account mount.
- Confirm with client what Creator Mode should unlock — document the behaviour before implementing the save.

**Supabase columns to add to `users` table:**
- `notifications_enabled` (boolean, default true)
- `push_token` (text, nullable)
- `ringtone_preference` (text, default 'Default') — only if Option B chosen
- `creator_mode_enabled` (boolean, default false)

---

### Issue 5 — Account Screen Shows "John Doe"

**Current behaviour:** Every user sees the name "John Doe" and the avatar letter "J" regardless of who is logged in.

**Root cause:** The display name and avatar initial in `src/pages/Account.jsx` are hardcoded strings — `'John Doe'` and `'J'`. The signup flow (`src/pages/Auth.jsx`) only collects email and password. No name is ever stored.

**Three options — confirm with client before implementing:**

**Option A — Add name field to signup (Recommended)**
- Add a `Full Name` input to the signup form in `Auth.jsx`.
- Pass it to Supabase: `supabase.auth.signUp({ ..., options: { data: { full_name: 'value' } } })`.
- Read it back via `user.user_metadata.full_name` on Account screen.
- Derive avatar initial from the first character of the name.
- Best practice: collecting the name at signup means it is always available from the first session.

**Option B — Post-signup name prompt (lazy collection)**
- Skip the signup form change.
- On the first visit to the Account screen (detect via a `profile_completed` flag in `users` table), show a one-time bottom sheet prompting the user to enter a display name.
- Store in `user_metadata` via `supabase.auth.updateUser({ data: { full_name: '...' } })`.
- Less friction at signup, slightly more complex logic.

**Option C — Remove name display, use email as identifier**
- Remove the "John Doe" display entirely.
- Show the user's email address as their identifier.
- Derive avatar initial from the first character of the email prefix.
- Simplest option — no new fields, no flow changes. Appropriate if the product does not require users to set a real name.

---

## Phase 2 — Scheduling & Calls

### Issue 6 — Phone Verification Delivers Conversation Instead of OTP

**Current behaviour:** After entering a phone number, the user receives a call. Instead of immediately reading a verification code, the AI starts a conversation — asking "where are you right now?" or "how can I help you today?". The code is eventually read out after 60+ seconds if at all. Confirmed failing in testing.

**How it currently works:** `sendVerificationCall()` in `src/api/verification.js` calls `scheduleCall()` — the same function used for escape calls — with `persona_type: 'customer_support'` (which is not a valid Luron persona ID) and passes the OTP instruction as a `note` (context hint). The conversational AI model treats a context note as a soft suggestion, so it follows its normal greeting behaviour first. The code generation (`generateVerificationCode()`, `hashCode()`, `formatCodeForSpeech()`) is all done client-side in the app.

**Root cause:** Using the wrong endpoint. The general `/schedule` endpoint invokes the conversational AI model. Luron has a dedicated `/api/v1/verify` endpoint built specifically for OTP delivery — it does not use the AI model at all, reads the code immediately, and handles code generation server-side.

**Fix (UI — `src/api/verification.js`):**
1. Replace `sendVerificationCall()` to call `POST /api/v1/verify` instead of `scheduleCall()`.
2. Remove the custom `generateVerificationCode()`, `hashCode()`, and `formatCodeForSpeech()` functions — the `/verify` endpoint handles all of this server-side.
3. Update the loading/status messages on `src/pages/PhoneVerification.jsx` to reflect the new instant flow.

**Note:** Get the exact request body required for `/api/v1/verify` from Luron API docs before implementing.

---

### Issue 7 — "Now" Calls Arrive Late or Not at All

**Current behaviour:** When the user selects "Now" as the call timing, the call arrives significantly later than expected — often 60+ seconds — or does not arrive at all.

**How it currently works:** In `src/api/luronApi.js`, the `calculateScheduleTime()` function handles the `'now'` case by setting `scheduled_for = current time + 5 seconds`. This goes through the standard `/api/v1/schedule` endpoint, which queues the call as a scheduled job. By the time the scheduler processes it, the 5-second window has already passed and the call either fires very late or is dropped.

**Root cause:** The app is using the scheduling endpoint for an instant request. Luron provides a separate dedicated Trigger Call endpoint specifically for immediate delivery — it bypasses the queue and fires the call instantly. This endpoint is not integrated.

**Fix (UI — `src/api/luronApi.js`):**
1. Add a new `triggerCall(params)` function that calls the Luron Trigger Call endpoint.
2. In the schedule flow, detect when `selectedTime === 'now'` and route to `triggerCall()` instead of `scheduleCall()`.
3. Show a "Connecting your call…" status message in the UI while the request is in flight.

**Note:** Get the exact Trigger Call endpoint URL and required request body from the Luron API docs before implementing.

---

### Issue 8 — AI Delivers Wrong Persona

**Current behaviour:** User schedules a call with "Manager" or "Boss" persona. The call arrives but the AI speaks as a completely different character (e.g. opens with personal questions in the style of the "Mom" persona). Confirmed failing in testing.

**How it currently works:** The persona IDs in `src/components/constants.jsx` are values chosen during app development. When `scheduleCall()` sends `persona_type` to Luron, Luron matches it against its own internal list. If the ID does not match exactly, Luron silently falls back to a default persona. There are also two voice entries with the same ID (`id: 'michael'`) in constants, which may cause unpredictable voice selection.

**Root cause:** Mismatch between the app's persona ID strings and Luron's accepted `persona_type` values. No validation is done before sending.

**Fix (UI — `src/components/constants.jsx`):**
1. Get the full confirmed list of valid `persona_type` values from the Luron API docs or dashboard.
2. Update every persona entry in `constants.jsx` to use the exact matching Luron ID.
3. Fix the duplicate `id: 'michael'` voice entries.
4. If any app persona has no direct Luron equivalent, map it to the closest available option and document the mapping.

---

### Issue 9 — Custom Scheduled Time Always Ignored

**Current behaviour:** User taps "Custom", picks a date and time, taps "Set Time" — the selector confirms the choice. The call fires at 10 minutes regardless. Confirmed failing in testing.

**How it currently works:** `calculateScheduleTime('custom', customDate)` in `src/api/luronApi.js` uses the `customDate` parameter if provided. However, the date/time picker in `src/pages/Home.jsx` / `src/components/EditScheduleModal.jsx` never writes its selected value to state — so `customDate` is always `null` when `scheduleCall()` is called. When `customDate` is `null`, the function defaults to `now + 10 minutes`.

**Root cause:** The picker's `onChange` event is not connected to state.

**Fix (UI — `src/pages/Home.jsx`, `src/components/EditScheduleModal.jsx`):**
1. Add a `customDate` state variable.
2. Wire the date/time picker's `onChange` to update `customDate`.
3. Pass the stored value through to `scheduleCall({ customDate })`.

---

### Issue 10 — Duplicate Calls on Multiple Taps

**Current behaviour:** Tapping "Schedule Escape" quickly two or three times creates multiple scheduled calls — multiple banners appear and multiple real AI calls fire to the user's phone.

**How it currently works:** The schedule button calls `scheduleCall()` on every tap with no guard. There is no loading state, no disabled state, and no debounce. Each tap triggers a full independent API request.

**Root cause:** No request deduplication or button locking.

**Fix (UI — `src/pages/Home.jsx`, `src/components/EditScheduleModal.jsx`):**
1. Add an `isSubmitting` boolean state.
2. Set it to `true` on first tap and disable the button immediately.
3. Show a loading spinner while the request is in flight.
4. On success: navigate or dismiss. On error: reset `isSubmitting` to `false` and show the error.

---

### Issue 11 — Email Contact Method Never Delivers

**Current behaviour:** User selects "Email" as the contact method, schedules an escape, receives a confirmation. No email ever arrives. The request stays in pending status with no error.

**How it currently works:** `mapContactMethodToType()` correctly maps the `email` contact method to `type: "email"` in the request body. However, when `type` is `"email"`, Luron also requires an `email_address` field and optionally `advanced_settings.email_subject`. The app never sends `email_address`, so Luron has no destination to deliver to. Luron accepts the request without error but cannot process it.

**Root cause:** Missing required `email_address` field in the schedule request for email type. The Luron API was confirmed to support email via the same `/api/v1/schedule` endpoint — 16 emails have been delivered successfully via the dashboard.

**Fix (UI — `src/api/luronApi.js`, `src/pages/Home.jsx`, `src/components/ContactMethodSelector.jsx`):**
1. Add `recipientEmail` parameter to `scheduleCall()`.
2. When `type === 'email'`, include `email_address: recipientEmail` and `advanced_settings.email_subject` in the request body.
3. In the schedule flow, default `recipientEmail` to the signed-in user's email from the Supabase session. Allow the user to enter a different address if needed.

---

## Phase 3 — History, Presets & Plan Management

### Issue 12 — History Disappears on Tab Switch

- **Files:** `src/pages/History.jsx`, `src/components/AppContext.jsx`
- **Root cause:** History tab fetch replaces the entire `callHistory` array in AppContext state rather than merging. Any calls added from the Home screen are overwritten.
- **Fix (UI):** Merge incoming history data with existing state entries. Deduplicate by `call_id` to avoid duplicates.

---

### Issue 13 — Quick Preset Saved Before User Configures It

- **Files:** `src/pages/Home.jsx`, `src/api/quickSchedules.js`
- **Root cause:** Tapping "New" immediately writes a blank record to the `quick_schedules` table in Supabase. The configuration panel opens after the fact.
- **Fix (UI):** Hold the new preset as local draft state only. Write to `quick_schedules` only when the user explicitly taps "Save Changes". Discard the draft on cancel/close without creating any database record.

---

### Issue 14 — Custom Persona Saved Before User Names It

- **Files:** `src/pages/PersonaSettings.jsx`, `src/api/personas.js`
- **Root cause:** Same pattern as Issue 13 — pressing "Add" immediately writes to `personas`/`persona_configs`.
- **Fix (UI):** Same approach — draft locally, write to database only on confirmed save.

---

### Issue 15 — Subscription Limits Not Enforced

- **Files:** `src/api/subscriptions.js`, `src/api/luronApi.js`, `src/pages/Home.jsx`
- **Root cause:** The `subscriptions` table has limit and usage columns, but no check is performed before scheduling and the counter is never decremented after a call.
- **Fix (Backend):** Supabase edge function that:
  1. Checks `subscriptions.remaining_calls` before accepting a schedule request.
  2. Decrements the counter on successful call scheduling.
  3. Returns an error if the user is at 0.
- **Fix (UI):** Show remaining call count on the schedule screen. Display an upgrade prompt when count reaches 0. Block the schedule button until the count is confirmed.

---

### Issue 16 — Plan Card Always Shows "Free / 1 of 2 Left"

- **File:** `src/pages/Account.jsx`
- **Root cause:** Plan tier, usage count, and call limit are hardcoded strings — the `subscriptions` table is never queried.
- **Fix (UI):** Fetch the user's subscription record from `subscriptions` on Account screen mount. Display actual plan tier, used count, and limit.

---

### Issue 17 — Timestamps Show Time Only (No Date)

- **File:** `src/pages/History.jsx`
- **Root cause:** The timestamp formatter outputs time only (e.g. `3:05 PM`) with no date component.
- **Fix (UI):** Extend the formatter to include relative date context: "Today 3:05 PM", "Yesterday 11:42 AM", or "Dec 28 · 2:15 PM" for older entries.

---

### Issue 18 — "Invalid Date" Text in History

- **File:** `src/pages/History.jsx`
- **Root cause:** When a history entry has a null/missing timestamp, the date formatter produces the error string `"Invalid Date"` which is displayed directly.
- **Fix (UI):** Guard the formatter — return `"—"` or `"Unknown time"` when the timestamp is absent.

---

### Issue 19 — Persona Names Lowercase in History

- **File:** `src/pages/History.jsx`
- **Root cause:** Luron returns the internal `persona_type` identifier in lowercase (e.g. `manager`). It is displayed without formatting.
- **Fix (UI):** Map the internal ID to a display name before rendering, or at minimum capitalise the first letter.

---

## Phase 4 — iOS Experience & Paywall

### Issue 20 — Screen Zooms In on Any Input Tap

- **File:** `src/index.css`
- **Root cause:** iOS automatically zooms on inputs with font size below 16px. Most inputs across the app use smaller text.
- **Fix (UI):** Add a global CSS rule setting `font-size: 16px` minimum on all `input`, `textarea`, and `select` elements. Single-line fix, affects all screens.

---

### Issue 21 — Bottom Tab Bar Disappears on Scroll / Keyboard Open

- **File:** `src/pages/Layout.jsx`
- **Root cause:** The tab bar uses `absolute bottom-0` positioning inside a `h-[100dvh]` container. When the user scrolls or the keyboard appears, the container height changes and the tab bar scrolls out of view.
- **Fix (UI):** Change tab bar to `fixed bottom-0`. Add `env(safe-area-inset-bottom)` padding so it sits above the iPhone home indicator.

---

### Issue 22 — Edit Button Invisible on iPhone (Hover-Only)

- **Files:** Quick preset component within `src/pages/Home.jsx`
- **Root cause:** The edit/delete icon is set to appear on CSS `hover`, which does not fire on touch screens.
- **Fix (UI):** Show the icon permanently on touch devices, or implement a swipe-left gesture to reveal edit and delete actions.

---

### Issue 23 — Info Links Show Plain Alert Box

- **File:** `src/pages/Account.jsx`
- **Root cause:** "How CueOut Works", Privacy Policy, and Terms of Use all call `alert()` with placeholder text.
- **Fix (UI):** Replace with `window.open(url)` or an in-app webview pointing to the actual hosted content. Privacy Policy and Terms of Use are App Store requirements — these must be live URLs.

---

### Issue 24 — "Continue with Plus" Button Does Nothing

- **File:** `src/pages/Paywall.jsx`
- **Root cause:** The button has no `onClick` handler. Apple In-App Purchase (IAP) has not been integrated.
- **Fix (Backend):** Supabase edge function to update the `subscriptions` table after receiving a verified Apple IAP receipt.
- **Fix (UI):**
  - Integrate Apple IAP via Capacitor (recommended: RevenueCat plugin for simplified receipt validation).
  - Handle three states: successful purchase, failed/cancelled purchase, restore previous purchase.
  - On success, call the Supabase edge function to upgrade the subscription tier.

---

### Issue 25 — "Billed Through Apple ID" Shown Without IAP Active

- **File:** `src/pages/Paywall.jsx`
- **Root cause:** Hardcoded text added before IAP was implemented.
- **Fix (UI):** Remove the line. Re-add once IAP is live.

---

### Issue 26 — No Way to Cancel Subscription In-App

- **File:** `src/pages/Account.jsx`
- **Root cause:** "Cancel anytime" is stated on the paywall but no management option exists anywhere in the app.
- **Fix (UI):** Add a "Manage Subscription" button in Account that opens `https://apps.apple.com/account/subscriptions` via `window.open()`. Show this button only for active Plus subscribers; show "Upgrade to Plus" for free users.

---

### Issue 27 — Billing Cycle Selection Ignored at Checkout

**Current behaviour:** Switching between "Monthly" and "Yearly" on the paywall correctly updates the displayed price ($9.99/month vs $89.99/year). However, this selection is not passed to the purchase — tapping "Continue with Plus" would always start a monthly subscription regardless of what was selected.

**How it currently works:** `Paywall.jsx` has a `billingCycle` state (`useState('monthly')`) and two buttons that update it. The price display reads from a `pricing[billingCycle]` object — so the UI display is correct and working. However, the "Continue with Plus" button has **no `onClick` handler at all** (Issue 24). When IAP is integrated, the `billingCycle` value must be read and used to select the correct Apple product.

**How Apple IAP products work:** Each subscription term (monthly, yearly) is a separate product registered in App Store Connect with its own unique Product ID (e.g. `com.cueout.app.plus.monthly`, `com.cueout.app.plus.yearly`). When initiating a purchase, the correct product ID must be passed to the IAP purchase call. If the wrong product ID is used, the user is billed for the wrong term.

**Root cause:** `billingCycle` state exists and is correct, but is not passed to the purchase call. Issue is blocked by Issue 24 (no IAP integration yet).

**Fix (UI — `src/pages/Paywall.jsx`):**
1. Define two Apple product IDs as constants: one for monthly, one for yearly. These must match exactly what is registered in App Store Connect.
2. When "Continue with Plus" is tapped, read the current `billingCycle` state and pass the corresponding product ID to the RevenueCat purchase function.
3. **This fix should be implemented as part of Issue 24** — do not build the IAP flow without billing cycle support baked in from the start.

**Note:** Product IDs must be confirmed and registered in App Store Connect before implementation.

---

### Issue 28 — Legal Links on Paywall Not Tappable

- **File:** `src/pages/Paywall.jsx`
- **Root cause:** "Terms of Service" and "Privacy Policy" at the bottom of the paywall are styled text with no `onClick` handler.
- **Fix (UI):** Add tap handlers opening the relevant URLs. Required by Apple for App Store approval of subscription screens.

---

### Issue 29 — Feature Comparison Logic Error

**Current behaviour:** On the Free vs Plus comparison card, "Standard call speed" appears with a hollow circle (excluded indicator) under the Free plan — implying Free users have no call delivery capability at all. This is incorrect and confusing.

**How the comparison works:** In `Paywall.jsx`, there are two arrays — `features.free` and `features.plus`. Each item has a `text` label and an `included` boolean. When `included` is `true`, a checkmark renders. When `false`, a hollow circle renders (styled to look like a cross/excluded state). The Free column renders the first 3 items from `features.free`:

```
1. ✅  2 AI calls total          (included: true)  ← correct
2. ✅  Basic persona only        (included: true)  ← correct
3. ○   Standard call speed       (included: false) ← WRONG
```

Free users DO receive calls at standard speed — this is a core feature of the free plan, not something excluded. The `included: false` was set incorrectly during development.

**Root cause:** Single incorrect boolean value in the `features.free` array.

**Fix (UI — `src/pages/Paywall.jsx`):**
Change line:
```js
{ text: 'Standard call speed', included: false },
```
to:
```js
{ text: 'Standard call speed', included: true },
```

The Plus column already correctly shows `'Priority call speed'` with `included: true` — no change needed there. After the fix, the comparison will correctly read:
- Free: standard call speed ✅
- Plus: priority call speed ✅

**Effort:** 1 line change. Lowest effort fix in the entire project.

---

## Supabase Edge Functions Required

| Function | Phase | Purpose |
|---|---|---|
| `check-and-decrement-calls` | 3 | Validate call limit before scheduling, decrement on success |
| `confirm-iap-purchase` | 4 | Verify Apple IAP receipt and upgrade subscription tier |

---

## External Dependencies to Add

| Dependency | Phase | Purpose |
|---|---|---|
| Capacitor Purchases (RevenueCat) | 4 | Apple In-App Purchase integration |

---

##  Required from Client

Product Decisions
Creator Mode Functionality
 A clear definition of what Creator Mode should do as a product feature, so it can be implemented correctly.
“How CueOut Works” Content
 This can be a short paragraph or a full help page, depending on your preference.
App Store & Apple Requirements
App Store Connect Access


Legal & Compliance
Privacy Policy URL
 A hosted web page (not a PDF) that users can access.
Terms of Service URL
 A hosted web page outlining usage terms.

User-Facing Information
Support Email Address
App Store Assets
App Icon
App Screenshots
App Description (Store Listing Copy)
