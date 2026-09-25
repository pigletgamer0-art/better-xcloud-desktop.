package com.alonstark.betterxcloud.tablet;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/**
 * Experimental wrapper for Xbox Cloud Gaming. Neither an official Xbox app
 * nor a guarantee that embedded WebView supports every cloud-gaming feature.
 */
public class MainActivity extends Activity {
    private static final String HOME = "https://www.xbox.com/en-US/play";
    private FrameLayout root;
    private WebView webView;
    private ProgressBar progress;
    private View fullScreenView;
    private WebChromeClient.CustomViewCallback fullScreenCallback;
    private String injectedJs;
    private boolean supportsDocumentStart;

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
        FrameLayout.LayoutParams progressLayout = new FrameLayout.LayoutParams(-1, 5);
        root.addView(progress, progressLayout);
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true); // Required by Xbox and the bundled scripts.
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setLoadsImagesAutomatically(true);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        try {
            String base = readAsset("better-xcloud.user.js");
            String addon = readAsset("ultra-assistant.user.js");
            // Execute only on the expected www.xbox.com play / signed-in auth routes.
            injectedJs = "(function(){'use strict';"
                    + "if(!/^\\/[A-Za-z-]+\\/(play(?:\\/|$)|auth\\/msa(?:\\/|$))/.test(location.pathname))return;\n"
                    + base + "\n;\n" + addon + "\n})();";
            supportsDocumentStart = WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT);
            if (supportsDocumentStart) {
                WebViewCompat.addDocumentStartJavaScript(
                    webView, injectedJs, Collections.singleton("https://www.xbox.com"));
            }
        } catch (Exception ex) {
            injectedJs = null;
            Toast.makeText(this, "No se pudieron cargar los scripts: " + ex.getMessage(),
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
                    Toast.makeText(MainActivity.this, "No se puede abrir este enlace", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            @Override public void onPageFinished(WebView view, String url) {
                if (!supportsDocumentStart && injectedJs != null && isXboxPlayOrAuth(url)) {
                    // Fallback for old WebView builds; this runs later than document-start.
                    view.evaluateJavascript(injectedJs, null);
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
                    View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
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

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(HOME);
        }
    }

    private static boolean isXboxPlayOrAuth(String url) {
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

    @Override public void onBackPressed() {
        if (fullScreenView != null) {
            webView.getWebChromeClient().onHideCustomView();
        } else if (webView.canGoBack()) {
            webView.goBack();
        } else {
            new AlertDialog.Builder(this)
                .setTitle("Better xCloud Android")
                .setItems(new String[]{"Recargar", "Abrir en navegador", "Salir"},
                    (dialog, which) -> {
                        if (which == 0) webView.reload();
                        if (which == 1) startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(HOME)));
                        if (which == 2) finish();
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
        if (webView != null) {
            CookieManager.getInstance().flush();
            webView.destroy();
        }
        super.onDestroy();
    }
}
