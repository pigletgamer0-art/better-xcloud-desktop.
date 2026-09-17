(() => {
  'use strict';

  const VERSION = '0.2.0';
  const PREFIX = 'BX.MobileEnhanced.';
  const SETTINGS_KEY = PREFIX + 'settings.v2';
  const STREAM_KEY = 'BetterXcloud.Stream';
  const PANEL_ID = 'bxme-panel';
  const BUTTON_ID = 'bxme-button';
  const HEALTH_ID = 'bxme-health';
  const STYLE_ID = 'bxme-style';

  const state = {
    started: false,
    panelOpen: false,
    healthTimer: null,
    lastHealth: null,
    settings: loadSettings(),
  };

  function safeJson(value, fallback) {
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
      return Object.assign(defaults, safeJson(localStorage.getItem(SETTINGS_KEY), {}));
    } catch (_) {
      return defaults;
    }
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch (_) {}
  }

  function readStore() {
    try { return safeJson(localStorage.getItem(STREAM_KEY), {}); } catch (_) { return {}; }
  }

  function writeStore(store) {
    try {
      localStorage.setItem(STREAM_KEY, JSON.stringify(store));
      window.dispatchEvent(new StorageEvent('storage', { key: STREAM_KEY, newValue: JSON.stringify(store) }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function storageApi() {
    return window.STORAGE || (window.BX_EXPOSED && window.BX_EXPOSED.STORAGE) || null;
  }

  function setSetting(key, value) {
    try {
      const storage = storageApi();
      if (storage && storage.Stream && typeof storage.Stream.setSetting === 'function') {
        storage.Stream.setSetting(key, value, 'ui');
        return true;
      }
    } catch (_) {}
    const store = readStore();
    store[key] = value;
    return writeStore(store);
  }

  function networkInfo() {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
    return {
      downlink: c && Number.isFinite(c.downlink) ? c.downlink : null,
      rtt: c && Number.isFinite(c.rtt) ? c.rtt : null,
      saveData: !!(c && c.saveData),
      effectiveType: c && c.effectiveType || null,
    };
  }

  function nativeProfile(mode) {
    if (mode === 'quality') return { label: 'Calidad', resolution: '1080p-hq', bitrate: 12288000, codec: 'high', processing: 'cas', processingMode: 'quality', sharpness: 2 };
    if (mode === 'performance') return { label: 'Rendimiento', resolution: '1080p', bitrate: 8192000, codec: 'normal', processing: 'usm', processingMode: 'performance', sharpness: 0 };

    const net = networkInfo();
    if (net.saveData) return { label: 'Auto ahorro', resolution: '1080p', bitrate: 6144000, codec: 'normal', processing: 'usm', processingMode: 'performance', sharpness: 0 };
    if ((net.rtt !== null && net.rtt >= 110) || (net.downlink !== null && net.downlink < 10) || net.effectiveType === '3g' || net.effectiveType === '2g') {
      return { label: 'Auto estable', resolution: '1080p', bitrate: 8192000, codec: 'normal', processing: 'usm', processingMode: 'performance', sharpness: 0 };
    }
    if ((net.downlink === null || net.downlink >= 30) && (net.rtt === null || net.rtt < 70)) {
      return { label: 'Auto calidad', resolution: '1080p-hq', bitrate: 12288000, codec: 'high', processing: 'cas', processingMode: 'performance', sharpness: 1 };
    }
    return { label: 'Auto equilibrado', resolution: '1080p', bitrate: 10240000, codec: 'high', processing: 'usm', processingMode: 'performance', sharpness: 0 };
  }

  function applyNativeLook(showToast = true) {
    if (state.settings.nativeLook === 'off') {
      if (showToast) toast('Native Look desactivado');
      return;
    }
    const p = nativeProfile(state.settings.nativeLook);
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
    Object.entries(values).forEach(([key, value]) => setSetting(key, value));
    if (showToast) toast(`Native Look: ${p.label}`);
  }

  function controllerFamily(id) {
    const s = String(id || '').toLowerCase();
    if (/dualsense|dualshock|playstation|sony|054c/.test(s)) return 'playstation';
    if (/nintendo|switch|joy-con|joycon|pro controller|057e/.test(s)) return 'nintendo';
    return 'xbox';
  }

  function familyLabel(family) {
    return family === 'playstation' ? 'PlayStation' : family === 'nintendo' ? 'Nintendo Switch' : 'Xbox';
  }

  function pads() {
    try { return Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean); } catch (_) { return []; }
  }

  function effectiveFamily(gp) {
    return state.settings.controllerMode === 'auto' ? controllerFamily(gp && gp.id) : state.settings.controllerMode;
  }

  function applyController(gp, silent = false) {
    if (!gp) return;
    const family = effectiveFamily(gp);
    const store = readStore();
    const settings = store['controller.settings'] && typeof store['controller.settings'] === 'object'
      ? Object.assign({}, store['controller.settings']) : {};
    const current = settings[gp.id] && typeof settings[gp.id] === 'object' ? Object.assign({}, settings[gp.id]) : {};

    if (Number(current.customizationPresetId) > 0) {
      if (!silent) toast(`${familyLabel(family)} detectado · perfil personalizado conservado`);
      updateControllerStatus();
      return;
    }

    settings[gp.id] = Object.assign({}, current, {
      shortcutPresetId: Number.isFinite(Number(current.shortcutPresetId)) ? Number(current.shortcutPresetId) : 0,
      customizationPresetId: family === 'nintendo' ? -1 : 0,
    });

    try {
      const storage = storageApi();
      if (storage && storage.Stream && typeof storage.Stream.setSetting === 'function') {
        storage.Stream.setSetting('controller.settings', settings, 'ui');
      } else {
        store['controller.settings'] = settings;
        writeStore(store);
      }
    } catch (_) {
      store['controller.settings'] = settings;
      writeStore(store);
    }

    try {
      const ss = window.StreamSettings || (window.BX_EXPOSED && window.BX_EXPOSED.StreamSettings);
      if (ss && typeof ss.refreshControllerSettings === 'function') ss.refreshControllerSettings();
    } catch (_) {}

    if (!silent) toast(`${familyLabel(family)} aplicado${family === 'nintendo' ? ' · ABXY Switch' : ''}`);
    updateControllerStatus();
  }

  function rescanController(silent = true) {
    const list = pads();
    if (list[0]) applyController(list[0], silent);
    else updateControllerStatus();
  }

  function vibrate(ms = 14) {
    if (!state.settings.haptics) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
  }

  function toast(message) {
    let el = document.getElementById('bxme-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bxme-toast';
      document.documentElement.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el.__bxTimer);
    el.__bxTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  function healthSample() {
    const video = document.querySelector('video');
    const net = networkInfo();
    let total = null;
    let dropped = null;
    let fps = null;
    if (video) {
      try {
        const q = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality() : null;
        if (q) { total = q.totalVideoFrames; dropped = q.droppedVideoFrames; }
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
    return {
      width: video ? video.videoWidth || 0 : 0,
      height: video ? video.videoHeight || 0 : 0,
      total, dropped, fps, net,
    };
  }

  function renderHealth() {
    const el = document.getElementById(HEALTH_ID);
    if (!el) return;
    const h = healthSample();
    const resolution = h.width && h.height ? `${h.width}×${h.height}` : 'esperando video';
    const fps = h.fps === null ? '—' : `${Math.round(h.fps)} FPS`;
    const dropped = h.dropped === null ? '—' : `${h.dropped} drop`;
    const rtt = h.net.rtt === null ? '—' : `${Math.round(h.net.rtt)} ms`;
    el.innerHTML = `<b>Stream Health</b><span>${resolution} · ${fps}</span><span>${dropped} · RTT ${rtt}</span>`;
  }

  function setHealth(enabled) {
    state.settings.streamHealth = !!enabled;
    saveSettings();
    if (state.healthTimer) clearInterval(state.healthTimer);
    state.healthTimer = null;
    const old = document.getElementById(HEALTH_ID);
    if (old) old.remove();
    if (enabled) {
      const el = document.createElement('div');
      el.id = HEALTH_ID;
      document.documentElement.appendChild(el);
      renderHealth();
      state.healthTimer = setInterval(renderHealth, 4000);
    }
    updatePanel();
    toast(enabled ? 'Stream Health activado' : 'Stream Health desactivado');
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#${BUTTON_ID}{position:fixed;right:14px;bottom:72px;z-index:2147483600;width:50px;height:50px;border:0;border-radius:25px;background:#151515;color:#fff;font:700 13px system-ui;box-shadow:0 3px 14px #0008}
#${PANEL_ID}{position:fixed;left:10px;right:10px;bottom:10px;z-index:2147483640;max-height:78vh;overflow:auto;background:#111;color:#f4f4f4;border:1px solid #393939;border-radius:18px;padding:16px;font:14px/1.35 system-ui;box-shadow:0 8px 28px #000b}
#${PANEL_ID} .head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}#${PANEL_ID} h2{font-size:18px;margin:0}#${PANEL_ID} .sub{font-size:12px;color:#aaa}#${PANEL_ID} .close{border:0;border-radius:14px;background:#2b2b2b;color:#fff;width:36px;height:36px;font-size:20px}#${PANEL_ID} .card{background:#1b1b1b;border:1px solid #303030;border-radius:14px;padding:12px;margin-top:10px}#${PANEL_ID} .title{font-weight:700;margin-bottom:8px}#${PANEL_ID} .row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#${PANEL_ID} .option{border:1px solid #3d3d3d;border-radius:12px;background:#252525;color:#fff;padding:11px 8px;font:600 13px system-ui;min-height:42px}#${PANEL_ID} .option.active{border-color:#8cc8ff;background:#17334d}#${PANEL_ID} .status{font-size:12px;color:#bcbcbc;margin-top:8px}
#${HEALTH_ID}{position:fixed;top:10px;right:10px;z-index:2147483500;background:#111e;color:#fff;border:1px solid #444;border-radius:10px;padding:8px 10px;font:11px/1.35 monospace;pointer-events:none;display:flex;flex-direction:column}
#bxme-toast{position:fixed;left:50%;bottom:136px;transform:translate(-50%,12px);z-index:2147483647;background:#050505ed;color:#fff;border:1px solid #444;border-radius:12px;padding:9px 12px;max-width:82vw;font:12px/1.25 system-ui;opacity:0;pointer-events:none;transition:.16s ease}#bxme-toast.show{opacity:1;transform:translate(-50%,0)}
@media (orientation:landscape){#${BUTTON_ID}{bottom:16px}#${PANEL_ID}{left:auto;width:min(430px,48vw);right:10px}}
`;
    (document.head || document.documentElement).appendChild(style);
  }

  function option(label, active, fn) {
    const b = document.createElement('button');
    b.className = 'option' + (active ? ' active' : '');
    b.textContent = label;
    b.onclick = () => { vibrate(); fn(); };
    return b;
  }

  function updateControllerStatus() {
    const el = document.getElementById('bxme-controller-status');
    if (!el) return;
    const gp = pads()[0];
    if (!gp) { el.textContent = 'Sin control físico detectado.'; return; }
    const detected = controllerFamily(gp.id);
    const effective = effectiveFamily(gp);
    el.textContent = `${state.settings.controllerMode === 'auto' ? 'Automático' : 'Manual'}: ${familyLabel(effective)} · detectado ${familyLabel(detected)}`;
  }

  function updatePanel() {
    const old = document.getElementById(PANEL_ID);
    if (old) old.remove();
    if (!state.panelOpen) return;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `<div class="head"><div><h2>Better xCloud · Mobile Enhanced</h2><div class="sub">v${VERSION} · inyección segura</div></div><button class="close">×</button></div>`;
    panel.querySelector('.close').onclick = () => { state.panelOpen = false; updatePanel(); };

    const native = document.createElement('div');
    native.className = 'card';
    native.innerHTML = '<div class="title">Native Look</div>';
    const nrow = document.createElement('div'); nrow.className = 'row';
    [['auto','Auto'],['quality','Calidad'],['performance','Rendimiento'],['off','Desactivado']].forEach(([mode,label]) => {
      nrow.appendChild(option(label, state.settings.nativeLook === mode, () => { state.settings.nativeLook = mode; saveSettings(); applyNativeLook(true); updatePanel(); }));
    });
    native.appendChild(nrow); panel.appendChild(native);

    const controller = document.createElement('div');
    controller.className = 'card'; controller.innerHTML = '<div class="title">Controller Console</div>';
    const crow = document.createElement('div'); crow.className = 'row';
    [['auto','Automático'],['xbox','Xbox'],['playstation','PlayStation'],['nintendo','Nintendo Switch']].forEach(([mode,label]) => {
      crow.appendChild(option(label, state.settings.controllerMode === mode, () => { state.settings.controllerMode = mode; saveSettings(); rescanController(false); updatePanel(); }));
    });
    controller.appendChild(crow);
    const cs = document.createElement('div'); cs.id = 'bxme-controller-status'; cs.className = 'status'; controller.appendChild(cs);
    panel.appendChild(controller);

    const health = document.createElement('div');
    health.className = 'card'; health.innerHTML = '<div class="title">Stream Health</div>';
    const hrow = document.createElement('div'); hrow.className = 'row';
    hrow.append(option('Activado', !!state.settings.streamHealth, () => setHealth(true)), option('Desactivado', !state.settings.streamHealth, () => setHealth(false)));
    health.appendChild(hrow); panel.appendChild(health);

    const haptics = document.createElement('div');
    haptics.className = 'card'; haptics.innerHTML = '<div class="title">Respuesta táctil</div>';
    const vrow = document.createElement('div'); vrow.className = 'row';
    vrow.append(option('Vibración ON', !!state.settings.haptics, () => { state.settings.haptics = true; saveSettings(); vibrate(25); updatePanel(); }), option('Vibración OFF', !state.settings.haptics, () => { state.settings.haptics = false; saveSettings(); updatePanel(); }));
    haptics.appendChild(vrow); panel.appendChild(haptics);

    document.documentElement.appendChild(panel);
    updateControllerStatus();
  }

  function createButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const b = document.createElement('button');
    b.id = BUTTON_ID;
    b.textContent = 'BX+';
    b.setAttribute('aria-label', 'Abrir Mobile Enhanced');
    b.onclick = () => { state.panelOpen = !state.panelOpen; vibrate(); updatePanel(); };
    document.documentElement.appendChild(b);
  }

  function start() {
    if (state.started || !document.documentElement) return;
    state.started = true;
    injectStyle();
    createButton();
    window.addEventListener('gamepadconnected', e => applyController(e.gamepad, false));
    window.addEventListener('gamepaddisconnected', () => setTimeout(() => rescanController(true), 250));
    window.addEventListener('keydown', e => {
      if (e.altKey && e.key === 'F11') {
        e.preventDefault(); e.stopPropagation();
        state.panelOpen = !state.panelOpen; updatePanel();
      }
    }, true);
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection && typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', () => {
        if (state.settings.nativeLook === 'auto') applyNativeLook(false);
      });
    }
    if (state.settings.nativeLook !== 'off') applyNativeLook(false);
    if (state.settings.streamHealth) setHealth(true);
    setTimeout(() => rescanController(true), 900);
    window.BX_MOBILE_ENHANCED = {
      version: VERSION,
      injected: true,
      open() { state.panelOpen = true; updatePanel(); },
      close() { state.panelOpen = false; updatePanel(); },
      applyNativeLook,
      rescanController,
      get settings() { return Object.assign({}, state.settings); },
    };
    console.info('[BX Mobile Enhanced] injected v' + VERSION);
  }

  function waitForHost(attempt = 0) {
    if (window.BX_EXPOSED && document.documentElement) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
      else start();
      return;
    }
    if (attempt < 80) setTimeout(() => waitForHost(attempt + 1), 125);
    else {
      // Last-resort UI injection: useful for diagnosing host/API changes.
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
      else start();
    }
  }

  waitForHost();
})();
