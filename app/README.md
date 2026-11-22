# Cryptex for Android

A native Flutter shell around the Cryptex web app (the repo root). It serves the web code from the
app bundle on `localhost` and bridges it to the phone: haptics, camera torch, share sheet,
text-to-speech, status bar, back button, camera/microphone permissions and file picking.
See `lib/main.dart`.

```bash
python tool/sync_web.py           # copy ../ (the web app) into assets/web
flutter build apk --release       # → build/app/outputs/flutter-apk/app-release.apk
```

Signing: put `keystore.properties` (storeFile, storePassword, keyAlias, keyPassword) and the keystore in
`android/` — both are git-ignored. Keep a backup: Android only accepts updates signed with the same key.
