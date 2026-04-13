# How to Run CueOut

## Prerequisites
- Node.js installed
- Xcode installed (for iOS simulator)
- `.env` file configured (see below)

---

## 1. Setup `.env`

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://msaakygyrluphiscxtyw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Run in Browser (Dev Mode)

```bash
npm run dev
```

Open `http://localhost:5173` (or whatever port Vite picks) in your browser.

---

## 4. Run in iOS Simulator

### Step 1 — Build the web app
```bash
npm run build
```

### Step 2 — Sync into iOS project
```bash
npx cap sync ios
```

### Step 3 — Check available simulators
```bash
xcrun simctl list devices available | grep iPhone
```

### Step 4 — Build for simulator
```bash
cd ios/App && xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'platform=iOS Simulator,id=<SIMULATOR_ID>' \
  build
```
Replace `<SIMULATOR_ID>` with the ID from Step 3.

**Example (iPhone 16 Pro):**
```bash
cd ios/App && xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'platform=iOS Simulator,id=477AFDB4-5172-4121-8933-D184DC9A191A' \
  build
```

### Step 5 — Install and launch on simulator
```bash
xcrun simctl install <SIMULATOR_ID> \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app

xcrun simctl launch <SIMULATOR_ID> com.cueout.app
```

**Example (iPhone 16 Pro):**
```bash
xcrun simctl install 477AFDB4-5172-4121-8933-D184DC9A191A \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app

xcrun simctl launch 477AFDB4-5172-4121-8933-D184DC9A191A com.cueout.app
```

---

## 5. Run on Real iOS Device

### Step 1 — Build and sync
```bash
npm run build
npx cap sync ios
```

### Step 2 — Open in Xcode
```bash
npx cap open ios
```

### Step 3 — In Xcode
1. Plug in your iPhone via USB
2. Select your device in the top device picker
3. Go to **Signing & Capabilities** → set your Apple ID as Team
4. Press **▶ Play** to build and run

### Trust the app on iPhone
iPhone → **Settings → General → VPN & Device Management** → Trust your Apple ID

---

## 6. Full One-Command Simulator Run (after first setup)

**iPhone 16 Pro:**
```bash
npm run build && \
npx cap sync ios && \
cd ios/App && \
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'platform=iOS Simulator,id=477AFDB4-5172-4121-8933-D184DC9A191A' build 2>&1 | grep -E "SUCCEEDED|FAILED|error:" && \
cd ../.. && \
xcrun simctl install 477AFDB4-5172-4121-8933-D184DC9A191A \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app && \
xcrun simctl launch 477AFDB4-5172-4121-8933-D184DC9A191A com.cueout.app
```

**iPhone 17 Pro:**
```bash
npm run build && \
npx cap sync ios && \
cd ios/App && \
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'platform=iOS Simulator,id=8FBCDAD6-BD6B-4233-BAAD-B1757EDC4CAE' build 2>&1 | grep -E "SUCCEEDED|FAILED|error:" && \
cd ../.. && \
xcrun simctl boot 8FBCDAD6-BD6B-4233-BAAD-B1757EDC4CAE 2>/dev/null; open -a Simulator && \
xcrun simctl install 8FBCDAD6-BD6B-4233-BAAD-B1757EDC4CAE \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app && \
xcrun simctl launch 8FBCDAD6-BD6B-4233-BAAD-B1757EDC4CAE com.cueout.app
```

---

## Simulator IDs (this machine)

| Device | ID |
|---|---|
| iPhone 16 Pro | `477AFDB4-5172-4121-8933-D184DC9A191A` |
| iPhone 16 Pro Max | `3994FE2F-B7AD-476A-8F9D-3D992F04CEDF` |
| iPhone 16 | `AF9E81D8-F470-439D-8FFB-5BC7C3370D7F` |
| iPhone 16 Plus | `7F529E2E-9472-487A-9DFE-4A3A651387B3` |
| iPhone 17 Pro | `8FBCDAD6-BD6B-4233-BAAD-B1757EDC4CAE` |
| iPhone 17 Pro Max | `3D6DCA03-3AA1-489A-956C-97B9604826E1` |
| iPhone Air | `CA9C3E96-41B6-4954-8A73-36C607D4DD25` |
| iPhone 17 | `B94CED9E-6509-4705-BCD0-B961A6B7F7C3` |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| White screen in browser | Check `.env` — Supabase URL must be `https://<ref>.supabase.co` not the dashboard URL |
| White screen in simulator | Same `.env` issue — rebuild after fixing |
| Port already in use | Vite will auto-pick next port (5174, 5175, etc.) |
| `xcrun simctl install` path not found | Run `xcodebuild` first to generate the `.app` file |
| "Untrusted developer" on real device | iPhone → Settings → General → VPN & Device Management → Trust |
| Simulator not booting | Run `xcrun simctl boot <ID>` first |
