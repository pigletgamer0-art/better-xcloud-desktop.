# Desktop 4.0 — lightweight runtime patch

This patch is intentionally conservative: it lets Chromium/Electron use its normal background throttling and starts the window at a size that fits smaller laptop displays. It does not change the Xbox streaming implementation, user agent, permissions, session storage, preload injection, GPU settings, or controller/microphone behavior.

Apply from the extracted source root with:

```sh
patch -p1 < patches/desktop-4.0-performance.patch
```

## Expected effect

- Hidden or occluded windows can reduce background timer and renderer work instead of being forced to run continuously.
- The app starts at 1280×800 and supports a smaller 800×520 minimum, fitting modest laptop screens more comfortably.
- Visible gameplay remains foregrounded and is not deliberately throttled.

## Validation required

Run a visible stream test, then minimize/restore and cover/uncover the window. Confirm controller input, microphone permissions, audio, session persistence, and stream recovery. Compare idle CPU and memory before/after on the same device. No numerical saving is claimed before measurement.

## Rollback

Remove the patch from the build workflow or restore the original three command-line switches and `backgroundThrottling: false` setting if background streaming behavior regresses.
