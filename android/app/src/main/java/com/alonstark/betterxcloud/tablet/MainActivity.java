package com.alonstark.betterxcloud.tablet;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.hardware.input.InputManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.Locale;

/**
 * Experimental Android WebView wrapper with a physical controller diagnostic.
 * The native Android input bridge is a fallback when WebView does not expose
 * controllers through navigator.getGamepads(). Real WebView support varies.
 */
public class MainActivity extends Activity {
    private static final String HOME = "https://www.xbox.com/en-US/play";
    private static final String[] BUTTON_LABELS = {
        "A", "B", "X", "Y", "LB", "RB", "LT", "RT", "Select", "Start",
        "L3", "R3", "Arriba", "Abajo", "Izquierda", "Derecha", "Home"
    };
    private FrameLayout root;
    private WebView webView;
    private ProgressBar progress;
    private Button testButton;
    private TextView testOutput;
    private AlertDialog testDialog;
    private View fullScreenView;
    private WebChromeClient.CustomViewCallback fullScreenCallback;
    private String injectedJs;
    private boolean supportsDocumentStart;
    private InputManager inputManager;
    private int activeControllerId = -1;
    private final float[] keyButtons = new float[17];
    private final float[] buttons = new float[17];
    private final float[] axes = new float[4];
    private final float[] analogTriggers = new float[2];
    private float hatX;
    private float hatY;
    private String lastInput = "Esperando botones o palancas";

    private final InputManager.InputDeviceListener deviceListener =
        new InputManager.InputDeviceListener() {
            @Override public void onInputDeviceAdded(int id) {
                if (activeControllerId < 0 && isController(InputDevice.getDevice(id))) {
                    selectController(id);
                }
            }
            @Override public void onInputDeviceRemoved(int id) {
                if (id == activeControllerId) {
                    clearController();
                    findController();
                }
            }
            @Override public void onInputDeviceChanged(int id) {
                if (id == activeControllerId &&
                    !isController(InputDevice.getDevice(id))) {
                    clearController();
                    findController();
                } else if (activeControllerId < 0) {
                    findController();
                }
            }
        };

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        root = new FrameLayout(this);
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setIndeterminate(false);
        root.addView(progress, new FrameLayout.LayoutParams(-1, 5));

        testButton = new Button(this);
        testButton.setText("🎮 Control");
        testButton.setAllCaps(false);
        testButton.setTextSize(12);
        testButton.setVisibility(View.GONE);
        testButton.setOnClickListener(view -> showControllerTest());
        FrameLayout.LayoutParams testParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.TOP | Gravity.END);
        testParams.setMargins(0, dp(6), dp(6), 0);
        root.addView(testButton, testParams);
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setLoadsImagesAutomatically(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        try {
            String pad = readAsset("controller-bridge.js");
            String base = readAsset("better-xcloud.user.js");
            String addon = readAsset("ultra-assistant.user.js");
            // Separate guarded scripts, so one failure does not block the others.
            injectedJs = "(function(){'use strict';"
                + "if(!/^\\/[A-Za-z-]+\\/(play(?:\\/|$)|auth\\/msa(?:\\/|$))/.test(location.pathname))return;\n"
                + guarded(pad, "Controller Bridge")
                + guarded(base, "Better xCloud")
                + guarded(addon, "Ultra Assistant")
                + "})();";
            supportsDocumentStart =
                WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT);
            if (supportsDocumentStart) {
                WebViewCompat.addDocumentStartJavaScript(
                    webView, injectedJs, Collections.singleton("https://www.xbox.com"));
            }
        } catch (Exception ex) {
            injectedJs = null;
            Toast.makeText(this, "Error cargando scripts: " + ex.getMessage(),
                Toast.LENGTH_LONG).show();
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String scheme = url.getScheme();
                if ("https".equalsIgnoreCase(scheme)) return false;
                if ("http".equalsIgnoreCase(scheme)) return true;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (Exception ignored) {
                    Toast.makeText(MainActivity.this, "No se puede abrir el enlace",
                        Toast.LENGTH_SHORT).show();
                }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!supportsDocumentStart && injectedJs != null && isXboxPlayOrAuth(url)) {
                    view.evaluateJavascript(injectedJs, result -> pushControllerState());
                } else {
                    pushControllerState();
                }
                progress.setVisibility(View.GONE);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int amount) {
                progress.setVisibility(amount < 100 ? View.VISIBLE : View.GONE);
                progress.setProgress(amount);
            }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullScreenView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                fullScreenView = view;
                fullScreenCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(-1, -1));
                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
            }
            @Override public void onHideCustomView() {
                if (fullScreenView != null) {
                    root.removeView(fullScreenView);
                    fullScreenView = null;
                    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
                    if (fullScreenCallback != null) fullScreenCallback.onCustomViewHidden();
                    fullScreenCallback = null;
                }
            }
        });

        inputManager = (InputManager) getSystemService(Context.INPUT_SERVICE);
        if (inputManager != null) {
            inputManager.registerInputDeviceListener(
                deviceListener, new Handler(Looper.getMainLooper()));
        }
        findController();

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(HOME);
        }
    }

    private static String guarded(String source, String name) {
        return "\ntry{(function(){\n" + source + "\n})();}catch(e){console.warn("
            + JSONObject.quote(name + " error: ") + ",e);}\n";
    }

    private static boolean isXboxPlayOrAuth(String url) {
        if (url == null || url.isEmpty()) return false;
        Uri uri = Uri.parse(url);
        if (!"www.xbox.com".equalsIgnoreCase(uri.getHost())
                || !"https".equalsIgnoreCase(uri.getScheme())) return false;
        String path = uri.getPath() == null ? "" : uri.getPath();
        return path.matches("^/[A-Za-z-]+/(play(?:/.*)?|auth/msa(?:/.*)?)$");
    }

    private String readAsset(String name) throws Exception {
        StringBuilder result = new StringBuilder();
        try (BufferedReader input = new BufferedReader(
            new InputStreamReader(getAssets().open(name), StandardCharsets.UTF_8))) {
            char[] buffer = new char[8192];
            int count;
            while ((count = input.read(buffer)) != -1) result.append(buffer, 0, count);
        }
        return result.toString();
    }

    private static boolean isController(InputDevice d) {
        return d != null && ((d.getSources() & InputDevice.SOURCE_GAMEPAD)
            == InputDevice.SOURCE_GAMEPAD || (d.getSources() & InputDevice.SOURCE_JOYSTICK)
            == InputDevice.SOURCE_JOYSTICK);
    }

    private void findController() {
        for (int id : InputDevice.getDeviceIds()) {
            if (isController(InputDevice.getDevice(id))) {
                selectController(id);
                return;
            }
        }
        testButton.setVisibility(View.GONE);
        refreshTest();
    }

    private void selectController(int id) {
        if (activeControllerId == id) return;
        if (activeControllerId >= 0) clearController();
        activeControllerId = id;
        Arrays.fill(keyButtons, 0);
        Arrays.fill(buttons, 0);
        Arrays.fill(axes, 0);
        Arrays.fill(analogTriggers, 0);
        hatX = hatY = 0;
        lastInput = "Control conectado. Presiona un botón.";
        testButton.setVisibility(View.VISIBLE);
        pushControllerState();
        refreshTest();
    }

    private void clearController() {
        activeControllerId = -1;
        Arrays.fill(keyButtons, 0);
        Arrays.fill(buttons, 0);
        Arrays.fill(axes, 0);
        Arrays.fill(analogTriggers, 0);
        hatX = hatY = 0;
        lastInput = "Control desconectado";
        testButton.setVisibility(View.GONE);
        pushControllerState();
        refreshTest();
    }

    private static int buttonForKey(int code) {
        switch (code) {
            case KeyEvent.KEYCODE_BUTTON_A: return 0;
            case KeyEvent.KEYCODE_BUTTON_B: return 1;
            case KeyEvent.KEYCODE_BUTTON_X: return 2;
            case KeyEvent.KEYCODE_BUTTON_Y: return 3;
            case KeyEvent.KEYCODE_BUTTON_L1: return 4;
            case KeyEvent.KEYCODE_BUTTON_R1: return 5;
            case KeyEvent.KEYCODE_BUTTON_L2: return 6;
            case KeyEvent.KEYCODE_BUTTON_R2: return 7;
            case KeyEvent.KEYCODE_BUTTON_SELECT: return 8;
            case KeyEvent.KEYCODE_BUTTON_START: return 9;
            case KeyEvent.KEYCODE_BUTTON_THUMBL: return 10;
            case KeyEvent.KEYCODE_BUTTON_THUMBR: return 11;
            case KeyEvent.KEYCODE_DPAD_UP:
            case KeyEvent.KEYCODE_BUTTON_DPAD_UP: return 12;
            case KeyEvent.KEYCODE_DPAD_DOWN:
            case KeyEvent.KEYCODE_BUTTON_DPAD_DOWN: return 13;
            case KeyEvent.KEYCODE_DPAD_LEFT:
            case KeyEvent.KEYCODE_BUTTON_DPAD_LEFT: return 14;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
            case KeyEvent.KEYCODE_BUTTON_DPAD_RIGHT: return 15;
            case KeyEvent.KEYCODE_BUTTON_MODE: return 16;
            default: return -1;
        }
    }

    private void rebuildButtons() {
        System.arraycopy(keyButtons, 0, buttons, 0, buttons.length);
        buttons[6] = Math.max(keyButtons[6], analogTriggers[0]);
        buttons[7] = Math.max(keyButtons[7], analogTriggers[1]);
        buttons[12] = Math.max(keyButtons[12], hatY < -0.5f ? 1 : 0);
        buttons[13] = Math.max(keyButtons[13], hatY > 0.5f ? 1 : 0);
        buttons[14] = Math.max(keyButtons[14], hatX < -0.5f ? 1 : 0);
        buttons[15] = Math.max(keyButtons[15], hatX > 0.5f ? 1 : 0);
    }

    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        InputDevice device = event.getDevice();
        if (isController(device) && event.getAction() != KeyEvent.ACTION_MULTIPLE) {
            if (activeControllerId != event.getDeviceId()) selectController(event.getDeviceId());
            int index = buttonForKey(event.getKeyCode());
            if (index >= 0) {
                keyButtons[index] = event.getAction() == KeyEvent.ACTION_DOWN ? 1 : 0;
                rebuildButtons();
                lastInput = BUTTON_LABELS[index] + (
                    event.getAction() == KeyEvent.ACTION_DOWN ? " presionado" : " soltado");
                pushControllerState();
                refreshTest();
            } else if (event.getAction() == KeyEvent.ACTION_DOWN) {
                lastInput = "Botón Android: " + KeyEvent.keyCodeToString(event.getKeyCode())
                    + " (sin asignación estándar)";
                refreshTest();
            }
        }
        // Allow the WebView native Gamepad implementation to see the real event.
        return super.dispatchKeyEvent(event);
    }

    private static float clamp(float value) {
        return Math.max(-1f, Math.min(1f, value));
    }

    private static float axis(MotionEvent event, int axis) {
        float value = clamp(event.getAxisValue(axis));
        return Math.abs(value) < 0.065f ? 0 : value;
    }

    private static float positiveAxis(MotionEvent event, int a, int fallback) {
        float value = event.getAxisValue(a);
        if (event.getDevice() != null &&
            event.getDevice().getMotionRange(a, InputDevice.SOURCE_JOYSTICK) == null) {
            value = event.getAxisValue(fallback);
        }
        return Math.max(0, Math.min(1, value));
    }

    @Override public boolean dispatchGenericMotionEvent(MotionEvent event) {
        if ((event.getSource() & InputDevice.SOURCE_JOYSTICK)
            == InputDevice.SOURCE_JOYSTICK && event.getAction() == MotionEvent.ACTION_MOVE
            && isController(event.getDevice())) {
            if (activeControllerId != event.getDeviceId()) selectController(event.getDeviceId());
            axes[0] = axis(event, MotionEvent.AXIS_X);
            axes[1] = axis(event, MotionEvent.AXIS_Y);
            InputDevice d = event.getDevice();
            boolean hasZ = d.getMotionRange(MotionEvent.AXIS_Z, InputDevice.SOURCE_JOYSTICK)
                != null;
            boolean hasRz = d.getMotionRange(MotionEvent.AXIS_RZ, InputDevice.SOURCE_JOYSTICK)
                != null;
            axes[2] = axis(event, hasZ ? MotionEvent.AXIS_Z : MotionEvent.AXIS_RX);
            axes[3] = axis(event, hasRz ? MotionEvent.AXIS_RZ : MotionEvent.AXIS_RY);
            analogTriggers[0] = positiveAxis(event, MotionEvent.AXIS_LTRIGGER,
                MotionEvent.AXIS_BRAKE);
            analogTriggers[1] = positiveAxis(event, MotionEvent.AXIS_RTRIGGER,
                MotionEvent.AXIS_GAS);
            hatX = axis(event, MotionEvent.AXIS_HAT_X);
            hatY = axis(event, MotionEvent.AXIS_HAT_Y);
            rebuildButtons();
            lastInput = String.format(Locale.US, "Palancas: %.2f %.2f / %.2f %.2f",
                axes[0], axes[1], axes[2], axes[3]);
            pushControllerState();
            refreshTest();
        }
        return super.dispatchGenericMotionEvent(event);
    }

    private void pushControllerState() {
        if (webView == null || !isXboxPlayOrAuth(webView.getUrl())) return;
        try {
            InputDevice device = InputDevice.getDevice(activeControllerId);
            JSONObject json = new JSONObject();
            json.put("connected", activeControllerId >= 0 && isController(device));
            json.put("name", device == null ? "" : device.getName());
            JSONArray jsButtons = new JSONArray();
            JSONArray jsAxes = new JSONArray();
            for (float b : buttons) jsButtons.put(b);
            for (float a : axes) jsAxes.put(a);
            json.put("buttons", jsButtons);
            json.put("axes", jsAxes);
            json.put("timestamp", android.os.SystemClock.uptimeMillis());
            webView.evaluateJavascript(
                "window.__bxAndroidPadBridge&&window.__bxAndroidPadBridge.update("
                    + json.toString() + ");", null);
        } catch (JSONException | IllegalStateException ignored) {
            // Keep the physical controls working even if the page is reloading.
        }
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private void showControllerTest() {
        testOutput = new TextView(this);
        testOutput.setPadding(dp(18), dp(12), dp(18), dp(12));
        testOutput.setTextSize(15);
        testDialog = new AlertDialog.Builder(this)
            .setTitle("🎮 Prueba de botones")
            .setView(testOutput)
            .setPositiveButton("Cerrar", (dialog, which) -> {})
            .create();
        testDialog.setOnDismissListener(dialog -> {
            testOutput = null;
            testDialog = null;
        });
        testDialog.show();
        refreshTest();
    }

    private void refreshTest() {
        if (testOutput == null) return;
        InputDevice d = InputDevice.getDevice(activeControllerId);
        StringBuilder pressed = new StringBuilder();
        for (int i = 0; i < buttons.length; i++) {
            if (buttons[i] > 0.5f) {
                if (pressed.length() > 0) pressed.append(", ");
                pressed.append(BUTTON_LABELS[i]);
            }
        }
        testOutput.setText(
            "Dispositivo: " + (d == null ? "Ninguno" : d.getName()) + "\n"
            + "Última entrada: " + lastInput + "\n"
            + "Presionados: " + (pressed.length() == 0 ? "ninguno" : pressed) + "\n"
            + String.format(Locale.US, "Palanca izquierda: %.2f / %.2f\n"
                  + "Palanca derecha: %.2f / %.2f\n"
                  + "Gatillos: %.2f / %.2f",
                  axes[0], axes[1], axes[2], axes[3], buttons[6], buttons[7])
            + "\n\nSi el botón se detecta aquí pero no funciona en el juego, "
            + "puede ser una limitación de Android WebView o del streaming.");
    }

    @Override public void onBackPressed() {
        if (fullScreenView != null) {
            webView.getWebChromeClient().onHideCustomView();
        } else if (webView.canGoBack()) {
            webView.goBack();
        } else {
            new AlertDialog.Builder(this)
                .setTitle("Better xCloud Android")
                .setItems(new String[]{"Probar control", "Recargar", "Abrir en navegador", "Salir"},
                    (dialog, which) -> {
                        if (which == 0) showControllerTest();
                        if (which == 1) webView.reload();
                        if (which == 2) startActivity(
                            new Intent(Intent.ACTION_VIEW, Uri.parse(HOME)));
                        if (which == 3) finish();
                    }).show();
        }
    }

    @Override protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }
    @Override protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }
    @Override protected void onDestroy() {
        if (inputManager != null) inputManager.unregisterInputDeviceListener(deviceListener);
        if (testDialog != null) testDialog.dismiss();
        if (webView != null) {
            CookieManager.getInstance().flush();
            webView.destroy();
        }
        super.onDestroy();
    }
}
