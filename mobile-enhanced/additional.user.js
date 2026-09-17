/**
 * Better xCloud Android additional userscript + Mobile Enhanced overlay.
 * Based on the extension point shipped by Better xCloud Android 0.24.2.
 * Mobile Enhanced v0.1
 */

// Keep the official Android integration.
BX_EXPOSED.deviceInfo.deviceType = 'android-handheld';
BX_EXPOSED.deviceInfo.deviceName = 'Better xCloud Android - Mobile Enhanced';

// <https://github.com/redphx/better-xcloud/issues/118>
if (BX_EXPOSED.deviceInfo.osVersion === 10) {
    BX_EXPOSED.renderingComponent = BX_EXPOSED.renderingComponents.JS;
}

const PwaNavigation = {
    LINKS: {
        HOME: '/play',
        SEARCH: '/play/search',
        LIBRARY: '/play/gallery/all-games',
        GAME_PASS: '/xbox-game-pass',
    },

    getUrl: link => 'https://www.xbox.com' + link,

    go(link) {
        location.href = PwaNavigation.getUrl(link);
    }
};

window.BX_ANDROID = {
    PwaNavigation,
    onEvent(...args) {
        dispatchEvent(new CustomEvent('bx-android-event', {
            detail: args,
        }));
    },
};

addEventListener('popstate', function() {
    window.BX_ANDROID.onEvent('page-state-changed');
});

(() => {
    'use strict';

    const VERSION = '0.1.0';
    const PREFIX = 'BX.MobileEnhanced.';
    const STREAM_KEY = 'BetterXcloud.Stream';
    const SETTINGS_KEY = PREFIX + 'settings.v1';
    const BACKUP_KEY = PREFIX + 'nativeLookBackup.v1';
    const PANEL_ID = 'bx-mobile-enhanced-panel';
    const BUTTON_ID = 'bx-mobile-enhanced-button';
    const HEALTH_ID = 'bx-mobile-enhanced-health';
    const STYLE_ID = 'bx-mobile-enhanced-style';

    const state = {
        panelOpen: false,
        healthTimer: null,
        lastHealth: null,
        lastController: null,
        settings: loadSettings(),
    };

    const STREAM_PREFS = [
        'stream.video.resolution',
        'stream.video.codecProfile',
        'stream.video.maxBitrate',
        'stream.video.preventResolutionDrops',
        'video.maxFps',
        'video.processing',
        'video.processing.mode',
        'video.processing.sharpness',
    ];

    function safeJsonParse(value, fallback) {
        if (!value) return fallback;
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' ? parsed : fallback;
        } catch (_) {
            return fallback;
        }
    }

    function loadSettings() {
        const defaults = {
            nativeLook: 'auto',
            controllerMode: 'auto',
            streamHealth: false,
            haptics: true,
        };
        try {
            return Object.assign(defaults, safeJsonParse(localStorage.getItem(SETTINGS_KEY), {}));
        } catch (_) {
            return defaults;
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
        } catch (_) {}
    }

    function readStreamStore() {
        try {
            return safeJsonParse(localStorage.getItem(STREAM_KEY), {});
        } catch (_) {
            return {};
        }
    }

    function writeStreamStore(store) {
        try {
            localStorage.setItem(STREAM_KEY, JSON.stringify(store));
            return true;
        } catch (_) {
            return false;
        }
    }

    function getStorageApi() {
        return window.STORAGE || (window.BX_EXPOSED && window.BX_EXPOSED.STORAGE) || null;
    }

    function getStreamSettingsApi() {
        return window.StreamSettings || (window.BX_EXPOSED && window.BX_EXPOSED.StreamSettings) || null;
    }

    function setStreamSetting(name, value) {
        let apiWorked = false;
        try {
            const storage = getStorageApi();
            if (storage && storage.Stream && typeof storage.Stream.setSetting === 'function') {
                storage.Stream.setSetting(name, value, 'ui');
                apiWorked = true;
            }
        } catch (_) {}

        if (!apiWorked) {
            const store = readStreamStore();
            store[name] = value;
            writeStreamStore(store);
        }
        return apiWorked;
    }

    function refreshStreamSettings() {
        try {
            const api = getStreamSettingsApi();
            if (api && typeof api.refreshControllerSettings === 'function') {
                api.refreshControllerSettings();
            }
        } catch (_) {}
    }

    function vibrate(ms) {
        if (!state.settings.haptics) return;
        try {
            if (navigator.vibrate) navigator.vibrate(ms || 18);
        } catch (_) {}
    }

    function toast(message) {
        let el = document.getElementById('bx-mobile-enhanced-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'bx-mobile-enhanced-toast';
            document.documentElement.appendChild(el);
        }
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(el.__hideTimer);
        el.__hideTimer = setTimeout(() => el.classList.remove('show'), 2200);
    }

    function networkInfo() {
        const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
        return {
            downlink: c && Number.isFinite(c.downlink) ? c.downlink : null,
            rtt: c && Number.isFinite(c.rtt) ? c.rtt : null,
            saveData: !!(c && c.saveData),
            effectiveType: c && c.effectiveType ? c.effectiveType : null,
        };
    }

    function chooseAutoNativeProfile() {
        const net = networkInfo();
        if (net.saveData) {
            return {
                label: 'Auto ahorro',
                resolution: '1080p',
                bitrate: 6144000,
                codec: 'normal',
                processing: 'usm',
                processingMode: 'performance',
                sharpness: 0,
            };
        }

        if ((net.rtt !== null && net.rtt >= 110) ||
            (net.downlink !== null && net.downlink > 0 && net.downlink < 10) ||
            net.effectiveType === '3g' || net.effectiveType === '2g') {
            return {
                label: 'Auto estable',
                resolution: '1080p',
                bitrate: 8192000,
                codec: 'normal',
                processing: 'usm',
                processingMode: 'performance',
                sharpness: 0,
            };
        }

        if ((net.downlink === null || net.downlink >= 30) &&
            (net.rtt === null || net.rtt < 70)) {
            return {
                label: 'Auto calidad',
                resolution: '1080p-hq',
                bitrate: 12288000,
                codec: 'high',
                processing: 'cas',
                processingMode: 'performance',
                sharpness: 1,
            };
        }

        return {
            label: 'Auto equilibrado',
            resolution: '1080p',
            bitrate: 10240000,
            codec: 'high',
            processing: 'usm',
            processingMode: 'performance',
            sharpness: 0,
        };
    }

    function getNativeProfile(mode) {
        if (mode === 'quality') {
            return {
                label: 'Calidad',
                resolution: '1080p-hq',
                bitrate: 12288000,
                codec: 'high',
                processing: 'cas',
                processingMode: 'quality',
                sharpness: 2,
            };
        }
        if (mode === 'performance') {
            return {
                label: 'Rendimiento',
                resolution: '1080p',
                bitrate: 8192000,
                codec: 'normal',
                processing: 'usm',
                processingMode: 'performance',
                sharpness: 0,
            };
        }
        return chooseAutoNativeProfile();
    }

    function ensureNativeBackup() {
        try {
            if (localStorage.getItem(BACKUP_KEY)) return;
            const store = readStreamStore();
            const backup = {};
            for (const key of STREAM_PREFS) {
                backup[key] = Object.prototype.hasOwnProperty.call(store, key)
                    ? { exists: true, value: store[key] }
                    : { exists: false };
            }
            localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
        } catch (_) {}
    }

    function restoreNativeLook() {
        let backup = null;
        try {
            backup = safeJsonParse(localStorage.getItem(BACKUP_KEY), null);
        } catch (_) {}
        if (!backup) {
            toast('Native Look desactivado');
            return;
        }

        const store = readStreamStore();
        for (const key of STREAM_PREFS) {
            const item = backup[key];
            if (!item) continue;
            if (item.exists) store[key] = item.value;
            else delete store[key];
        }
        writeStreamStore(store);
        try { localStorage.removeItem(BACKUP_KEY); } catch (_) {}
        toast('Native Look restaurado');
    }

    function applyNativeLook(showToast = true) {
        const mode = state.settings.nativeLook;
        if (mode === 'off') {
            restoreNativeLook();
            return;
        }

        ensureNativeBackup();
        const p = getNativeProfile(mode);
        const values = {
            'stream.video.resolution': p.resolution,
            'stream.video.codecProfile': p.codec,
            'stream.video.maxBitrate': p.bitrate,
            'stream.video.preventResolutionDrops': false,
            'video.maxFps': 60,
            'video.processing': p.processing,
            'video.processing.mode': p.processingMode,
            'video.processing.sharpness': p.sharpness,
        };

        for (const [key, value] of Object.entries(values)) {
            setStreamSetting(key, value);
        }
        if (showToast) toast(`Native Look: ${p.label} · ${(p.bitrate / 1048576).toFixed(1)} Mbps`);
    }

    function controllerFamily(id) {
        const s = String(id || '').toLowerCase();
        if (/dualsense|dualshock|playstation|sony|054c/.test(s)) return 'playstation';
        if (/nintendo|switch|joy-con|joycon|pro controller|057e/.test(s)) return 'nintendo';
        if (/xbox|xinput|microsoft|045e/.test(s)) return 'xbox';
        return 'xbox';
    }

    function familyLabel(family) {
        if (family === 'playstation') return 'PlayStation';
        if (family === 'nintendo') return 'Nintendo Switch';
        return 'Xbox';
    }

    function getConnectedGamepads() {
        try {
            return Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean);
        } catch (_) {
            return [];
        }
    }

    function effectiveControllerFamily(gamepad) {
        const mode = state.settings.controllerMode;
        return mode === 'auto' ? controllerFamily(gamepad && gamepad.id) : mode;
    }

    function findControllerSettingKey(settings, gamepadId) {
        if (!settings || typeof settings !== 'object') return gamepadId;
        if (Object.prototype.hasOwnProperty.call(settings, gamepadId)) return gamepadId;
        const needle = String(gamepadId || '').toLowerCase();
        for (const key of Object.keys(settings)) {
            const lower = key.toLowerCase();
            if (needle && (lower.includes(needle) || needle.includes(lower))) return key;
        }
        return gamepadId;
    }

    function applyControllerProfile(gamepad, silent = false) {
        if (!gamepad) return;
        const family = effectiveControllerFamily(gamepad);
        const preset = family === 'nintendo' ? -1 : 0;
        const store = readStreamStore();
        const all = (store['controller.settings'] && typeof store['controller.settings'] === 'object')
            ? Object.assign({}, store['controller.settings'])
            : {};
        const key = findControllerSettingKey(all, gamepad.id);
        const current = all[key] && typeof all[key] === 'object' ? Object.assign({}, all[key]) : {};

        // Preserve user-made Better xCloud custom layouts (>0).
        if (Number(current.customizationPresetId) > 0) {
            state.lastController = { id: gamepad.id, family, customPreserved: true };
            if (!silent) toast(`${familyLabel(family)} detectado · perfil personalizado conservado`);
            updatePanelStatus();
            return;
        }

        const next = Object.assign({}, current, {
            shortcutPresetId: Number.isFinite(Number(current.shortcutPresetId)) ? Number(current.shortcutPresetId) : 0,
            customizationPresetId: preset,
        });
        all[key] = next;

        let appliedViaApi = false;
        try {
            const storage = getStorageApi();
            if (storage && storage.Stream && typeof storage.Stream.setSetting === 'function') {
                storage.Stream.setSetting('controller.settings', all, 'ui');
                appliedViaApi = true;
            }
        } catch (_) {}
        if (!appliedViaApi) {
            store['controller.settings'] = all;
            writeStreamStore(store);
        }
        refreshStreamSettings();

        state.lastController = { id: gamepad.id, family, customPreserved: false };
        if (!silent) {
            const detail = family === 'nintendo' ? 'ABXY Switch aplicado' : 'disposición estándar aplicada';
            toast(`${familyLabel(family)} · ${detail}`);
        }
        updatePanelStatus();
    }

    function rescanController(silent = true) {
        const pads = getConnectedGamepads();
        if (!pads.length) {
            state.lastController = null;
            updatePanelStatus();
            return;
        }
        applyControllerProfile(pads[0], silent);
    }

    function setControllerMode(mode) {
        state.settings.controllerMode = mode;
        saveSettings();
        rescanController(false);
        updatePanel();
    }

    function healthSample() {
        const video = document.querySelector('video');
        const net = networkInfo();
        let width = 0;
        let height = 0;
        let dropped = null;
        let total = null;
        let fps = null;

        if (video) {
            width = video.videoWidth || 0;
            height = video.videoHeight || 0;
            try {
                const q = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality() : null;
                if (q) {
                    total = q.totalVideoFrames;
                    dropped = q.droppedVideoFrames;
                }
            } catch (_) {}
            if (total === null && typeof video.webkitDecodedFrameCount === 'number') {
                total = video.webkitDecodedFrameCount;
                dropped = typeof video.webkitDroppedFrameCount === 'number' ? video.webkitDroppedFrameCount : null;
            }
        }

        const now = performance.now();
        if (state.lastHealth && total !== null && state.lastHealth.total !== null) {
            const dt = (now - state.lastHealth.time) / 1000;
            if (dt > 0) fps = Math.max(0, (total - state.lastHealth.total) / dt);
        }
        state.lastHealth = { time: now, total };

        return { width, height, dropped, total, fps, net, hasVideo: !!video };
    }

    function renderHealth() {
        const el = document.getElementById(HEALTH_ID);
        if (!el) return;
        const h = healthSample();
        const resolution = h.width && h.height ? `${h.width}×${h.height}` : 'esperando video';
        const fps = h.fps === null ? '—' : `${Math.round(h.fps)} FPS`;
        const dropped = h.dropped === null ? '—' : `${h.dropped} drop`;
        const rtt = h.net.rtt === null ? '—' : `${Math.round(h.net.rtt)} ms`;
        const down = h.net.downlink === null ? '—' : `${h.net.downlink.toFixed(1)} Mbps`;
        el.innerHTML = `<b>Stream Health</b><span>${resolution} · ${fps}</span><span>${dropped} · RTT ${rtt}</span><span>Red ${down}</span>`;
    }

    function stopHealth() {
        if (state.healthTimer) clearInterval(state.healthTimer);
        state.healthTimer = null;
        state.lastHealth = null;
        const el = document.getElementById(HEALTH_ID);
        if (el) el.remove();
    }

    function startHealth() {
        stopHealth();
        const el = document.createElement('div');
        el.id = HEALTH_ID;
        document.documentElement.appendChild(el);
        renderHealth();
        state.healthTimer = setInterval(renderHealth, 4000);
    }

    function setHealth(enabled) {
        state.settings.streamHealth = !!enabled;
        saveSettings();
        if (state.settings.streamHealth) startHealth(); else stopHealth();
        updatePanel();
        toast(state.settings.streamHealth ? 'Stream Health activado' : 'Stream Health desactivado');
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
#${BUTTON_ID}{position:fixed;right:14px;bottom:72px;z-index:2147483600;width:48px;height:48px;border:0;border-radius:24px;background:#151515;color:#fff;font:700 13px system-ui,sans-serif;box-shadow:0 3px 14px #0008;touch-action:manipulation}
#${BUTTON_ID}:active{transform:scale(.96)}
#${PANEL_ID}{position:fixed;left:10px;right:10px;bottom:10px;z-index:2147483640;max-height:min(78vh,640px);overflow:auto;background:#111;color:#f4f4f4;border:1px solid #393939;border-radius:18px;padding:16px;font:14px/1.35 system-ui,sans-serif;box-shadow:0 8px 28px #000b}
#${PANEL_ID} .bxme-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
#${PANEL_ID} h2{font-size:18px;margin:0}
#${PANEL_ID} .bxme-sub{font-size:12px;color:#aaa;margin-top:2px}
#${PANEL_ID} .bxme-close{border:0;border-radius:14px;background:#2b2b2b;color:#fff;width:36px;height:36px;font-size:20px}
#${PANEL_ID} .bxme-card{background:#1b1b1b;border:1px solid #303030;border-radius:14px;padding:12px;margin-top:10px}
#${PANEL_ID} .bxme-title{font-weight:700;margin-bottom:8px}
#${PANEL_ID} .bxme-status{font-size:12px;color:#bcbcbc;margin:6px 0 0}
#${PANEL_ID} .bxme-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#${PANEL_ID} button.bxme-option{border:1px solid #3d3d3d;border-radius:12px;background:#252525;color:#fff;padding:11px 8px;font:600 13px system-ui,sans-serif;min-height:42px}
#${PANEL_ID} button.bxme-option.active{border-color:#8cc8ff;background:#17334d}
#${PANEL_ID} .bxme-foot{font-size:11px;color:#888;margin-top:12px;text-align:center}
#${HEALTH_ID}{position:fixed;top:10px;right:10px;z-index:2147483500;background:#111e;color:#fff;border:1px solid #444;border-radius:10px;padding:8px 10px;font:11px/1.35 ui-monospace,SFMono-Regular,monospace;pointer-events:none;display:flex;flex-direction:column;gap:1px}
#bx-mobile-enhanced-toast{position:fixed;left:50%;bottom:136px;transform:translate(-50%,12px);z-index:2147483647;background:#050505ed;color:#fff;border:1px solid #444;border-radius:12px;padding:9px 12px;max-width:82vw;font:12px/1.25 system-ui,sans-serif;opacity:0;pointer-events:none;transition:.16s ease}
#bx-mobile-enhanced-toast.show{opacity:1;transform:translate(-50%,0)}
@media (orientation:landscape){#${BUTTON_ID}{bottom:16px}#${PANEL_ID}{left:auto;width:min(430px,48vw);right:10px}#bx-mobile-enhanced-toast{bottom:78px}}
`;
        (document.head || document.documentElement).appendChild(style);
    }

    function button(label, active, onclick) {
        const b = document.createElement('button');
        b.className = 'bxme-option' + (active ? ' active' : '');
        b.textContent = label;
        b.addEventListener('click', () => {
            vibrate(14);
            onclick();
        });
        return b;
    }

    function updatePanelStatus() {
        const el = document.getElementById('bxme-controller-status');
        if (!el) return;
        const pads = getConnectedGamepads();
        if (!pads.length) {
            el.textContent = 'Sin control físico detectado.';
            return;
        }
        const gp = pads[0];
        const detected = controllerFamily(gp.id);
        const effective = effectiveControllerFamily(gp);
        const override = state.settings.controllerMode === 'auto' ? 'Automático' : 'Manual';
        const custom = state.lastController && state.lastController.customPreserved ? ' · mapeo personalizado conservado' : '';
        el.textContent = `${override}: ${familyLabel(effective)} · detectado ${familyLabel(detected)} · ${gp.id}${custom}`;
    }

    function updatePanel() {
        const old = document.getElementById(PANEL_ID);
        if (old) old.remove();
        if (!state.panelOpen) return;

        const panel = document.createElement('div');
        panel.id = PANEL_ID;

        const head = document.createElement('div');
        head.className = 'bxme-head';
        const titles = document.createElement('div');
        const h2 = document.createElement('h2');
        h2.textContent = 'Better xCloud · Mobile Enhanced';
        const sub = document.createElement('div');
        sub.className = 'bxme-sub';
        sub.textContent = `v${VERSION} · ajustes móviles`;
        titles.append(h2, sub);
        const close = document.createElement('button');
        close.className = 'bxme-close';
        close.textContent = '×';
        close.onclick = () => togglePanel(false);
        head.append(titles, close);
        panel.appendChild(head);

        const nativeCard = document.createElement('div');
        nativeCard.className = 'bxme-card';
        nativeCard.innerHTML = '<div class="bxme-title">Native Look</div>';
        const nativeRow = document.createElement('div');
        nativeRow.className = 'bxme-row';
        const modes = [
            ['auto', 'Auto'],
            ['quality', 'Calidad'],
            ['performance', 'Rendimiento'],
            ['off', 'Desactivado'],
        ];
        for (const [mode, label] of modes) {
            nativeRow.appendChild(button(label, state.settings.nativeLook === mode, () => {
                state.settings.nativeLook = mode;
                saveSettings();
                applyNativeLook(true);
                updatePanel();
            }));
        }
        nativeCard.appendChild(nativeRow);
        const net = networkInfo();
        const ns = document.createElement('div');
        ns.className = 'bxme-status';
        const profile = state.settings.nativeLook === 'off' ? null : getNativeProfile(state.settings.nativeLook);
        ns.textContent = profile
            ? `${profile.resolution} · ${(profile.bitrate / 1048576).toFixed(1)} Mbps · H.264 ${profile.codec}`
            : 'Se restauran los valores que había antes de Mobile Enhanced.';
        nativeCard.appendChild(ns);
        panel.appendChild(nativeCard);

        const controllerCard = document.createElement('div');
        controllerCard.className = 'bxme-card';
        controllerCard.innerHTML = '<div class="bxme-title">Controller Console</div>';
        const controllerRow = document.createElement('div');
        controllerRow.className = 'bxme-row';
        const controllers = [
            ['auto', 'Automático'],
            ['xbox', 'Xbox'],
            ['playstation', 'PlayStation'],
            ['nintendo', 'Nintendo Switch'],
        ];
        for (const [mode, label] of controllers) {
            controllerRow.appendChild(button(label, state.settings.controllerMode === mode, () => setControllerMode(mode)));
        }
        controllerCard.appendChild(controllerRow);
        const cs = document.createElement('div');
        cs.id = 'bxme-controller-status';
        cs.className = 'bxme-status';
        controllerCard.appendChild(cs);
        panel.appendChild(controllerCard);

        const healthCard = document.createElement('div');
        healthCard.className = 'bxme-card';
        healthCard.innerHTML = '<div class="bxme-title">Stream Health</div>';
        const healthRow = document.createElement('div');
        healthRow.className = 'bxme-row';
        healthRow.append(
            button('Activado', !!state.settings.streamHealth, () => setHealth(true)),
            button('Desactivado', !state.settings.streamHealth, () => setHealth(false))
        );
        healthCard.appendChild(healthRow);
        const hs = document.createElement('div');
        hs.className = 'bxme-status';
        hs.textContent = 'Muestra resolución, FPS estimados, frames perdidos y datos de red. Muestreo cada 4 s.';
        healthCard.appendChild(hs);
        panel.appendChild(healthCard);

        const systemCard = document.createElement('div');
        systemCard.className = 'bxme-card';
        systemCard.innerHTML = '<div class="bxme-title">Respuesta táctil</div>';
        const systemRow = document.createElement('div');
        systemRow.className = 'bxme-row';
        systemRow.append(
            button('Vibración ON', !!state.settings.haptics, () => {
                state.settings.haptics = true; saveSettings(); vibrate(25); updatePanel();
            }),
            button('Vibración OFF', !state.settings.haptics, () => {
                state.settings.haptics = false; saveSettings(); updatePanel();
            })
        );
        systemCard.appendChild(systemRow);
        panel.appendChild(systemCard);

        const foot = document.createElement('div');
        foot.className = 'bxme-foot';
        foot.textContent = 'Alt + F11 también abre este menú si usas teclado físico.';
        panel.appendChild(foot);

        document.documentElement.appendChild(panel);
        updatePanelStatus();
    }

    function togglePanel(force) {
        state.panelOpen = typeof force === 'boolean' ? force : !state.panelOpen;
        updatePanel();
        vibrate(12);
    }

    function createLauncherButton() {
        if (document.getElementById(BUTTON_ID)) return;
        const b = document.createElement('button');
        b.id = BUTTON_ID;
        b.textContent = 'BX+';
        b.setAttribute('aria-label', 'Abrir Mobile Enhanced');
        b.addEventListener('click', () => togglePanel());
        document.documentElement.appendChild(b);
    }

    function onControllerChanged(event) {
        const gp = event && event.gamepad ? event.gamepad : getConnectedGamepads()[0];
        if (gp) applyControllerProfile(gp, false);
        else rescanController(true);
    }

    function init() {
        injectStyle();
        createLauncherButton();

        addEventListener('gamepadconnected', onControllerChanged);
        addEventListener('gamepaddisconnected', () => setTimeout(() => rescanController(true), 200));
        addEventListener('keydown', event => {
            if (event.altKey && event.key === 'F11') {
                event.preventDefault();
                event.stopPropagation();
                togglePanel();
            }
        }, true);

        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection && typeof connection.addEventListener === 'function') {
            connection.addEventListener('change', () => {
                if (state.settings.nativeLook === 'auto') applyNativeLook(false);
                updatePanel();
            });
        }

        if (state.settings.nativeLook !== 'off') applyNativeLook(false);
        if (state.settings.streamHealth) startHealth();
        setTimeout(() => rescanController(true), 800);

        window.BX_MOBILE_ENHANCED = {
            version: VERSION,
            open: () => togglePanel(true),
            close: () => togglePanel(false),
            applyNativeLook,
            rescanController,
            get settings() { return Object.assign({}, state.settings); },
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
