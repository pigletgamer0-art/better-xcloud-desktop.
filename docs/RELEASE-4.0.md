# Better xCloud Desktop 4.0 release plan

## Version track

- Current development target: `4.0.0-beta.1`.
- Public beta remains separate from stable `main`.
- Official `4.0.0` is not declared ready until every release gate below passes.

## Upstream Better xCloud synchronization

The desktop app uses the official upstream release endpoint:

`https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js`

At startup it checks after a short delay, then polls locally once per hour. Network checks are throttled to once every six hours. A downloaded script is accepted only after checking its userscript header, project name, MIT license, version, size, compatibility marker, and JavaScript syntax. It is written to a temporary file and atomically renamed only after validation.

The app does not replace the running script in the middle of a cloud-gaming session. It asks the user to restart to activate the downloaded core. If validation or download fails, the currently working bundled/cached copy remains in place.

The beta build workflow separately queries the GitHub Releases API for the latest upstream release, downloads the official asset, verifies that its embedded `@version` matches the release tag, checks syntax and the desktop injector compatibility marker, records its SHA-256, and embeds that release in the Windows validation build. A daily workflow schedule is included for when this workflow is enabled on the repository's default branch; beta maintainers can also run it manually.

## Beta exit gates

- [ ] Re-test the latest upstream release against the desktop injector; reject incompatible upstream changes safely.
- [ ] Verify automatic detection, download, validation, restart prompt, and rollback behavior.
- [ ] Verify startup, sign-in/session persistence, stream launch, reconnect, audio, microphone, and controller profiles.
- [ ] Verify Ultra Assistant, Stream Health, Native Look, and keyboard shortcuts.
- [ ] Verify install, upgrade from 2.6.0 and 2.7.7, uninstall, and preservation of user data.
- [ ] Measure idle CPU/RAM, startup time, and active-stream stability on a low-spec Windows laptop.
- [ ] Verify Windows 10/11 x64, keyboard navigation, small-window layout, and reduced-motion preference.
- [ ] Review license notices, upstream attribution, version metadata, checksums, and release notes.

## Official 4.0.0 release gates

- [ ] All beta exit gates pass with no known release-blocking defects.
- [ ] Final clean Windows installer is built from the release commit.
- [ ] Installer and source checksums are published.
- [ ] Upgrade and rollback paths are tested on a clean Windows profile and an existing profile.
- [ ] Tag `v4.0.0` and publish the final changelog only after the release candidate is approved.

## Release discipline

Do not label a validation artifact as a stable installer. Do not replace the stable branch with beta code before release approval. Keep upstream Better xCloud attribution and its MIT license notices intact.
