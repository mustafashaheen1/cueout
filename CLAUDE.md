# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
# Development
npm run dev          # Vite dev server at http://localhost:5173

# Build + deploy to iOS simulator (full flow)
npm run build && npx cap sync ios
cd ios/App && xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'platform=iOS Simulator,id=477AFDB4-5172-4121-8933-D184DC9A191A' build 2>&1 | grep -E "SUCCEEDED|FAILED|error:"
xcrun simctl install 477AFDB4-5172-4121-8933-D184DC9A191A \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch 477AFDB4-5172-4121-8933-D184DC9A191A com.cueout.app

# Lint
npm run lint

# Open in Xcode (for physical device)
npx cap open ios
```

Simulator IDs on this machine: iPhone 16 Pro `477AFDB4-5172-4121-8933-D184DC9A191A`, iPhone 16 Pro Max `3994FE2F-B7AD-476A-8F9D-3D992F04CEDF`, iPhone 17 Pro `8FBCDAD6-BD6B-4233-BAAD-B1757EDC4CAE`.

No test suite exists in this project.

---

## Architecture

**React 18 + Vite → Capacitor → iOS.** The web app is built with Vite and wrapped in a Capacitor iOS container. There is no server-side rendering — everything runs client-side in the Capacitor webview.

### Two Context Providers

The app has two separate React contexts that must not be confused:

**`AuthContext` (`src/components/AuthContext.jsx`)** — wraps the entire app (root of `App.jsx`). Owns the Supabase auth session, `user`, `isAuthenticated`, and all auth actions (signIn, signOut, signUp, Apple OAuth). Use `useAuth()` to access.

**`AppContext` (`src/components/AppContext.jsx`)** — owns all app data state: `upcomingCalls`, `history`, `quickSchedules`, `callerIDs`, `userId` (Luron), and all CRUD operations. Use `useApp()` to access. AppContext is not mounted at the root — check `Layout.jsx` for where it wraps the page content.

AppContext imports `isAuthenticated` from `src/api/index.js` (a function) but the local state is named `isAuth` to avoid shadowing. The public context value is `isAuthenticated: isAuth`. Per-method auth guards use `if (isAuth)` (local state). `addToHistory` has no `if (isAuth)` guard — it always writes, relying on `withAuth()` in `calls.js` to enforce auth.

### Data Flow

```
Supabase (auth + DB) ←→ src/api/*.js ←→ AppContext ←→ Pages/Components
Luron API            ←→ src/api/luronApi.js ←→ AppContext / Pages directly
```

All Supabase API modules are in `src/api/` and re-exported from `src/api/index.js`. Each module uses `supabaseQuery()` + `withAuth()` from `src/lib/supabaseMiddleware.js` — these handle retry, error normalisation, and auth scope automatically.

Luron API calls go through `src/lib/apiClient.js` (`luronGet`/`luronPost`) which adds the `x-api-key` header from `VITE_LURON_API_KEY`. The Luron `user_id` passed in all requests is the Supabase user UUID (`user?.id`) — not a random localStorage key.

### Routing

Pages are named-route based. URLs use PascalCase page names (`/Home`, `/Auth`, `/PhoneVerification`). The router lives in `src/pages/index.jsx`. Navigation uses `createPageUrl(pageName)` from `src/components/utils.jsx` — always use this helper, never hardcode paths.

Initial route logic: no onboarding seen → `/Onboarding`, onboarding done but not logged in → `/Auth`, logged in → `/Home`.

### DB Column Whitelisting

`addUpcomingCall` in AppContext uses `pickDbUpcomingCallFields()` to strip UI-only fields (like `persona`, `icon`, `originalState`) before sending to Supabase. The whitelist is `DB_UPCOMING_CALL_FIELDS` in AppContext. Any new DB column added to `upcoming_calls` must also be added to this set or it will be silently dropped.

### Key Constants

All persona IDs, voice IDs, and time options live in `src/components/constants.jsx`. The persona IDs here do not all match the `persona_type` values accepted by the Luron API — mismatches cause Luron to fall back to a default persona silently.

### iOS-Specific Notes

- Tab bar positioning: uses `absolute bottom-0` inside `h-[100dvh]` — scrolling and keyboard open cause it to disappear. Needs `fixed bottom-0`.
- Input zoom: iOS zooms on inputs below 16px font size. No global override exists yet.
- The app bundle ID is `com.cueout.app`. This is registered to the client's Apple Developer account — use a different bundle ID for personal team testing.

### Environment

```
VITE_SUPABASE_URL=https://msaakygyrluphiscxtyw.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

Luron API base URL is hardcoded in `src/api/luronApi.js` as `https://luron-api.onrender.com`. The production URL from the Luron dashboard is `https://api.luron.ai/api/v1` — these need to be reconciled with the client before changing.
