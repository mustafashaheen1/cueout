# CueOut iOS App — Issue Report & Development Proposal

Prepared following a full code review and QA audit of the current app.
All issues have been identified, tested, and verified against the live Luron API.

---

## Summary

The audit identified 30 issues grouped into four themes: account and data foundation, the core scheduling experience, history and plan management, and iOS-specific behaviour plus the monetisation system. Each phase below describes what the user currently experiences, what the problem is, and what work is needed. Backend work refers to Supabase database and server-side logic. UI work refers to the iOS app front end.

**Timeline is based on one developer working 6 hours per day, 5 days per week. Each phase includes time for testing and review.**

---

## Phase 1 — Account, Login & Data
**Timeline: Week 1–2 (including QA)**
*Everything related to the user's account, saved data, and profile. These issues affect every user on every screen.*

---

### 1. Data Never Saves to the Account (Affects Entire App)

**What the user experiences:**
Changes made in the app — scheduled calls, quick presets, preferences — appear to work within a single session. After closing and reopening the app, data may be missing or incomplete. The app behaves as if it is not connected to the user's account even when the user is logged in.

**Why it happens:**
A conflict in the app's login check causes it to always behave as if the user is logged out. Every save action silently writes to the device only, never to the account database.

**Work required:**
- **Backend:** Fix the login check conflict. This single fix unblocks all data saving across the entire app.
- **UI:** Verify all save actions correctly reach the database after the fix.

---

### 2. New User Sees Previous User's Call History — Privacy Issue ✅ Verified During Testing

**What the user experiences:**
When a second person signs up or logs in on the same device, they can see the complete call history of the previous user — including all past calls, scheduled times, and context notes.

**Why it happens:**
The app uses an anonymous device ID to identify users to the call system, not their actual account. A new user on the same device inherits that ID and sees all the data attached to it. The app also never clears its memory when a different user logs in.

**Work required:**
- **Backend:** Link each user's call data to their account ID, not the device.
- **UI:** Clear all stored data when a user logs out and reload fresh data when a new user logs in.

---

### 3. Email Address Changes Are Not Saved

**What the user experiences:**
The user edits their email address in Account settings and taps Save. The new email appears on screen for the current session. After closing and reopening the app, the old email is back.

**Why it happens:**
The save action updates what is displayed on screen but never updates the actual account.

**Work required:**
- **UI:** Connect the save action to the account authentication system so the email change is applied to the actual account.

---

### 4. Account Preferences Reset on Every App Restart

**What the user experiences:**
Notification preferences, ringtone selection, and Creator Mode are set by the user but reset to their defaults every time the app is closed and reopened.

**Why it happens:**
These settings exist only in the app's temporary memory. They are never written to or read from the database.

**Work required:**
- **Backend:** Save preference changes to the database when the user makes them.
- **UI:** Read saved preferences from the database when the Account screen loads so toggles always show the correct state.

---

### 5. Account Screen Shows "John Doe" for Every User

**What the user experiences:**
Every user sees the name "John Doe" and the avatar letter "J" in their Account screen, regardless of who is logged in.

**Why it happens:**
The display name and avatar are placeholder text that was never replaced with real user data.

**Work required:**
- **UI:** Show the user's actual name or derive the avatar initial from their email address. Add a display name field to the user profile so they can set their own name.

---

## Phase 2 — Scheduling & Calls
**Timeline: Week 3–4 (including QA)**
*All issues related to the core product experience — scheduling, timing, personas, and call delivery.*

---

### 6. Phone Verification Call Does Not Read the Code Reliably ✅ Verified During Testing

**What the user experiences:**
After entering their phone number to verify their account, the user receives a call. Instead of reading a 6-digit code, the AI starts a conversation — asking "where are you right now?" or "how can I help you today?" The actual code is eventually read out after roughly 60 seconds, if at all. Some users hang up before the code is delivered.

**Why it happens:**
The verification call is being routed through the general AI conversation system instead of the call service's dedicated verification line. The instruction to "read the code" is treated as a suggestion, not a command, so the AI follows its normal conversational behaviour first.

**Work required:**
- **Backend:** Switch to the Luron API's dedicated verification endpoint, which is purpose-built for reading codes and does not use the conversational AI model.
- **UI:** Update the loading state and messaging on the verification screen to reflect the new flow.

---

### 7. "Now" Calls Arrive Late or Not at All ✅ Verified During Testing

**What the user experiences:**
When the user selects "Now" as the call timing, the call arrives significantly later than expected — often 60 seconds or more. In some cases the call never arrives.

**Why it happens:**
The call service's server goes to sleep when not in use and takes up to 60 seconds to wake up. By that time, the 5-second window for "Now" has already passed. There is also a dedicated instant-trigger endpoint available that the app is not using.

**Work required:**
- **Backend:** Switch "Now" calls to use the Luron API's dedicated instant-trigger endpoint, which processes the request immediately.
- **UI:** Add a brief status message ("Connecting your call…") so the user knows the call is being set up.

---

### 8. AI Call Delivers Wrong Persona ✅ Verified During Testing

**What the user experiences:**
A user schedules a call using the "Manager" or "Boss" persona. The call arrives but the AI speaks as a completely different character — for example, opening with personal questions in the style of a "Mom" persona.

**Why it happens:**
Some persona names used in the app do not match the identifiers the call service recognises, so the service falls back to an unrelated default. The shared device identity issue (Issue 2) also means call contexts from different users can get mixed up.

**Work required:**
- **Backend:** Confirm the exact persona identifiers supported by the Luron API and update the app's list to match them exactly.
- **UI:** Map any unsupported personas to the closest available option and show the correct name to the user.

---

### 9. Custom Scheduled Time Is Always Ignored ✅ Verified During Testing

**What the user experiences:**
The user taps "Custom," picks a specific date and time, taps "Set Time," and the selector confirms the choice. The call fires at 10 minutes regardless of what was selected.

**Why it happens:**
The date and time the user picks is never actually stored. When the call is scheduled, the custom time is always sent as empty, so the service defaults to 10 minutes.

**Work required:**
- **UI:** Connect the date and time picker so the selected value is captured and passed correctly to the scheduling request.

---

### 10. Tapping "Schedule" Multiple Times Creates Duplicate Calls

**What the user experiences:**
Tapping the "Schedule Escape" button quickly two or three times creates multiple scheduled calls — multiple banners appear and multiple real AI calls will be triggered to the user's phone.

**Why it happens:**
The button is not disabled after the first tap and there is no visible loading indicator, so the user has no indication the first tap was registered.

**Work required:**
- **UI:** Disable the button immediately on first tap and keep it disabled until the call is confirmed as scheduled. Show a visible loading state during the request.

---

### 11. Email Contact Method Never Delivers

**What the user experiences:**
The user selects "Email" as the contact method, schedules an escape, and receives a confirmation. No email ever arrives. The request sits in "pending" status indefinitely with no error shown.

**Why it happens:**
Email delivery has not yet been implemented on the call service backend. The service accepts the request without error but never processes it.

**Work required:**
- **UI:** Disable the Email option and show a "Coming soon" label until the backend supports it. This prevents users from scheduling escapes they will never receive.

---

## Phase 3 — History, Presets & Plan Management
**Timeline: Week 5–6 (including QA)**
*All issues related to viewing past calls, managing quick presets, and the subscription plan.*

---

### 12. History Disappears When Opening the History Tab

**What the user experiences:**
A call is scheduled from the Home screen and appears correctly as an upcoming call. When the user navigates to the History tab, their recent call history disappears or shows outdated information.

**Why it happens:**
When the History tab loads, it fetches new data from the server and replaces the entire history list instead of adding to it. Any calls added from the Home screen are overwritten.

**Work required:**
- **UI:** Change the sync logic to combine incoming data with existing entries rather than replacing them entirely.

---

### 13. Quick Preset Saved Before User Configures It ✅ Verified During Testing

**What the user experiences:**
Tapping "New" in the Quick Presets section immediately creates and saves a blank preset named "New Preset" — before the configuration panel even opens. If the user closes the panel without saving, the blank preset remains permanently in their list and can only be removed by finding and deleting it manually.

**Why it happens:**
The save happens at the moment "New" is tapped, not when the user confirms their settings.

**Work required:**
- **UI:** Delay saving until the user explicitly taps "Save Changes." If the user closes the panel without saving, discard the draft without creating anything.

---

### 14. Custom Persona Saved Before User Names It

**What the user experiences:**
Tapping "Add" to create a new custom persona immediately saves an empty "Custom" entry and navigates to the settings screen. Pressing back without finishing the setup leaves an unwanted persona card permanently in the selector.

**Why it happens:**
Same pattern as Issue 13 — the entry is created on tap, not on confirmation.

**Work required:**
- **UI:** Same fix as Issue 13 — only save when the user confirms.

---

### 15. Subscription Limits Not Enforced

**What the user experiences:**
Free plan users are described as having 2 calls available. In practice there is no restriction — a free user can schedule unlimited calls with no prompt to upgrade.

**Why it happens:**
The subscription limit system is fully built in the database but is never checked when a call is scheduled. The usage counter is also never reduced after a call is made.

**Work required:**
- **Backend:** Check the user's remaining call count before every schedule action and reduce it after each successful call.
- **UI:** Display the remaining call count accurately and show an upgrade prompt when the user has 0 calls remaining.

---

### 16. Plan Card Always Shows "Free / 1 of 2 Left" for Every User

**What the user experiences:**
The Plan section in Account always displays "Free" and "1 of 2 left" regardless of the user's actual plan or usage.

**Why it happens:**
The plan details are hardcoded text. The subscription database is never checked.

**Work required:**
- **UI:** Read the user's real plan tier, usage count, and limit from the database and display them on the card.

---

### 17. Call History Shows Timestamps Without a Date

**What the user experiences:**
Every entry in call history shows only a time (e.g., "3:05 PM") with no date. A call from yesterday looks identical to a call from three weeks ago.

**Why it happens:**
The timestamp format only displays hours and minutes, without the date.

**Work required:**
- **UI:** Display relative dates alongside the time — "Today 3:05 PM", "Yesterday 11:42 AM", or "Dec 28 · 2:15 PM" for older entries.

---

### 18. "Invalid Date" Text Appears in Call History

**What the user experiences:**
Some history entries show the literal text "Invalid Date" where the call time should appear.

**Why it happens:**
When the server returns a history entry without a timestamp, the app tries to format the empty value as a date, producing an error string that is displayed directly to the user.

**Work required:**
- **UI:** Show "Unknown time" or a dash when the timestamp is missing, rather than displaying a raw error string.

---

### 19. Persona Names Show in Lowercase in History

**What the user experiences:**
The history list shows persona names as "manager", "friend", "boss" in lowercase instead of "Manager", "Friend", "Boss".

**Why it happens:**
The server returns an internal identifier in all lowercase which is displayed without any formatting.

**Work required:**
- **UI:** Convert the internal identifier to a properly capitalised display name before showing it to the user.

---

## Phase 4 — iOS Experience & Paywall
**Timeline: Week 7–8 (including QA)**
*iOS-specific interaction issues and the full subscription and payment system.*

---

### 20. Screen Zooms In When Tapping Any Input Field ✅ Verified During Testing

**What the user experiences:**
Tapping any text field, note area, or input on iPhone causes the entire screen to zoom in unexpectedly. The layout shifts and the user must manually zoom back out.

**Why it happens:**
iOS automatically zooms in on input fields with text below a minimum size threshold. Most inputs across the app are set below this threshold.

**Work required:**
- **UI:** Apply a minimum text size to all input fields across the entire app. This is a single global style fix.

---

### 21. Bottom Tab Bar Disappears When Scrolling or Keyboard Opens ✅ Verified During Testing

**What the user experiences:**
When the user scrolls down on any screen, or taps a field that opens the keyboard, the bottom navigation bar (Home / History / Account) slides off the bottom of the screen. Navigation is lost until the user scrolls back up or closes the keyboard.

**Why it happens:**
The tab bar is anchored to the page height, which changes when scrolling or when the keyboard appears on iOS. It needs to use a fixed position that stays in place regardless of what happens on screen.

**Work required:**
- **UI:** Change the tab bar to use a fixed position so it always stays at the bottom of the screen.

---

### 22. Quick Preset Edit Button Is Invisible on iPhone

**What the user experiences:**
There is no visible way to edit or delete a Quick Preset on iPhone. The edit icon only appears when hovering with a mouse — something that does not exist on a touch screen. iPhone users are permanently locked out of the edit and delete functions.

**Why it happens:**
The icon was set to appear on hover only, which is a desktop-only behaviour.

**Work required:**
- **UI:** Show the edit icon permanently on mobile, or add a long-press or swipe-left gesture to reveal edit and delete options.

---

### 23. Info Links Open a Plain Alert Box Instead of Real Content

**What the user experiences:**
Tapping "How CueOut Works," "Privacy Policy," or "Terms of Use" in the Account screen pops up a plain system alert box with a placeholder message. On iPhone this looks unpolished and broken.

**Why it happens:**
These are placeholder links. No real content has been connected to them.

**Work required:**
- **UI:** Connect each link to its actual content — either an in-app screen or a link to a hosted page. The Privacy Policy and Terms of Use must be accessible pages for App Store compliance.

---

### 24. "Continue with Plus" Button Does Nothing

**What the user experiences:**
On the subscription upgrade screen, tapping "Continue with Plus" produces no response — no loading state, no payment sheet, nothing. The button looks fully functional but has no action attached.

**Why it happens:**
The button was built without a payment handler. No payment system has been connected yet.

**Work required:**
- **Backend:** Create a Supabase server function that updates the user's subscription tier after a successful payment is confirmed by Apple.
- **UI:** Connect the button to Apple In-App Purchase (IAP), which is required by Apple for selling subscriptions within any iOS app. The flow should handle successful purchase, failed purchase, and restoring a previous purchase.

---

### 25. "Billed Through Apple ID" Displayed Without Payment Active

**What the user experiences:**
The paywall shows "Billed through Apple ID. Cancel anytime." even though Apple billing is not yet set up. This is inaccurate and risks rejection during App Store review.

**Why it happens:**
The text was added before the payment integration was completed.

**Work required:**
- **UI:** Remove this line until Apple IAP is live.

---

### 26. No Way to Cancel a Subscription from Within the App

**What the user experiences:**
The paywall states "Cancel anytime" but there is no cancellation option anywhere in Account or Settings.

**Why it happens:**
The cancellation flow was never built.

**Work required:**
- **UI:** Add a "Manage Subscription" option in the Account screen that takes the user to the Apple subscription management page. For Plus users, this replaces the "Upgrade to Plus" button.

---

### 27. Billing Cycle Selection Is Ignored at Checkout

**What the user experiences:**
Switching between "Monthly" and "Yearly" on the paywall correctly updates the displayed price. However, this selection is not passed to the purchase — the system would always start a monthly subscription regardless of what was chosen.

**Why it happens:**
The billing cycle selection updates the display only and is not connected to the purchase action.

**Work required:**
- **UI:** Pass the selected billing cycle to the purchase so the correct Apple subscription product (monthly or annual) is used.

---

### 28. Legal Links on Paywall Are Not Tappable

**What the user experiences:**
"Terms of Service" and "Privacy Policy" at the bottom of the paywall appear underlined but nothing happens when tapped. Apple requires working links to these documents on all subscription screens to pass App Store review.

**Why it happens:**
These are styled text with no link attached.

**Work required:**
- **UI:** Make both links tappable, opening the relevant documents in a browser or web view.

---

### 29. Feature Comparison Contains a Logic Error

**What the user experiences:**
On the Free vs Plus comparison, "Standard call speed" is shown with a red cross under the Free plan — implying Free users have no call speed at all, which is incorrect and confusing.

**Why it happens:**
A setting in the feature list was set to the wrong value.

**Work required:**
- **UI:** Correct the entry so "Standard call speed" shows as included for Free, and "Priority call speed" shows as included for Plus.

---

## QA Included in Every Phase

Each phase includes the following before handoff:

- Full functional testing across iPhone SE, iPhone 16 Pro, and iPhone 16 Pro Max screen sizes
- Edge case testing for all fixed flows (empty states, network failures, cancelled actions)
- Regression testing to confirm no previously working features are broken
- Sign-off checklist per phase before the next phase begins

---

## Timeline Overview

| Phase | Focus | Duration |
|---|---|---|
| **Phase 1** | Account, login & data — the foundation everything else depends on | **Week 1–2** |
| **Phase 2** | Scheduling & calls — the core product experience | **Week 3–4** |
| **Phase 3** | History, presets & plan management | **Week 5–6** |
| **Phase 4** | iOS experience & full paywall / payment integration | **Week 7–8** |

**Total estimated duration: 8 weeks**
**Based on: 1 developer · 6 hours/day · 5 days/week · QA included in each phase**

Each phase delivers a stable, tested increment. Phases can be reviewed and approved before the next begins.
