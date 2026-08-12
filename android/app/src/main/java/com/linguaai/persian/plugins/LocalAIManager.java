package com.linguaai.persian.plugins;

import android.content.Context;
import android.util.Log;

public class LocalAIManager {

    private static final String TAG = "LinguaAI-LocalAI";

    private final Context context;

    private long modelPtr = 0L;
    private boolean engineInitialized = false;

    static {
        try {
            System.loadLibrary("llama_jni");
            Log.d(TAG, "llama_jni loaded successfully");
        } catch (UnsatisfiedLinkError e) {
            Log.e(TAG, "Failed to load llama_jni", e);
        }
    }

    public LocalAIManager(Context context) {
        this.context = context.getApplicationContext();
    }

    /**
     * Initialize llama.cpp backend.
     */
    public synchronized boolean initEngine() {
        if (engineInitialized) {
            return true;
        }

        try {
            engineInitialized = nativeInitEngine();

            Log.d(
                    TAG,
                    "Engine initialized: " + engineInitialized
            );

            return engineInitialized;

        } catch (Throwable e) {
            Log.e(TAG, "Engine initialization failed", e);
            engineInitialized = false;
            return false;
        }
    }

    /**
     * Load a GGUF model.
     *
     * @param modelPath absolute filesystem path to GGUF file
     * @return true if model loaded successfully
     */
    public synchronized boolean loadModel(String modelPath) {

        if (modelPath == null || modelPath.trim().isEmpty()) {
            Log.e(TAG, "Model path is empty");
            return false;
        }

        if (!engineInitialized) {
            if (!initEngine()) {
                Log.e(TAG, "Cannot load model: engine not initialized");
                return false;
            }
        }

        // Unload previous model if one exists.
        if (modelPtr != 0L) {
            unloadModel();
        }

        try {

            long ptr = nativeLoadModel(modelPath);

            if (ptr == 0L) {
                Log.e(TAG, "nativeLoadModel returned 0");
                return false;
            }

            modelPtr = ptr;

            Log.d(
                    TAG,
                    "Model loaded successfully: " + modelPtr
            );

            return true;

        } catch (Throwable e) {

            Log.e(TAG, "Model loading failed", e);

            modelPtr = 0L;

            return false;
        }
    }

    /**
     * Run local LLM inference.
     *
     * @param prompt input prompt
     * @param maxTokens maximum number of generated tokens
     * @param temperature sampling temperature
     * @param topP top-p sampling value
     * @return generated text or error string
     */
    public synchronized String runInference(
            String prompt,
            int maxTokens,
            float temperature,
            float topP) {

        if (modelPtr == 0L) {
            return "Error: model is not loaded";
        }

        if (prompt == null || prompt.trim().isEmpty()) {
            return "Error: prompt is empty";
        }

        try {

            return nativeRunInference(
                    modelPtr,
                    prompt,
                    maxTokens,
                    temperature,
                    topP
            );

        } catch (Throwable e) {

            Log.e(TAG, "Inference failed", e);

            return "Error: " + e.getMessage();
        }
    }

    /**
     * Convenience overload with sensible defaults.
     */
    public synchronized String runInference(String prompt) {
        return runInference(
                prompt,
                128,
                0.7f,
                0.9f
        );
    }

    /**
     * Unload currently loaded model.
     */
    public synchronized void unloadModel() {

        if (modelPtr == 0L) {
            return;
        }

        try {

            nativeUnloadModel(modelPtr);

            Log.d(
                    TAG,
                    "Model unloaded successfully"
            );

        } catch (Throwable e) {

            Log.e(TAG, "Model unload failed", e);

        } finally {

            modelPtr = 0L;
        }
    }

    /**
     * Free llama.cpp backend.
     */
    public synchronized void freeEngine() {

        // Model must be unloaded first.
        unloadModel();

        if (!engineInitialized) {
            return;
        }

        try {

            nativeFreeEngine();

            Log.d(
                    TAG,
                    "Engine freed successfully"
            );

        } catch (Throwable e) {

            Log.e(TAG, "Engine free failed", e);

        } finally {

            engineInitialized = false;
        }
    }

    /**
     * Check whether a model is currently loaded.
     */
    public synchronized boolean isModelLoaded() {
        return modelPtr != 0L;
    }

    /**
     * Check whether llama.cpp engine is initialized.
     */
    public synchronized boolean isEngineInitialized() {
        return engineInitialized;
    }

    /**
     * Return native model pointer.
     */
    public synchronized long getModelPtr() {
        return modelPtr;
    }

    // ========================================================
    // JNI
    // ========================================================

    private native boolean nativeInitEngine();

    private native long nativeLoadModel(
            String modelPath
    );

    private native String nativeRunInference(
            long modelPtr,
            String prompt,
            int maxTokens,
            float temperature,
            float topP
    );

    private native void nativeUnloadModel(
            long modelPtr
    );

    private native void nativeFreeEngine();
}
