package com.linguaai.persian.plugins;

import android.content.Context;
import android.util.Log;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * Manager for the local llama.cpp AI engine.
 *
 * Java layer:
 *   LocalAIManager
 *
 * Native layer:
 *   llama_jni.cpp
 */
public class LocalAIManager {

    private static final String TAG = "LinguaAI-LocalAI";

    private static final int DEFAULT_MAX_TOKENS = 128;
    private static final float DEFAULT_TEMPERATURE = 0.7f;
    private static final float DEFAULT_TOP_P = 0.9f;

    private final Context context;

    /**
     * Native engine state.
     */
    private boolean engineReady = false;

    /**
     * Native model pointer returned by nativeLoadModel().
     */
    private long nativeModelPtr = 0L;

    /**
     * Logical ID/path of the currently loaded model.
     */
    private String loadedModelId = null;

    /**
     * Prevent double native loading/freeing.
     */
    private boolean nativeLibraryLoaded = false;

    public LocalAIManager(Context context) {
        this.context = context.getApplicationContext();
        loadNativeLibrary();
    }

    // ============================================================
    // Native library
    // ============================================================

    private synchronized void loadNativeLibrary() {

        if (nativeLibraryLoaded) {
            return;
        }

        try {

            System.loadLibrary("linguaai_localai");

            nativeLibraryLoaded = true;

            Log.d(
                    TAG,
                    "Native library loaded successfully"
            );

        } catch (UnsatisfiedLinkError e) {

            nativeLibraryLoaded = false;

            Log.e(
                    TAG,
                    "Failed to load linguaai_localai",
                    e
            );
        }
    }

    // ============================================================
    // Native methods
    // ============================================================

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

    // ============================================================
    // Engine
    // ============================================================

    /**
     * Initialize llama.cpp backend.
     */
    public synchronized boolean initializeEngine() {

        if (engineReady) {

            Log.d(
                    TAG,
                    "Engine already initialized"
            );

            return true;
        }

        if (!nativeLibraryLoaded) {

            Log.e(
                    TAG,
                    "Native library is not loaded"
            );

            return false;
        }

        try {

            engineReady = nativeInitEngine();

            Log.d(
                    TAG,
                    "Engine initialization result: "
                            + engineReady
            );

            return engineReady;

        } catch (Throwable e) {

            engineReady = false;

            Log.e(
                    TAG,
                    "Engine initialization failed",
                    e
            );

            return false;
        }
    }

    /**
     * Alias for code that expects initEngine().
     */
    public synchronized boolean initEngine() {
        return initializeEngine();
    }

    /**
     * Returns whether the native llama.cpp engine is ready.
     *
     * This method is required by LocalAIPlugin.java.
     */
    public synchronized boolean isEngineReady() {
        return engineReady;
    }

    // ============================================================
    // Model
    // ============================================================

    /**
     * Load a GGUF model.
     *
     * @param modelPath absolute path to GGUF file
     * @return true when successfully loaded
     */
    public synchronized boolean loadModel(
            String modelPath
    ) {

        if (modelPath == null ||
                modelPath.trim().isEmpty()) {

            Log.e(
                    TAG,
                    "loadModel: empty model path"
            );

            return false;
        }

        if (!engineReady) {

            Log.d(
                    TAG,
                    "Engine is not ready. Initializing..."
            );

            if (!initializeEngine()) {
                return false;
            }
        }

        File modelFile = new File(modelPath);

        if (!modelFile.exists()) {

            Log.e(
                    TAG,
                    "Model does not exist: "
                            + modelPath
            );

            return false;
        }

        if (!modelFile.isFile()) {

            Log.e(
                    TAG,
                    "Model path is not a file: "
                            + modelPath
            );

            return false;
        }

        /*
         * اگر مدل دیگری load شده، ابتدا آزادش می‌کنیم.
         */
        if (nativeModelPtr != 0L) {
            unloadModel();
        }

        try {

            Log.d(
                    TAG,
                    "Loading model: "
                            + modelPath
            );

            long ptr = nativeLoadModel(
                    modelPath
            );

            if (ptr == 0L) {

                Log.e(
                        TAG,
                        "nativeLoadModel returned 0"
                );

                nativeModelPtr = 0L;
                loadedModelId = null;

                return false;
            }

            nativeModelPtr = ptr;

            loadedModelId =
                    modelFile.getAbsolutePath();

            Log.d(
                    TAG,
                    "Model loaded successfully: "
                            + loadedModelId
            );

            return true;

        } catch (Throwable e) {

            nativeModelPtr = 0L;
            loadedModelId = null;

            Log.e(
                    TAG,
                    "Model loading failed",
                    e
            );

            return false;
        }
    }

    /**
     * Returns the currently loaded model ID/path.
     *
     * This method is required by LocalAIPlugin.java.
     */
    public synchronized String getLoadedModelId() {
        return loadedModelId;
    }

    /**
     * Returns whether a native model is currently loaded.
     */
    public synchronized boolean isModelLoaded() {

        return nativeModelPtr != 0L &&
                loadedModelId != null;
    }

    /**
     * Unload current model.
     */
    public synchronized void unloadModel() {

        if (nativeModelPtr == 0L) {

            loadedModelId = null;

            return;
        }

        try {

            Log.d(
                    TAG,
                    "Unloading model: "
                            + loadedModelId
            );

            nativeUnloadModel(
                    nativeModelPtr
            );

        } catch (Throwable e) {

            Log.e(
                    TAG,
                    "Error unloading model",
                    e
            );

        } finally {

            nativeModelPtr = 0L;
            loadedModelId = null;
        }
    }

    // ============================================================
    // Inference
    // ============================================================

    /**
     * Run inference using default parameters.
     */
    public synchronized String runInference(
            String prompt
    ) {

        return runInference(
                prompt,
                DEFAULT_MAX_TOKENS,
                DEFAULT_TEMPERATURE,
                DEFAULT_TOP_P
        );
    }

    /**
     * Run inference using custom parameters.
     */
    public synchronized String runInference(
            String prompt,
            int maxTokens,
            float temperature,
            float topP
    ) {

        if (prompt == null ||
                prompt.trim().isEmpty()) {

            return "Error: empty prompt";
        }

        if (!engineReady) {

            return "Error: engine is not initialized";
        }

        if (nativeModelPtr == 0L) {

            return "Error: no model loaded";
        }

        try {

            String result = nativeRunInference(
                    nativeModelPtr,
                    prompt,
                    maxTokens,
                    temperature,
                    topP
            );

            if (result == null) {

                return "Error: native inference returned null";
            }

            return result;

        } catch (Throwable e) {

            Log.e(
                    TAG,
                    "Inference failed",
                    e
            );

            return "Error: "
                    + e.getMessage();
        }
    }

    // ============================================================
    // Installed models
    // ============================================================

    /**
     * Returns installed GGUF models.
     *
     * This method is required by LocalAIPlugin.java.
     *
     * The result is a JSON-like array of absolute file paths
     * represented as a Java String[].
     */
    public synchronized String[] getInstalledModels() {

        List<String> models =
                new ArrayList<>();

        /*
         * Search locations:
         *
         * 1. app files/models
         * 2. app external files/models
         *
         * We intentionally don't scan the entire device.
         */

        File internalModelsDir =
                new File(
                        context.getFilesDir(),
                        "models"
                );

        addGgufFiles(
                internalModelsDir,
                models
        );

        File externalFilesDir =
                context.getExternalFilesDir(null);

        if (externalFilesDir != null) {

            File externalModelsDir =
                    new File(
                            externalFilesDir,
                            "models"
                    );

            addGgufFiles(
                    externalModelsDir,
                    models
            );
        }

        /*
         * اگر مدل فعلی در لیست نبود، آن را اضافه کن.
         *
         * این کار باعث می‌شود Plugin بتواند مدلی را که
         * از مسیر دیگری load شده نیز ببیند.
         */
        if (loadedModelId != null &&
                !models.contains(loadedModelId)) {

            File loadedFile =
                    new File(
                            loadedModelId
                    );

            if (loadedFile.exists() &&
                    loadedFile.isFile()) {

                models.add(
                        loadedFile.getAbsolutePath()
                );
            }
        }

        return models.toArray(
                new String[0]
        );
    }

    /**
     * Add GGUF files from a directory.
     */
    private void addGgufFiles(
            File directory,
            List<String> result
    ) {

        if (directory == null ||
                result == null) {

            return;
        }

        if (!directory.exists() ||
                !directory.isDirectory()) {

            return;
        }

        File[] files =
                directory.listFiles();

        if (files == null) {
            return;
        }

        for (File file : files) {

            if (file == null ||
                    !file.isFile()) {

                continue;
            }

            String name =
                    file.getName()
                            .toLowerCase();

            if (name.endsWith(".gguf")) {

                result.add(
                        file.getAbsolutePath()
                );
            }
        }
    }

    // ============================================================
    // Shutdown
    // ============================================================

    /**
     * Release model and llama.cpp backend.
     */
    public synchronized void release() {

        Log.d(
                TAG,
                "Releasing LocalAIManager"
        );

        /*
         * مدل باید قبل از backend آزاد شود.
         */
        unloadModel();

        if (engineReady) {

            try {

                nativeFreeEngine();

            } catch (Throwable e) {

                Log.e(
                        TAG,
                        "Error freeing native engine",
                        e
                );
            }
        }

        engineReady = false;
    }

    /**
     * Alias for code that expects shutdown().
     */
    public synchronized void shutdown() {
        release();
    }
}
