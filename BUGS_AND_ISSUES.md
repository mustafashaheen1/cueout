# CueOut — Bugs & Issues

---

## Critical Bugs (App Breaking)

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

### BUG-002 — `isAuthenticated` name conflict in `AppContext.jsx`
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

## Medium Bugs

### BUG-003 — `isAuthenticated` boolean used incorrectly throughout `AppContext.jsx`
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

### BUG-004 — `AppProvider` not aware of auth changes
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

### BUG-005 — Custom time picker does not capture the selected value
**File:** `src/pages/Home.jsx` lines 771–789
**Severity:** Medium — custom scheduling time always defaults, user input is ignored

**Problem:**
The custom datetime input has no `onChange` handler and no state variable to store the selected value:
```jsx
<input
  type="datetime-local"
  className="..."
  // No onChange, no value binding
/>
```
When "Set Time" is clicked, it just sets `selectedTime = 'custom'` without storing the actual selected datetime. The Luron API then defaults to 10 minutes.

**Fix:**
```js
const [customDateTime, setCustomDateTime] = useState('');
// ...
<input
  type="datetime-local"
  value={customDateTime}
  onChange={(e) => setCustomDateTime(e.target.value)}
/>
```
And pass `customDateTime` to `scheduleCallAPI` as `customDate`.

---

### BUG-006 — `Account.jsx` phone edit saves locally only
**File:** `src/pages/Account.jsx` line 106–109
**Severity:** Medium — phone number changes are not persisted to Supabase

**Problem:**
```js
const handleSavePhone = () => {
  setPhoneNumber(tempPhone); // only updates local state
  setIsEditingPhone(false);
  // No Supabase update call
};
```
Changes are lost on page refresh.

**Fix:** Call `updatePhoneNumber(user.id, digits, countryCode)` from `api/auth.js` inside `handleSavePhone`.

---

### BUG-007 — `Account.jsx` email edit saves locally only
**File:** `src/pages/Account.jsx` line 111–114
**Severity:** Medium — same issue as BUG-006 but for email

**Problem:**
```js
const handleSaveEmail = () => {
  setEmail(tempEmail); // only updates local state
  setIsEditingEmail(false);
  // No Supabase update call
};
```

**Fix:** Call `updateEmail(newEmail)` from `AuthContext` inside `handleSaveEmail`.

---

### BUG-008 — Account page shows hardcoded name "John Doe"
**File:** `src/pages/Account.jsx` line 136
**Severity:** Medium — always shows wrong name regardless of user

**Problem:**
```jsx
<h3 className="font-semibold text-base text-white">John Doe</h3>
```
The display name is hardcoded. There's no logic to fetch or show the actual user's name.

**Fix:** Use `user.email` or fetch a `full_name` field from the `users` Supabase table, or derive initials from email.

---

### BUG-009 — Avatar letter hardcoded to "J"
**File:** `src/pages/Account.jsx` line 132
**Severity:** Low/Medium — cosmetic but always wrong

**Problem:**
```jsx
<div className="... text-xl font-bold">J</div>
```
The avatar initial is hardcoded as "J".

**Fix:** Derive from the user's email or name:
```js
const initial = user?.email?.[0]?.toUpperCase() || '?';
```

---

## Low Priority / UI Issues

### BUG-010 — Notifications & Ringtone settings not persisted
**File:** `src/pages/Account.jsx`
**Severity:** Low — user preferences lost on refresh

`notificationsEnabled` and `selectedRingtone` are local state only. They should be saved to Supabase via `toggleNotifications()` and `updateRingtone()` which already exist in `api/auth.js` but are never called.

---

### BUG-011 — Creator Mode not persisted
**File:** `src/pages/Account.jsx`
**Severity:** Low — same as BUG-010

`creatorMode` is local state. `toggleCreatorMode()` exists in `api/auth.js` but is not called.

---

### BUG-012 — History page uses mock data as fallback
**File:** `src/pages/History.jsx` lines 21–87
**Severity:** Low — `mockHistory` array is defined but never used in the current render

The `mockHistory` array exists but since history now comes from `AppContext` and Luron API, it's dead code. Safe to remove.

---

### BUG-013 — `window.getCallDetails` debug utility left in production
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

### BUG-014 — Free plan call count is hardcoded in UI
**File:** `src/pages/Home.jsx` line 367, `src/pages/Account.jsx` line 252
**Severity:** Low — shows "1/2 calls left" regardless of actual usage

```jsx
<span className="text-red-400 font-semibold">1/2 calls left</span>
```
```jsx
<span className="font-semibold text-sm text-red-400">1 of 2 left</span>
```
The remaining call count is hardcoded. It should read from the subscription/usage API.

---

## Advanced Options Bugs

### BUG-015 — Note cleared before being sent to Luron API
**File:** `src/pages/Home.jsx` lines 262–273
**Severity:** Critical — call context is always empty, user's note never reaches the AI

**Problem:**
```js
setNote('');           // ← state cleared first

scheduleCallAPI({
  note,                // ← captures already-cleared value ''
  ...
})
```
`setNote('')` runs before `scheduleCallAPI`, so `note` is always `''` when sent to the API. The AI call never receives the user's context instruction.

**Fix:**
```js
const noteToSend = note;   // save before clearing
setNote('');

scheduleCallAPI({ note: noteToSend, ... });
```

---

### BUG-016 — Duplicate character voice IDs, wrong label shown in Advanced row
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

### BUG-017 — Custom datetime value never captured or sent to API
**File:** `src/pages/Home.jsx` lines 771–789 and line 270
**Severity:** Medium — custom time scheduling is completely broken

**Problem:**
```jsx
<input type="datetime-local" />  // no onChange, no value binding
```
And when scheduling:
```js
scheduleCallAPI({
  customDate: null,   // always null, never uses the picked time
  ...
})
```
User picks a custom time → value is discarded → Luron API defaults to 10 minutes.

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

### BUG-018 — `selectedVoiceData` can be undefined causing blank Advanced row
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

## Environment / Config Issues

### ENV-001 — No `.env` file in repo (by design, but needs documentation)
The `.env` is gitignored. New developers must manually create it from `.env.example`. The example file has placeholder values — the real Supabase URL format is not documented anywhere in the project.

Required `.env` format:
```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## UI / Device Issues

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

### BUG-022 — Tab Bar Disappears When Keyboard Opens in Caller ID Modal
**File:** `src/pages/Layout.jsx` line 70, `src/pages/Account.jsx`
**Severity:** Medium — the bottom tab bar vanishes when the user focuses any text input inside the Caller ID editor modal

**Problem:**
The tab bar is positioned using `absolute bottom-0` inside a `h-[100dvh]` container. When the iOS keyboard opens, the WKWebView viewport shrinks. The `100dvh` container recalculates to exclude the keyboard area, pushing the `absolute bottom-0` tab bar off-screen behind the keyboard. The tab bar is not actually hidden by code — it is visually pushed out of the visible area.

**Fix:** Use `position: fixed` for the tab bar container instead of `absolute`, or apply `interactive-widget=resizes-content` in the viewport meta tag so the layout is not affected by the keyboard.

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

## Paywall / Subscription Screen Issues

### BUG-028 — "Continue with Plus" Button Has No Handler — Purchase Flow Never Initiates
**File:** `src/pages/Paywall.jsx` line 237
**Severity:** Critical — the entire monetisation flow is non-functional

**Problem:**
The primary CTA button has no `onClick` handler attached:
```jsx
<button className="w-full bg-gradient-to-r from-red-500 to-red-600 ...">
  Continue with Plus
</button>
```
Tapping it does absolutely nothing — no payment sheet, no API call, no navigation, no feedback. Both the Monthly and Yearly billing cycle selections are also unused since no purchase function reads the `billingCycle` state. The button renders and looks functional but is a complete stub.

**Fix:** Implement an `onClick` handler that initiates the appropriate purchase flow (e.g. Apple In-App Purchase via Capacitor, or a Stripe/RevenueCat checkout) passing the selected `billingCycle` to determine which product ID to purchase.

---

### BUG-029 — Monthly / Yearly Toggle Only Updates Price Display — Selection Is Never Consumed
**File:** `src/pages/Paywall.jsx` lines 66, 124–149
**Severity:** High — user selects a billing plan but it is silently discarded

**Problem:**
```js
const [billingCycle, setBillingCycle] = useState('monthly');
```
The `billingCycle` state drives the price display correctly (`$9.99/month` vs `$89.99/year`). However since the "Continue with Plus" button has no `onClick` (BUG-028), the selected billing cycle is never passed to any purchase function. A user who deliberately switches to Yearly to save money gets no acknowledgment and the selection has zero effect on what happens next.

**Fix:** Pass `billingCycle` into the purchase handler so the correct product ID (monthly vs annual subscription) is used when initiating the payment.

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

## History Screen Issues

### BUG-024 — History Data Resets to Zero on Next App Session
**File:** `src/components/AppContext.jsx` line 332
**Severity:** High — all call history disappears when the user closes and reopens the app

**Problem:**
`syncHistoryWithAPI()` completely replaces the history array with whatever the Luron API returns:
```js
setHistory(mappedHistory);  // full replacement, not merge
```
The Luron API identifies users by `userId` stored in localStorage (`CueOut_user_id`). If localStorage is cleared, a new `userId` is generated and the Luron API returns an empty history for the new ID — wiping all previously displayed records. Additionally, if the API request fails for any reason (network, rate limit, server error), the error handler returns the existing `history` state, but if the state was already empty from the initial load, history stays empty permanently for that session.

**Fix:** Merge API results with locally cached history rather than replacing entirely. Keep a persisted `userId` tied to the Supabase user account rather than anonymous localStorage.

---

### BUG-025 — History Count Shows Duplicates (e.g. 2 Total Calls When Only 1 Made)
**File:** `src/components/AppContext.jsx` lines 209–230, `src/pages/History.jsx` line 110
**Severity:** Medium — misleading stats shown to the user

**Problem:**
When a call completes locally (via `handleCompleteCall` on Home), `addToHistory()` adds it to the `history` array immediately. When the user then opens the History page, `syncHistoryWithAPI()` fires and fetches from the Luron API — which also contains that same call. Since `setHistory(mappedHistory)` replaces the array with Luron data, in most cases this resolves itself. However, the brief window between `addToHistory` and the sync completing shows an inflated count. Furthermore, if the same call appears in both the local Supabase `call_history` (via `addToHistory`) and the Luron API response, and if Supabase history is ever merged back in, it produces a permanent duplicate.

**Fix:** Do not call `addToHistory()` locally when a call completes. Rely solely on `syncHistoryWithAPI()` to populate history from the authoritative Luron API source.

---

## Email Feature Issues

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

## Summary Table

| ID | File | Severity | Status |
|---|---|---|---|
| BUG-001 | `.env` | Critical | Fix: correct URL format |
| BUG-002 | `AppContext.jsx` | Critical | Fix: rename import |
| BUG-003 | `AppContext.jsx` | Medium | Fix: use AuthContext user |
| BUG-004 | `AppContext.jsx` | Medium | Fix: add auth dependency |
| BUG-005 | `Home.jsx` | Medium | Fix: bind datetime input |
| BUG-006 | `Account.jsx` | Medium | Fix: call Supabase on save |
| BUG-007 | `Account.jsx` | Medium | Fix: call updateEmail |
| BUG-008 | `Account.jsx` | Medium | Fix: use real user name |
| BUG-009 | `Account.jsx` | Low | Fix: derive initial from email |
| BUG-010 | `Account.jsx` | Low | Fix: persist to Supabase |
| BUG-011 | `Account.jsx` | Low | Fix: persist to Supabase |
| BUG-012 | `History.jsx` | Low | Remove dead mock data |
| BUG-013 | `luronApi.js` | Low | Remove debug window exposure |
| BUG-014 | `Home.jsx`, `Account.jsx` | Low | Fix: read from real API |
| BUG-015 | `Home.jsx` | Critical | Fix: save note before clearing |
| BUG-016 | `constants.jsx` | Medium | Fix: unique character voice IDs |
| BUG-017 | `Home.jsx` | Medium | Fix: bind datetime input + pass to API |
| BUG-018 | `Home.jsx` | Low | Fix: fallback to realisticVoices[0] |
| BUG-019 | `index.css`, all pages | High | Fix: add buffer to `pt-safe` |
| BUG-020 | `Account.jsx` | High | Fix: replace alert() with real content screens |
| BUG-021 | `Account.jsx` | Medium | Fix: set input font-size to 16px |
| BUG-022 | `Layout.jsx` | Medium | Fix: use fixed positioning for tab bar |
| BUG-023 | `History.jsx`, `AppContext.jsx` | High | Fix: default quick schedules + fix promote logic |
| BUG-024 | `AppContext.jsx` | High | Fix: merge history instead of replace |
| BUG-025 | `AppContext.jsx`, `History.jsx` | Medium | Fix: remove local addToHistory on completion |
| BUG-026 | `luronApi.js` | Critical | Fix: disable email UI until backend supports it |
| BUG-027 | `History.jsx` | High | Fix: block repeat + show warning for pending email |
| BUG-028 | `Paywall.jsx` | Critical | Fix: implement purchase onClick handler |
| BUG-029 | `Paywall.jsx` | High | Fix: pass billingCycle into purchase handler |
| BUG-030 | `Paywall.jsx` | Medium | Fix: persist free plan choice + show confirmation |
| ENV-001 | `.env` | Config | Document correct format |
