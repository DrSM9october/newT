package com.linguaai.persian;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.annotation.Nullable;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.util.ArrayList;
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
    public void onCreate(
        @Nullable Bundle savedInstanceState
    ) {
        super.onCreate(savedInstanceState);

        initializeTextToSpeech();

        voicePackManager =
            new LinguaVoicePackManager(
                this,
                bridge.getWebView()
            );

        bridge.getWebView().addJavascriptInterface(
            new LinguaTtsBridge(),
            "AndroidTTS"
        );

        bridge.getWebView().addJavascriptInterface(
            new LinguaSpeechBridge(),
            "AndroidSpeech"
        );

        bridge.getWebView().addJavascriptInterface(
            voicePackManager,
            "LinguaVoicePacks"
        );

        initializeSpeechRecognizer();
    }

    private void initializeTextToSpeech() {

        textToSpeech = new TextToSpeech(
            this,
            status -> {

                ttsReady =
                    status == TextToSpeech.SUCCESS;

                if (ttsReady) {

                    textToSpeech
                        .setOnUtteranceProgressListener(
                            new UtteranceProgressListener() {

                                @Override
                                public void onStart(
                                    String utteranceId
                                ) {
                                    notifyJavascriptStarted(
                                        utteranceId
                                    );
                                }

                                @Override
                                public void onDone(
                                    String utteranceId
                                ) {
                                    notifyJavascriptDone(
                                        utteranceId
                                    );
                                }

                                @Override
                                public void onError(
                                    String utteranceId
                                ) {
                                    notifyJavascriptError(
                                        utteranceId
                                    );
                                }
                            }
                        );

                    if (pendingRequest != null) {

                        SpeakRequest request =
                            pendingRequest;

                        pendingRequest = null;

                        speakInternal(request);
                    }

                } else {

                    ttsReady = false;

                    notifyJavascriptError(
                        "native-tts-init-failed"
                    );
                }
            }
        );
    }

    private void initializeSpeechRecognizer() {

        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            return;
        }

        speechRecognizer =
            SpeechRecognizer.createSpeechRecognizer(this);

        speechRecognizer.setRecognitionListener(
            new RecognitionListener() {

                @Override
                public void onReadyForSpeech(
                    Bundle params
                ) {
                }

                @Override
                public void onBeginningOfSpeech() {
                }

                @Override
                public void onRmsChanged(
                    float rmsdB
                ) {
                }

                @Override
                public void onBufferReceived(
                    byte[] buffer
                ) {
                }

                @Override
                public void onEndOfSpeech() {
                }

                @Override
                public void onPartialResults(
                    Bundle partialResults
                ) {
                }

                @Override
                public void onEvent(
                    int eventType,
                    Bundle params
                ) {
                }

                @Override
                public void onError(
                    int error
                ) {
                    notifyJavascriptSpeechError(
                        String.valueOf(error)
                    );
                }

                @Override
                public void onResults(
                    Bundle results
                ) {

                    ArrayList<String> values =
                        results.getStringArrayList(
                            SpeechRecognizer.RESULTS_RECOGNITION
                        );

                    if (
                        values != null &&
                        !values.isEmpty()
                    ) {

                        notifyJavascriptSpeechResult(
                            values.get(0)
                        );

                    } else {

                        notifyJavascriptSpeechError(
                            "no-result"
                        );
                    }
                }
            }
        );
    }

    private void speakInternal(
        SpeakRequest request
    ) {

        runOnUiThread(() -> {

            if (
                !ttsReady ||
                textToSpeech == null
            ) {

                notifyJavascriptError(
                    request.requestId
                );

                return;
            }

            Locale locale =
                localeFor(request.language);

            int languageResult =
                textToSpeech.setLanguage(locale);

            if (
                languageResult ==
                    TextToSpeech.LANG_MISSING_DATA ||
                languageResult ==
                    TextToSpeech.LANG_NOT_SUPPORTED
            ) {

                Locale fallbackLocale =
                    fallbackLocaleFor(
                        request.language
                    );

                int fallbackResult =
                    textToSpeech.setLanguage(
                        fallbackLocale
                    );

                if (
                    fallbackResult ==
                        TextToSpeech.LANG_MISSING_DATA ||
                    fallbackResult ==
                        TextToSpeech.LANG_NOT_SUPPORTED
                ) {

                    notifyJavascriptError(
                        request.requestId
                    );

                    return;
                }
            }

            float safeRate =
                Math.max(
                    0.1f,
                    Math.min(
                        request.rate,
                        2.0f
                    )
                );

            float safePitch =
                Math.max(
                    0.1f,
                    Math.min(
                        request.pitch,
                        2.0f
                    )
                );

            textToSpeech.setSpeechRate(
                safeRate
            );

            textToSpeech.setPitch(
                safePitch
            );

            int result =
                textToSpeech.speak(
                    request.text,
                    TextToSpeech.QUEUE_FLUSH,
                    null,
                    request.requestId
                );

            if (
                result ==
                TextToSpeech.ERROR
            ) {

                notifyJavascriptError(
                    request.requestId
                );
            }
        });
    }

    private Locale localeFor(
        String language
    ) {

        if (language == null) {
            return Locale.US;
        }

        switch (language) {

            case "en-GB":
                return Locale.UK;

            case "en-AU":
                return new Locale(
                    "en",
                    "AU"
                );

            case "ar-IQ":
                return new Locale(
                    "ar",
                    "IQ"
                );

            case "ar-LB":
                return new Locale(
                    "ar",
                    "LB"
                );

            case "ar":
                return new Locale("ar");

            case "fa":
            case "fa-IR":
                return new Locale(
                    "fa",
                    "IR"
                );

            case "en-US":
            default:
                return Locale.US;
        }
    }

    private Locale fallbackLocaleFor(
        String language
    ) {

        if (
            language != null &&
            language.startsWith("ar")
        ) {
            return new Locale("ar");
        }

        if (
            language != null &&
            language.startsWith("fa")
        ) {
            return new Locale(
                "fa",
                "IR"
            );
        }

        return Locale.US;
    }

    private void notifyJavascriptStarted(
        String requestId
    ) {

        WebView webView =
            bridge.getWebView();

        if (webView == null) return;

        webView.post(() -> {

            String id =
                JSONObject.quote(
                    requestId == null
                        ? ""
                        : requestId
                );

            webView.evaluateJavascript(
                "window.__linguaNativeTtsStarted && " +
                "window.__linguaNativeTtsStarted(" +
                id +
                ")",
                null
            );
        });
    }

    private void notifyJavascriptDone(
        String requestId
    ) {

        WebView webView =
            bridge.getWebView();

        if (webView == null) return;

        webView.post(() -> {

            String id =
                JSONObject.quote(
                    requestId == null
                        ? ""
                        : requestId
                );

            webView.evaluateJavascript(
                "window.__linguaNativeTtsDone && " +
                "window.__linguaNativeTtsDone(" +
                id +
                ")",
                null
            );
        });
    }

    private void notifyJavascriptError(
        String requestId
    ) {

        WebView webView =
            bridge.getWebView();

        if (webView == null) return;

        webView.post(() -> {

            String id =
                JSONObject.quote(
                    requestId == null
                        ? "native-tts-error"
                        : requestId
                );

            webView.evaluateJavascript(
                "window.__linguaNativeTtsError && " +
                "window.__linguaNativeTtsError(" +
                id +
                ")",
                null
            );
        });
    }

    private void notifyJavascriptSpeechResult(
        String text
    ) {

        WebView webView =
            bridge.getWebView();

        if (webView == null) return;

        webView.post(() -> {

            String value =
                JSONObject.quote(
                    text == null ? "" : text
                );

            webView.evaluateJavascript(
                "window.__linguaNativeSpeechResult && " +
                "window.__linguaNativeSpeechResult(" +
                value +
                ")",
                null
            );
        });
    }

    private void notifyJavascriptSpeechError(
        String message
    ) {

        WebView webView =
            bridge.getWebView();

        if (webView == null) return;

        webView.post(() -> {

            String value =
                JSONObject.quote(
                    message == null
                        ? "speech-error"
                        : message
                );

            webView.evaluateJavascript(
                "window.__linguaNativeSpeechError && " +
                "window.__linguaNativeSpeechError(" +
                value +
                ")",
                null
            );
        });
    }

    private static class SpeakRequest {

        final String text;
        final String language;
        final float rate;
        final float pitch;
        final String requestId;

        SpeakRequest(
            String text,
            String language,
            float rate,
            float pitch,
            String requestId
        ) {

            this.text = text;
            this.language = language;
            this.rate = rate;
            this.pitch = pitch;
            this.requestId = requestId;
        }
    }

    private class LinguaTtsBridge {

        @JavascriptInterface
        public void speak(
            String text,
            String language,
            double rate,
            double pitch,
            String requestId
        ) {

            SpeakRequest request =
                new SpeakRequest(
                    text == null
                        ? ""
                        : text,

                    language == null
                        ? "en-US"
                        : language,

                    (float) rate,
                    (float) pitch,

                    requestId == null
                        ? "0"
                        : requestId
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

                if (textToSpeech != null) {
                    textToSpeech.stop();
                }
            });
        }

        @JavascriptInterface
        public boolean isAvailable() {

            return
                ttsReady &&
                textToSpeech != null;
        }

        @JavascriptInterface
        public void getVoices() {

            StringBuilder out =
                new StringBuilder("[");

            if (
                textToSpeech != null &&
                android.os.Build.VERSION.SDK_INT >= 21
            ) {

                boolean first = true;

                for (
                    android.speech.tts.Voice voice :
                    textToSpeech.getVoices()
                ) {

                    if (!first) {
                        out.append(",");
                    }

                    first = false;

                    String value =
                        voice.getName()
                        + " ["
                        + voice.getLocale()
                            .toLanguageTag()
                        + "]";

                    out.append(
                        JSONObject.quote(value)
                    );
                }
            }

            out.append("]");

            WebView webView =
                bridge.getWebView();

            if (webView != null) {

                String json =
                    out.toString();

                webView.post(() ->
                    webView.evaluateJavascript(
                        "window.__linguaNativeVoices && " +
                        "window.__linguaNativeVoices(" +
                        JSONObject.quote(json) +
                        ")",
                        null
                    )
                );
            }
        }
    }

    private class LinguaSpeechBridge {

        @JavascriptInterface
        public void startListening(
            String language
        ) {

            pendingSpeechLanguage =
                language == null
                    ? "en-US"
                    : language;

            if (
                checkSelfPermission(
                    Manifest.permission.RECORD_AUDIO
                ) != PackageManager.PERMISSION_GRANTED
            ) {

                requestPermissions(
                    new String[]{
                        Manifest.permission.RECORD_AUDIO
                    },
                    RECORD_AUDIO_REQUEST
                );

                return;
            }

            startNativeRecognition();
        }

        @JavascriptInterface
        public void stopListening() {

            runOnUiThread(() -> {

                if (
                    speechRecognizer != null
                ) {
                    speechRecognizer.cancel();
                }
            });
        }

        @JavascriptInterface
        public boolean isAvailable() {

            return speechRecognizer != null;
        }
    }

    private void startNativeRecognition() {

        runOnUiThread(() -> {

            if (speechRecognizer == null) {

                notifyJavascriptSpeechError(
                    "unavailable"
                );

                return;
            }

            Intent intent =
                new Intent(
                    RecognizerIntent
                        .ACTION_RECOGNIZE_SPEECH
                );

            intent.putExtra(
                RecognizerIntent
                    .EXTRA_LANGUAGE_MODEL,
                RecognizerIntent
                    .LANGUAGE_MODEL_FREE_FORM
            );

            intent.putExtra(
                RecognizerIntent.EXTRA_LANGUAGE,
                pendingSpeechLanguage
            );

            intent.putExtra(
                RecognizerIntent
                    .EXTRA_LANGUAGE_PREFERENCE,
                pendingSpeechLanguage
            );

            intent.putExtra(
                RecognizerIntent
                    .EXTRA_PARTIAL_RESULTS,
                false
            );

            speechRecognizer.cancel();

            speechRecognizer.startListening(
                intent
            );
        });
    }

    @Override
    public void onRequestPermissionsResult(
        int requestCode,
        String[] permissions,
        int[] grantResults
    ) {

        super.onRequestPermissionsResult(
            requestCode,
            permissions,
            grantResults
        );

        if (
            requestCode ==
                RECORD_AUDIO_REQUEST &&
            grantResults.length > 0 &&
            grantResults[0] ==
                PackageManager.PERMISSION_GRANTED
        ) {

            startNativeRecognition();

        } else if (
            requestCode ==
                RECORD_AUDIO_REQUEST
        ) {

            notifyJavascriptSpeechError(
                "microphone-permission-denied"
            );
        }
    }

    @Override
    public void onDestroy() {

        if (
            speechRecognizer != null
        ) {

            speechRecognizer.destroy();
            speechRecognizer = null;
        }

        if (
            textToSpeech != null
        ) {

            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }

        super.onDestroy();
    }
}
