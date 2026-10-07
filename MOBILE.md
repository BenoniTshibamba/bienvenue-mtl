# MOBILE.md — Bienvenue on iOS & Android 📱

One codebase, three targets. The production **web build** (`frontend/dist`) is what
Capacitor wraps, so the website, the iPhone app, and the Android app all run the
exact same code. The mobile app is fully client-side (checklist + language live in
`localStorage`) — no backend needed on phones.

- **App name:** Bienvenue
- **Bundle ID / package:** `com.bb24.bienvenue`
- **Capacitor:** v8 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`)
- **Native projects:** `frontend/ios/` (Xcode) and `frontend/android/` (Android Studio)

## Everyday workflow

```sh
# after any frontend change:
npm run mobile:build        # vite build + cap sync → copies web into ios/ and android/

# open the native projects:
npm run mobile:sync --prefix frontend
npm run mobile:open:ios --prefix frontend       # opens Xcode (Mac only)
npm run mobile:open:android --prefix frontend    # opens Android Studio
```

## Before submitting: app icon & splash (do this first)

1. Install the asset generator: `npm i -D @capacitor/assets`
2. Put a 1024×1024 icon at `frontend/assets/icon.png` and a splash at
   `frontend/assets/splash.png` (your BB24 logo works).
3. Run: `npx capacitor-assets generate --iconBackgroundColor '#fffbf3'`
4. Re-run `npm run mobile:build`.

## iOS — App Store (your steps)

1. **Apple Developer Program** — enroll at developer.apple.com: **$99 USD/year**.
   Use your real identity; it takes ~24–48h to activate.
2. **Build the binary — you need a Mac** (or a cloud Mac):
   - On a Mac: `npm run mobile:open:ios --prefix frontend`, select a real
     device/simulator to verify, then **Product → Archive** in Xcode.
     Upload the archive to **App Store Connect** (Xcode Organizer → Distribute App).
   - No Mac? Use **Codemagic** (codemagic.com) — connect your GitHub repo,
     it builds the iOS archive in the cloud and can push to App Store Connect.
3. **App Store Connect** (appstoreconnect.apple.com): create the app
   (bundle ID `com.bb24.bienvenue`), fill in the listing — bilingual description
   (FR first), screenshots (iPhone 6.7" and 6.5" required), keywords,
   support URL, and privacy policy URL.
4. **Review:** Apple reviews every app (usually 24–48h). Common rejections to
   avoid: placeholder text, broken links, missing privacy info. This app
   collects **no user data** (everything stays in `localStorage`) — say so in
   the privacy answers; it makes review smoother.

## Android — Google Play (your steps)

1. **Google Play Developer account** — play.google.com/console/signup:
   **$25 USD one-time**. Identity verification required (passport works).
2. **Build the bundle** (works on any computer with Android Studio):
   - `npm run mobile:open:android --prefix frontend`
   - **Build → Generate Signed Bundle/APK → Android App Bundle (.aab)**.
     Create a new upload keystore and **back it up** — lose it and you can
     never update the app again.
3. **Play Console**: create the app, upload the `.aab`, fill in the bilingual
   store listing, screenshots, content rating questionnaire, and data-safety
   form (declare: no data collected).
4. **Review:** usually a few hours to a few days for a first release.

## What NOT to do

- Don't change the bundle ID (`com.bb24.bienvenue`) after first submission —
  stores treat a new ID as a different app.
- Don't submit debug builds. iOS: archive in **Release**. Android: signed `.aab`.
- Version bumps: update `version` in `frontend/package.json`, then bump
  `versionCode`/`versionName` (Android, `android/app/build.gradle`) and the
  marketing version/build number (iOS, Xcode) before each store update.

## Checklist before you hit "Submit for review"

- [ ] Icon + splash generated and synced
- [ ] Tested on a real iPhone and a real Android phone (not just simulators)
- [ ] Language toggle works in the native builds (FR default)
- [ ] All external links open correctly (they open in the system browser)
- [ ] Bilingual store descriptions + screenshots ready
- [ ] Privacy: "no data collected" declared honestly on both stores

---
BUILT WITH LOVE AND CAFFEINE BY BB24
