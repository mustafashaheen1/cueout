# CueOut — Master Bug Tracker (Unified)

This file is the single authoritative bug tracker for CueOut. It was created by merging:
- `BUGS_AND_ISSUES.md` — initial code-review bugs (BUG-001 through BUG-030, ENV-001)
- `SCREEN_REVIEW_BUGS.md` — systematic screen-by-screen review bugs (BUG-031 through BUG-102)

Exact duplicates have been collapsed (see the Duplicate / Merge Reference table below). Cross-references are noted inline on each affected entry. BUG-071 is intentionally skipped (never assigned).

---

## Duplicate / Merge Reference

| Old Bug (BUGS_AND_ISSUES.md) | Description | Covered By |
|---|---|---|
| BUG-005 | Custom time input no `onChange` | BUG-076 |
| BUG-006 | `handleSavePhone` no Supabase call | BUG-033 (merged as note) |
| BUG-007 | Email edit saves locally only | BUG-032 |
| BUG-008 | Hardcoded name "John Doe" | BUG-031 |
| BUG-009 | Avatar letter hardcoded "J" | BUG-031 |
| BUG-010 | Notifications / ringtone not persisted | BUG-035 |
| BUG-011 | Creator mode not persisted | BUG-035 / BUG-046 |
| BUG-014 | Free plan call count hardcoded | BUG-039 |
| BUG-017 | Custom datetime never captured or sent | BUG-076 |
| BUG-024 | History replaced not merged | BUG-057 |
| BUG-028 | "Continue with Plus" no `onClick` | BUG-095 |

---

## Foundation & AppContext Bugs

---

### BUG-001 — Wrong Supabase URL in `.env`
**File:** `.env`
**Severity:** Critical — causes white screen / all auth to fail

**Problem:**
```env
VITE_SUPABASE_URL=https://supabase.com/dashboard/project/msaakygyrluphiscxtyw
```
This is the **Supabase dashboard URL**, not the project API URL. All Supabase requests go to the wrong host, triggering CORS errors and failed fetches.

**Fix:**
```env
VITE_SUPABASE_URL=https://msaakygyrluphiscxtyw.supabase.co
```

**Console error seen:**
```
Access to fetch at 'https://supabase.com/dashboard/...' has been blocked by CORS policy
```

---

### BUG-002 — `isAuthenticated` Name Conflict in `AppContext.jsx`
**File:** `src/components/AppContext.jsx` lines 20 and 35
**Severity:** Critical — crashes `AppContext` on mount, falls back to localStorage

**Problem:**
The imported function `isAuthenticated` from `../api` is shadowed by a state variable declared with the same name on line 35:
```js
// Line 20 — imports the function
import { isAuthenticated } from '../api';

// Line 35 — declares state with same name, SHADOWS the import
const [isAuthenticated, setIsAuthenticatedState] = useState(false);

// Line 52 — tries to call the function, but calls boolean false() instead
const authenticated = await isAuthenticated(); // ❌ TypeError: isAuthenticated is not a function
```

**Fix — rename the import to avoid conflict:**
```js
import { isAuthenticated as checkIsAuthenticated } from '../api';
// ...
const authenticated = await checkIsAuthenticated();
```

**Console error seen:**
```
AppContext.jsx:85 Error loading data: TypeError: isAuthenticated2 is not a function
```

---

### BUG-003 — `isAuthenticated` Boolean Used Incorrectly Throughout `AppContext.jsx`
**File:** `src/components/AppContext.jsx`
**Severity:** Medium — Supabase writes never happen even when user is logged in

**Problem:**
After the name conflict fix (BUG-002), the state variable `isAuthenticated` is a boolean (`false` initially). All the conditional checks like:
```js
if (isAuthenticated) {
  await createSchedule(schedule); // never runs
}
```
...always evaluate to `false` on first render because the state starts as `false` and is only set to `true` after `loadData()` completes. Any calls that happen before `loadData()` finishes will silently skip Supabase writes and only update localStorage.

**Fix:** Use the state variable `isAuthenticated` correctly by ensuring `loadData()` completes before any write operations, or use `AuthContext`'s `isAuthenticated` directly instead of duplicating it.

---

### BUG-004 — `AppProvider` Not Aware of Auth Changes
**File:** `src/components/AppContext.jsx`
**Severity:** Medium — data doesn't reload when user logs in or out

**Problem:**
`AppContext` loads data once on mount (`useEffect(() => { loadData(); }, [])`). It has no subscription to `AuthContext` auth state changes. So if a user logs in, `AppContext` doesn't re-fetch from Supabase — it keeps the localStorage fallback data.

**Fix:** Add a dependency on `user` from `AuthContext`:
```js
const { user } = useAuth();
useEffect(() => { loadData(); }, [user]);
```

---

## Global Layout / iOS

---

### BUG-019 — Safe Area Inset Insufficient on iPhone (Content Clips Under Status Bar)
**File:** `src/index.css` line 193, all pages using `pt-safe`
**Severity:** High — content appears behind the iPhone status bar / Dynamic Island on all screens

**Problem:**
The `.pt-safe` utility class is defined as:
```css
.pt-safe {
  padding-top: env(safe-area-inset-top);
}
```
This provides exactly the system safe area value — no additional buffer. On iPhone models with a Dynamic Island or notch, `env(safe-area-inset-top)` alone is not enough to clear the status bar comfortably. The content starts immediately below the notch with zero breathing room, causing the page header to visually clip or sit uncomfortably close to the top edge.

**Fix:** Add a minimum buffer on top of the safe area inset:
```css
.pt-safe {
  padding-top: calc(env(safe-area-inset-top) + 0.75rem);
}
```

---

## Email Feature Bugs

---

### BUG-026 — Scheduled Email Calls Are Never Delivered
**File:** `src/api/luronApi.js` line 110, `src/components/ContactMethodSelector.jsx`
**Severity:** Critical — a core advertised feature does not work

**Problem:**
When the user selects "Email" as the contact method, the app sends `type: 'email'` to the Luron API:
```json
{ "type": "email", "when": "...", "user_id": "..." }
```
The Luron API accepts the request and returns a `call_id` with no error. However, the email is never dispatched — the API record remains in `pending` status indefinitely. The app provides no indication that email delivery failed, and no error is surfaced to the user. The root cause is that email delivery is not implemented on the Luron API backend.

**Fix (app-side):** Disable the Email contact method option in the UI until confirmed working on the backend, or show a clear "coming soon" state. Do not silently accept a request that will never be fulfilled.

---

### BUG-027 — "Repeat This Setup" for Email Still Results in Pending Status
**File:** `src/pages/History.jsx` lines 135–150
**Severity:** High — user retries a failed email thinking it will work the second time

**Problem:**
When a user views a history item with status `pending` (email never sent) and taps "Repeat this setup", the app navigates to Home with the same `type: 'email'` configuration pre-filled. Scheduling it again sends another request to the Luron API which again returns `pending`. The user has no way to know the feature is non-functional — the UI presents it as a valid action.

The history detail modal also displays a confusing state: the status field shows `pending` (mapped through `status || 'Unknown'`) without any explanation of what pending means or what the user should do.

**Fix:**
1. Show a clear warning in the call detail modal when status is `pending`: "This email was not delivered. Email sending is currently unavailable."
2. Do not allow "Repeat this setup" for calls with `pending` email status.

---

## Account Screen

### User Details Card

---

### BUG-031 — Hardcoded Avatar Initial and Display Name
**File:** `src/pages/Account.jsx` lines 132–136
**Severity:** High — every user sees "John Doe" with avatar letter "J"
**Note:** Was BUG-008 (hardcoded name) and BUG-009 (hardcoded avatar "J") in `BUGS_AND_ISSUES.md`

**Problem:**
```jsx
<div ...>J</div>
<h3>John Doe</h3>
```
The avatar initial and display name are hardcoded strings. Neither is derived from `user.email`, Supabase auth, or any database field.

**Additional gap:** The `users` table has no `display_name` column at all. The schema needs a name field before this can be fixed in code.

**Fix:**
- Avatar: use `user.email?.[0]?.toUpperCase()` as fallback
- Name: add `display_name` column to the `users` table and load it on mount

---

### BUG-032 — Email Edit Saves to Local State Only, Supabase Auth Not Updated
**File:** `src/pages/Account.jsx` lines 111–114
**Severity:** High — email changes are lost on reload
**Note:** Was BUG-007 in `BUGS_AND_ISSUES.md`

**Problem:**
```jsx
const handleSaveEmail = () => {
  setEmail(tempEmail);       // local state only
  setIsEditingEmail(false);
};
```
`updateEmail()` is available in `AuthContext` but is **not imported** in Account.jsx (`const { user, signOut } = useAuth()` — only `signOut` is destructured). The new email is never sent to Supabase Auth.

**Fix:** Destructure `updateEmail` from `useAuth()` and call it inside `handleSaveEmail`.

---

### BUG-033 — Phone Inline Edit State Is Unreachable (Dead Code)
**File:** `src/pages/Account.jsx` lines 188–220
**Severity:** Medium — dead code, confusing codebase

**Problem:**
`isEditingPhone` state and the entire inline edit UI block (lines 200–220) are unreachable. The only button in the phone row calls:
```jsx
onClick={() => navigate(createPageUrl('PhoneVerification'))}
```
`setIsEditingPhone(true)` is never called anywhere. The `handleSavePhone()` function is also dead code.

**Fix:** Remove `isEditingPhone`, `tempPhone`, `handleSavePhone` and the unreachable JSX block entirely. The pencil button already correctly navigates to PhoneVerification.

**Also:** `handleSavePhone` would not persist to Supabase even if it were reachable — it only called `setPhoneNumber(tempPhone)` and `setIsEditingPhone(false)` with no `updatePhoneNumber(user.id, digits, countryCode)` call from `api/auth.js`. (Was BUG-006 in `BUGS_AND_ISSUES.md`)

---

### BUG-034 — Email Edit Input Below 16px Triggers iOS Auto-Zoom
**File:** `src/pages/Account.jsx` line 154
**Severity:** Medium — layout breaks on iOS when editing email

**Problem:**
```jsx
<input type="email" className="... text-xs ..." />
```
`text-xs` = 12px. iOS Safari auto-zooms the viewport on any `<input>` with font-size below 16px. This shifts the entire layout and does not restore automatically on all devices.

**Fix:** Use `text-sm` (14px) or add `style={{ fontSize: '16px' }}` to the input.

---

### BUG-035 — Notifications, Ringtone, Creator Mode Not Loaded or Saved to Supabase
**File:** `src/pages/Account.jsx` lines 28–38, 282–333, 342–368
**Severity:** High — all preference settings reset on every app restart
**Note:** Was BUG-010 (notifications/ringtone) and BUG-011 (creator mode) in `BUGS_AND_ISSUES.md`

**Problem:**
The `users` table has columns `notifications_enabled`, `selected_ringtone`, and `creator_mode_enabled`, but:
- None are fetched from Supabase on mount (`loadUserProfile` only reads `phone_number` and `country_code`)
- None are written back to Supabase when the user toggles them
- All three are pure local `useState` that disappear on reload

**Fix:**
1. Extend `loadUserProfile` to also select these three columns
2. Add a Supabase `update` call inside each toggle handler

---

### BUG-036 — Creator Mode AnimatePresence Placed Inside Conditional (Exit Animation Never Runs)
**File:** `src/pages/Account.jsx` lines 298–333
**Severity:** Low — collapse animation is broken

**Problem:**
```jsx
{creatorMode && (           // ← AnimatePresence is nested INSIDE the condition
  <AnimatePresence>
    <motion.div exit={{ opacity: 0, height: 0 }}>...</motion.div>
  </AnimatePresence>
)}
```
When `creatorMode` becomes `false`, the entire block including `AnimatePresence` unmounts immediately. The `exit` animation on the `motion.div` never fires because `AnimatePresence` is gone before it can orchestrate the exit.

**Fix:** Move `AnimatePresence` outside the condition:
```jsx
<AnimatePresence>
  {creatorMode && (
    <motion.div exit={{ opacity: 0, height: 0 }}>...</motion.div>
  )}
</AnimatePresence>
```

---

### BUG-037 — Creator Mode Toggle Has No Effect on App UI
**File:** `src/pages/Account.jsx` lines 283–296
**Severity:** Medium — feature appears to work but does nothing

**Problem:**
`creatorMode` and `showWatermark` are local state inside Account.jsx. No other component reads these values. Enabling Creator Mode does not:
- Change any UI layout
- Add a watermark anywhere on screen
- Modify any recording-optimized layout
- Persist to context or Supabase

The toggle is purely cosmetic — it animates on/off but has zero effect on the app.

**Fix:** Move `creatorMode` and `showWatermark` into `AppContext` so other pages can read and respond to them.

---

### BUG-038 — Support Email Uses Wrong Domain (Old Product Name)
**File:** `src/pages/Account.jsx` line 397
**Severity:** Low — support emails go to wrong address

**Problem:**
```jsx
onClick={() => window.location.href = 'mailto:support@gocall.app'}
```
Domain `gocall.app` is a leftover from a previous product. The app is now CueOut/Cueout.

**Fix:** Update to the correct support email address.

---

### Info Links

---

### BUG-020 — Account Screen Info Links Show Browser `alert()` Instead of Real Content
**File:** `src/pages/Account.jsx` lines 382–399
**Severity:** High — three tappable items trigger a native browser alert dialog, which is broken UX on iOS

**Problem:**
```js
onClick={() => alert('Opening help documentation...')}
onClick={() => alert('Opening privacy policy...')}
onClick={() => alert('Opening terms of use...')}
```
All three items — "How CueOut Works", "Privacy Policy", and "Terms of Use" — fire a raw `alert()` call. On iOS inside a WKWebView (Capacitor), `alert()` looks broken and unprofessional. These are placeholder stubs with no real content behind them. Support opens a `mailto:` link which may silently fail if no mail client is configured.

**Fix:** Replace each `alert()` with a full-screen modal or in-app WebView containing the actual content. At minimum, link to hosted web pages for Privacy Policy and Terms.

---

### Caller ID Manager

---

### BUG-021 — Caller ID Name Input Triggers Auto-Zoom on iOS
**File:** `src/pages/Account.jsx` line 467
**Severity:** Medium — the entire page zooms in when the user taps a Caller ID name field on iPhone, breaking the modal layout

**Problem:**
```jsx
<input
  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm ..."
/>
```
`text-sm` = 14px. iOS Safari and WKWebView automatically zoom in on any input field with `font-size` below 16px to improve readability. This causes an unintended zoom that misaligns the modal and makes it hard to restore the original zoom level.

**Fix:** Set the input font size to at least 16px:
```jsx
className="... text-base ..."
// or in CSS:
font-size: 16px;
```

---

### Keyboard / Layout

---

### BUG-022 — Tab Bar Disappears When Keyboard Opens or During Page Scroll on iOS ✅ CONFIRMED
**File:** `src/pages/Layout.jsx` line 70, `src/pages/Account.jsx`
**Severity:** High — the bottom tab bar vanishes on two confirmed triggers

**Confirmed by user testing:** Tab bar disappears both when keyboard opens AND when scrolling any screen.

**Problem:**
The tab bar is positioned using `absolute bottom-0` inside a `h-[100dvh]` container. Two separate iOS triggers cause the same failure:

1. **Keyboard open:** WKWebView viewport shrinks when the keyboard appears. `100dvh` recalculates to exclude the keyboard area, pushing the `absolute bottom-0` tab bar off-screen.

2. **Page scroll:** On iOS, scrolling causes the Safari/WKWebView chrome (address bar, home indicator area) to dynamically resize. `dvh` (dynamic viewport height) changes mid-scroll, causing the container to resize and the `absolute bottom-0` tab bar to move off-screen during the animation.

**Fix:** Change the tab bar to `position: fixed; bottom: 0` with `padding-bottom: env(safe-area-inset-bottom)`. Fixed positioning is not affected by viewport height changes from keyboard or scroll chrome adjustments.

---

### Your Plan Card

---

### BUG-039 — Plan Card Shows Hardcoded Data — Full Subscription API Exists But Is Never Called
**File:** `src/pages/Account.jsx` lines 245–253 · `src/api/subscriptions.js`
**Severity:** High — plan status and call count are always wrong
**Note:** Was BUG-014 in `BUGS_AND_ISSUES.md`

**Problem:**
```jsx
<span>Free</span>          // hardcoded — never reads tier from subscriptions table
<span>1 of 2 left</span>  // hardcoded — never reads calls_remaining
```
`subscriptions.js` has 7 fully-built functions (`getSubscription`, `getSubscriptionStatus`, `canUseMethod`, `decrementUsage`, `updateSubscriptionTier`, `cancelSubscription`, `addTopUpCalls`). Not one is imported or called in Account.jsx. The plan card always shows "Free / 1 of 2 left" regardless of the user's actual subscription.

**Fix:** Call `getSubscription()` on mount in Account.jsx and use the returned `tier`, `calls_remaining`, and `calls_limit` to populate the card.

---

### BUG-040 — "Upgrade to Plus" Button Always Visible Regardless of Current Plan
**File:** `src/pages/Account.jsx` lines 256–263
**Severity:** Medium — Plus users see an upgrade prompt they've already acted on

**Problem:**
The upgrade button is unconditionally rendered. There is no check on whether the user is already on the Plus tier. A user who has upgraded would still see "Upgrade to Plus".

**Fix:** Conditionally render the button only when `subscription.tier !== 'plus'`. Show a "Manage Subscription" or "Active Plan" state for Plus users.

---

### BUG-041 — `decrementUsage()` Never Called After Scheduling — Call Limit Never Enforced
**File:** `src/pages/Home.jsx` · `src/api/subscriptions.js` line 62
**Severity:** High — Free plan users can schedule unlimited calls

**Problem:**
After a successful `scheduleCallAPI()` call, `decrementUsage('call')` is never invoked. The `calls_remaining` counter in the Supabase `subscriptions` table never decreases. Free plan users can bypass the 2-call limit entirely.

**Fix:** Call `decrementUsage('call')` inside the `.then()` block after `scheduleCallAPI()` resolves successfully in `Home.jsx`.

---

### BUG-042 — `canUseMethod()` Never Checked Before Scheduling — Plan Gate Missing
**File:** `src/pages/Home.jsx` `handleSchedule()` function
**Severity:** High — no enforcement of subscription limits at point of scheduling

**Problem:**
`handleSchedule()` only validates that the user has a verified phone number. It never calls `canUseMethod('call')` to check if the user still has calls remaining. The Free plan 2-call limit exists in the database but is completely unenforced in the UI.

**Fix:** Call `canUseMethod('call')` at the start of `handleSchedule()` and block scheduling with a "No calls remaining — upgrade to Plus" error if it returns `false`.

---

### BUG-043 — Stripe Payment Integration Completely Missing
**File:** `src/pages/Paywall.jsx` · `src/api/subscriptions.js` line 78
**Severity:** High — subscription upgrade flow has no functional payment step

**Problem:**
`updateSubscriptionTier(tier, billingCycle, stripeSubscriptionId)` expects a Stripe subscription ID, indicating Stripe is the intended payment processor. However:
- No Stripe SDK is installed in the project
- No payment sheet or checkout flow exists
- The Paywall "Continue with Plus" button has no `onClick` handler (BUG-095)
- No webhook handling exists for subscription events

The entire monetisation flow is a UI shell with no backend payment integration.

**Additional note:** For iOS App Store distribution, Apple requires In-App Purchase (IAP) for subscription features — Stripe alone is not permitted for digital goods on iOS.

---

### Creator Mode Card

---

### BUG-044 — No Watermark Component Exists — Watermark Toggle Does Nothing
**File:** `src/pages/Account.jsx` line 309 · entire codebase
**Severity:** Medium — advertised feature is completely unimplemented

**Problem:**
`showWatermark` state is toggled by a switch, but there is no `<Watermark />` component, no conditional overlay, and no code anywhere in the app that reads `showWatermark`. The toggle animates on and off but has zero visual effect.

**Fix:** Create a watermark overlay component (e.g. a semi-transparent "CueOut" badge) and render it conditionally in `Layout.jsx` based on a shared state value from `AppContext`.

---

### BUG-045 — Creator Mode Not Accessible to Other Pages (Local State Only)
**File:** `src/pages/Account.jsx` lines 28–29
**Severity:** Medium — feature cannot work by design

**Problem:**
`creatorMode` and `showWatermark` are declared as local `useState` inside Account.jsx. Even if other pages wanted to respond to Creator Mode (hide UI chrome, show watermark, etc.), they cannot — the value is not in `AppContext`, not in any context provider, and not in localStorage.

**Fix:** Move `creatorMode` and `showWatermark` into `AppContext` (or a dedicated `SettingsContext`) so Home, Layout, and History can read and respond to them.

---

### BUG-046 — Creator Mode and Preferences Not Loaded from Supabase on Mount
**File:** `src/pages/Account.jsx` lines 59–86
**Severity:** High — user preferences reset on every app restart
**Note:** Was BUG-011 (creator mode) and part of BUG-010 (notifications/ringtone) in `BUGS_AND_ISSUES.md`

**Problem:**
`loadUserProfile()` only fetches `phone_number` and `country_code`. The following columns exist in the `users` table but are never read:
- `creator_mode_enabled`
- `notifications_enabled`
- `selected_ringtone`

All three corresponding state values initialise from hardcoded defaults (`false`, `true`, `'Default'`) every session.

**Fix:** Extend the `.select()` in `loadUserProfile()` to include all preference columns and populate state from the returned values.

---

## History Screen

### Dead Code

---

### BUG-012 — History Page Uses Mock Data as Fallback
**File:** `src/pages/History.jsx` lines 21–87
**Severity:** Low — `mockHistory` array is defined but never used in the current render

The `mockHistory` array exists but since history now comes from `AppContext` and Luron API, it's dead code. Safe to remove.

---

### Total Calls Card

---

### BUG-047 — Total Calls Denominator Hardcoded as `/ 20` — Wrong for Free Plan Users
**File:** `src/pages/History.jsx` line 224
**Severity:** High — misleading plan usage display

**Problem:**
```jsx
{history.length} <span>/ 20</span>   // '/ 20' is hardcoded
```
Free plan limit is 2 calls, Plus plan limit is 20. All users see `/ 20` regardless of tier. A Free user sees `0 / 20` implying they have 20 calls available when they only have 2.

**Fix:** Load subscription data via `getSubscription()` and use `subscription.calls_limit` as the denominator. Conditionally hide or change the denominator based on plan tier.

---

### BUG-048 — Metric Mismatch: Lifetime Call Count Shown Against Monthly Plan Limit
**File:** `src/pages/History.jsx` lines 222–226
**Severity:** Medium — confusing and misleading UX

**Problem:**
"Total Calls" means all-time calls made. `/ 20` is a monthly plan limit. A Plus user who made 45 total calls would display `45 / 20`, implying they've exceeded their plan when they haven't.

**Fix:** Either show total calls without a denominator, or rename the card to "Calls This Month" and use `calls_remaining` / `calls_limit` from the subscription.

---

### BUG-049 — `getUserStats()` API Available But Never Called — Stats Computed from Incomplete Local Array
**File:** `src/pages/History.jsx` · `src/api/luronApi.js` line 303
**Severity:** Medium — inaccurate stats

**Problem:**
`luronApi.js` exports `getUserStats(userId)` which hits `GET /users/:userId/stats` and returns server-side accurate call totals. History.jsx ignores it and computes `history.length` from the local state array, which may be empty, partial, or stale.

**Fix:** Call `getUserStats(userId)` on mount alongside `syncHistoryWithAPI()` and use the returned `total_count` for the Total Calls card.

---

### BUG-050 — Previous User's Call History Shown to New Account — Privacy Data Leak ✅ CONFIRMED
**File:** `src/components/AppContext.jsx` line 38 · `src/api/luronApi.js` line 382
**Severity:** Critical — confirmed privacy data leak between users on the same device
**Previously described as:** "History lost on new device" — this is now confirmed to be far worse.

**Confirmed by user testing:** When signing up with a new account on the same device, the new user sees the complete call history of the previous user.

**Root cause (two compounding issues):**

1. **Shared localStorage `userId`:** `getUserId()` generates a random ID on first launch and stores it in `localStorage` as `'CueOut_user_id'`. `localStorage` persists across accounts on the same device. When User B signs up or logs in, `getUserId()` returns the **same ID that was generated for User A** — so the Luron API returns User A's entire call history to User B.

2. **AppContext never resets on account switch:** `AppContext` loads data once on mount (`useEffect([], [])`) and has no subscription to auth changes (see BUG-004). When User A logs out and User B logs in, `AppContext` keeps User A's `history`, `upcomingCalls`, and `quickSchedules` arrays in React state — no reset, no re-fetch. User B sees User A's data without any API call.

**Privacy impact:** Any user on a shared device (family members, handed-off phone, second account) can view every call a previous user has ever scheduled, including their phone number, persona choices, and context notes.

**Fix:**
1. Tie the Luron `userId` to `user.id` from Supabase Auth — never use anonymous localStorage IDs
2. Clear all AppContext state on logout and re-fetch on login: add `user` from `AuthContext` as a `useEffect` dependency and reset state arrays to `[]` when `user` becomes `null`

---

### BUG-025 — History Count Shows Duplicates During Local + API Sync Window
**File:** `src/components/AppContext.jsx` lines 209–230, `src/pages/History.jsx` line 110
**Severity:** Medium — misleading stats shown to the user

**Problem:**
When a call completes locally (via `handleCompleteCall` on Home), `addToHistory()` adds it to the `history` array immediately. When the user then opens the History page, `syncHistoryWithAPI()` fires and fetches from the Luron API — which also contains that same call. Since `setHistory(mappedHistory)` replaces the array with Luron data, in most cases this resolves itself. However, the brief window between `addToHistory` and the sync completing shows an inflated count. Furthermore, if the same call appears in both the local Supabase `call_history` (via `addToHistory`) and the Luron API response, and if Supabase history is ever merged back in, it produces a permanent duplicate.

**Note:** This is related but distinct from BUG-057. BUG-025 is about the temporary duplicate count during the local+API window. BUG-057 is about the full replacement wiping locally-added items.

**Fix:** Do not call `addToHistory()` locally when a call completes. Rely solely on `syncHistoryWithAPI()` to populate history from the authoritative Luron API source.

---

### This Week Card

---

### BUG-051 — `completedAt` Undefined Causes Silent NaN — Stats Cards Show Inconsistent Counts
**File:** `src/pages/History.jsx` lines 244–249 · `src/components/AppContext.jsx` line 319
**Severity:** Medium — Total Calls and This Week counts are inconsistent

**Problem:**
```js
completedAt: apiCall.created_at   // can be null/undefined from Luron API
```
`new Date(undefined)` → `Invalid Date`. `Invalid Date - now` → `NaN`. `NaN < threshold` → `false`.

Calls with no `created_at` are **excluded from "This Week"** but **still counted in Total Calls** (`history.length` counts all items including those with missing dates). The two stat cards show different subsets of the same data.

**Fix:** Guard the filter: `if (!h.completedAt) return false;` before the date calculation.

---

### BUG-052 — "This Week" Uses Rolling 7-Day Window, Not Calendar Week
**File:** `src/pages/History.jsx` lines 244–249
**Severity:** Low — minor logic inconsistency

**Problem:**
The filter computes `diff < 7 * 24 * 60 * 60 * 1000` (last 168 hours). A call made last Monday at 6pm vanishes from "This Week" on this Monday at 6pm — not at midnight. Users would see the count drop mid-day unexpectedly.

**Fix:** Calculate the start of the current calendar week (Monday 00:00) and filter from that timestamp instead.

---

### BUG-053 — No Loading State on Stat Cards — Both Show `0` While Fetching
**File:** `src/pages/History.jsx` lines 208–253
**Severity:** Low — poor perceived performance

**Problem:**
Both stat cards render `history.length` and `history.filter().length` immediately on mount. During `syncHistoryWithAPI()` (which may take 1–3 seconds), both cards show `0` with no skeleton or spinner — looks like an empty account before data arrives.

**Fix:** Show a loading skeleton or placeholder (`—`) in both stat cards while `isLoadingHistory` is true.

---

### Recent Activity

---

### BUG-054 — History Items Show Time Only — No Date Context
**File:** `src/pages/History.jsx` line 333
**Severity:** Medium — older history items have no meaningful timestamp

**Problem:**
```jsx
scheduledTime: new Date(call.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
```
Every history item shows only `"3:05 PM"` — no day or date. Yesterday's call, last week's call, and a month-old call all look the same in the list.

**Fix:** Use a relative format: "Today 3:05 PM", "Yesterday 11:42 AM", or "Dec 28 · 2:15 PM" for older items.

---

### BUG-055 — `Invalid Date` Rendered Visibly When `completedAt` Is Missing
**File:** `src/pages/History.jsx` line 333
**Severity:** Medium — broken UI in production

**Problem:**
`new Date(undefined).toLocaleTimeString()` returns the string `"Invalid Date"` which is passed as `scheduledTime` and rendered directly in the history row. Users see `"Invalid Date"` as the call timestamp.

**Fix:** Guard with a fallback: `call.completedAt ? new Date(call.completedAt).toLocaleTimeString(...) : 'Unknown time'`.

---

### BUG-056 — `personaName` Shows Raw Lowercase API ID Instead of Display Name
**File:** `src/components/AppContext.jsx` line 317 · `src/pages/History.jsx` line 336
**Severity:** Medium — broken display text in history list

**Problem:**
```js
// In syncHistoryWithAPI():
personaName: apiCall.persona_type   // value: "manager", "friend", "mom"

// In History.jsx render:
personaName: call.personaName || call.persona   // both fallbacks are the same raw ID
```
The history list shows "manager", "friend", "boss" in lowercase instead of "Manager", "Friend", "Boss".

**Fix:** In `syncHistoryWithAPI()`, map `persona_type` through the existing `getPersonaIcon` map or a separate display name map to produce proper capitalised names.

---

### BUG-057 — `syncHistoryWithAPI()` Fully Replaces History Array — Locally-Added Items Lost
**File:** `src/components/AppContext.jsx` line 332
**Severity:** High — call history disappears when History tab is opened
**Note:** Was BUG-024 in `BUGS_AND_ISSUES.md`

**Problem:**
```js
// Comment says "Merge with local history" but code does the opposite:
setHistory(mappedHistory);   // full replacement
```
Any calls added via `addToHistory()` (when a countdown timer fires on the Home screen) are wiped the moment the user navigates to the History tab and `syncHistoryWithAPI()` runs.

**Note:** This is related but distinct from BUG-025. BUG-057 is about complete replacement wiping local items. BUG-025 is about temporary duplicate inflation during the sync window.

**Fix:** Merge instead of replace: combine Luron API results with local-only items that don't have a matching `call_id` in the API response.

---

### BUG-058 — History Fetch Errors Are Silent — No UI Feedback to User
**File:** `src/pages/History.jsx` lines 107–115
**Severity:** Medium — user sees empty list with no explanation

**Problem:**
When `syncHistoryWithAPI()` fails, `apiError` is set in AppContext but History.jsx never reads it. The loading spinner disappears and the user sees an empty list or stale data with no error message.

**Fix:** Read `apiError` from `useApp()` and display an inline error banner in the Recent Activity section when the fetch fails.

---

### BUG-059 — No Manual Refresh — History Only Loads Once on Mount
**File:** `src/pages/History.jsx` line 102 (`useEffect(fetchHistory, [])`)
**Severity:** Low — stale data with no recovery path

**Problem:**
History is fetched once when the component mounts (empty dependency array). If a call completes while the user is on the History tab, the new entry never appears. There is no pull-to-refresh or refresh button.

**Fix:** Add a refresh button in the header or implement pull-to-refresh using a scroll event on the container.

---

### Quick Presets

---

### BUG-023 — Quick Preset Tap in History Does Nothing; User Sees Blank "New Preset"
**File:** `src/pages/History.jsx` line 270, `src/components/AppContext.jsx` line 35
**Severity:** High — the Quick Presets feature appears completely broken on first launch

**Problem:**
Due to BUG-002 (auth state crash), `AppContext` falls back to `loadFromLocalStorage()` on mount. However, `loadFromLocalStorage()` does not define a fallback for `quickSchedules` — it sets an empty array:
```js
setQuickSchedules(savedSchedules ? JSON.parse(savedSchedules) : []);
```
If the user has never saved a quick schedule, the presets row renders empty with only the `+ New` button visible. The user taps `+ New` thinking it is a preset, which creates a blank "New Preset" and immediately opens the edit modal — making it appear as if something is broken.

Additionally, `promoteQuickSchedule` uses `if (index <= 0) return prev` — if a preset is already at position 0, tapping it silently does nothing even though navigation to Home should still fire.

**Fix:**
1. Provide default quick schedules in the localStorage fallback (same as `initializeDefaultQuickSchedules`).
2. Fix `promoteQuickSchedule` to always fire `navigate` regardless of the schedule's current position.

---

### BUG-060 — Settings Gear Is a `<div>` Nested Inside `<motion.button>` — Invalid HTML + Event Conflict
**File:** `src/pages/History.jsx` lines 271–291
**Severity:** High — edit action may trigger call scheduling simultaneously

**Problem:**
```jsx
<motion.button onClick={() => handleQuickCall(option)}>   // schedules a call
  <div onClick={(e) => handleEditSchedule(e, option)}>    // opens edit modal
    <Settings />
  </div>
</motion.button>
```
A clickable `<div>` inside a `<button>` is invalid HTML. `e.stopPropagation()` is not called on the inner `<div>`. On iOS WebKit, the inner click can bubble through to the outer button, causing **both** the edit modal to open AND a call to be scheduled simultaneously when tapping the gear icon.

**Fix:** Replace the inner `<div>` with a `<button>` element and add `e.stopPropagation()`.

---

### BUG-061 — Settings Gear Invisible on iOS — Presets Cannot Be Edited or Deleted on Touch Devices
**File:** `src/pages/History.jsx` line 283
**Severity:** Critical — core feature inaccessible on the primary target platform

**Problem:**
```jsx
className="... opacity-0 group-hover:opacity-100 ..."
```
The settings gear is hidden with `opacity-0` and only revealed by `group-hover`. Hover states do not exist on iOS touch devices. On iPhone, the gear icon is **permanently invisible** — users have no way to edit or delete any Quick Preset.

**QA test:** Open History on iOS simulator → tap any preset card and hold — gear never appears. There is no long-press, swipe, or alternate gesture either.

**Fix:** On mobile, show the settings gear persistently (e.g., at `opacity-60`) or provide a long-press / swipe-left gesture to reveal edit/delete actions.

---

### BUG-062 — "New" Add Button Is Permanently 50% Opacity on iOS — Appears Disabled
**File:** `src/pages/History.jsx` line 297
**Severity:** Medium — affordance for creating presets looks broken on iOS

**Problem:**
```jsx
className="... opacity-50 hover:opacity-100 ..."
```
`hover:opacity-100` never fires on a touch device. The "New" button is always rendered at half opacity on iOS, making it look like a disabled or unavailable control.

**QA test:** Run on simulator → the "New" preset button always looks greyed out regardless of interaction.

**Fix:** Remove `opacity-50` / `hover:opacity-100` and use a consistent visible style, or use an `active:` variant for touch feedback instead.

---

### BUG-063 — `handleAddCustomPreset` Saves Preset Before User Configures It — Closing Without Saving Still Creates the Preset (CONFIRMED)
**File:** `src/pages/History.jsx` lines 177–195
**Severity:** High — every cancelled "New" creates a permanent ghost entry

**Confirmed by user testing.**

**Problem:**
```jsx
addQuickSchedule(newSchedule);   // saves to Supabase + local state IMMEDIATELY
setEditingSchedule(newSchedule); // modal opens after save already happened
```
The blank `"New Preset ✨"` with all default values is written to the database and local state the moment "New" is tapped — before the modal even opens. Two code paths confirm this:

1. **User taps "New" → closes modal with X (no Save)** → preset is already saved. Closing the modal calls `onClose={() => setEditingSchedule(null)}` which only clears the modal state. The preset in AppContext and Supabase is untouched. A "New Preset ✨" entry remains permanently in the list.

2. **User taps "New" → closes modal by tapping outside** → same result. Background tap calls `onClose`, not `onDelete`.

There is no cleanup on modal dismiss. The only way to remove the ghost entry is to reopen the edit modal (which requires the hover-only gear icon on iOS — BUG-061) and tap the trash icon.

**QA steps to reproduce:**
1. Open History screen
2. Tap the "New" preset button
3. Close the modal by tapping X or background — do NOT tap "Save Changes"
4. Observe: a "New Preset ✨" entry now appears in the Quick Presets list
5. Navigate away and return — the ghost preset persists

**Fix:** Do not call `addQuickSchedule()` on "New" tap. Instead, pass an unsaved draft object to `EditScheduleModal` and only call `addQuickSchedule()` inside the `onSave` handler when the user explicitly confirms.

---

### BUG-064 — `voices` Prop Passed to `EditScheduleModal` Is Never Used — Dead Prop
**File:** `src/pages/History.jsx` line 473 · `src/components/EditScheduleModal.jsx` line 13
**Severity:** Low — dead code / misleading

**Problem:**
```jsx
// History.jsx — passes voices from its own local array (james, alex, sophia...)
<EditScheduleModal voices={voices} ... />

// EditScheduleModal.jsx — does NOT destructure voices
export default function EditScheduleModal({ schedule, onSave, onClose, onDelete, personas })
```
`EditScheduleModal` imports `realisticVoices` and `characterVoices` directly from `constants.jsx`. The `voices` prop is silently ignored. The voice array in `History.jsx` (which uses non-API IDs like `james`, `alex`) has no effect.

**Fix:** Remove the `voices` prop from the `EditScheduleModal` call in History.jsx.

---

### BUG-065 — `personas[0]?.id` Used Before PersonaContext Loads — New Preset Gets Undefined Persona
**File:** `src/pages/History.jsx` line 185
**Severity:** Medium — preset created with invalid persona when context is slow

**Problem:**
```jsx
persona: personas[0]?.id || 'manager'
```
If `PersonaContext` hasn't finished loading when the user taps "New", `personas` is an empty array. `personas[0]` is `undefined`, so the preset silently falls back to the hardcoded string `'manager'`. If the user has deleted the manager persona, Home.jsx will receive an unresolvable persona ID and show no selected persona.

**Fix:** Disable the "New" button while `personas.length === 0`, or use the first loaded persona after a loading check.

---

### BUG-066 — Quick Preset Order Silently Reorders on Every Use — No User Control
**File:** `src/pages/History.jsx` line 122 · `src/components/AppContext.jsx` line 185
**Severity:** Medium — unexpected UX behaviour

**Problem:**
```jsx
const handleQuickCall = (option) => {
  promoteQuickSchedule(option.id);   // moves tapped preset to position 0
  navigate(...)
};
```
Every time a preset is tapped, it moves to the front of the list. A user who arranged presets in a deliberate order will find it constantly shuffled. There is no indication this is happening, no setting to disable it, and no way to manually reorder.

**QA test:** Create 3 presets → tap the third one → observe the list reorders → the tapped preset is now first.

**Fix:** Either document this as intentional "most-used first" behaviour with a visible indicator, or remove auto-reordering and let users drag to reorder manually.

---

### BUG-067 — No Empty State for Quick Presets — New Users See a Bare Section With No Explanation
**File:** `src/pages/History.jsx` lines 269–304
**Severity:** Medium — poor onboarding UX

**Problem:**
When `quickSchedules` is empty (new user or all presets deleted), the section renders only the greyed-out "New" button at 50% opacity with no label, description, or call-to-action. The section heading "Quick Presets" appears above essentially nothing.

**QA test:** Log in as a new user with no presets → History screen shows "Quick Presets" heading followed by a faint button with no context.

**Fix:** Show an empty state message such as "No presets yet. Add one from your call history or tap + to create."

---

### BUG-068 — No Preset Detail Visible on Card — User Cannot Tell What a Preset Does
**File:** `src/pages/History.jsx` lines 276–290
**Severity:** Medium — usability issue

**Problem:**
Each preset card shows only an icon (emoji) and a name (truncated to ~12 chars). There is no indication of:
- Which persona (Manager, Mom, Boss?)
- Contact method (call, text, email?)
- Timing (Now, 3 min, 5 min?)
- Voice selected

A user with 4 presets named "Work", "Quick", "Escape", "Boss" cannot distinguish what each one does without opening the edit modal — which is impossible on iOS (BUG-061).

**Fix:** Add a 1-line subtitle under the preset name (e.g., "📞 3 min · Emma") or show a tooltip on long-press.

---

### BUG-069 — Duplicate Presets Can Be Created Without Warning
**File:** `src/pages/History.jsx` lines 152–175 (`handleAddToQuickSchedule`)
**Severity:** Low — data quality issue

**Problem:**
`handleAddToQuickSchedule()` does not check if an identical preset already exists before calling `addQuickSchedule()`. Tapping "Add to Quick Schedule" on the same history item multiple times creates multiple identical entries in the list.

**QA test:** Open any history item detail → tap "Add to Quick Schedule" 3 times → 3 identical presets appear in the list.

**Fix:** Check for an existing preset with the same `persona`, `contactMethods`, and `voice` before adding, and show a "Already saved" toast instead.

---

### BUG-070 — No Scroll Indicator on Preset List — Users Don't Know More Presets Exist
**File:** `src/pages/History.jsx` line 269
**Severity:** Low — discoverability issue

**Problem:**
```jsx
style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
```
The scrollbar is hidden. `snap-x` snapping hides partial cards at the edge. With 4+ presets, there is no visual indicator (arrows, dots, fade gradient) that the list scrolls horizontally.

**QA test:** Add 5+ presets → on a narrow device, only 3 are visible — nothing indicates more exist to the right.

**Fix:** Add a right-edge fade gradient (`bg-gradient-to-r from-transparent to-black`) overlay to indicate overflow, or show a count badge ("4 presets").

---

## Schedule (Home) Screen

### Contact Method

---

### BUG-072 — Multi-Select Is Misleading — Only One Method Is Ever Sent to Luron API
**File:** `src/components/ContactMethodSelector.jsx` · `src/api/luronApi.js` lines 55–66
**Severity:** High — user selects multiple methods but only one is used silently

**Problem:**
`ContactMethodSelector` allows selecting Call + Text + Email simultaneously. However `mapContactMethodToType()` in luronApi.js uses strict priority:
```js
if (contactMethods.includes('call')) return 'call';   // call always wins
if (contactMethods.includes('text')) return 'text';
if (contactMethods.includes('email')) return 'email';
```
A user who selects Text + Email sees both highlighted with active styling, but only Text is sent to the API. The Email selection is silently dropped with no feedback.

**QA test:** Select Text + Email → tap Schedule Escape → only a text is scheduled. No indication Email was ignored.

**Fix:** Either enforce single-select, or visually communicate which method takes priority, or support multi-delivery on the backend.

---

### BUG-073 — Contact Method Label Always Says "call" Regardless of Selected Method
**File:** `src/pages/Home.jsx` line 397
**Severity:** Low — inconsistent copy

**Problem:**
```jsx
<label>How should we reach you for the call?</label>
```
This label is static. When Text or Email is the only selected method, the label still says "for the call" — contradicting the user's selection.

**Fix:** Dynamically update the label: "for the call", "for the text", "for the email", or "for your escape" when multiple are selected.

---

### Time Selection

---

### BUG-074 — `layoutId="timeChipBg"` Hardcoded — Animation Teleports When EditScheduleModal Is Open
**File:** `src/components/TimeChip.jsx` line 17
**Severity:** Medium — broken animation when modal and form are both rendered

**Problem:**
```jsx
<motion.div layoutId="timeChipBg" ... />
```
Framer Motion's `layoutId` creates a shared layout animation between ALL elements with that ID in the component tree. `EditScheduleModal` also renders `TimeChip` components. When the modal is open alongside the Home form, both sets of TimeChips share the same `"timeChipBg"` ID — the red pill animation teleports between the Home form chips and the modal chips instead of staying within its own set.

**Fix:** Pass a unique `layoutId` prop to `TimeChip` (e.g., `layoutId={id}` derived from context/parent) so each chip group has isolated animations.

---

### BUG-075 — "Now" Chip Has No Warning That It Means 5 Seconds
**File:** `src/api/luronApi.js` line 21 · `src/components/constants.jsx` line 2
**Severity:** Medium — user expectation mismatch

**Problem:**
```js
case 'now':
  scheduledTime = new Date(now.getTime() + 5000); // 5 seconds
```
The chip label is "Now" with no sub-label. Users reasonably expect an immediate call. In reality the call is queued for 5 seconds from scheduling. On slow connections or if the Luron API has cold-start latency (it's on Render free tier), the call may arrive significantly later than "now".

**Fix:** Add a sub-label to the chip: "Now (~5s)" or show a tooltip explaining the 5-second delay.

---

### BUG-076 — "Custom" Time Chip Shows Selected State But Time Value Is Never Captured ✅ CONFIRMED
**File:** `src/pages/Home.jsx` lines 773–792
**Severity:** High — user-set custom time is silently ignored
**Note:** Was BUG-005 and BUG-017 in `BUGS_AND_ISSUES.md`
**Confirmed by user testing:** User selected custom time "after 2 minutes" — call arrived after 10 minutes (the API default), not 2 minutes. Confirmed the custom value is fully discarded.

**Problem:**
```jsx
// Custom time modal input — completely uncontrolled
<input type="datetime-local" />   // no value prop, no onChange handler

// "Set Time" button
onClick={() => {
  setSelectedTime('custom');    // chip turns red ✓
  setShowCustomTime(false);     // modal closes ✓
  // the actual date picked is never read or stored ✗
}}
```
The user opens the modal, picks a date/time, taps "Set Time", and the "Custom" chip becomes selected — giving full visual confirmation the custom time was accepted. But `customDate` is always `null`. `calculateScheduleTime('custom', null)` defaults to 10 minutes. The call fires at the wrong time.

**QA test:** Select Custom → pick a date 3 days from now → tap Set Time → schedule → call fires in 10 minutes, not 3 days later.

**Fix:**
```js
const [customDateTime, setCustomDateTime] = useState('');

<input
  type="datetime-local"
  value={customDateTime}
  onChange={(e) => setCustomDateTime(e.target.value)}
/>

// when scheduling:
scheduleCallAPI({ customDate: customDateTime ? new Date(customDateTime) : null, ... });
```

---

### Persona Selector

---

### BUG-077 — Redundant `setOrderedPersonas` Call in useEffect — Dead State Update
**File:** `src/pages/Home.jsx` lines 97–109
**Severity:** Low — unnecessary code causing confusion

**Problem:**
```jsx
useEffect(() => {
  setOrderedPersonas((prev) => { return personas; });  // ← immediately overwritten below
  const selected = personas.find(p => p.id === selectedPersona);
  if (selected) {
    setOrderedPersonas([selected, ...rest]);  // ← only this one takes effect
  }
}, [personas]);
```
React batches state updates within the same synchronous block. The first `setOrderedPersonas` call is overwritten before a render occurs and has zero effect. It is dead code that adds confusion about intent.

**Fix:** Remove the first `setOrderedPersonas` call entirely.

---

### BUG-078 — PersonaCard Settings `<button>` Nested Inside Outer `<button>` — Invalid HTML
**File:** `src/components/PersonaCard.jsx` lines 17–43
**Severity:** High — both tap handlers can fire simultaneously on iOS

**Problem:**
```jsx
<button onClick={onClick}>                    // selects persona
  ...
  {selected && (
    <button onClick={handleSettingsClick}>    // navigates to PersonaSettings
      <Settings />
    </button>
  )}
</button>
```
Nesting `<button>` inside `<button>` is invalid HTML (W3C spec). On iOS WebKit, the inner button click propagates to the outer, causing both persona selection and navigation to PersonaSettings to fire at the same time.

**QA test:** Select a persona → tap the gear icon → both `onClick` (persona select) and `handleSettingsClick` (navigate) fire → user is navigated away unexpectedly.

**Fix:** Replace outer `<button>` with a `<div role="button">` or restructure so the settings button is a sibling, not a child.

---

### BUG-079 — PersonaCard Settings Gear Is 24×24px — Below iOS 44pt Minimum Touch Target
**File:** `src/components/PersonaCard.jsx` line 38
**Severity:** Medium — difficult to tap precisely on real device

**Problem:**
```jsx
<button className="... w-6 h-6 ...">  // 24×24px
  <Settings className="w-3 h-3" />
</button>
```
Apple HIG and WCAG both require a minimum 44×44pt interactive touch target. At 24px, users frequently miss the gear icon and accidentally trigger persona selection instead.

**Fix:** Increase the hit area to at least 44×44px using padding or a larger container.

---

### BUG-080 — "Add" Custom Persona Saves Before Configuration — Orphan Personas on Back Navigation
**File:** `src/pages/Home.jsx` lines 161–172
**Severity:** High — same pattern as BUG-063

**Problem:**
```jsx
addPersona(newPersona);                                  // saved immediately
navigate(createPageUrl('PersonaSettings'), { state: { persona: newPersona } });
```
A blank "Custom ✨" persona is written to PersonaContext and Supabase before the user configures it. If the user presses back from PersonaSettings without saving, the empty persona remains in the selector list permanently.

**QA test:** Tap "Add" persona → immediately press back → a "Custom ✨" persona card appears in the home screen selector.

**Fix:** Pass the draft persona to PersonaSettings without saving it, and only call `addPersona()` when the user confirms the save in PersonaSettings.

---

### Voice Selector

---

### BUG-016 — Duplicate Character Voice IDs, Wrong Label Shown in Advanced Row
**File:** `src/components/constants.jsx` lines 16–21
**Severity:** Medium — Jordan and Alex are the same voice, wrong name shown after selection

**Problem:**
```js
export const characterVoices = [
  { id: 'sarah',   name: 'Sophia', icon: '🌸' },
  { id: 'michael', name: 'Alex',   icon: '😎' },
  { id: 'emma',    name: 'Morgan', icon: '🎩' },
  { id: 'michael', name: 'Jordan', icon: '⚡' },  // ← same id as Alex
];
```
Alex and Jordan both have `id: 'michael'` — selecting either sends the same voice to the API.

Also `selectedVoiceData` uses `.find()` which returns the first match:
```js
const selectedVoiceData = [...realisticVoices, ...characterVoices].find((v) => v.id === selectedVoice);
```
Selecting Jordan returns `Michael` (realistic) instead of Jordan — the Advanced row shows the wrong name.

**Fix:** Give each character voice a unique display ID and map to the real API voice separately.

---

### BUG-018 — `selectedVoiceData` Can Be Undefined Causing Blank Advanced Row
**File:** `src/pages/Home.jsx` line 341
**Severity:** Low — Advanced options row shows blank name/icon/description

**Problem:**
```js
const selectedVoiceData = [...realisticVoices, ...characterVoices].find((v) => v.id === selectedVoice);
```
If `selectedVoice` holds a value not in either list (e.g. from an old saved preset), `selectedVoiceData` is `undefined`. The Advanced row then renders nothing:
```jsx
<p>{selectedVoiceData?.name}</p>         // blank
<div>{selectedVoiceData?.icon}</div>     // blank
```

**Fix:** Add a fallback:
```js
const selectedVoiceData = [...realisticVoices, ...characterVoices].find((v) => v.id === selectedVoice)
  || realisticVoices[0];
```

---

### Context Note

---

### BUG-081 — Note Textarea Uses `text-sm` (14px) — Triggers iOS Auto-Zoom on Focus
**File:** `src/pages/Home.jsx` line 484
**Severity:** Medium — layout shifts on every note interaction on iOS

**Problem:**
```jsx
<textarea className="... text-sm ..." />
```
`text-sm` = 14px. iOS Safari auto-zooms the viewport when focusing any input with font-size below 16px. The entire schedule form shifts and scales up, requiring the user to manually zoom back out.

**Fix:** Set `text-base` (16px) or add `style={{ fontSize: '16px' }}` to prevent auto-zoom.

---

### NOTE — BUG-015 in BUGS_AND_ISSUES.md Is Incorrect
**File:** `src/pages/Home.jsx` lines 263–286
**Status:** INVALID — closed

`setNote('')` is called before `scheduleCallAPI({ note, ... })`. BUG-015 claimed the note is sent as empty. This is **incorrect**. In JavaScript, `note` inside `scheduleCallAPI({ note })` is a closure-captured value from the current render. `setNote('')` schedules a React state update for the **next** render but does not change the value of the `note` variable in the current execution. The note IS sent correctly to the API.

**Action:** BUG-015 from `BUGS_AND_ISSUES.md` is invalid/closed. No fix required.

---

### Schedule Escape Button

---

### BUG-082 — `isScheduling` Set True Then Immediately False — Spinner Never Renders
**File:** `src/pages/Home.jsx` lines 231–258
**Severity:** Medium — loading feedback is broken

**Problem:**
```jsx
setIsScheduling(true);          // line 231

const newCall = { ... };
addUpcomingCall(newCall);       // synchronous optimistic update

setIsScheduling(false);         // line 257 — same synchronous block
setShowSuccess(true);
```
React 18 batches all state updates within the same event handler. `isScheduling` is set `true` then immediately `false` before React commits a single render. The button's disabled state and spinner never appear — the UI jumps straight from default to success.

**Fix:** Move `setIsScheduling(false)` into the `.then()` / `.catch()` of `scheduleCallAPI()`, not before it.

---

### BUG-083 — No Double-Tap Protection — Rapid Taps Create Multiple Duplicate Scheduled Calls
**File:** `src/pages/Home.jsx` line 608
**Severity:** High — users can accidentally spam real API calls

**Problem:**
Because `isScheduling` is never actually `true` at render time (BUG-082), the button is never disabled. Tapping "Schedule Escape" rapidly 3 times creates 3 identical upcoming call banners and fires 3 separate requests to the Luron API.

**QA test:** Tap "Schedule Escape" 5 times quickly → 5 banners appear, 5 API calls fire, 5 real AI calls will arrive.

**Fix:** Fix BUG-082 first (keep button disabled until API responds), and additionally debounce the `handleSchedule` function.

---

### Success Toast

---

### BUG-084 — Toast Fixed Width `w-[380px]` Overflows on iPhone SE (375px Viewport)
**File:** `src/pages/Home.jsx` line 641
**Severity:** Low — visual clipping on smaller devices

**Problem:**
```jsx
<motion.div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[380px]">
```
iPhone SE has a 375px viewport width. The toast is 380px — it overflows by 5px, causing the right edge to clip or triggering a horizontal scrollbar on the page.

**Fix:** Use `w-[calc(100%-2rem)]` or `max-w-[380px] w-full mx-4` to keep the toast within viewport bounds.

---

### BUG-085 — `bottom-32` Toast Position May Overlap Tab Bar on Small Devices
**File:** `src/pages/Home.jsx` line 641
**Severity:** Low — content overlap

**Problem:**
`bottom-32` = 128px from the bottom. The tab bar is ~80–90px + safe area inset. On iPhone SE or devices with a shorter screen, the success toast can sit directly on top of the tab bar, obscuring both.

**Fix:** Use `bottom-[calc(env(safe-area-inset-bottom)+6rem)]` or position relative to the tab bar height.

---

### Custom Time Modal

---

### BUG-086 — `datetime-local` Native Picker Renders Light Theme Inside Dark Modal on iOS
**File:** `src/pages/Home.jsx` line 773
**Severity:** Low — visual inconsistency on iOS

**Problem:**
```jsx
<input type="datetime-local" className="bg-zinc-800 ..." />
```
On iOS, `datetime-local` inputs trigger the native date picker wheel, which renders with iOS system styling (light background, system font). The input container is dark (`bg-zinc-800`) but the activated picker is light — creating a jarring visual clash in the middle of a dark modal.

**Fix:** Consider a custom date picker UI library styled to match the dark theme, or add a note that this is a known iOS limitation.

---

### Caller ID Selector

---

### BUG-087 — "Use random number" Label Is Inaccurate — Behavior Is Server-Determined
**File:** `src/components/CallerIDSelector.jsx` line 56
**Severity:** Low — misleading copy

**Problem:**
```jsx
<p className="text-xs text-zinc-500">Use random number</p>
```
Selecting null sends `caller_id: null` to the Luron API. The actual number shown on the user's phone is determined entirely by the Luron backend. It may be a fixed pool number, the service's own number, or carrier-assigned — not necessarily "random". The label sets incorrect expectations.

**Fix:** Change to "Use default number" or "Let the service choose".

---

## Paywall Screen

### Background / Animation

---

### BUG-088 — `animate-pulse blur-3xl` Fixed Full-Screen Elements Cause GPU/Battery Drain on Older iOS
**File:** `src/pages/Paywall.jsx` line 78
**Severity:** Medium — performance regression on older devices

**Problem:**
```jsx
<div className="fixed inset-0 overflow-hidden pointer-events-none">
  <div className="absolute ... blur-3xl animate-pulse opacity-20" />
  <div className="absolute ... blur-3xl animate-pulse opacity-20" />
</div>
```
Two full-screen blurred, pulsing `fixed` elements run a CSS animation continuously for the entire time the Paywall is mounted. `blur-3xl` is GPU-intensive on its own; combined with `animate-pulse` (repeated opacity transitions), this causes constant compositing work. On iPhone XR/11 and older, this can produce visible frame drops and accelerated battery drain.

**Fix:** Replace the CSS animation with a static low-opacity gradient overlay, or throttle with `prefers-reduced-motion` media query.

---

### Billing Toggle

---

### BUG-089 — Billing Toggle Resets to Monthly on Every Open — No State Persistence
**File:** `src/pages/Paywall.jsx`
**Severity:** Low — minor UX annoyance

**Problem:**
The `isYearly` toggle state is local (`useState(false)`). Every time the user dismisses and reopens the Paywall, the toggle resets to Monthly even if they previously switched to Yearly to review pricing.

**Fix:** Persist `isYearly` preference in `localStorage` or pass it as a prop from the parent component.

---

### BUG-029 — Monthly / Yearly Toggle Only Updates Price Display — Selection Is Never Consumed by Purchase Handler
**File:** `src/pages/Paywall.jsx` lines 66, 124–149
**Severity:** High — user selects a billing plan but it is silently discarded

**Problem:**
```js
const [billingCycle, setBillingCycle] = useState('monthly');
```
The `billingCycle` state drives the price display correctly (`$9.99/month` vs `$89.99/year`). However since the "Continue with Plus" button has no `onClick` (BUG-095), the selected billing cycle is never passed to any purchase function. A user who deliberately switches to Yearly to save money gets no acknowledgment and the selection has zero effect on what happens next.

**Note:** This is related but distinct from BUG-089. BUG-029 is that `billingCycle` state is never consumed by any purchase handler. BUG-089 is that the toggle resets to Monthly on every open.

**Fix:** Pass `billingCycle` into the purchase handler so the correct product ID (monthly vs annual subscription) is used when initiating the payment.

---

### Feature Cards

---

### BUG-090 — Feature Card Glow Uses `group-hover` Only — No Tap Feedback on iOS
**File:** `src/pages/Paywall.jsx`
**Severity:** Low — missing touch affordance on primary platform

**Problem:**
```jsx
<div className="... group-hover:border-purple-500/50 group-hover:bg-purple-500/5">
```
The glow/border highlight on feature cards is `group-hover` only. iOS Safari does not fire `:hover` on tap — it requires a persistent touch hold. Users tapping feature cards on iPhone get no visual feedback that the card is interactive.

**Fix:** Add `active:border-purple-500/50 active:bg-purple-500/5` for tap feedback, or use a `motion.div` with `whileTap` scale.

---

### BUG-091 — "Top up anytime" Feature Claim — Top-Up Flow Does Not Exist
**File:** `src/pages/Paywall.jsx` (plus-features list)
**Severity:** High — false feature claim visible on upgrade screen

**Problem:**
The Plus features list includes "Top up anytime" as a selling point. `subscriptions.js` has an `addTopUpCalls()` function defined but it is never called anywhere in the app. There is no top-up UI (no button, no modal, no flow). A user who upgrades based on this claim cannot access the feature.

**Fix:** Remove "Top up anytime" from the feature list until the top-up flow is built, or implement the flow.

---

### Free vs Plus Comparison

---

### BUG-092 — `included: false` on "Standard call speed" in Free Plan — Logic Is Inverted
**File:** `src/pages/Paywall.jsx` line 50
**Severity:** Medium — misleading feature comparison UI

**Problem:**
```js
{ text: 'Standard call speed', included: false }
```
"Standard call speed" in the Free features array has `included: false`, which renders it with a red ✗ icon. This reads as "Free plan does NOT have standard call speed" — the opposite of the truth. The intent was likely to contrast Free (standard speed) vs Plus (priority speed).

**Fix:** Set `included: true` for "Standard call speed" on Free. Or replace with two rows: Free gets `{ text: 'Standard call speed', included: true }` and Plus gets `{ text: 'Priority call speed', included: true }`.

---

### BUG-093 — Feature List Truncated with `.slice(0, 3)` — No Show-More Option
**File:** `src/pages/Paywall.jsx` line 184
**Severity:** Low — incomplete feature disclosure

**Problem:**
```jsx
{features.free.slice(0, 3).map((feature, index) => (
```
The Free (and Plus) feature list is sliced to 3 items with no expand control. Any features defined beyond index 2 are silently hidden.

**Fix:** Remove `.slice(0, 3)` or add a "Show all" expand toggle.

---

### BUG-094 — `key={index}` Used for Feature List Items — Unstable React Keys
**File:** `src/pages/Paywall.jsx` line 184
**Severity:** Low — React reconciliation warning in dev

**Problem:**
```jsx
{features.free.slice(0, 3).map((feature, index) => (
  <div key={index}>
```
Using array index as React key causes incorrect reconciliation when items reorder (e.g., toggling billing period). React will incorrectly reuse DOM nodes instead of re-rendering.

**Fix:** Use `key={feature.text}` since feature text strings are unique within each list.

---

### CTA / Purchase Button

---

### BUG-095 — "Continue with Plus" Button Has No `onClick` Handler — Tapping Does Nothing
**File:** `src/pages/Paywall.jsx` line 237
**Severity:** Critical — primary CTA is completely broken
**Note:** Was BUG-028 in `BUGS_AND_ISSUES.md`

**Problem:**
```jsx
<button className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 ...">
  <span>Continue with Plus</span>
  <ArrowRight />
</button>
```
The main upgrade button has no `onClick`. Tapping it produces no response — no payment sheet, no navigation, no toast. Silent failure on the most important action in the entire app.

**QA Steps:**
1. Navigate to Paywall (tap "Upgrade" in Account)
2. Tap "Continue with Plus"
3. **Expected:** Payment flow begins
4. **Actual:** Nothing happens

**Fix:** Implement an `onClick` handler. At minimum show a "Coming soon" toast. Long-term: integrate Apple IAP (StoreKit via Capacitor) or Stripe checkout.

---

### BUG-096 — "Billed through Apple ID" Is False — Apple IAP Is Not Implemented
**File:** `src/pages/Paywall.jsx` line 227
**Severity:** High — false statement, App Store review risk

**Problem:**
```jsx
<p className="text-xs text-zinc-400">Billed through Apple ID. Cancel anytime.</p>
```
There is no Apple In-App Purchase integration in the codebase. No `@capacitor/purchases`, no RevenueCat, no StoreKit references anywhere. "Billed through Apple ID" is fabricated copy. Apple App Store guidelines require that any subscription billing claims be accurate — this can cause App Store rejection or removal.

**Fix:** Remove this line until IAP is integrated. Replace with a neutral placeholder or hide the Paywall CTA entirely.

---

### BUG-097 — "Cancel anytime" — No Cancellation UI Exists Anywhere in the App
**File:** `src/pages/Paywall.jsx` line 227
**Severity:** Medium — false promise to user

**Problem:**
Same line as above: "Cancel anytime." There is no cancellation UI in Account or Settings. `subscriptions.js` has a `cancelSubscription()` function that is never called. A subscribed user cannot cancel from within the app.

**Fix:** Remove the claim until a cancellation flow exists, or add a deep link to the Apple subscriptions management page (`itms-apps://apps.apple.com/account/subscriptions`).

---

### Keep Free Plan

---

### BUG-030 — "Keep Free Plan" Navigates Back With No State Update or Confirmation
**File:** `src/pages/Paywall.jsx` line 242
**Severity:** Medium — dismissing the paywall gives no feedback and does not persist the user's free plan choice

**Problem:**
```jsx
<button onClick={() => navigate(-1)}>
  Keep Free Plan
</button>
```
Tapping "Keep Free Plan" navigates back to the previous screen. No state is updated, no preference is saved, and no confirmation is shown. The hardcoded "1/2 calls left" badge on the Home screen remains unchanged regardless. If the user navigates to the Paywall from multiple entry points and dismisses it, there is no way to track that they consciously chose to stay on the free plan, and the app will continue prompting them repeatedly.

**Fix:** On dismiss, mark the user's plan choice in state or Supabase (e.g. `free_plan_acknowledged: true`) and add a brief toast confirming "You're on the Free plan — 2 calls available".

---

### Legal Text

---

### BUG-098 — Legal Text Fails WCAG AA Contrast — `text-[10px] text-zinc-600` on Black
**File:** `src/pages/Paywall.jsx` lines 249–258
**Severity:** Medium — accessibility failure

**Problem:**
```jsx
<p className="text-[10px] text-zinc-600 leading-relaxed text-center">
  By continuing, you agree to our Terms of Service...
</p>
```
`text-zinc-600` (#52525b) on a near-black background gives approximately 3.4:1 contrast ratio. WCAG AA requires 4.5:1 for normal text (and 10px is well below the 18px large-text threshold). Also fails Apple HIG guidelines for readable text.

**Fix:** Use `text-zinc-400` (#a1a1aa) minimum (~7:1 on black). Also increase font size to at least 12px.

---

### BUG-099 — Legal "Terms" and "Privacy Policy" Are Plain `<span>` Elements — No Links
**File:** `src/pages/Paywall.jsx` lines 249–258
**Severity:** Medium — App Store rejection risk

**Problem:**
```jsx
<span className="underline">Terms of Service</span>
<span className="underline">Privacy Policy</span>
```
These are styled `<span>` elements with no `href` and no `onClick`. Tapping them does nothing. Apple App Store guidelines require that subscription paywalls link to accessible ToS and Privacy Policy documents.

**Fix:** Replace `<span>` with `<a href="...">` or add `onClick` that opens the URL via `window.open` or Capacitor Browser plugin.

---

### FeatureDetailModal

---

### BUG-100 — FeatureDetailModal Outer Element Is `<div>` Not `motion.div` — Exit Animations Never Fire
**File:** `src/components/FeatureDetailModal.jsx` line 106
**Severity:** Low — broken exit animation

**Problem:**
```jsx
return (
  <div>              {/* ← plain div, not motion.div */}
    <motion.div ...> {/* ← inner backdrop */}
```
The component is used inside `AnimatePresence` at the call site, but `AnimatePresence` requires the **direct child** to be a `motion.*` element with an `exit` prop. Because the outermost element is a plain `<div>`, the exit animation never runs — the modal disappears instantly on close.

**Fix:** Change the outermost `<div>` to `<motion.div>` and add matching `initial`/`animate`/`exit` props.

---

### BUG-101 — "Got It" in FeatureDetailModal Closes Modal Without Offering Purchase
**File:** `src/components/FeatureDetailModal.jsx`
**Severity:** Low — missed conversion opportunity

**Problem:**
The FeatureDetailModal is opened when a user taps a feature to learn more. The only available action is "Got it", which dismisses the modal and returns to the Paywall. There is no CTA inside the modal itself to drive the purchase.

**Fix:** Add a secondary "Continue with Plus" CTA inside the modal that closes the detail view and triggers the purchase flow.

---

### BUG-102 — No Monthly Equivalent Shown for Yearly Price — Reduces Perceived Value
**File:** `src/pages/Paywall.jsx`
**Severity:** Low — conversion best practice missing

**Problem:**
When "Yearly" is selected, only the annual total is shown (e.g., "$49.99/yr"). There is no breakdown of the effective monthly cost ("= $4.17/month"). Most subscription paywalls show the per-month equivalent to make the yearly deal feel tangible and worth switching to.

**Fix:** Below the annual price, render `= $${(annualPrice / 12).toFixed(2)}/month` when yearly billing is active.

---

## Code Quality

---

### BUG-013 — `window.getCallDetails` Debug Utility Left in Production
**File:** `src/api/luronApi.js` lines 397–402
**Severity:** Low — minor security/cleanliness issue

```js
if (typeof window !== 'undefined') {
  window.getCallDetails = getCallDetails;
  console.log('🔧 Debug: window.getCallDetails() is available for testing');
}
```
This exposes an internal API function on the global `window` object and logs to console in production. Should be removed or wrapped in a `dev` environment check.

---

## Config / Environment

---

### ENV-001 — No `.env` File in Repo (By Design, But Needs Documentation)

The `.env` is gitignored. New developers must manually create it from `.env.example`. The example file has placeholder values — the real Supabase URL format is not documented anywhere in the project.

Required `.env` format:
```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Phone Verification Screen

---

### BUG-103 — AI Call Delivers Wrong Persona/Content — Scheduled Meeting Call Sounds Like Mom ✅ CONFIRMED
**File:** `src/api/luronApi.js` (scheduleCall) · Luron backend
**Severity:** Critical — core product feature delivers wrong experience

**Confirmed by user testing:** User scheduled a call with a meeting/work persona and context note. The AI arrived speaking as if from Mom persona — greeting with "where are you right now?" unrelated to the scheduled context.

**Root cause (two possible paths):**

1. **Unknown persona type on Luron backend:** If the `persona_type` sent (e.g., `'coordinator'`, `'service'`) is not registered on the Luron API side, the API silently falls back to a default persona. The client sees a successful `call_id` response with no error, but the AI uses a different persona than requested.

2. **userId cross-contamination (BUG-050):** Since all users on the same device share the same anonymous `userId`, the Luron backend may associate the call with the wrong user context. If a previous user on the device had a Mom persona call scheduled, the Luron backend might serve the wrong context for the shared `userId`.

**QA steps to reproduce:**
1. Select Manager or Boss persona with context note "urgent meeting"
2. Schedule call for Now
3. Answer the call
4. **Expected:** AI introduces as manager/boss, references a meeting
5. **Actual:** AI speaks as Mom or unrelated persona

**Fix:**
- Confirm which persona IDs are supported on the Luron backend and map only to those IDs
- Add a fallback when Luron returns a call with a mismatched persona type
- Fix BUG-050 (shared userId) to eliminate cross-user context contamination

---

### BUG-104 — Phone OTP Verification Routes Through Conversational AI — Code Delivered Unreliably ✅ CONFIRMED
**File:** `src/api/verification.js` lines 75–89
**Severity:** Critical — core onboarding flow is broken and unreliable

**Confirmed by user testing:** Requested phone verification code. AI answered and asked "where are you? how can I help you today?" — conversational greeting instead of reading the code. The actual OTP code was eventually read out after approximately 1 minute.

**Root cause (code confirmed):**
```js
// verification.js line 75
const luronResponse = await scheduleLuronCall({
  userId,
  selectedPersona: 'customer_support',  // ← NOT a recognised Luron persona ID
  note: verificationMessage,             // ← treated as context hint, NOT a script
  ...
});
```

Three compounding problems:

1. **`'customer_support'` is not a valid Luron persona ID.** Luron falls back to its default conversational AI persona — which opens with a greeting like "where are you right now? how can I help you today?"

2. **The OTP instruction is passed as `note` (custom_instruction).** The Luron API treats `note` as a *context hint* for the AI, not a rigid script. The conversational AI may chat for 30–60 seconds before eventually reaching the OTP instruction in its response.

3. **The `verificationMessage` string says "Do not ask questions. Just say: Your CueOut verification code is X"** — but because it's treated as context, the AI ignores this directive and follows its conversational training first.

**Impact:**
- New users cannot reliably complete phone verification (the only gateway to scheduling calls)
- Some users may never receive the code if they hang up after 30s of conversation
- Some calls may deliver the wrong code if the AI paraphrases rather than reads digits exactly

**Fix — Use the native Luron `/verify` endpoint (confirmed available by client):**
The Luron API has a dedicated `POST /verify` endpoint that sends a 6-digit verification code via a phone call. This is the correct endpoint for OTP delivery — it is a deterministic system, not a conversational AI flow. The current code completely ignores this endpoint and routes OTP through `/schedule` instead.

Replace `verification.js` `sendVerificationCall()` to call `POST /verify` directly:
```js
// Replace scheduleLuronCall() with:
const response = await fetch(`${BASE_URL}/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: userId,
    phone_number: fullPhoneNumber
  })
});
```
The API will handle code generation, delivery, and return a `call_id`. The app-side code hashing and storage in `phone_verifications` table can be simplified or removed since the API manages the code lifecycle.

**Interim fix (while integrating `/verify`):**
Change `selectedPersona` to a valid Luron persona ID (e.g., `'service'`) and add a UI warning: "The call may take up to 60 seconds to connect."

---

### BUG-106 — Luron `/verify` Endpoint Never Integrated — App Ignores Native OTP API
**File:** `src/api/luronApi.js` · `src/api/verification.js`
**Severity:** Critical — the correct OTP endpoint exists but is completely unused

**Problem:**
The Luron API exposes a dedicated `POST /verify` endpoint specifically for sending 6-digit verification codes via phone call. This endpoint is designed for deterministic OTP delivery — not conversational AI. The current `luronApi.js` has **zero integration** with this endpoint. No function, no import, no call.

Instead, `verification.js` routes OTP through `POST /schedule` using `scheduleLuronCall()` with a conversational `custom_instruction` — the root cause of BUG-104 (AI goes off-script, 60-second delay).

**Gap in `luronApi.js`:**
```js
// These functions exist:
export async function scheduleCall(...)    // POST /schedule
export async function getHistory(...)      // GET  /history
export async function getCallDetails(...)  // GET  /history/:callId
export async function getUserStats(...)    // GET  /users/:userId/stats
export async function checkHealth(...)     // GET  /health

// This function is MISSING:
// export async function sendVerificationCode(...)  // POST /verify  ← NEVER BUILT
```

**Fix:** Add a `sendVerificationCode(userId, phoneNumber)` function to `luronApi.js` that calls `POST /verify`, then update `verification.js` to call it instead of `scheduleLuronCall()`.

---

### BUG-107 — Luron "Trigger Call" Endpoint Never Integrated — "Now" Calls Use Incorrect `/schedule` + 5s Delay
**File:** `src/api/luronApi.js` · `src/pages/Home.jsx`
**Severity:** High — immediate calls are unreliable and will always be late

**Problem:**
The Luron API has a dedicated **Trigger Call** endpoint for making a call immediately with custom instructions. The app ignores this and routes all "Now" calls through `POST /schedule` with a 5-second scheduled delay:

```js
case 'now':
  scheduledTime = new Date(now.getTime() + 5000); // 5 seconds
  break;
```

This is unreliable for two reasons:

1. **Render free-tier cold-start:** The Luron API is hosted on Render's free tier, which spins down after inactivity. A cold-start takes 30–90 seconds. When a user schedules a "Now" call and the API is sleeping, the API wakes up 60 seconds later — the `when` timestamp of 5 seconds ago has already expired. The call either fires immediately (ignoring the schedule) or is dropped entirely depending on backend handling.

2. **Wrong endpoint for the use case:** `/schedule` is designed for future scheduling. Immediate/triggered calls should use the Trigger Call endpoint, which processes the request synchronously without a `when` timestamp.

**QA impact:** "Now" calls are the most commonly used timing option. On any cold-start scenario, the call either arrives significantly late or not at all — directly contradicting the "Now" label.

**Fix:**
- Add a `triggerCall(userId, params)` function to `luronApi.js` that calls the Trigger Call endpoint
- In `Home.jsx`, when `selectedTime === 'now'`, call `triggerCall()` instead of `scheduleCall()`
- For all other timing options (3min, 5min, custom), continue using `scheduleCall()`

---

## Global iOS Issues

---

### BUG-105 — All Input Fields Below 16px Font-Size Trigger iOS Viewport Zoom — Affects Entire App ✅ CONFIRMED
**File:** Multiple files — `Account.jsx`, `Home.jsx`, `PhoneVerification.jsx`, `EditScheduleModal.jsx`
**Severity:** High — affects every form interaction across the app

**Confirmed by user testing:** Tapping any input field or form element causes the entire iOS screen to zoom in, shifting the layout.

**Problem:**
iOS Safari and WKWebView (Capacitor) automatically zoom the viewport when focusing any `<input>`, `<select>`, or `<textarea>` with `font-size` below 16px. Confirmed affected elements across the codebase:

| Screen | Element | Class | Size |
|---|---|---|---|
| Account | Email edit input | `text-xs` | 12px |
| Account | Caller ID name input | `text-sm` | 14px |
| Home | Context note textarea | `text-sm` | 14px |
| PhoneVerification | Phone number input | `text-base` (OK) | 16px ✓ |
| PhoneVerification | OTP digit inputs | `text-2xl` (OK) | 24px ✓ |
| EditScheduleModal | Preset name input | unknown | check needed |

**Fix (global):** Add to the global CSS:
```css
input, textarea, select {
  font-size: 16px !important;
}
```
Or audit every `<input>`, `<textarea>`, `<select>` in the app and change `text-xs` / `text-sm` to `text-base` or add `style={{ fontSize: '16px' }}`.

Also add to `index.html` viewport meta:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
```
Note: `maximum-scale=1` prevents all user-pinch zooming — only use this if intentional.

---

| ID | File / Component | Severity | Brief Description |
|---|---|---|---|
| BUG-001 | `.env` | Critical | Wrong Supabase dashboard URL in env |
| BUG-002 | `AppContext.jsx` | Critical | `isAuthenticated` import shadowed by state variable |
| BUG-026 | `luronApi.js`, `ContactMethodSelector.jsx` | Critical | Email calls never delivered — backend not implemented |
| BUG-050 | `AppContext.jsx`, `luronApi.js` | Critical | ✅ Privacy data leak — new user sees previous user's full history (was High) |
| BUG-061 | `History.jsx` | Critical | Preset settings gear permanently invisible on iOS |
| BUG-095 | `Paywall.jsx` | Critical | "Continue with Plus" button has no `onClick` |
| BUG-103 | `luronApi.js`, Luron backend | Critical | ✅ AI delivers wrong persona/content — meeting call sounds like Mom |
| BUG-104 | `verification.js` | Critical | ✅ OTP verification uses conversational AI — code unreliable, 60s delay |
| BUG-106 | `luronApi.js`, `verification.js` | Critical | Native Luron `/verify` endpoint never integrated — OTP routed through wrong endpoint |
| BUG-107 | `luronApi.js`, `Home.jsx` | High | Luron "Trigger Call" endpoint never integrated — "Now" calls use `/schedule` + 5s delay, fail on cold-start |
| BUG-019 | `index.css`, all pages | High | Safe area inset insufficient — content clips under status bar |
| BUG-020 | `Account.jsx` | High | Info links fire `alert()` instead of real content |
| BUG-023 | `History.jsx`, `AppContext.jsx` | High | Quick preset tap does nothing on first launch |
| BUG-027 | `History.jsx` | High | Repeat pending email still queues to same broken endpoint |
| BUG-029 | `Paywall.jsx` | High | Billing cycle selection never consumed by purchase handler |
| BUG-031 | `Account.jsx` | High | Hardcoded "John Doe" name and "J" avatar (was BUG-008/BUG-009) |
| BUG-032 | `Account.jsx` | High | Email edit saves to local state only (was BUG-007) |
| BUG-035 | `Account.jsx` | High | Notifications, ringtone, creator mode not loaded/saved (was BUG-010/BUG-011) |
| BUG-039 | `Account.jsx`, `subscriptions.js` | High | Plan card hardcoded — subscription API never called (was BUG-014) |
| BUG-041 | `Home.jsx`, `subscriptions.js` | High | `decrementUsage()` never called — call limit unenforced |
| BUG-042 | `Home.jsx` | High | `canUseMethod()` never checked — plan gate missing |
| BUG-043 | `Paywall.jsx`, `subscriptions.js` | High | Stripe / IAP completely missing |
| BUG-046 | `Account.jsx` | High | Creator mode and preferences not loaded from Supabase on mount (was BUG-011) |
| BUG-047 | `History.jsx` | High | Denominator hardcoded `/20` — wrong for free plan |
| BUG-105 | Multiple files | High | ✅ All inputs below 16px trigger iOS viewport zoom across entire app |
| BUG-057 | `AppContext.jsx` | High | `syncHistoryWithAPI()` fully replaces history — local items lost (was BUG-024) |
| BUG-060 | `History.jsx` | High | Settings gear `<div>` inside `<button>` — event conflict on iOS |
| BUG-063 | `History.jsx` | High | New preset saved before user configures it — ghost entries on cancel |
| BUG-072 | `ContactMethodSelector.jsx`, `luronApi.js` | High | Multi-select misleading — only one method sent to API |
| BUG-078 | `PersonaCard.jsx` | High | `<button>` inside `<button>` — invalid HTML, both handlers fire on iOS |
| BUG-080 | `Home.jsx` | High | Custom persona saved before configuration — orphan on back nav |
| BUG-083 | `Home.jsx` | High | No double-tap protection — rapid taps create duplicate calls |
| BUG-091 | `Paywall.jsx` | High | "Top up anytime" feature claim — flow does not exist |
| BUG-096 | `Paywall.jsx` | High | "Billed through Apple ID" — Apple IAP not implemented |
| BUG-003 | `AppContext.jsx` | Medium | `isAuthenticated` boolean starts false — Supabase writes silently skipped |
| BUG-004 | `AppContext.jsx` | Medium | `AppProvider` not aware of auth state changes |
| BUG-016 | `constants.jsx` | Medium | Duplicate character voice IDs — Jordan and Alex same voice |
| BUG-017 | `Home.jsx` | Medium | (Duplicate of BUG-076 — see BUG-076) |
| BUG-021 | `Account.jsx` | Medium | Caller ID input triggers auto-zoom on iOS |
| BUG-022 | `Layout.jsx` | High | ✅ Tab bar disappears on keyboard open AND during page scroll (was Medium) |
| BUG-025 | `AppContext.jsx`, `History.jsx` | Medium | Duplicate count during local+API sync window |
| BUG-030 | `Paywall.jsx` | Medium | "Keep Free Plan" dismisses with no state update |
| BUG-033 | `Account.jsx` | Medium | Phone edit state unreachable dead code; `handleSavePhone` also missing Supabase call (was BUG-006/BUG-033) |
| BUG-034 | `Account.jsx` | Medium | Email input `text-xs` triggers iOS auto-zoom |
| BUG-037 | `Account.jsx` | Medium | Creator mode toggle has no effect on app UI |
| BUG-040 | `Account.jsx` | Medium | "Upgrade to Plus" always visible even for Plus users |
| BUG-044 | `Account.jsx` | Medium | No watermark component — watermark toggle does nothing |
| BUG-045 | `Account.jsx` | Medium | Creator mode local state only — inaccessible to other pages |
| BUG-048 | `History.jsx` | Medium | Lifetime call count shown against monthly plan limit |
| BUG-049 | `History.jsx`, `luronApi.js` | Medium | `getUserStats()` never called — stats from incomplete local array |
| BUG-051 | `History.jsx`, `AppContext.jsx` | Medium | `completedAt` undefined causes NaN — stat cards inconsistent |
| BUG-054 | `History.jsx` | Medium | History items show time only, no date context |
| BUG-055 | `History.jsx` | Medium | "Invalid Date" rendered visibly when `completedAt` missing |
| BUG-056 | `AppContext.jsx`, `History.jsx` | Medium | `personaName` shows raw lowercase API ID |
| BUG-058 | `History.jsx` | Medium | History fetch errors silent — no UI feedback |
| BUG-062 | `History.jsx` | Medium | "New" preset button permanently 50% opacity on iOS |
| BUG-065 | `History.jsx` | Medium | `personas[0]` used before PersonaContext loads — undefined persona |
| BUG-066 | `History.jsx`, `AppContext.jsx` | Medium | Preset order reorders silently on every use |
| BUG-067 | `History.jsx` | Medium | No empty state for Quick Presets |
| BUG-068 | `History.jsx` | Medium | No preset detail visible on card |
| BUG-074 | `TimeChip.jsx` | Medium | `layoutId="timeChipBg"` hardcoded — animation teleports when modal open |
| BUG-075 | `luronApi.js`, `constants.jsx` | Medium | "Now" chip has no warning it means 5 seconds |
| BUG-079 | `PersonaCard.jsx` | Medium | Settings gear 24×24px — below iOS 44pt touch target |
| BUG-081 | `Home.jsx` | Medium | Note textarea `text-sm` triggers iOS auto-zoom |
| BUG-082 | `Home.jsx` | Medium | `isScheduling` set true then immediately false — spinner never renders |
| BUG-088 | `Paywall.jsx` | Medium | Full-screen `blur-3xl animate-pulse` causes GPU/battery drain on older iOS |
| BUG-092 | `Paywall.jsx` | Medium | `included: false` on "Standard call speed" — logic inverted |
| BUG-097 | `Paywall.jsx` | Medium | "Cancel anytime" — no cancellation UI exists |
| BUG-098 | `Paywall.jsx` | Medium | Legal text fails WCAG AA contrast |
| BUG-099 | `Paywall.jsx` | Medium | Legal "Terms" and "Privacy Policy" are plain `<span>` — no links |
| BUG-012 | `History.jsx` | Low | `mockHistory` dead code |
| BUG-013 | `luronApi.js` | Low | `window.getCallDetails` debug exposure in production |
| BUG-018 | `Home.jsx` | Low | `selectedVoiceData` can be undefined — blank Advanced row |
| BUG-036 | `Account.jsx` | Low | `AnimatePresence` inside condition — exit animation never runs |
| BUG-038 | `Account.jsx` | Low | Support email uses wrong domain (gocall.app) |
| BUG-052 | `History.jsx` | Low | "This Week" uses rolling 7-day window, not calendar week |
| BUG-053 | `History.jsx` | Low | No loading state on stat cards — both show 0 while fetching |
| BUG-059 | `History.jsx` | Low | No manual refresh — history loads once on mount only |
| BUG-064 | `History.jsx`, `EditScheduleModal.jsx` | Low | `voices` prop passed to EditScheduleModal is never used |
| BUG-069 | `History.jsx` | Low | Duplicate presets can be created without warning |
| BUG-070 | `History.jsx` | Low | No scroll indicator on preset list |
| BUG-073 | `Home.jsx` | Low | Contact method label always says "call" |
| BUG-077 | `Home.jsx` | Low | Redundant `setOrderedPersonas` call in useEffect |
| BUG-084 | `Home.jsx` | Low | Toast fixed width `w-[380px]` overflows on iPhone SE |
| BUG-085 | `Home.jsx` | Low | Toast `bottom-32` may overlap tab bar on small devices |
| BUG-086 | `Home.jsx` | Low | `datetime-local` picker renders light theme inside dark modal on iOS |
| BUG-087 | `CallerIDSelector.jsx` | Low | "Use random number" label inaccurate — behavior is server-determined |
| BUG-089 | `Paywall.jsx` | Low | Billing toggle resets to Monthly on every Paywall open |
| BUG-090 | `Paywall.jsx` | Low | Feature card glow `group-hover` only — no tap feedback on iOS |
| BUG-093 | `Paywall.jsx` | Low | Feature list sliced to 3 items — no show-more option |
| BUG-094 | `Paywall.jsx` | Low | `key={index}` used for feature list — unstable React keys |
| BUG-100 | `FeatureDetailModal.jsx` | Low | Outer element `<div>` not `motion.div` — exit animations never fire |
| BUG-101 | `FeatureDetailModal.jsx` | Low | "Got It" closes modal without offering purchase |
| BUG-102 | `Paywall.jsx` | Low | No monthly equivalent shown for yearly price |
| ENV-001 | `.env` | Config | `.env` format not documented for new developers |
