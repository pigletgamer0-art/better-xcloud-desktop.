/*
 * Android controller fallback for WebViews whose Gamepad API does not expose
 * a physical controller. Native Android input is sent as snapshots by Activity.
 * When the WebView reports a real gamepad, its original API remains authoritative.
 */
(function () {
  'use strict';
  if (window.__bxAndroidPadBridge) return;

  var nativeGet = typeof navigator.getGamepads === 'function'
    ? navigator.getGamepads.bind(navigator) : null;
  var pad = null;
  var lastConnected = false;

  function eventFor(type, gamepad) {
    try {
      window.dispatchEvent(new GamepadEvent(type, { gamepad: gamepad }));
    } catch (_) {
      var ev = new Event(type);
      Object.defineProperty(ev, 'gamepad', { value: gamepad });
      window.dispatchEvent(ev);
    }
  }

  function realPads() {
    try {
      return nativeGet ? Array.from(nativeGet() || []) : [];
    } catch (_) {
      return [];
    }
  }

  function update(data) {
    if (!data || typeof data !== 'object') return;
    var was = pad;
    if (!data.connected) {
      pad = null;
      if (was && lastConnected) eventFor('gamepaddisconnected', was);
      lastConnected = false;
      return;
    }
    var buttons = Array.from({ length: 17 }, function (_, i) {
      var value = Math.max(0, Math.min(1, Number(data.buttons && data.buttons[i]) || 0));
      return { pressed: value > 0.5, touched: value > 0, value: value };
    });
    var axes = Array.from({ length: 4 }, function (_, i) {
      var value = Number(data.axes && data.axes[i]) || 0;
      return Math.max(-1, Math.min(1, value));
    });
    pad = {
      id: String(data.name || 'Android gamepad'),
      index: 0,
      connected: true,
      mapping: 'standard',
      timestamp: Number(data.timestamp) || Date.now(),
      buttons: buttons,
      axes: axes
    };
    if (!lastConnected) {
      lastConnected = true;
      // The browser will also receive its own native event on WebViews that
      // already implement Gamepad API. Consumers can ignore this duplicate.
      if (!realPads().some(function (p) { return p && p.connected; })) {
        eventFor('gamepadconnected', pad);
      }
    }
  }

  window.__bxAndroidPadBridge = { update: update, get: function () { return pad; } };
  // Do not intercept an already supported physical gamepad.
  function combined() {
    var standard = realPads();
    if (standard.some(function (p) { return p && p.connected; }) || !pad) {
      return standard;
    }
    var output = standard.slice();
    output[0] = pad;
    return output;
  }

  try {
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true, value: combined
    });
  } catch (_) {
    try { navigator.getGamepads = combined; } catch (_ignored) { /* diagnostic still works */ }
  }
})();
