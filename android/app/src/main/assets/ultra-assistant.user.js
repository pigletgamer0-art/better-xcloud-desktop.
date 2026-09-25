// ==UserScript==
// @name         Better xCloud - Ultra Assistant Android Tablet
// @namespace    https://github.com/redphx/better-xcloud
// @version      2.1.0
// @description  Android tablet profiles, manual stream diagnosis, backup and restore for Better xCloud.
// @match        https://www.xbox.com/*/play*
// @match        https://www.xbox.com/*/auth/msa?*loggedIn*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const ADDON_VERSION = '2.1.0';

  const GLOBAL_KEY = 'BetterXcloud';
  const STREAM_KEY = 'BetterXcloud.Stream';

  const STATE_KEY = 'BX.UltraAssistant.State.v2';
  const BACKUP_KEY = 'BX.UltraAssistant.Backups.v2';

  const BUTTON_CLASS = 'bx-ultra-assistant-addon-button';
  const FALLBACK_BUTTON_ID = 'bx-ultra-assistant-fallback-button';
  const MODAL_ID = 'bx-ultra-assistant-addon-modal';
  const STYLE_ID = 'bx-ultra-assistant-addon-style';

  const MAX_BACKUPS = 5;

  /*
   * Classification matches Better xCloud's current GlobalPref/StreamPref split.
   * Important: "stream.video.*" resolution/bitrate prefs are GLOBAL prefs.
   */
  const GLOBAL_PREFS = new Set([
    'stream.video.resolution',
    'stream.video.codecProfile',
    'stream.video.maxBitrate',
    'stream.video.combineAudio',
    'stream.video.preventResolutionDrops',

    'loadingScreen.gameArt.show',
    'loadingScreen.waitTime.show',
    'loadingScreen.rocket',

    'ui.reduceAnimations',
    'ui.hideScrollbar',
    'ui.streamMenu.simplify',
    'ui.splashVideo.skip',
    'ui.imageQuality',
    'ui.controllerStatus.show',

    'block.tracking',
    'gameBar.position',
    'audio.volume.booster.enabled',
    'screenshot.applyFilters'
  ]);

  const STREAM_PREFS = new Set([
    'audio.volume',
    'controller.pollingRate',
    'controller.settings',
    'deviceVibration.intensity',
    'deviceVibration.mode',
    'keyboardShortcuts.preset.inGameId',
    'localCoOp.enabled',
    'mkb.p1.preset.mappingId',
    'mkb.p1.slot',
    'mkb.p2.preset.mappingId',
    'mkb.p2.slot',
    'nativeMkb.scroll.sensitivityX',
    'nativeMkb.scroll.sensitivityY',
    'stats.colors',
    'stats.items',
    'stats.opacity.all',
    'stats.opacity.background',
    'stats.position',
    'stats.quickGlance.enabled',
    'stats.showWhenPlaying',
    'stats.textSize',
    'video.brightness',
    'video.contrast',
    'video.maxFps',
    'video.player.type',
    'video.position',
    'video.player.powerPreference',
    'video.processing',
    'video.processing.mode',
    'video.ratio',
    'video.saturation',
    'video.processing.sharpness'
  ]);

  const LABELS = {
    'stream.video.resolution': 'Resolución objetivo',
    'stream.video.maxBitrate': 'Bitrate máximo',
    'stream.video.preventResolutionDrops': 'Evitar bajadas automáticas a 720p',
    'stream.video.codecProfile': 'Perfil H.264',

    'controller.pollingRate': 'Polling del mando',
    'deviceVibration.mode': 'Vibración del dispositivo',

    'video.maxFps': 'Límite de FPS',
    'video.player.type': 'Renderer',
    'video.player.powerPreference': 'Configuración del renderer',
    'video.processing': 'Método de claridad',
    'video.processing.mode': 'Modo de claridad',
    'video.processing.sharpness': 'Nitidez',

    'ui.reduceAnimations': 'Reducir animaciones',
    'ui.imageQuality': 'Calidad de imágenes del menú',
    'ui.splashVideo.skip': 'Saltar intro de Xbox',
    'loadingScreen.gameArt.show': 'Arte en pantalla de carga',
    'loadingScreen.rocket': 'Animación del cohete',
    'loadingScreen.waitTime.show': 'Tiempo estimado de espera',

    'stats.showWhenPlaying': 'Estadísticas al iniciar',
    'stats.quickGlance.enabled': 'Quick Glance'
  };

  const PROFILE_META = {
    'tablet-stable': {
      icon: '📱',
      label: 'Tablet: estabilidad',
      short: '720p, bitrate moderado y procesado mínimo; no fuerza 60 FPS.'
    },
    auto: {
      icon: '✨',
      label: 'Automático inteligente',
      short: 'El asistente elige el perfil según equipo y conexión.'
    },
    'ultra-latency': {
      icon: '⚡',
      label: 'Ultra fluido / mínimo delay',
      short: 'Menos trabajo local, menos bitrate y sin nitidez extra.'
    },
    competitive: {
      icon: '🎯',
      label: 'Competitivo / baja latencia',
      short: 'Respuesta rápida sin sacrificar tanta calidad.'
    },
    balanced: {
      icon: '⚖️',
      label: 'Equilibrado',
      short: 'Mezcla de nitidez, estabilidad y respuesta.'
    },
    quality: {
      icon: '✨',
      label: 'Máxima calidad',
      short: '1080p HQ, bitrate alto y claridad mejorada.'
    },
    unstable: {
      icon: '📶',
      label: 'Conexión inestable',
      short: 'Menos presión de red para reducir cortes y pixelación.'
    },
    resources: {
      icon: '🪶',
      label: 'Máximo ahorro de recursos',
      short: 'Menos carga para notebooks, TV Box y equipos modestos.'
    }
  };

  const DEVICE_META = {
    auto: 'Detectar automáticamente',
    'pc-low': 'PC / notebook básico',
    'pc-mid': 'PC / notebook medio',
    'pc-high': 'PC potente',
    mobile: 'Android / móvil',
    tablet: 'Android / tablet',
    tv: 'Smart TV / TV Box'
  };

  const VALIDATORS = {
    'stream.video.resolution': value =>
      ['720p', '1080p', '1080p-hq', 'auto'].includes(value),

    'stream.video.maxBitrate': value =>
      Number.isInteger(value) &&
      (value === 0 || (value >= 102400 && value <= 15360000)),

    'stream.video.preventResolutionDrops': isBoolean,

    'stream.video.codecProfile': value =>
      ['default', 'low', 'normal', 'high'].includes(value),

    'controller.pollingRate': value =>
      Number.isInteger(value) && value >= 4 && value <= 60,

    'deviceVibration.mode': value =>
      ['on', 'auto', 'off'].includes(value),

    'video.maxFps': value =>
      Number.isInteger(value) && value >= 10 && value <= 60,

    'video.player.type': value =>
      ['default', 'webgl2', 'webgpu'].includes(value),

    'video.player.powerPreference': value =>
      ['default', 'low-power', 'high-performance'].includes(value),

    'video.processing': value =>
      ['usm', 'cas'].includes(value),

    'video.processing.mode': value =>
      ['performance', 'quality'].includes(value),

    'video.processing.sharpness': value =>
      Number.isInteger(value) && value >= 0 && value <= 10,

    'ui.reduceAnimations': isBoolean,
    'ui.splashVideo.skip': isBoolean,
    'loadingScreen.gameArt.show': isBoolean,
    'loadingScreen.waitTime.show': isBoolean,

    'loadingScreen.rocket': value =>
      ['show', 'hide', 'hide-queue'].includes(value),

    'ui.imageQuality': value =>
      Number.isInteger(value) && value >= 10 && value <= 90,

    'stats.showWhenPlaying': isBoolean,
    'stats.quickGlance.enabled': isBoolean
  };

  let bodyOverflowBeforeModal = '';
  let attachScheduled = false;
  let fallbackTimer = 0;

  function isBoolean(value) {
    return typeof value === 'boolean';
  }

  function safeParse(raw, fallback = null) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function readStorageObject(key) {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return {
        raw: null,
        value: {},
        valid: true
      };
    }

    const value = safeParse(raw, null);

    const valid =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value);

    return {
      raw,
      value: valid ? value : {},
      valid
    };
  }

  function writeStorageObject(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function restoreRaw(key, raw) {
    if (raw === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, raw);
    }
  }

  function readAddonState() {
    const state = safeParse(localStorage.getItem(STATE_KEY) || '{}', {});

    return {
      device: typeof state?.device === 'string' ? state.device : 'auto',
      style: typeof state?.style === 'string' ? state.style : 'auto',
      adaptive: state?.adaptive !== false,
      lightUi: state?.lightUi !== false
    };
  }

  function saveAddonState(state) {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (_) {
      // Non-critical. The assistant still works without persistent UI state.
    }
  }

  function readBackups() {
    const value = safeParse(localStorage.getItem(BACKUP_KEY) || '[]', []);

    return Array.isArray(value) ? value : [];
  }

  function saveBackups(backups) {
    localStorage.setItem(
      BACKUP_KEY,
      JSON.stringify(backups.slice(0, MAX_BACKUPS))
    );
  }

  function createBackup(label = 'Antes de aplicar perfil') {
    const backup = {
      version: 2,
      addonVersion: ADDON_VERSION,
      createdAt: new Date().toISOString(),
      label,
      globalRaw: localStorage.getItem(GLOBAL_KEY),
      streamRaw: localStorage.getItem(STREAM_KEY)
    };

    const backups = readBackups();
    backups.unshift(backup);
    saveBackups(backups);

    return backup;
  }

  function restoreBackup(backup) {
    if (!backup || typeof backup !== 'object') {
      throw new Error('No hay un respaldo válido para restaurar.');
    }

    const currentGlobal = localStorage.getItem(GLOBAL_KEY);
    const currentStream = localStorage.getItem(STREAM_KEY);

    try {
      restoreRaw(GLOBAL_KEY, backup.globalRaw ?? null);
      restoreRaw(STREAM_KEY, backup.streamRaw ?? null);
    } catch (error) {
      restoreRaw(GLOBAL_KEY, currentGlobal);
      restoreRaw(STREAM_KEY, currentStream);
      throw error;
    }
  }

  function validateSetting(key, value) {
    const validator = VALIDATORS[key];

    if (!validator) {
      throw new Error(`El ajuste "${key}" no está autorizado por este add-on.`);
    }

    if (!validator(value)) {
      throw new Error(
        `Valor inválido para "${key}": ${JSON.stringify(value)}`
      );
    }
  }

  function partitionSettings(settings) {
    const globalChanges = {};
    const streamChanges = {};

    for (const [key, value] of Object.entries(settings)) {
      validateSetting(key, value);

      if (STREAM_PREFS.has(key)) {
        streamChanges[key] = value;
      } else if (GLOBAL_PREFS.has(key)) {
        globalChanges[key] = value;
      } else {
        throw new Error(
          `No se reconoce dónde guarda Better xCloud el ajuste "${key}".`
        );
      }
    }

    return {
      globalChanges,
      streamChanges
    };
  }

  function applySettingsTransactional(settings, profileName) {
    const globalState = readStorageObject(GLOBAL_KEY);
    const streamState = readStorageObject(STREAM_KEY);

    if (!globalState.valid) {
      throw new Error(
        `El almacenamiento "${GLOBAL_KEY}" contiene JSON inválido. ` +
        'No lo modificaré para evitar pérdida de configuración.'
      );
    }

    if (!streamState.valid) {
      throw new Error(
        `El almacenamiento "${STREAM_KEY}" contiene JSON inválido. ` +
        'No lo modificaré para evitar pérdida de configuración.'
      );
    }

    const {
      globalChanges,
      streamChanges
    } = partitionSettings(settings);

    const nextGlobal = {
      ...globalState.value,
      ...globalChanges
    };

    const nextStream = {
      ...streamState.value,
      ...streamChanges
    };

    const backup = createBackup(
      `Antes de aplicar ${profileName || 'perfil'}`
    );

    try {
      writeStorageObject(GLOBAL_KEY, nextGlobal);
      writeStorageObject(STREAM_KEY, nextStream);

      const verifyGlobal = readStorageObject(GLOBAL_KEY);
      const verifyStream = readStorageObject(STREAM_KEY);

      if (!verifyGlobal.valid || !verifyStream.valid) {
        throw new Error('No se pudo verificar la configuración escrita.');
      }

      for (const [key, value] of Object.entries(globalChanges)) {
        if (!sameValue(verifyGlobal.value[key], value)) {
          throw new Error(`Falló la verificación de "${key}".`);
        }
      }

      for (const [key, value] of Object.entries(streamChanges)) {
        if (!sameValue(verifyStream.value[key], value)) {
          throw new Error(`Falló la verificación de "${key}".`);
        }
      }

      return backup;
    } catch (error) {
      restoreRaw(GLOBAL_KEY, backup.globalRaw ?? null);
      restoreRaw(STREAM_KEY, backup.streamRaw ?? null);
      throw error;
    }
  }

  function sameValue(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function detectDevice() {
    const ua = String(navigator.userAgent || '').toLowerCase();
    const uaData = navigator.userAgentData;
    const cores = Number(navigator.hardwareConcurrency || 0);
    const memory = Number(navigator.deviceMemory || 0);
    const dpr = Number(window.devicePixelRatio || 1);
    const width = Number(screen?.width || 0);
    const height = Number(screen?.height || 0);
    const logicalPixels = width * height;
    const physicalPixels = logicalPixels * dpr * dpr;

    const isTv =
      /smart-tv|smarttv|tizen|webos|aft|android tv|googletv/.test(ua);

    const isMobile =
      Boolean(uaData?.mobile) ||
      /android|iphone|ipad|ipod|mobile/.test(ua);

    const touchPoints = Number(navigator.maxTouchPoints || 0);
    // La resolución CSS es una señal aproximada; no identifica el modelo real.
    const smallSide = Math.min(width, height);
    const isAndroidTablet = /android/.test(ua) && touchPoints > 0 &&
      smallSide >= 600 && !isTv;

    let tier = 'pc-mid';
    let label = 'PC / notebook medio';

    if (isTv) {
      tier = 'tv';
      label = 'Smart TV / TV Box';
    } else if (isAndroidTablet) {
      tier = 'tablet';
      label = 'Tablet Android (estimada)';
    } else if (isMobile) {
      tier = 'mobile';
      label = 'Móvil / Android';
    } else {
      const lowSignals = [
        cores > 0 && cores <= 4,
        memory > 0 && memory <= 4
      ].filter(Boolean).length;

      const highSignals = [
        cores >= 8,
        memory >= 8
      ].filter(Boolean).length;

      if (lowSignals >= 1 && highSignals === 0) {
        tier = 'pc-low';
        label = 'PC / notebook básico';
      } else if (highSignals >= 2) {
        tier = 'pc-high';
        label = 'PC potente';
      }
    }

    return {
      tier,
      label,
      cores,
      memory,
      dpr,
      width,
      height,
      physicalPixels,
      touchPoints,
      webgpu: Boolean(navigator.gpu)
    };
  }

  function getConnection() {
    const c =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    const downlink =
      typeof c?.downlink === 'number' && Number.isFinite(c.downlink)
        ? c.downlink
        : 0;

    const rtt =
      typeof c?.rtt === 'number' && Number.isFinite(c.rtt)
        ? c.rtt
        : 0;

    const effectiveType =
      typeof c?.effectiveType === 'string'
        ? c.effectiveType
        : 'desconocida';

    const saveData = Boolean(c?.saveData);

    let grade = 'unknown';

    if (
      saveData ||
      ['slow-2g', '2g', '3g'].includes(effectiveType) ||
      (downlink > 0 && downlink < 8) ||
      (rtt > 0 && rtt >= 100)
    ) {
      grade = 'poor';
    } else if (
      (downlink > 0 && downlink < 15) ||
      (rtt > 0 && rtt >= 60)
    ) {
      grade = 'fair';
    } else if (
      (downlink >= 25 || downlink === 0) &&
      (rtt > 0 && rtt < 60)
    ) {
      grade = 'good';
    }

    return {
      type: effectiveType,
      downlink,
      rtt,
      saveData,
      grade,
      available: Boolean(c)
    };
  }

  function getCurrentVersion() {
    const state = readStorageObject(GLOBAL_KEY);

    if (!state.valid) {
      return 'desconocida';
    }

    return String(state.value['version.current'] || 'no detectada');
  }

  function resolveDevice(choice) {
    return choice === 'auto'
      ? detectDevice().tier
      : choice;
  }

  function recommendStyle(device, conn) {
    if (device === 'tablet') {
      return 'tablet-stable';
    }

    if (conn.grade === 'poor') {
      return 'unstable';
    }

    if (
      ['pc-low', 'tv'].includes(device)
    ) {
      return 'resources';
    }

    if (device === 'mobile' && conn.grade !== 'good') {
      return 'balanced';
    }

    if (device === 'pc-high' && conn.grade === 'good') {
      return 'balanced';
    }

    return 'balanced';
  }

  function resolveStyle(styleChoice, device, conn) {
    return styleChoice === 'auto'
      ? recommendStyle(device, conn)
      : styleChoice;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundBitrate(value) {
    const step = 102400;
    return clamp(
      Math.round(value / step) * step,
      102400,
      15360000
    );
  }

  function adaptBitrate(base, profile, conn, adaptive) {
    if (!adaptive || !conn.downlink) {
      return base;
    }

    const networkBudget = conn.downlink * 1000000 * 0.62;

    if (profile === 'quality') {
      if (conn.downlink < 12) {
        return roundBitrate(Math.min(base, networkBudget));
      }

      return base;
    }

    const floorByProfile = {
      'tablet-stable': 1024000,
      'ultra-latency': 3072000,
      competitive: 4096000,
      balanced: 4096000,
      unstable: 2560000,
      resources: 3072000
    };

    const floor =
      floorByProfile[profile] || 3072000;

    return roundBitrate(
      clamp(
        Math.min(base, networkBudget),
        floor,
        base
      )
    );
  }

  function getBaseSettings() {
    return {
      'controller.pollingRate': 4,
      'video.maxFps': 60,
      'video.brightness': undefined,
      'video.contrast': undefined,
      'video.saturation': undefined
    };
  }

  function cleanupUndefined(obj) {
    const result = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }

    return result;
  }

  function makeProfile(
    deviceChoice,
    styleChoice,
    {
      adaptive = true,
      lightUi = true
    } = {}
  ) {
    const detected = detectDevice();
    const conn = getConnection();
    const device = resolveDevice(deviceChoice);
    const style = resolveStyle(styleChoice, device, conn);

    const lowDevice =
      ['pc-low', 'mobile', 'tablet', 'tv'].includes(device);

    const highDevice =
      device === 'pc-high';

    const settings = cleanupUndefined(getBaseSettings());
    // En Android no imponer 250 Hz: priorizar consumo y estabilidad.
    if (device === 'mobile' || device === 'tablet') {
      settings['controller.pollingRate'] = 8;
    }

    let reason = '';
    let latencyScore = 3;
    let qualityScore = 3;
    let stabilityScore = 3;

    if (style === 'tablet-stable') {
      Object.assign(settings, {
        'stream.video.resolution': '720p',
        'stream.video.maxBitrate': adaptBitrate(3072000, style, conn, adaptive),
        'stream.video.preventResolutionDrops': false,
        'stream.video.codecProfile': 'default',
        'deviceVibration.mode': 'off',
        'video.maxFps': 60, // Límite permitido, NO promesa de 60 FPS reales.
        'video.player.type': 'default',
        'video.player.powerPreference': 'default',
        'video.processing': 'usm',
        'video.processing.mode': 'performance',
        'video.processing.sharpness': 0,
        'stats.showWhenPlaying': true,
        'stats.quickGlance.enabled': true
      });
      reason = 'Pensado para tablets Android: 720p, 3 Mb/s como techo, ' +
        'sin nitidez adicional, con estadísticas visibles. La tasa real, ' +
        'el ping y los FPS dependen de Xbox, la red y la tablet.';
      latencyScore = 3;
      qualityScore = 2;
      stabilityScore = 4;
    } else if (style === 'ultra-latency') {
      Object.assign(settings, {
        'stream.video.resolution': '720p',
        'stream.video.maxBitrate': adaptBitrate(
          5120000,
          style,
          conn,
          adaptive
        ),
        'stream.video.preventResolutionDrops': false,
        'stream.video.codecProfile': 'default',

        'deviceVibration.mode': 'off',

        'video.player.type': 'default',
        'video.player.powerPreference': 'default',
        'video.processing': 'usm',
        'video.processing.mode': 'performance',
        'video.processing.sharpness': 0,

        'stats.showWhenPlaying': false,
        'stats.quickGlance.enabled': false
      });

      reason =
        'Minimiza trabajo de decodificación y postprocesado. ' +
        'Mantiene el polling del mando en 4 ms (250 Hz), que es el mínimo permitido actualmente por Better xCloud.';

      latencyScore = 5;
      qualityScore = 2;
      stabilityScore = 4;
    } else if (style === 'competitive') {
      Object.assign(settings, {
        'stream.video.resolution':
          lowDevice ? '720p' : '1080p',

        'stream.video.maxBitrate': adaptBitrate(
          lowDevice ? 6144000 : 9216000,
          style,
          conn,
          adaptive
        ),

        'stream.video.preventResolutionDrops': false,
        'stream.video.codecProfile': 'default',

        'deviceVibration.mode': 'off',

        'video.player.type': 'default',
        'video.player.powerPreference': 'default',
        'video.processing': 'usm',
        'video.processing.mode': 'performance',
        'video.processing.sharpness': 0,

        'stats.showWhenPlaying': false,
        'stats.quickGlance.enabled': false
      });

      reason =
        'Prioriza respuesta y 60 FPS, pero permite 1080p en equipos que deberían decodificarlo con soltura.';

      latencyScore = 5;
      qualityScore = lowDevice ? 3 : 4;
      stabilityScore = 4;
    } else if (style === 'quality') {
      Object.assign(settings, {
        'stream.video.resolution': '1080p-hq',
        'stream.video.maxBitrate': adaptBitrate(
          15360000,
          style,
          conn,
          adaptive
        ),
        'stream.video.preventResolutionDrops': true,
        'stream.video.codecProfile': 'default',

        'deviceVibration.mode': 'auto',

        'video.player.type':
          highDevice ? 'webgl2' : 'default',

        'video.player.powerPreference':
          highDevice ? 'low-power' : 'default',

        'video.processing':
          highDevice ? 'cas' : 'usm',

        'video.processing.mode':
          highDevice ? 'quality' : 'performance',

        'video.processing.sharpness':
          highDevice ? 2 : 1,

        'stats.showWhenPlaying': false,
        'stats.quickGlance.enabled': true
      });

      reason =
        highDevice
          ? 'Usa 1080p HQ y, en PC potente, WebGL2 + FidelityFX CAS para priorizar claridad.'
          : 'Usa 1080p HQ, pero conserva el renderer predeterminado para no forzar una ruta gráfica más pesada en este dispositivo.';

      latencyScore = 2;
      qualityScore = 5;
      stabilityScore = 3;
    } else if (style === 'unstable') {
      Object.assign(settings, {
        'stream.video.resolution': '720p',
        'stream.video.maxBitrate': adaptBitrate(
          4096000,
          style,
          conn,
          adaptive
        ),
        'stream.video.preventResolutionDrops': false,
        'stream.video.codecProfile': 'default',

        'deviceVibration.mode': 'off',

        'video.player.type': 'default',
        'video.player.powerPreference': 'default',
        'video.processing': 'usm',
        'video.processing.mode': 'performance',
        'video.processing.sharpness': 0,

        'stats.showWhenPlaying': false,
        'stats.quickGlance.enabled': false
      });

      reason =
        'Reduce el flujo de datos y evita mantener 1080p a la fuerza cuando la red o la decodificación no pueden sostenerlo.';

      latencyScore = 4;
      qualityScore = 2;
      stabilityScore = 5;
    } else if (style === 'resources') {
      Object.assign(settings, {
        'stream.video.resolution': '720p',
        'stream.video.maxBitrate': adaptBitrate(
          5120000,
          style,
          conn,
          adaptive
        ),
        'stream.video.preventResolutionDrops': false,
        'stream.video.codecProfile': 'default',

        'deviceVibration.mode': 'off',

        'video.player.type': 'default',
        'video.player.powerPreference': 'low-power',
        'video.processing': 'usm',
        'video.processing.mode': 'performance',
        'video.processing.sharpness': 0,

        'stats.showWhenPlaying': false,
        'stats.quickGlance.enabled': false
      });

      reason =
        'Reduce resolución, bitrate y efectos de claridad para aliviar CPU/GPU sin limitar el stream a 30 FPS.';

      latencyScore = 4;
      qualityScore = 2;
      stabilityScore = 5;
    } else {
      Object.assign(settings, {
        'stream.video.resolution':
          lowDevice ? '720p' : '1080p',

        'stream.video.maxBitrate': adaptBitrate(
          lowDevice ? 7168000 : 10240000,
          'balanced',
          conn,
          adaptive
        ),

        'stream.video.preventResolutionDrops': false,
        'stream.video.codecProfile': 'default',

        'deviceVibration.mode': 'auto',

        'video.player.type': 'default',
        'video.player.powerPreference': 'default',
        'video.processing': 'usm',
        'video.processing.mode': 'performance',
        'video.processing.sharpness': lowDevice ? 0 : 1,

        'stats.showWhenPlaying': false,
        'stats.quickGlance.enabled': true
      });

      reason =
        'Mantiene una buena relación entre nitidez, estabilidad y respuesta sin forzar el renderer.';

      latencyScore = 4;
      qualityScore = lowDevice ? 3 : 4;
      stabilityScore = 4;
    }

    if (lightUi) {
      Object.assign(settings, {
        'ui.reduceAnimations': true,
        'ui.splashVideo.skip': true,
        'loadingScreen.rocket': 'hide',
        'loadingScreen.waitTime.show': false,
        'loadingScreen.gameArt.show':
          style === 'quality',
        'ui.imageQuality':
          style === 'quality'
            ? 90
            : style === 'balanced'
              ? 60
              : 30
      });
    }

    const adapted =
      conn.downlink > 0 &&
      settings['stream.video.maxBitrate'] <
      getNominalBitrate(style, lowDevice);

    if (adapted) {
      reason +=
        ' El bitrate fue reducido automáticamente usando la estimación de conexión del navegador.';
    }

    const meta = PROFILE_META[style] || PROFILE_META.balanced;

    return {
      style,
      title: `${meta.icon} ${meta.label}`,
      reason,
      settings,
      device,
      detected,
      conn,
      scores: {
        latency: latencyScore,
        quality: qualityScore,
        stability: stabilityScore
      },
      recommendation:
        recommendStyle(device, conn)
    };
  }

  function getNominalBitrate(style, lowDevice) {
    switch (style) {
      case 'tablet-stable':
        return 3072000;      case 'ultra-latency':
        return 5120000;
      case 'competitive':
        return lowDevice ? 6144000 : 9216000;
      case 'quality':
        return 15360000;
      case 'unstable':
        return 4096000;
      case 'resources':
        return 5120000;
      default:
        return lowDevice ? 7168000 : 10240000;
    }
  }

  function formatValue(key, value) {
    if (key === 'stream.video.maxBitrate') {
      return `${(value / 1024000).toFixed(1)} Mb/s`;
    }

    if (key === 'controller.pollingRate') {
      return `${Math.round(1000 / value)} Hz · ${value} ms`;
    }

    if (key === 'video.maxFps' && value === 60) {
      return '60 FPS / sin límite adicional';
    }

    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    const map = {
      default: 'Predeterminado',
      auto: 'Automático',
      off: 'Desactivado',
      on: 'Activado',
      performance: 'Rendimiento',
      quality: 'Calidad',
      'high-performance': 'Alto rendimiento',
      'low-power': 'Ahorro de energía',
      hide: 'Oculta',
      'hide-queue': 'Ocultar durante la cola',
      show: 'Visible',
      webgl2: 'WebGL2',
      webgpu: 'WebGPU',
      cas: 'AMD FidelityFX CAS',
      usm: 'Unsharp masking',
      '1080p-hq': '1080p HQ'
    };

    return map[value] || String(value);
  }

  function formatConnection(conn) {
    const parts = [];

    if (conn.type && conn.type !== 'desconocida') {
      parts.push(conn.type.toUpperCase());
    }

    if (conn.downlink) {
      parts.push(`~${conn.downlink} Mbps`);
    }

    if (conn.rtt) {
      parts.push(`RTT estimado ~${conn.rtt} ms`);
    }

    if (conn.saveData) {
      parts.push('Ahorro de datos activo');
    }

    return parts.length
      ? parts.join(' · ')
      : 'La API del navegador no entrega datos de red.';
  }

  function diagnoseStreamMetrics({ ping, fps, bitrate, packetsLost, framesLost }) {
    const lines = [];
    if (ping !== null) {
      if (ping >= 120) lines.push('Ping ' + ping + ' ms: la respuesta puede sentirse tardía; cambiar FPS o bitrate no garantiza reducirlo.');
      else if (ping >= 70) lines.push('Ping ' + ping + ' ms: puede sentirse retraso en controles.');
      else lines.push('Ping ' + ping + ' ms: comprueba igualmente la respuesta real al jugar.');
    }
    if (fps !== null) {
      if (fps <= 30) lines.push('FPS ' + fps + ': la transmisión puede estar limitada a 30 FPS por servidor, juego, navegador o dispositivo. Ajustar el límite a 60 NO crea fotogramas nuevos.');
      else lines.push('FPS ' + fps + ': comprueba si se mantiene durante una partida, no solo en el lobby.');
    }
    if (bitrate !== null) {
      if (bitrate < 2) lines.push('Bitrate observado ' + bitrate + ' Mbps: la imagen puede verse comprimida; es tasa recibida, NO una prueba de que tu conexión solo tenga esa velocidad.');
      else lines.push('Bitrate observado ' + bitrate + ' Mbps: es la tasa de transmisión, no el ancho de banda máximo de tu Wi-Fi.');
    }
    if (packetsLost !== null) {
      lines.push(packetsLost > 0
        ? 'PL ' + packetsLost + ': hubo paquetes perdidos; vigila cortes y fluctuaciones.'
        : 'PL 0: no se observaron paquetes perdidos en esta lectura; no descarta otros problemas.');
    }
    if (framesLost !== null) {
      lines.push(framesLost > 0
        ? 'FL ' + framesLost + ': se registran cuadros perdidos; comprueba si aumenta al jugar.'
        : 'FL 0: no hay cuadros perdidos en esta lectura.');
    }
    if (!lines.length) lines.push('Introduce al menos una métrica visible en la barra de estadísticas.');
    lines.push('Los iconos rojos no se pueden identificar con certeza sin abrir su descripción.');
    return lines;
  }

  function parseMetricInput(value, maximum) {
    const trimmed = String(value).trim().replace(',', '.');
    if (trimmed === '') return null;
    const number = Number(trimmed);
    if (!Number.isFinite(number) || number < 0 || number > maximum) {
      throw new Error('Métrica inválida: revisa los valores ingresados.');
    }
    return number;
  }

  function scoreDots(value) {
    return Array.from(
      { length: 5 },
      (_, index) =>
        `<span class="${index < value ? 'is-on' : ''}"></span>`
    ).join('');
  }

  function isStreamProbablyActive() {
    const videos = [...document.querySelectorAll('video')];

    return videos.some(video =>
      video.readyState >= 2 &&
      !video.paused &&
      video.videoWidth > 0
    );
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;

    style.textContent = `
      .${BUTTON_CLASS} {
        width: 100%;
        min-height: 42px;
        border: 1px solid rgba(0,120,212,.9) !important;
        border-radius: 10px !important;
        background:
          linear-gradient(
            135deg,
            rgba(0,120,212,.23),
            rgba(123,31,162,.18)
          ) !important;
        font-weight: 700 !important;
        cursor: pointer;
      }

      .${BUTTON_CLASS}:hover {
        filter: brightness(1.1);
      }

      #${FALLBACK_BUTTON_ID} {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483600;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 999px;
        padding: 10px 14px;
        background: rgba(22,22,22,.92);
        color: #fff;
        font: 700 13px/1.2 Segoe UI, Arial, sans-serif;
        box-shadow: 0 8px 30px rgba(0,0,0,.4);
        cursor: pointer;
        backdrop-filter: blur(10px);
      }

      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(0,0,0,.76);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        font-family: Segoe UI, Arial, sans-serif;
        color: #fff;
      }

      #${MODAL_ID} * {
        box-sizing: border-box;
      }

      #${MODAL_ID} .bxua-card {
        width: min(880px, 100%);
        max-height: 94vh;
        overflow: auto;
        overscroll-behavior: contain;
        background: #181818;
        border: 1px solid #3c3c3c;
        border-radius: 18px;
        box-shadow: 0 20px 80px rgba(0,0,0,.7);
      }

      #${MODAL_ID} .bxua-header {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 18px;
        background: rgba(24,24,24,.96);
        border-bottom: 1px solid #333;
        backdrop-filter: blur(12px);
      }

      #${MODAL_ID} h2 {
        margin: 0 0 4px;
        font-size: 23px;
      }

      #${MODAL_ID} .bxua-version {
        font-size: 12px;
        opacity: .65;
      }

      #${MODAL_ID} .bxua-close {
        width: 38px;
        height: 38px;
        padding: 0;
        border-radius: 10px;
        font-size: 22px;
      }

      #${MODAL_ID} .bxua-body {
        padding: 18px;
      }

      #${MODAL_ID} .bxua-sub {
        opacity: .78;
        line-height: 1.45;
        margin: 0 0 16px;
      }

      #${MODAL_ID} .bxua-status-grid,
      #${MODAL_ID} .bxua-grid,
      #${MODAL_ID} .bxua-score-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      #${MODAL_ID} .bxua-status-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-bottom: 12px;
      }

      #${MODAL_ID} .bxua-status,
      #${MODAL_ID} .bxua-box {
        background: #232323;
        border: 1px solid #3a3a3a;
        border-radius: 12px;
        padding: 12px;
      }

      #${MODAL_ID} .bxua-status small,
      #${MODAL_ID} .bxua-muted {
        display: block;
        opacity: .67;
        font-size: 12px;
      }

      #${MODAL_ID} .bxua-status strong {
        display: block;
        margin-top: 4px;
        line-height: 1.35;
      }

      #${MODAL_ID} label {
        display: block;
        font-weight: 700;
        margin-bottom: 7px;
      }

      #${MODAL_ID} select {
        width: 100%;
        padding: 10px;
        border-radius: 9px;
        background: #111;
        color: #fff;
        border: 1px solid #555;
        font-size: 15px;
      }

      #${MODAL_ID} .bxua-detected {
        margin-top: 9px;
        font-size: 12px;
        opacity: .68;
        line-height: 1.45;
      }

      #${MODAL_ID} .bxua-options {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        margin: 12px 0 0;
      }

      #${MODAL_ID} .bxua-check {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
      }

      #${MODAL_ID} .bxua-check input {
        width: 17px;
        height: 17px;
      }

      #${MODAL_ID} .bxua-recommend {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 12px;
        padding: 12px;
        border: 1px solid #1b6ea8;
        border-radius: 12px;
        background: rgba(0,120,212,.12);
      }

      #${MODAL_ID} .bxua-recommend-text {
        line-height: 1.4;
      }

      #${MODAL_ID} .bxua-summary {
        margin-top: 12px;
        padding: 13px;
        border-radius: 12px;
        border: 1px solid #107c10;
        background: rgba(16,124,16,.13);
        line-height: 1.5;
      }

      #${MODAL_ID} .bxua-summary strong {
        font-size: 16px;
      }

      #${MODAL_ID} .bxua-score-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-top: 12px;
      }

      #${MODAL_ID} .bxua-score {
        padding: 10px;
        border: 1px solid #343434;
        border-radius: 10px;
        background: #202020;
      }

      #${MODAL_ID} .bxua-dots {
        display: flex;
        gap: 4px;
        margin-top: 7px;
      }

      #${MODAL_ID} .bxua-dots span {
        width: 12px;
        height: 5px;
        border-radius: 999px;
        background: #4b4b4b;
      }

      #${MODAL_ID} .bxua-dots span.is-on {
        background: #2ea043;
      }

      #${MODAL_ID} .bxua-list {
        margin-top: 12px;
        border: 1px solid #393939;
        border-radius: 12px;
        overflow: hidden;
      }

      #${MODAL_ID} .bxua-list-title {
        padding: 10px 12px;
        background: #202020;
        border-bottom: 1px solid #333;
        font-weight: 700;
      }

      #${MODAL_ID} .bxua-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 8px 10px;
        border-bottom: 1px solid #333;
        font-size: 14px;
      }

      #${MODAL_ID} .bxua-row:last-child {
        border-bottom: 0;
      }

      #${MODAL_ID} .bxua-row span:last-child {
        text-align: right;
        font-weight: 700;
      }

      #${MODAL_ID} .bxua-actions {
        display: flex;
        gap: 9px;
        flex-wrap: wrap;
        margin-top: 14px;
      }

      #${MODAL_ID} button {
        border: 0;
        border-radius: 10px;
        padding: 10px 14px;
        font-weight: 700;
        cursor: pointer;
        color: #fff;
        background: #353535;
      }

      #${MODAL_ID} button:hover:not(:disabled) {
        filter: brightness(1.12);
      }

      #${MODAL_ID} button:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      #${MODAL_ID} button.bxua-apply {
        background: #107c10;
      }

      #${MODAL_ID} button.bxua-secondary {
        background: #1f5f8b;
      }

      #${MODAL_ID} .bxua-warning {
        font-size: 12px;
        opacity: .7;
        margin-top: 12px;
        line-height: 1.5;
      }

      #${MODAL_ID} .bxua-error {
        display: none;
        margin-top: 12px;
        padding: 10px 12px;
        border: 1px solid #d13438;
        border-radius: 10px;
        background: rgba(209,52,56,.12);
        color: #ffd8d8;
        line-height: 1.4;
      }

      #${MODAL_ID} .bxua-error.is-visible {
        display: block;
      }

      #${MODAL_ID} .bxua-live-warning {
        color: #ffd166;
      }

      #${MODAL_ID} .bxua-metrics { margin-top: 14px; padding: 12px; border-radius: 12px; background: #232323; border: 1px solid #3a3a3a; }
      #${MODAL_ID} .bxua-metrics-grid { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 8px; margin: 10px 0; }
      #${MODAL_ID} .bxua-metrics-grid label { font-size: 12px; }
      #${MODAL_ID} .bxua-metrics-grid input { width: 100%; min-width: 0; font-size: 16px; background: #111; border: 1px solid #666; border-radius: 8px; color: #fff; padding: 9px; }
      #${MODAL_ID} .bxua-metrics-result { white-space: pre-line; line-height: 1.5; margin-top: 10px; font-size: 13px; }
      @media (max-width: 850px) {
        #${MODAL_ID} { padding: max(4px, env(safe-area-inset-top)) 4px max(4px, env(safe-area-inset-bottom)); }
        #${MODAL_ID} .bxua-card { max-height: 96dvh; }
        #${MODAL_ID} .bxua-metrics-grid { grid-template-columns: repeat(3,minmax(0,1fr)); }
        #${MODAL_ID} button { min-height: 44px; }
      }
      @media (max-width: 720px) {
        #${MODAL_ID} {
          padding: 0;
          align-items: stretch;
        }

        #${MODAL_ID} .bxua-card {
          width: 100%;
          max-height: 100vh;
          border-radius: 0;
        }

        #${MODAL_ID} .bxua-grid,
        #${MODAL_ID} .bxua-status-grid,
        #${MODAL_ID} .bxua-score-grid {
          grid-template-columns: 1fr;
        }

        #${MODAL_ID} .bxua-recommend {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function closeAssistant() {
    const modal = document.getElementById(MODAL_ID);

    if (!modal) {
      return;
    }

    modal.remove();

    if (document.body) {
      document.body.style.overflow = bodyOverflowBeforeModal;
    }
  }

  function renderStatusText(profile) {
    const detected = profile.detected;
    const parts = [
      detected.label
    ];

    if (detected.cores) {
      parts.push(`${detected.cores} hilos`);
    }

    if (detected.memory) {
      parts.push(`~${detected.memory} GB RAM reportados`);
    }

    return parts.join(' · ');
  }

  function showError(box, message) {
    box.textContent = message;
    box.classList.add('is-visible');
  }

  function clearError(box) {
    box.textContent = '';
    box.classList.remove('is-visible');
  }

  async function copyDiagnostics(profile) {
    const payload = {
      addonVersion: ADDON_VERSION,
      betterXcloudVersion: getCurrentVersion(),
      url: location.href,
      device: {
        selected: profile.device,
        detected: profile.detected
      },
      note: 'La API de red no mide el ping real de Xbox; copiar solo si deseas compartir estos datos.',
      connection: profile.conn,
      profile: profile.style,
      settings: profile.settings,
      userAgent: navigator.userAgent
    };

    const text = JSON.stringify(payload, null, 2);

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  function exportLatestBackup() {
    const backup = readBackups()[0];

    if (!backup) {
      throw new Error('Todavía no hay respaldos para exportar.');
    }

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download =
      `better-xcloud-backup-${Date.now()}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(
      () => URL.revokeObjectURL(url),
      1000
    );
  }

  function openAssistant() {
    injectStyles();
    closeAssistant();

    const saved = readAddonState();
    const initialDetected = detectDevice();
    const initialConn = getConnection();
    const backups = readBackups();
    const streamActive = isStreamProbablyActive();

    const modal = document.createElement('div');
    modal.id = MODAL_ID;

    modal.innerHTML = `
      <div
        class="bxua-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bxua-title"
      >
        <div class="bxua-header">
          <div>
            <h2 id="bxua-title">
              🤖 Better xCloud Ultra Assistant
            </h2>
            <div class="bxua-version">
              Add-on v${ADDON_VERSION}
              · Better xCloud ${escapeHtml(getCurrentVersion())}
            </div>
          </div>

          <button
            type="button"
            class="bxua-close"
            id="bxua-close"
            aria-label="Cerrar"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        <div class="bxua-body">
          <p class="bxua-sub">
            Crea un perfil seguro para Better xCloud sin tocar
            opciones ajenas al rendimiento. Antes de aplicar,
            se guarda automáticamente una copia de la configuración.
          </p>

          <div class="bxua-status-grid">
            <div class="bxua-status">
              <small>Dispositivo detectado</small>
              <strong id="bxua-device-status">
                ${escapeHtml(renderDetected(initialDetected))}
              </strong>
            </div>

            <div class="bxua-status">
              <small>Conexión estimada por el navegador</small>
              <strong id="bxua-network-status">
                ${escapeHtml(formatConnection(initialConn))}
              </strong>
            </div>

            <div class="bxua-status">
              <small>Respaldo</small>
              <strong>
                ${
                  backups.length
                    ? `${backups.length} disponible${backups.length === 1 ? '' : 's'}`
                    : 'Se creará al aplicar'
                }
              </strong>
            </div>
          </div>

          <div class="bxua-grid">
            <div class="bxua-box">
              <label for="bxua-device">
                1. Dispositivo
              </label>

              <select id="bxua-device">
                ${Object.entries(DEVICE_META)
                  .map(([value, label]) =>
                    `<option value="${value}">
                      ${escapeHtml(label)}
                    </option>`
                  )
                  .join('')}
              </select>

              <div class="bxua-detected">
                La detección usa señales disponibles del navegador.
                No intenta adivinar el modelo exacto de CPU/GPU.
              </div>
            </div>

            <div class="bxua-box">
              <label for="bxua-style">
                2. Objetivo
              </label>

              <select id="bxua-style">
                ${Object.entries(PROFILE_META)
                  .map(([value, meta]) =>
                    `<option value="${value}">
                      ${meta.icon} ${escapeHtml(meta.label)}
                    </option>`
                  )
                  .join('')}
              </select>

              <div class="bxua-detected" id="bxua-style-help">
                El modo automático calcula la recomendación al abrir el asistente
                según equipo y datos de red disponibles.
              </div>
            </div>
          </div>

          <div class="bxua-options">
            <label class="bxua-check">
              <input
                type="checkbox"
                id="bxua-adaptive"
              >
              Calcular bitrate al aplicar perfil (estimación de red)
            </label>

            <label class="bxua-check">
              <input
                type="checkbox"
                id="bxua-light-ui"
              >
              Optimizar interfaz y pantalla de carga
            </label>
          </div>

          <div class="bxua-recommend">
            <div class="bxua-recommend-text">
              <strong>Recomendación actual:</strong>
              <span id="bxua-recommend-text"></span>
            </div>

            <button
              type="button"
              id="bxua-use-recommend"
              class="bxua-secondary"
            >
              Usar recomendación
            </button>
          </div>

          <div
            id="bxua-summary"
            class="bxua-summary"
          ></div>

          <div class="bxua-score-grid">
            <div class="bxua-score">
              <strong>Respuesta</strong>
              <div
                id="bxua-score-latency"
                class="bxua-dots"
              ></div>
            </div>

            <div class="bxua-score">
              <strong>Calidad</strong>
              <div
                id="bxua-score-quality"
                class="bxua-dots"
              ></div>
            </div>

            <div class="bxua-score">
              <strong>Estabilidad</strong>
              <div
                id="bxua-score-stability"
                class="bxua-dots"
              ></div>
            </div>
          </div>

          <div
            id="bxua-list"
            class="bxua-list"
          ></div>

          <section class="bxua-metrics" aria-label="Diagnóstico manual de transmisión">
            <strong>📊 Diagnóstico de la partida (manual)</strong>
            <div class="bxua-detected">Copia los números de la barra de Better xCloud. No son lecturas automáticas: evita confundir bitrate de vídeo con velocidad de Internet.</div>
            <div class="bxua-metrics-grid">
              <label>Ping (ms)<input id="bxua-ping" inputmode="decimal" type="number" min="0" max="5000" placeholder="144"></label>
              <label>FPS<input id="bxua-fps" inputmode="numeric" type="number" min="0" max="240" placeholder="30"></label>
              <label>BTR (Mbps)<input id="bxua-btr" inputmode="decimal" type="number" min="0" max="200" step="0.1" placeholder="1.3"></label>
              <label>PL<input id="bxua-pl" inputmode="numeric" type="number" min="0" max="100000" placeholder="0"></label>
              <label>FL<input id="bxua-fl" inputmode="numeric" type="number" min="0" max="100000" placeholder="34"></label>
            </div>
            <button id="bxua-analyze" type="button">Analizar cifras</button>
            <div id="bxua-metrics-result" class="bxua-metrics-result" role="status"></div>
          </section>

          <div
            id="bxua-error"
            class="bxua-error"
            role="alert"
          ></div>

          <div class="bxua-actions">
            <button
              type="button"
              id="bxua-apply"
              class="bxua-apply"
            >
              ✅ Aplicar perfil y recargar
            </button>

            <button
              type="button"
              id="bxua-restore"
              ${backups.length ? '' : 'disabled'}
            >
              ↩ Restaurar último respaldo
            </button>

            <button
              type="button"
              id="bxua-copy"
            >
              📋 Copiar diagnóstico
            </button>

            <button
              type="button"
              id="bxua-export"
              ${backups.length ? '' : 'disabled'}
            >
              💾 Exportar respaldo
            </button>
          </div>

          <div class="bxua-warning">
            ${
              streamActive
                ? '<span class="bxua-live-warning"><b>Hay una transmisión activa.</b> Aplicar o restaurar recargará la página y cerrará esa sesión.</span><br>'
                : ''
            }

            Los datos de <b>downlink</b> y <b>RTT</b>, cuando aparecen,
            son estimaciones del navegador y no equivalen al ping real
            hacia el servidor de Xbox.

            El asistente puede reducir carga local, bitrate y
            postprocesado, pero no puede eliminar la latencia física
            de Internet.
          </div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(modal);

    if (document.body) {
      bodyOverflowBeforeModal =
        document.body.style.overflow || '';

      document.body.style.overflow = 'hidden';
    }

    const deviceSelect =
      modal.querySelector('#bxua-device');

    const styleSelect =
      modal.querySelector('#bxua-style');

    const adaptive =
      modal.querySelector('#bxua-adaptive');

    const lightUi =
      modal.querySelector('#bxua-light-ui');

    const summary =
      modal.querySelector('#bxua-summary');

    const list =
      modal.querySelector('#bxua-list');

    const errorBox =
      modal.querySelector('#bxua-error');

    const applyButton =
      modal.querySelector('#bxua-apply');

    const restoreButton =
      modal.querySelector('#bxua-restore');

    const exportButton =
      modal.querySelector('#bxua-export');

    const recommendText =
      modal.querySelector('#bxua-recommend-text');

    deviceSelect.value =
      DEVICE_META[saved.device]
        ? saved.device
        : 'auto';

    styleSelect.value =
      PROFILE_META[saved.style]
        ? saved.style
        : 'auto';

    adaptive.checked =
      saved.adaptive;

    lightUi.checked =
      saved.lightUi;

    modal.querySelector('#bxua-analyze').addEventListener('click', () => {
      const result = modal.querySelector('#bxua-metrics-result');
      try {
        const input = (id, max) => parseMetricInput(modal.querySelector(id).value, max);
        const messages = diagnoseStreamMetrics({
          ping: input('#bxua-ping', 5000), fps: input('#bxua-fps', 240),
          bitrate: input('#bxua-btr', 200), packetsLost: input('#bxua-pl', 100000),
          framesLost: input('#bxua-fl', 100000)
        });
        result.textContent = messages.join('\n');
      } catch (error) {
        result.textContent = String(error.message || error);
      }
    });

    let currentProfile = null;

    function persistUiState() {
      saveAddonState({
        device: deviceSelect.value,
        style: styleSelect.value,
        adaptive: adaptive.checked,
        lightUi: lightUi.checked
      });
    }

    function refreshPreview() {
      clearError(errorBox);
      persistUiState();

      currentProfile = makeProfile(
        deviceSelect.value,
        styleSelect.value,
        {
          adaptive: adaptive.checked,
          lightUi: lightUi.checked
        }
      );

      const recommended =
        PROFILE_META[currentProfile.recommendation] ||
        PROFILE_META.balanced;

      recommendText.textContent =
        ` ${recommended.icon} ${recommended.label}. ${recommended.short}`;

      summary.innerHTML = `
        <strong>${escapeHtml(currentProfile.title)}</strong>
        <br>
        ${escapeHtml(currentProfile.reason)}
      `;

      modal.querySelector(
        '#bxua-score-latency'
      ).innerHTML =
        scoreDots(currentProfile.scores.latency);

      modal.querySelector(
        '#bxua-score-quality'
      ).innerHTML =        scoreDots(currentProfile.scores.quality);

      modal.querySelector(
        '#bxua-score-stability'
      ).innerHTML =
        scoreDots(currentProfile.scores.stability);

      const grouped = {
        'Stream y red': [],
        'Renderer y entrada': [],
        'Interfaz': []
      };

      for (
        const [key, value]
        of Object.entries(currentProfile.settings)
      ) {
        const row = `
          <div class="bxua-row">
            <span>${escapeHtml(LABELS[key] || key)}</span>
            <span>${escapeHtml(formatValue(key, value))}</span>
          </div>
        `;

        if (
          key.startsWith('stream.video.')
        ) {
          grouped['Stream y red'].push(row);
        } else if (
          key.startsWith('video.') ||
          key.startsWith('controller.') ||
          key.startsWith('deviceVibration.') ||
          key.startsWith('stats.')
        ) {
          grouped['Renderer y entrada'].push(row);
        } else {
          grouped['Interfaz'].push(row);
        }
      }

      list.innerHTML =
        Object.entries(grouped)
          .filter(([, rows]) => rows.length)
          .map(([title, rows]) => `
            <div class="bxua-list-title">
              ${escapeHtml(title)}
            </div>
            ${rows.join('')}
          `)
          .join('');
    }

    deviceSelect.addEventListener(
      'change',
      refreshPreview
    );

    styleSelect.addEventListener(
      'change',
      refreshPreview
    );

    adaptive.addEventListener(
      'change',
      refreshPreview
    );

    lightUi.addEventListener(
      'change',
      refreshPreview
    );

    modal
      .querySelector('#bxua-use-recommend')
      .addEventListener(
        'click',
        () => {
          const temp = makeProfile(
            deviceSelect.value,
            'auto',
            {
              adaptive: adaptive.checked,
              lightUi: lightUi.checked
            }
          );

          styleSelect.value =
            temp.recommendation;

          refreshPreview();
        }
      );

    modal
      .querySelector('#bxua-close')
      .addEventListener(
        'click',
        closeAssistant
      );

    modal.addEventListener(
      'click',
      event => {
        if (event.target === modal) {
          closeAssistant();
        }
      }
    );

    applyButton.addEventListener(
      'click',
      () => {
        clearError(errorBox);

        try {
          if (!currentProfile) {
            refreshPreview();
          }

          applySettingsTransactional(
            currentProfile.settings,
            currentProfile.title
          );

          applyButton.textContent =
            '✅ Aplicado. Recargando…';

          applyButton.disabled = true;
          restoreButton.disabled = true;
          exportButton.disabled = true;

          setTimeout(
            () => location.reload(),
            450
          );
        } catch (error) {
          console.error(
            '[Better xCloud Ultra Assistant]',
            error
          );

          showError(
            errorBox,
            `No se aplicó nada: ${error?.message || error}`
          );
        }
      }
    );

    restoreButton.addEventListener(
      'click',
      () => {
        clearError(errorBox);

        try {
          const backup =
            readBackups()[0];

          restoreBackup(backup);

          restoreButton.textContent =
            '↩ Restaurado. Recargando…';

          restoreButton.disabled = true;
          applyButton.disabled = true;
          exportButton.disabled = true;

          setTimeout(
            () => location.reload(),
            450
          );
        } catch (error) {
          showError(
            errorBox,
            `No se pudo restaurar: ${error?.message || error}`
          );
        }
      }
    );

    modal
      .querySelector('#bxua-copy')
      .addEventListener(
        'click',
        async event => {
          clearError(errorBox);

          try {
            await copyDiagnostics(currentProfile);

            const button = event.currentTarget;
            const oldText = button.textContent;

            button.textContent =
              '✅ Diagnóstico copiado';

            setTimeout(
              () => {
                if (button.isConnected) {
                  button.textContent = oldText;
                }
              },
              1400
            );
          } catch (error) {
            showError(
              errorBox,
              `No se pudo copiar: ${error?.message || error}`
            );
          }
        }
      );

    exportButton.addEventListener(
      'click',
      () => {
        clearError(errorBox);

        try {
          exportLatestBackup();
        } catch (error) {
          showError(
            errorBox,
            `No se pudo exportar: ${error?.message || error}`
          );
        }
      }
    );

    modal.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeAssistant();
        }
      }
    );

    refreshPreview();

    setTimeout(
      () => deviceSelect.focus(),
      0
    );
  }

  function renderDetected(detected) {
    const parts = [detected.label];

    if (detected.cores) {
      parts.push(`${detected.cores} hilos`);
    }

    if (detected.memory) {
      parts.push(`~${detected.memory} GB RAM`);
    }

    return parts.join(' · ');
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function createMainButton() {
    const button = document.createElement('button');

    button.type = 'button';
    button.className =
      `bx-button bx-focusable bx-full-width ${BUTTON_CLASS}`;

    button.textContent =
      '🤖 Ultra Assistant · Auto optimización';

    button.title =
      'Analizar dispositivo y preparar un perfil seguro';

    button.addEventListener(
      'click',
      openAssistant
    );

    return button;
  }

  function removeFallbackButton() {
    document
      .getElementById(FALLBACK_BUTTON_ID)
      ?.remove();
  }

  function ensureFallbackButton() {
    if (
      document.querySelector(`.${BUTTON_CLASS}`) ||
      document.getElementById(FALLBACK_BUTTON_ID)
    ) {
      return;
    }

    const button = document.createElement('button');

    button.id =
      FALLBACK_BUTTON_ID;

    button.type =
      'button';

    button.textContent =
      '🤖 Ultra Assistant';

    button.title =
      'Abrir Better xCloud Ultra Assistant (Alt + F9)';

    button.addEventListener(
      'click',
      openAssistant
    );

    document.documentElement.appendChild(button);
  }

  function attachToBetterXcloudMenu() {
    injectStyles();

    const topButtons =
      document.querySelectorAll('.bx-top-buttons');

    let attached = false;

    for (const parent of topButtons) {
      if (
        parent.querySelector(`.${BUTTON_CLASS}`)
      ) {
        attached = true;
        continue;
      }

      parent.appendChild(createMainButton());
      attached = true;
    }

    if (attached) {
      removeFallbackButton();
    }

    return attached;
  }

  function scheduleAttach() {
    if (attachScheduled) {
      return;
    }

    attachScheduled = true;

    setTimeout(
      () => {
        attachScheduled = false;
        attachToBetterXcloudMenu();
      }, 900
    );
  }

  function startObserver() {
    injectStyles();
    scheduleAttach();

    const observer =
      new MutationObserver(scheduleAttach);

    observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );

    clearTimeout(fallbackTimer);

    fallbackTimer = setTimeout(
      ensureFallbackButton,
      3500
    );
  }

  if (document.documentElement) {
    startObserver();
  } else {
    window.addEventListener(
      'DOMContentLoaded',
      startObserver,
      { once: true }
    );
  }

  /*
   * Emergency shortcut:
   * Alt + F9 opens the assistant even if Better xCloud changes its menu.
   */
  window.addEventListener(
    'keydown',
    event => {
      if (
        event.altKey &&
        event.code === 'F9'
      ) {
        event.preventDefault();
        openAssistant();
      }
    }
  );
})();