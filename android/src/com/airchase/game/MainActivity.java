package com.airchase.game;

import android.app.Activity;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.SoundPool;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class MainActivity extends Activity {
    private static final String HOST = "https://appassets.androidplatform.net/";
    private static final Map<String, String> MIME = new HashMap<>();
    static {
        MIME.put("html", "text/html"); MIME.put("css", "text/css"); MIME.put("js", "application/javascript");
        MIME.put("jpeg", "image/jpeg"); MIME.put("jpg", "image/jpeg"); MIME.put("png", "image/png");
        MIME.put("ttf", "font/ttf"); MIME.put("mp3", "audio/mpeg"); MIME.put("ogg", "audio/ogg"); MIME.put("wav", "audio/wav");
    }
    private WebView web;
    private SoundPool pool;
    private HandlerThread audioThread;
    private Handler audio;

    // bruitages joués par le SoundPool natif : le Web Audio de la WebView a ~1 s de latence sur tablette Huawei
    public class NativeAudio {
        private final Map<String, Integer> ids = new ConcurrentHashMap<>();
        private final AtomicInteger ready = new AtomicInteger();

        @JavascriptInterface
        public boolean load(String path) {
            if (ids.containsKey(path)) return true;
            try (AssetFileDescriptor fd = getAssets().openFd("www/" + path)) {
                ids.put(path, pool.load(fd, 1));
                return true;
            } catch (IOException e) {
                return false;
            }
        }

        @JavascriptInterface
        public int loaded() { return ready.get(); }

        private final int[] voices = new int[2];

        // Ne bloque pas le jeu : un appel JS -> Java est synchrone et SoundPool.play/stop peut prendre
        // plusieurs ms (gels au tir), donc la lecture est confiée au fil « audio ». Le JS (A.Sfx.playNative)
        // a déjà décidé, selon les priorités, que ce son peut couper le son en cours sur la voix TIA `ch`.
        @JavascriptInterface
        public void play(String path, final double vol, final int ch) {
            final Integer id = ids.get(path);
            if (id == null || ch < 0 || ch >= voices.length) return;
            audio.post(new Runnable() {
                @Override
                public void run() {
                    if (voices[ch] != 0) pool.stop(voices[ch]);
                    voices[ch] = pool.play(id, (float) vol, (float) vol, 1, 0, 1f);
                }
            });
        }
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        audioThread = new HandlerThread("audio", android.os.Process.THREAD_PRIORITY_AUDIO);
        audioThread.start();
        audio = new Handler(audioThread.getLooper());
        final NativeAudio sfx = new NativeAudio();
        pool = new SoundPool.Builder().setMaxStreams(4).setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build();
        pool.setOnLoadCompleteListener(new SoundPool.OnLoadCompleteListener() {
            @Override
            public void onLoadComplete(SoundPool p, int id, int status) { if (status == 0) sfx.ready.incrementAndGet(); }
        });
        web = new WebView(this);
        web.addJavascriptInterface(sfx, "NativeAudio");
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                String url = r.getUrl().toString();
                if (!url.startsWith(HOST)) return null;
                String path = r.getUrl().getPath().substring(1);
                String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase();
                try {
                    WebResourceResponse res = new WebResourceResponse(MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream", null, getAssets().open("www/" + path));
                    Map<String, String> h = new HashMap<>();
                    h.put("Cache-Control", "no-cache");
                    h.put("Access-Control-Allow-Origin", "*");
                    res.setResponseHeaders(h);
                    return res;
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", null, 404, "Not Found", null, null);
                }
            }
        });
        setContentView(web);
        immersive();
        web.loadUrl(HOST + "index.html");
    }

    private void immersive() {
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override
    public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }

    @Override
    protected void onPause() {
        web.onPause();
        web.pauseTimers();
        pool.autoPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        pool.autoResume();
        web.resumeTimers();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        audioThread.quitSafely();
        pool.release();
        web.destroy();
        super.onDestroy();
    }
}
