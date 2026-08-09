package com.linguaai.persian;

import android.os.Bundle;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.annotation.Nullable;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private TextToSpeech textToSpeech;
    private boolean ttsReady = false;
    private SpeechRecognizer speechRecognizer;
    private String pendingSpeechLanguage = "en-US";
    private static final int RECORD_AUDIO_REQUEST = 7201;
    private SpeakRequest pendingRequest;
    private LinguaVoicePackManager voicePackManager;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        textToSpeech = new TextToSpeech(this, status -> {
            ttsReady = status == TextToSpeech.SUCCESS;
            if (ttsReady) {
                textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String utteranceId) { }

                    @Override public void onDone(String utteranceId) {
                        notifyJavascriptDone(utteranceId);
                    }

                    @Override public void onError(String utteranceId) {
                        notifyJavascriptDone(utteranceId);
                    }
                });
                if (pendingRequest != null) {
                    SpeakRequest request = pendingRequest;
                    pendingRequest = null;
                    speakInternal(request);
                }
            }
        });

        voicePackManager = new LinguaVoicePackManager(this, bridge.getWebView());
        bridge.getWebView().addJavascriptInterface(new LinguaTtsBridge(), "AndroidTTS");
        bridge.getWebView().addJavascriptInterface(new LinguaSpeechBridge(), "AndroidSpeech");
        bridge.getWebView().addJavascriptInterface(voicePackManager, "LinguaVoicePacks");
        if (SpeechRecognizer.isRecognitionAvailable(this)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
            speechRecognizer.setRecognitionListener(new android.speech.RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) { }
                @Override public void onBeginningOfSpeech() { }
                @Override public void onRmsChanged(float rmsdB) { }
                @Override public void onBufferReceived(byte[] buffer) { }
                @Override public void onEndOfSpeech() { }
                @Override public void onPartialResults(Bundle partialResults) { }
                @Override public void onEvent(int eventType, Bundle params) { }
                @Override public void onError(int error) { notifyJavascriptSpeechError(String.valueOf(error)); }
                @Override public void onResults(Bundle results) {
                    java.util.ArrayList<String> values = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (values != null && !values.isEmpty()) notifyJavascriptSpeechResult(values.get(0));
                    else notifyJavascriptSpeechError("no-result");
                }
            });
        }
    }

    private void speakInternal(SpeakRequest request) {
        runOnUiThread(() -> {
            if (!ttsReady || textToSpeech == null) {
                notifyJavascriptDone(request.requestId);
                return;
            }

            Locale locale = localeFor(request.language);
            int result = textToSpeech.setLanguage(locale);
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                String language = request.language.startsWith("ar") ? "ar" : "en";
                locale = language.equals("ar") ? new Locale("ar") : Locale.US;
                textToSpeech.setLanguage(locale);
            }

            textToSpeech.setSpeechRate(request.rate);
            textToSpeech.setPitch(request.pitch);
            textToSpeech.speak(
                request.text,
                TextToSpeech.QUEUE_FLUSH,
                null,
                request.requestId
            );
        });
    }

    private Locale localeFor(String language) {
        switch (language) {
            case "en-GB": return Locale.UK;
            case "ar-IQ": return new Locale("ar", "IQ");
            case "ar-LB": return new Locale("ar", "LB");
            case "ar": return new Locale("ar");
            default: return Locale.US;
        }
    }

    private void notifyJavascriptSpeechResult(String text) {
        WebView webView = bridge.getWebView();
        if (webView == null) return;
        webView.post(() -> {
            String value = JSONObject.quote(text == null ? "" : text);
            webView.evaluateJavascript("window.__linguaNativeSpeechResult && window.__linguaNativeSpeechResult(" + value + ")", null);
        });
    }

    private void notifyJavascriptSpeechError(String message) {
        WebView webView = bridge.getWebView();
        if (webView == null) return;
        webView.post(() -> {
            String value = JSONObject.quote(message == null ? "speech-error" : message);
            webView.evaluateJavascript("window.__linguaNativeSpeechError && window.__linguaNativeSpeechError(" + value + ")", null);
        });
    }

    private void notifyJavascriptDone(String requestId) {
        WebView webView = bridge.getWebView();
        if (webView == null) return;
        webView.post(() -> {
            try {
                String id = JSONObject.quote(requestId);
                webView.evaluateJavascript("window.__linguaNativeTtsDone && window.__linguaNativeTtsDone(" + id + ")", null);
            } catch (Exception ignored) { }
        });
    }

    private static class SpeakRequest {
        final String text;
        final String language;
        final float rate;
        final float pitch;
        final String requestId;

        SpeakRequest(String text, String language, float rate, float pitch, String requestId) {
            this.text = text;
            this.language = language;
            this.rate = rate;
            this.pitch = pitch;
            this.requestId = requestId;
        }
    }

    private class LinguaSpeechBridge {
        @JavascriptInterface
        public void startListening(String language) {
            pendingSpeechLanguage = language == null ? "en-US" : language;
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, RECORD_AUDIO_REQUEST);
                return;
            }
            startNativeRecognition();
        }

        @JavascriptInterface
        public void stopListening() {
            runOnUiThread(() -> { if (speechRecognizer != null) speechRecognizer.cancel(); });
        }

        @JavascriptInterface
        public boolean isAvailable() {
            return speechRecognizer != null;
        }
    }

    private void startNativeRecognition() {
        runOnUiThread(() -> {
            if (speechRecognizer == null) { notifyJavascriptSpeechError("unavailable"); return; }
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, pendingSpeechLanguage);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, pendingSpeechLanguage);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            speechRecognizer.cancel();
            speechRecognizer.startListening(intent);
        });
    }

    private class LinguaTtsBridge {
        @JavascriptInterface
        public void speak(String text, String language, double rate, double pitch, String requestId) {
            SpeakRequest request = new SpeakRequest(
                text == null ? "" : text,
                language == null ? "en-US" : language,
                (float) rate,
                (float) pitch,
                requestId == null ? "0" : requestId
            );
            runOnUiThread(() -> {
                if (!ttsReady) {
                    pendingRequest = request;
                } else {
                    speakInternal(request);
                }
            });
        }

        @JavascriptInterface
        public void stop() {
            runOnUiThread(() -> {
                if (textToSpeech != null) textToSpeech.stop();
            });
        }

        @JavascriptInterface
        public boolean isAvailable() {
            return ttsReady && textToSpeech != null;
        }

        @JavascriptInterface
        public void getVoices() {
            StringBuilder out = new StringBuilder("[");
            if (textToSpeech != null && android.os.Build.VERSION.SDK_INT >= 21) {
                boolean first = true;
                for (android.speech.tts.Voice v : textToSpeech.getVoices()) {
                    if (!first) out.append(",");
                    first = false;
                    out.append(JSONObject.quote(v.getName() + " [" + v.getLocale().toLanguageTag() + "]"));
                }
            }
            out.append("]");
            WebView webView = bridge.getWebView();
            if (webView != null) webView.post(() -> webView.evaluateJavascript(
                "window.__linguaNativeVoices && window.__linguaNativeVoices(" + JSONObject.quote(out.toString()) + ")", null));
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == RECORD_AUDIO_REQUEST && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startNativeRecognition();
        } else if (requestCode == RECORD_AUDIO_REQUEST) {
            notifyJavascriptSpeechError("microphone-permission-denied");
        }
    }

    @Override
    public void onDestroy() {
        if (speechRecognizer != null) { speechRecognizer.destroy(); speechRecognizer = null; }
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        super.onDestroy();
    }
}
