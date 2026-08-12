package com.linguaai.persian.plugins;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;

/**
 * LocalAIManager
 *
 * Java bridge between the Android application and the native
 * llama.cpp implementation.
 *
 * Native library:
 *     android/app/src/main/cpp/jni/llama_jni.cpp
 *
 * CMake library name:
 *     linguaai_localai
 */
public class LocalAIManager {

    private static final String TAG = "LinguaAI-LocalAI";

    // ============================================================
    // Native library
    // ============================================================

    static {
        try {
            System.loadLibrary("linguaai_localai");

            Log.d(
                    TAG,
                    "Native library loaded successfully"
            );

        } catch (UnsatisfiedLinkError e) {

            Log.e(
                    TAG,
                    "Failed to load native library: linguaai_localai",
                    e
            );
        }
    }

    // ============================================================
    // Singleton
    // ============================================================

    private static volatile LocalAIManager instance;

    private final Context context;

    private LocalAIManager(Context context) {

        this.context =
                context.getApplicationContext();

        Log.d(
                TAG,
                "LocalAIManager created"
        );
    }

    public static LocalAIManager getInstance(
            Context context) {

        if (instance == null) {

            synchronized (LocalAIManager.class) {

                if (instance == null) {

                    instance =
                            new LocalAIManager(context);
                }
            }
        }

        return instance;
    }

    // ============================================================
    // Native state
    // ============================================================

    /**
     * Indicates whether llama.cpp backend has been initialized.
     */
    private volatile boolean engineInitialized = false;

    /**
     * Native pointer returned by nativeLoadModel().
     */
    private volatile long modelPtr = 0L;

    /**
     * Logical ID of currently loaded model.
     *
     * This is NOT the native pointer.
     */
    private volatile String loadedModelId = null;

    /**
     * Path of currently loaded model.
     */
    private volatile String loadedModelPath = null;

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
     *
     * @return true if engine is ready.
     */
    public synchronized boolean initEngine() {

        if (engineInitialized) {

            Log.d(
                    TAG,
                    "Engine already initialized"
            );

            return true;
        }

        try {

            Log.d(
                    TAG,
                    "Initializing llama.cpp engine..."
            );

            boolean result =
                    nativeInitEngine();

            if (result) {

                engineInitialized = true;

                Log.d(
                        TAG,
                        "Engine initialized successfully"
                );

            } else {

                engineInitialized = false;

                Log.e(
                        TAG,
                        "nativeInitEngine returned false"
                );
            }

            return result;

        } catch (UnsatisfiedLinkError e) {

            engineInitialized = false;

            Log.e(
                    TAG,
                    "Native engine method is unavailable",
                    e
            );

            return false;

        } catch (Exception e) {

            engineInitialized = false;

            Log.e(
                    TAG,
                    "Engine initialization failed",
                    e
            );

            return false;
        }
    }

    // ============================================================
    // Required by LocalAIPlugin
    // ============================================================

    /**
     * Returns whether the llama.cpp engine is initialized.
     *
     * Used by LocalAIPlugin.java:
     *
     *     aiManager.isEngineReady()
     */
    public synchronized boolean isEngineReady() {

        return engineInitialized;
    }

    // ============================================================
    // Model loading
    // ============================================================

    /**
     * Load a GGUF model.
     *
     * The model ID is derived from the file name.
     *
     * @param modelPath absolute path to GGUF file
     * @return true if model was loaded successfully
     */
    public synchronized boolean loadModel(
            String modelPath) {

        if (modelPath == null ||
                modelPath.trim().isEmpty()) {

            Log.e(
                    TAG,
                    "loadModel: modelPath is empty"
            );

            return false;
        }

        if (!engineInitialized) {

            Log.d(
                    TAG,
                    "Engine is not initialized. Initializing..."
            );

            if (!initEngine()) {

                Log.e(
                        TAG,
                        "Unable to initialize engine"
                );

                return false;
            }
        }

        File modelFile =
                new File(modelPath);

        if (!modelFile.exists()) {

            Log.e(
                    TAG,
                    "Model file does not exist: "
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

        // --------------------------------------------------------
        // If another model is loaded, unload it first.
        // --------------------------------------------------------

        if (modelPtr != 0L) {

            Log.d(
                    TAG,
                    "Another model is already loaded. "
                            + "Unloading it first."
            );

            unloadModel();
        }

        try {

            Log.d(
                    TAG,
                    "Loading model: "
                            + modelPath
            );

            long ptr =
                    nativeLoadModel(
                            modelPath
                    );

            if (ptr == 0L) {

                Log.e(
                        TAG,
                        "nativeLoadModel returned 0"
                );

                return false;
            }

            modelPtr = ptr;

            loadedModelPath =
                    modelPath;

            loadedModelId =
                    modelFile.getName();

            Log.d(
                    TAG,
                    "Model loaded successfully"
            );

            Log.d(
                    TAG,
                    "Model ID: "
                            + loadedModelId
            );

            Log.d(
                    TAG,
                    "Native handle: "
                            + modelPtr
            );

            return true;

        } catch (UnsatisfiedLinkError e) {

            Log.e(
                    TAG,
                    "Native model loading method unavailable",
                    e
            );

            modelPtr = 0L;
            loadedModelId = null;
            loadedModelPath = null;

            return false;

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Model loading failed",
                    e
            );

            modelPtr = 0L;
            loadedModelId = null;
            loadedModelPath = null;

            return false;
        }
    }

    // ============================================================
    // Optional overload
    // ============================================================

    /**
     * Load a GGUF model with an explicit logical ID.
     *
     * This overload is useful if another part of the application
     * already has a model ID.
     *
     * @param modelId logical model ID
     * @param modelPath absolute GGUF path
     * @return true if successful
     */
    public synchronized boolean loadModel(
            String modelId,
            String modelPath) {

        boolean loaded =
                loadModel(modelPath);

        if (loaded) {

            if (modelId != null &&
                    !modelId.trim().isEmpty()) {

                loadedModelId =
                        modelId;
            }
        }

        return loaded;
    }

    // ============================================================
    // Loaded model ID
    // ============================================================

    /**
     * Returns the logical ID of the currently loaded model.
     *
     * Used by LocalAIPlugin.java:
     *
     *     aiManager.getLoadedModelId()
     */
    public synchronized String getLoadedModelId() {

        return loadedModelId;
    }

    // ============================================================
    // Installed models
    // ============================================================

    /**
     * Returns installed GGUF models.
     *
     * LocalAIPlugin.java expects a JSONArray because it calls:
     *
     *     aiManager.getInstalledModels().length()
     *
     * The method scans the application's model directory.
     */
    public synchronized JSONArray getInstalledModels() {

        JSONArray result =
                new JSONArray();

        try {

            File modelsDirectory =
                    new File(
                            context.getFilesDir(),
                            "models"
                    );

            if (!modelsDirectory.exists()) {

                if (!modelsDirectory.mkdirs()) {

                    Log.w(
                            TAG,
                            "Could not create models directory: "
                                    + modelsDirectory
                    );
                }
            }

            File[] files =
                    modelsDirectory.listFiles();

            if (files == null) {

                return result;
            }

            for (File file : files) {

                if (file == null ||
                        !file.isFile()) {

                    continue;
                }

                String name =
                        file.getName();

                if (!name.toLowerCase()
                        .endsWith(".gguf")) {

                    continue;
                }

                JSONObject model =
                        new JSONObject();

                model.put(
                        "id",
                        name
                );

                model.put(
                        "name",
                        name
                );

                model.put(
                        "path",
                        file.getAbsolutePath()
                );

                model.put(
                        "size",
                        file.length()
                );

                model.put(
                        "loaded",
                        name.equals(
                                loadedModelId
                        )
                );

                result.put(
                        model
                );
            }

        } catch (JSONException e) {

            Log.e(
                    TAG,
                    "Failed to create installed model JSON",
                    e
            );

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Failed to scan installed models",
                    e
            );
        }

        /*
         * اگر مدل فعلی خارج از پوشه models بارگذاری شده باشد،
         * آن را هم در لیست قرار می‌دهیم تا Plugin بتواند وضعیت
         * فعلی را مشاهده کند.
         */
        if (loadedModelPath != null &&
                modelPtr != 0L) {

            boolean alreadyExists =
                    false;

            for (int i = 0;
                 i < result.length();
                 i++) {

                JSONObject item =
                        result.optJSONObject(i);

                if (item == null) {
                    continue;
                }

                String path =
                        item.optString(
                                "path",
                                ""
                        );

                if (loadedModelPath.equals(path)) {

                    alreadyExists = true;

                    break;
                }
            }

            if (!alreadyExists) {

                try {

                    JSONObject current =
                            new JSONObject();

                    current.put(
                            "id",
                            loadedModelId
                    );

                    current.put(
                            "name",
                            loadedModelId
                    );

                    current.put(
                            "path",
                            loadedModelPath
                    );

                    current.put(
                            "size",
                            new File(
                                    loadedModelPath
                            ).length()
                    );

                    current.put(
                            "loaded",
                            true
                    );

                    result.put(
                            current
                    );

                } catch (JSONException e) {

                    Log.e(
                            TAG,
                            "Failed to add current model",
                            e
                    );
                }
            }
        }

        return result;
    }

    // ============================================================
    // Inference
    // ============================================================

    /**
     * Run local inference.
     *
     * @param prompt prompt text
     * @param maxTokens maximum generated tokens
     * @param temperature sampling temperature
     * @param topP top-p sampling
     * @return generated response or error string
     */
    public synchronized String runInference(
            String prompt,
            int maxTokens,
            float temperature,
            float topP) {

        if (!engineInitialized) {

            return "Error: engine is not initialized";
        }

        if (modelPtr == 0L) {

            return "Error: no model is loaded";
        }

        if (prompt == null ||
                prompt.trim().isEmpty()) {

            return "Error: prompt is empty";
        }

        try {

            Log.d(
                    TAG,
                    "Running inference..."
            );

            String result =
                    nativeRunInference(
                            modelPtr,
                            prompt,
                            maxTokens,
                            temperature,
                            topP
                    );

            if (result == null) {

                return "Error: native inference returned null";
            }

            return result;

        } catch (UnsatisfiedLinkError e) {

            Log.e(
                    TAG,
                    "Native inference method unavailable",
                    e
            );

            return "Error: native inference unavailable";

        } catch (Exception e) {

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
    // Convenience inference
    // ============================================================

    /**
     * Run inference using safe default parameters.
     */
    public synchronized String runInference(
            String prompt) {

        return runInference(
                prompt,
                128,
                0.7f,
                0.9f
        );
    }

    // ============================================================
    // Model unload
    // ============================================================

    /**
     * Unload the currently loaded native model.
     */
    public synchronized void unloadModel() {

        if (modelPtr == 0L) {

            loadedModelId = null;
            loadedModelPath = null;

            return;
        }

        long ptr =
                modelPtr;

        Log.d(
                TAG,
                "Unloading model: "
                        + loadedModelId
        );

        try {

            nativeUnloadModel(
                    ptr
            );

        } catch (UnsatisfiedLinkError e) {

            Log.e(
                    TAG,
                    "Native unload method unavailable",
                    e
            );

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Model unload failed",
                    e
            );

        } finally {

            modelPtr = 0L;

            loadedModelId = null;

            loadedModelPath = null;
        }
    }

    // ============================================================
    // Engine shutdown
    // ============================================================

    /**
     * Free llama.cpp backend.
     *
     * Model should be unloaded before freeing the engine.
     */
    public synchronized void
