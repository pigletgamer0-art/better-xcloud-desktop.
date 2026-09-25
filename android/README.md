# Better xCloud Android Tablet — beta 0.1.2

Android tablet proof-of-concept built separately from the existing Windows Desktop release.

## Included
- Native Android launcher with an embedded WebView (Android 8+, minSdk 26).
- Custom cross-device gaming launcher icon designed for the Android phone and tablet edition.
- Native Bluetooth/USB gamepad connection detection and a live **Probar control** panel for standard buttons, D-pad, thumbsticks and triggers.
- Fallback standard Gamepad API bridge if the embedded WebView reports no connected controller; native browser gamepad input is left enabled.
- Disconnect/reconnect handling and diagnosis of unrecognized Android key codes.
- Bundled Better xCloud 6.7.12 (MIT); GitHub Actions downloads the pinned original
  release and verifies SHA-256 before building, rather than downloading scripts while playing.
- Bundled Ultra Assistant Android Tablet 2.1 add-on for profiles, stats diagnosis
  and settings backup/restore. The add-on is under `app/src/main/assets/`.
- Touch input, cookies and DOM storage enabled. HTTPS-only page loading; no SSL bypass.
- Full-screen web video, back-navigation and browser fallback.
- No extra permissions beyond Internet.

## Known limitations
This is an **experimental Android WebView wrapper**. It is not the same runtime
as Chromium/Electron Desktop or a userscript-enabled standalone browser.
Controller button detection in the native tester **does not guarantee** the Xbox cloud stream accepts those inputs. Different controllers expose different Android key/axis mappings, and the Gamepad API fallback may not reach all cross-origin streaming frames.
Xbox / Microsoft may block signing in from an embedded browser. WebRTC,
codec support, cloud streaming, touch controls and physical gamepads depend
on the particular Android System WebView version, device and service support.
Document-start script injection requires WebViewFeature.DOCUMENT_START_SCRIPT.
The fallback injection on older WebView versions is late and may not work.
A high ping or streaming FPS cap cannot be removed by the wrapper.
The Xbox service itself and your account must permit streaming.

### Installation
Open the Android beta GitHub Release and download the APK to the phone.
Share it to the tablet with Quick Share, then open the received APK and approve
installation from that source if prompted. Enable Android System WebView
updates. Launch the app and sign in to Xbox if supported. If sign-in fails,
choose **Abrir en navegador** from the Android Back menu; the browser route
does not include the embedded assistant unless a compatible userscript manager
is installed separately.

The beta APK is signed with GitHub Actions' temporary **debug key** and is
intended for testing only. Updating to a later build may require uninstalling
the old beta, which clears its app-local WebView cookies and settings. Do not
uninstall without first exporting the Ultra Assistant settings you want to keep.

## Source / build
GitHub Actions: `.github/workflows/build-android.yml`.
To build locally, install JDK 17, Android SDK API 35 and Gradle 8.10.2, then run:
```bash
cd android
gradle --no-daemon :app:assembleDebug
```
Run the Android workflow to build a prerelease APK, compute SHA-256 and publish
a **separate** GitHub Release tag `android-v0.1.2-beta.3`. This does not modify
the Windows Desktop `v2.6.0` release.

Unofficial community project, not affiliated with Microsoft, Xbox, or redphx.
Better xCloud is MIT-licensed; see the upstream repository and bundled license.
