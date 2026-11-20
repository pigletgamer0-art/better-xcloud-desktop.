# Better xCloud Desktop 4.0 — Lightweight performance policy

The 4.0 interface must remain a thin shell around the existing streaming runtime.

## Prototype constraints

- The first UI prototype is a single HTML document with inline CSS and vanilla JavaScript.
- No UI framework, icon package, remote font, external image, animation library, or runtime network dependency.
- No blur/backdrop filters, canvas effects, animated backgrounds, or auto-playing media.
- Navigation changes visibility locally; it does not create extra windows or renderer processes.
- Motion is limited to short hover/focus transitions and respects `prefers-reduced-motion`.
- The Xbox Cloud Gaming link opens the official site in a separate browser context in the prototype.

## Integration rules

- Do not add a second Electron runtime or a second copy of Chromium.
- Reuse the existing BrowserWindow, preload bridge, profile, session, and user-data paths.
- Keep context isolation and the existing security boundary. Do not expose Node.js APIs to the renderer.
- Keep stream, controller, microphone, and audio handling unchanged during the UI migration.
- Suspend nonessential diagnostics and UI polling when their panel is hidden.
- Debounce settings persistence; do not write settings on every input/poll tick.
- Prefer CSS/SVG icons and system fonts. Avoid remote assets and network calls during startup.

## Measurement checklist

Capture before/after on the same Windows device and power mode:

1. Cold start to first interactive frame.
2. Idle memory after startup settles.
3. Idle CPU over a representative 60-second interval.
4. Memory/CPU while the stream is active.
5. Renderer responsiveness during navigation.
6. Controller input and microphone/voice regression checks.

Do not claim a specific memory or CPU saving until measured on the target device. The prototype is a UI preview, not yet integrated with the production Electron main process.
