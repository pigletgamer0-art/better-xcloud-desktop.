# Better xCloud Desktop 4.0 — UI & Performance Roadmap

> Working branch: `feature/desktop-4.0-ui-performance`
> Base: public beta `beta-v2.7.7`
> Target: Windows 10/11 x64

## Product direction

A polished, lightweight desktop shell around the existing Electron/Chromium streaming runtime. Version 4.0 prioritizes interface clarity and low overhead; it must not trade streaming stability for visual effects.

## Non-negotiable compatibility

- Preserve the independent Electron runtime and existing Better xCloud integration.
- Preserve controller-aware profiles (Xbox, PlayStation, Nintendo/Switch), glyph/layout mapping, MIC Sensitivity, Native Look, Ultra Assistant, and Stream Health.
- Preserve the existing installer/uninstaller, saved session, settings, and user-data migration behavior.
- Keep the product clearly unofficial and retain upstream Better xCloud attribution/licensing.
- Keep navigation focused on **Inicio**, **Xbox Cloud Gaming**, **Laboratorio**, and **Ajustes**. Do not add minigames or an unrelated sandbox.

## Visual system

- Dark navy/graphite surfaces with restrained electric-blue and cyan accents.
- Clear typography, generous spacing, consistent iconography, and visible keyboard focus.
- A compact left navigation rail/sidebar, a top title/status area, and a responsive content region.
- Motion is subtle and optional; respect Windows reduced-motion preferences.
- Avoid heavy blur, continuously animated backgrounds, video backgrounds, and large decorative assets.

## Information architecture

1. **Inicio** — launch/resume Xbox Cloud Gaming, connection/runtime status, recent activity only if already available locally.
2. **Xbox Cloud Gaming** — the existing streaming experience, with minimal chrome and a clear return path.
3. **Laboratorio** — existing Ultra Assistant and Stream Health tools; controller and MIC controls where already supported.
4. **Ajustes** — appearance, startup behavior, performance toggles, diagnostics, and data controls.

## Performance requirements

- Do not run periodic UI work while a panel/window is hidden unless required for an active stream or device input.
- Debounce settings writes and avoid repeated disk writes during controller polling.
- Keep diagnostic polling bounded and pause it when its panel is inactive.
- Avoid expensive CSS filters, excessive DOM updates, and unnecessary renderer processes.
- Do not change the stream pipeline, controller event semantics, audio/microphone routing, or preload security model as part of a visual refactor.
- Measure startup time, idle CPU/RAM, renderer responsiveness, and stream stability before/after changes.

## Implementation sequence

- [ ] Inventory the beta branch entry points, renderer, preload, main process, and build scripts.
- [ ] Capture a baseline for startup, idle resource use, and stream behavior.
- [ ] Implement the new app shell and design tokens without changing streaming internals.
- [ ] Migrate existing panels into the new navigation.
- [ ] Add lightweight performance controls and lifecycle-aware polling.
- [ ] Run build, installer, upgrade/migration, controller, audio, and streaming regression checks.
- [ ] Publish a 4.0 preview only after the regression checklist passes.

## Acceptance criteria

- The app opens to a useful Inicio screen and reaches Xbox Cloud Gaming in one clear action.
- Navigation remains usable at common laptop resolutions.
- No loss of existing controller, microphone, Native Look, Ultra Assistant, or Stream Health behavior.
- No measurable sustained idle-work regression from the old build.
- The app remains usable with reduced motion enabled and keyboard-only navigation.
- Installer upgrade preserves the user's session and settings.
