#include <jni.h>

#include <algorithm>
#include <cstdint>
#include <mutex>
#include <string>
#include <vector>

#include "llama.h"

namespace {

std::mutex g_backend_mutex;
bool g_backend_initialized = false;

/**
 * Initialize the llama.cpp backend exactly once while it is active.
 *
 * We intentionally do not use std::once_flag here because
 * llama_backend_free() can be called during shutdown and the
 * backend may need to be initialized again later.
 */
bool ensure_backend() {
    std::lock_guard<std::mutex> lock(g_backend_mutex);

    if (g_backend_initialized) {
        return true;
    }

    try {
        llama_backend_init();
        g_backend_initialized = true;
        return true;
    } catch (...) {
        g_backend_initialized = false;
        return false;
    }
}

/**
 * Release the llama.cpp backend.
 */
void free_backend() {
    std::lock_guard<std::mutex> lock(g_backend_mutex);

    if (!g_backend_initialized) {
        return;
    }

    try {
        llama_backend_free();
    } catch (...) {
        // Never allow native shutdown to escape through JNI.
    }

    g_backend_initialized = false;
}

/**
 * Convert a Java String to UTF-8 std::string.
 */
bool jstring_to_string(
        JNIEnv * env,
        jstring value,
        std::string & output) {

    output.clear();

    if (env == nullptr || value == nullptr) {
        return false;
    }

    const char * chars =
            env->GetStringUTFChars(
                    value,
                    nullptr
            );

    if (chars == nullptr) {
        return false;
    }

    output.assign(chars);

    env->ReleaseStringUTFChars(
            value,
            chars
    );

    return true;
}

/**
 * Tokenize a prompt.
 *
 * llama_tokenize() returns the required token count as
 * a negative value when the supplied buffer is too small.
 */
std::vector<llama_token> tokenize(
        const llama_vocab * vocab,
        const std::string & text,
        bool add_bos) {

    if (vocab == nullptr) {
        return {};
    }

    const int32_t text_length =
            static_cast<int32_t>(text.size());

    int32_t required =
            llama_tokenize(
                    vocab,
                    text.c_str(),
                    text_length,
                    nullptr,
                    0,
                    add_bos,
                    true
            );

    if (required >= 0) {

        if (required == 0) {
            return {};
        }

        std::vector<llama_token> tokens(
                static_cast<size_t>(required)
        );

        const int32_t actual =
                llama_tokenize(
                        vocab,
                        text.c_str(),
                        text_length,
                        tokens.data(),
                        required,
                        add_bos,
                        true
                );

        if (actual < 0) {
            return {};
        }

        tokens.resize(
                static_cast<size_t>(actual)
        );

        return tokens;
    }

    const int32_t token_count =
            -required;

    if (token_count <= 0) {
        return {};
    }

    std::vector<llama_token> tokens(
            static_cast<size_t>(token_count)
    );

    const int32_t actual =
            llama_tokenize(
                    vocab,
                    text.c_str(),
                    text_length,
                    tokens.data(),
                    token_count,
                    add_bos,
                    true
            );

    if (actual < 0) {
        return {};
    }

    tokens.resize(
            static_cast<size_t>(actual)
    );

    return tokens;
}

/**
 * Convert one llama token to its UTF-8 text piece.
 */
std::string token_to_piece(
        const llama_vocab * vocab,
        llama_token token) {

    if (vocab == nullptr) {
        return {};
    }

    std::vector<char> buffer(128);

    int32_t size =
            llama_token_to_piece(
                    vocab,
                    token,
                    buffer.data(),
                    static_cast<int32_t>(buffer.size()),
                    0,
                    true
            );

    if (size < 0) {

        const int32_t required =
                -size;

        if (required <= 0) {
            return {};
        }

        buffer.resize(
                static_cast<size_t>(required)
        );

        size =
                llama_token_to_piece(
                        vocab,
                        token,
                        buffer.data(),
                        required,
                        0,
                        true
                );
    }

    if (size <= 0) {
        return {};
    }

    return std::string(
            buffer.data(),
            static_cast<size_t>(size)
    );
}

/**
 * Create a Java String safely.
 */
jstring make_java_string(
        JNIEnv * env,
        const std::string & value) {

    if (env == nullptr) {
        return nullptr;
    }

    return env->NewStringUTF(
            value.c_str()
    );
}

} // namespace


// ============================================================
// Engine initialization
// ============================================================

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeInitEngine(
        JNIEnv *,
        jobject) {

    return ensure_backend()
            ? JNI_TRUE
            : JNI_FALSE;
}


// ============================================================
// Model loading
// ============================================================

extern "C"
JNIEXPORT jlong JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeLoadModel(
        JNIEnv * env,
        jobject,
        jstring modelPath) {

    if (env == nullptr || modelPath == nullptr) {
        return 0L;
    }

    if (!ensure_backend()) {
        return 0L;
    }

    std::string path;

    if (!jstring_to_string(
            env,
            modelPath,
            path)) {

        return 0L;
    }

    if (path.empty()) {
        return 0L;
    }

    try {

        llama_model_params modelParams =
                llama_model_default_params();

        /*
         * CPU-only configuration.
         *
         * CMake also disables GPU backends for the current
         * Android MVP.
         */
        modelParams.n_gpu_layers = 0;

        llama_model * model =
                llama_model_load_from_file(
                        path.c_str(),
                        modelParams
                );

        if (model == nullptr) {
            return 0L;
        }

        return reinterpret_cast<jlong>(
                model
        );

    } catch (...) {

        return 0L;
    }
}


// ============================================================
// Inference
// ============================================================

extern "C"
JNIEXPORT jstring JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeRunInference(
        JNIEnv * env,
        jobject,
        jlong modelPtr,
        jstring prompt,
        jint maxTokens,
        jfloat temperature,
        jfloat topP) {

    if (env == nullptr) {
        return nullptr;
    }

    if (modelPtr == 0L) {
        return make_java_string(
                env,
                "Error: invalid model pointer"
        );
    }

    if (prompt == nullptr) {
        return make_java_string(
                env,
                "Error: empty prompt"
        );
    }

    /*
     * Keep backend alive for the entire inference operation.
     */
    if (!ensure_backend()) {
        return make_java_string(
                env,
                "Error: llama backend is not initialized"
        );
    }

    try {

        auto * model =
                reinterpret_cast<llama_model *>(
                        modelPtr
                );

        if (model == nullptr) {
            return make_java_string(
                    env,
                    "Error: invalid model"
            );
        }

        std::string promptText;

        if (!jstring_to_string(
                env,
                prompt,
                promptText)) {

            return make_java_string(
                    env,
                    "Error: unable to read prompt"
            );
        }

        if (promptText.empty()) {
            return make_java_string(
                    env,
                    "Error: empty prompt"
            );
        }

        const llama_vocab * vocab =
                llama_model_get_vocab(
                        model
                );

        if (vocab == nullptr) {
            return make_java_string(
                    env,
                    "Error: model vocabulary is unavailable"
            );
        }

        /*
         * Limit generation to a sane Android-side range.
         */
        const int32_t n_predict =
                std::max(
                        1,
                        std::min(
                                static_cast<int32_t>(maxTokens),
                                static_cast<int32_t>(1024)
                        )
                );

        std::vector<llama_token> promptTokens =
                tokenize(
                        vocab,
                        promptText,
                        true
                );

        if (promptTokens.empty()) {
            return make_java_string(
                    env,
                    "Error: prompt tokenization failed"
            );
        }

        /*
         * Context size must contain both the prompt and
         * the requested generated tokens.
         *
         * Keep the Android MVP bounded to 2048 tokens.
         */
        const uint32_t requestedContext =
                static_cast<uint32_t>(
                        promptTokens.size()
                )
                +
                static_cast<uint32_t>(
                        n_predict
                )
                +
                8U;

        const uint32_t contextSize =
                std::max(
                        32U,
                        std::min(
                                2048U,
                                requestedContext
                        )
                );

        /*
         * If the prompt itself is larger than the context,
         * fail cleanly instead of allowing an invalid decode.
         */
        if (promptTokens.size() >= contextSize) {

            return make_java_string(
                    env,
                    "Error: prompt is too long for context"
            );
        }

        llama_context_params contextParams =
                llama_context_default_params();

        contextParams.n_ctx =
                contextSize;

        /*
         * Keep batch size bounded for Android memory usage.
         */
        contextParams.n_batch =
                std::min(
                        512U,
                        contextSize
                );

        contextParams.n_ubatch =
                std::min(
                        contextParams.n_ubatch,
                        contextParams.n_batch
                );

        /*
         * CPU threading.
         *
         * llama.cpp will use these values for prompt processing
         * and generation.
         */
        contextParams.n_threads = 4;
        contextParams.n_threads_batch = 4;

        llama_context * ctx =
                llama_init_from_model(
                        model,
                        contextParams
                );

        if (ctx == nullptr) {

            return make_java_string(
                    env,
                    "Error: failed to create llama context"
            );
        }

        /*
         * Sampler chain.
         */
        llama_sampler_chain_params samplerParams =
                llama_sampler_chain_default_params();

        llama_sampler * sampler =
                llama_sampler_chain_init(
                        samplerParams
                );

        if (sampler == nullptr) {

            llama_free(ctx);

            return make_java_string(
                    env,
                    "Error: failed to create sampler"
            );
        }

        /*
         * Sanitize user parameters.
         */
        const float safeTemperature =
                std::max(
                        0.0f,
                        std::min(
                                2.0f,
                                static_cast<float>(temperature)
                        )
                );

        const float safeTopP =
                std::max(
                        0.01f,
                        std::min(
                                1.0f,
                                static_cast<float>(topP)
                        )
                );

        /*
         * Deterministic generation when temperature is zero.
         */
        if (safeTemperature <= 0.001f) {

            llama_sampler_chain_add(
                    sampler,
                    llama_sampler_init_greedy()
            );

        } else {

            llama_sampler_chain_add(
                    sampler,
                    llama_sampler_init_top_k(40)
            );

            llama_sampler_chain_add(
                    sampler,
                    llama_sampler_init_top_p(
                            safeTopP,
                            1
                    )
            );

            llama_sampler_chain_add(
                    sampler,
                    llama_sampler_init_temp(
                            safeTemperature
                    )
            );

            llama_sampler_chain_add(
                    sampler,
                    llama_sampler_init_dist(
                            LLAMA_DEFAULT_SEED
                    )
            );
        }

        /*
         * Evaluate the complete prompt first.
         */
        llama_batch batch =
                llama_batch_get_one(
                        promptTokens.data(),
                        static_cast<int32_t>(
                                promptTokens.size()
                        )
                );

        if (llama_decode(
                ctx,
                batch
        ) != 0) {

            llama_sampler_free(
                    sampler
            );

            llama_free(
                    ctx
            );

            return make_java_string(
                    env,
                    "Error: prompt evaluation failed"
            );
        }

        /*
         * Generate response.
         */
        std::string output;

        output.reserve(
                static_cast<size_t>(
                        n_predict
                ) * 4U
        );

        for (
                int32_t generated = 0;
                generated < n_predict;
                ++generated) {

            const llama_token token =
                    llama_sampler_sample(
                            sampler,
                            ctx,
                            -1
                    );

            /*
             * Stop at end-of-generation token.
             */
            if (llama_vocab_is_eog(
                    vocab,
                    token
            )) {
                break;
            }

            const std::string piece =
                    token_to_piece(
                            vocab,
                            token
                    );

            output += piece;

            /*
             * Feed generated token back into context.
             */
            batch =
                    llama_batch_get_one(
                            &token,
                            1
                    );

            if (llama_decode(
                    ctx,
                    batch
            ) != 0) {
                break;
            }
        }

        /*
         * Release inference-specific resources.
         *
         * The model remains alive and is owned by Java's
         * nativeModelPtr until nativeUnloadModel().
         */
        llama_sampler_free(
                sampler
        );

        llama_free(
                ctx
        );

        return make_java_string(
                env,
                output
        );

    } catch (...) {

        return make_java_string(
                env,
                "Error: native inference exception"
        );
    }
}


// ============================================================
// Model unloading
// ============================================================

extern "C"
JNIEXPORT void JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeUnloadModel(
        JNIEnv *,
        jobject,
        jlong modelPtr) {

    if (modelPtr == 0L) {
        return;
    }

    try {

        auto * model =
                reinterpret_cast<llama_model *>(
                        modelPtr
                );

        if (model != nullptr) {
            llama_model_free(
                    model
            );
        }

    } catch (...) {

        /*
         * Never throw a C++ exception through JNI.
         */
    }
}


// ============================================================
// Backend shutdown
// ============================================================

extern "C"
JNIEXPORT void JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeFreeEngine(
        JNIEnv *,
        jobject) {

    free_backend();
}
