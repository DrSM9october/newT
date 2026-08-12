#include <jni.h>

#include <android/log.h>

#include <algorithm>
#include <cmath>
#include <cstring>
#include <exception>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

#include "llama.h"
#include "llama_jni.h"

#define LOG_TAG "LinguaAI-Llama"

#define LOGD(...) \
    __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)

#define LOGE(...) \
    __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace {

struct NativeModel {
    llama_model * model = nullptr;
    llama_context * ctx = nullptr;
};

std::mutex g_mutex;
bool g_engine_initialized = false;

std::string jstring_to_utf8(JNIEnv *env, jstring value) {
    if (!value) {
        return {};
    }

    const char * chars = env->GetStringUTFChars(value, nullptr);

    if (!chars) {
        return {};
    }

    std::string result(chars);

    env->ReleaseStringUTFChars(value, chars);

    return result;
}

jstring make_result(JNIEnv *env, const std::string &text) {
    return env->NewStringUTF(text.c_str());
}

int get_thread_count() {
    unsigned int hw = std::thread::hardware_concurrency();

    if (hw == 0) {
        return 4;
    }

    /*
     * روی موبایل تمام هسته‌ها را درگیر نکنیم.
     * مقدار 4 برای شروع محافظه‌کارانه است.
     */
    return static_cast<int>(
        std::max(
            1u,
            std::min(hw, 4u)
        )
    );
}

bool tokenize_prompt(
        llama_model *model,
        const std::string &prompt,
        std::vector<llama_token> &tokens) {

    if (!model) {
        return false;
    }

    if (prompt.empty()) {
        return false;
    }

    const int32_t text_len =
        static_cast<int32_t>(prompt.size());

    /*
     * مرحله اول:
     * تعداد واقعی توکن‌ها را از llama.cpp می‌گیریم.
     */
    int32_t required = llama_tokenize(
        model,
        prompt.c_str(),
        text_len,
        nullptr,
        0,
        true,
        true
    );

    if (required <= 0) {
        LOGE("llama_tokenize returned %d", required);
        return false;
    }

    tokens.resize(static_cast<size_t>(required));

    /*
     * مرحله دوم:
     * tokenization واقعی
     */
    int32_t n_tokens = llama_tokenize(
        model,
        prompt.c_str(),
        text_len,
        tokens.data(),
        required,
        true,
        true
    );

    if (n_tokens <= 0) {
        LOGE(
            "llama_tokenize failed, result=%d",
            n_tokens
        );

        tokens.clear();
        return false;
    }

    tokens.resize(static_cast<size_t>(n_tokens));

    LOGD(
        "Prompt tokenized: %d tokens",
        n_tokens
    );

    return true;
}

llama_token sample_next_token(
        llama_context *ctx,
        llama_model *model,
        const std::vector<llama_token> &history,
        float temperature,
        float top_p) {

    if (!ctx || !model) {
        return -1;
    }

    const int32_t n_vocab =
        llama_n_vocab(model);

    float *logits =
        llama_get_logits(ctx);

    if (!logits || n_vocab <= 0) {
        LOGE("Invalid logits");
        return -1;
    }

    std::vector<llama_token_data> candidates;

    candidates.reserve(
        static_cast<size_t>(n_vocab)
    );

    for (int32_t token_id = 0;
         token_id < n_vocab;
         ++token_id) {

        candidates.push_back({
            static_cast<llama_token>(token_id),
            logits[token_id],
            0.0f
        });
    }

    llama_token_data_array candidate_array = {
        candidates.data(),
        candidates.size(),
        false
    };

    /*
     * Temperature
     */
    float temp = temperature;

    if (!std::isfinite(temp) || temp <= 0.0f) {
        temp = 0.7f;
    }

    temp = std::clamp(temp, 0.05f, 2.0f);

    llama_sample_temp(
        ctx,
        &candidate_array,
        temp
    );

    /*
     * Top-P
     */
    float p = top_p;

    if (!std::isfinite(p)) {
        p = 0.9f;
    }

    p = std::clamp(p, 0.05f, 1.0f);

    llama_sample_top_p(
        ctx,
        &candidate_array,
        p,
        1
    );

    /*
     * تبدیل logits به probability
     */
    llama_sample_softmax(
        ctx,
        &candidate_array
    );

    /*
     * انتخاب تصادفی بر اساس probability
     */
    llama_token token =
        llama_sample_token(
            ctx,
            &candidate_array
        );

    return token;
}

std::string token_to_piece(
        llama_model *model,
        llama_token token) {

    if (!model) {
        return {};
    }

    /*
     * ابتدا buffer کوچک.
     */
    std::vector<char> buffer(256);

    int32_t n = llama_token_to_piece(
        model,
        token,
        buffer.data(),
        static_cast<int32_t>(buffer.size()),
        0,
        false
    );

    /*
     * در صورت کمبود فضا، اندازه بزرگ‌تر.
     */
    if (n < 0) {
        buffer.resize(
            static_cast<size_t>(-n) + 1
        );

        n = llama_token_to_piece(
            model,
            token,
            buffer.data(),
            static_cast<int32_t>(buffer.size()),
            0,
            false
        );
    }

    if (n <= 0) {
        return {};
    }

    return std::string(
        buffer.data(),
        static_cast<size_t>(n)
    );
}

} // namespace

// ============================================================
// Engine initialization
// ============================================================

JNIEXPORT jboolean JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeInitEngine(
        JNIEnv *env,
        jobject thiz) {

    (void) env;
    (void) thiz;

    std::lock_guard<std::mutex> lock(g_mutex);

    if (g_engine_initialized) {
        LOGD("Llama engine already initialized");
        return JNI_TRUE;
    }

    LOGD("Initializing llama.cpp backend...");

    try {

        llama_backend_init();

        g_engine_initialized = true;

        LOGD("Llama engine initialized successfully");

        return JNI_TRUE;

    } catch (const std::exception &e) {

        LOGE(
            "Engine initialization exception: %s",
            e.what()
        );

        g_engine_initialized = false;

        return JNI_FALSE;
    }
}

// ============================================================
// Load model
// ============================================================

JNIEXPORT jlong JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeLoadModel(
        JNIEnv *env,
        jobject thiz,
        jstring modelPath) {

    (void) thiz;

    if (!g_engine_initialized) {
        LOGE("Engine is not initialized");
        return 0;
    }

    if (!modelPath) {
        LOGE("modelPath is null");
        return 0;
    }

    std::string path =
        jstring_to_utf8(env, modelPath);

    if (path.empty()) {
        LOGE("Model path is empty");
        return 0;
    }

    LOGD(
        "Loading GGUF model: %s",
        path.c_str()
    );

    try {

        llama_model_params model_params =
            llama_model_default_params();

        /*
         * Android CPU-only build.
         */
        model_params.n_gpu_layers = 0;

        llama_model *model =
            llama_load_model_from_file(
                path.c_str(),
                model_params
            );

        if (!model) {
            LOGE("llama_load_model_from_file failed");
            return 0;
        }

        LOGD("Model loaded successfully");

        llama_context_params ctx_params =
            llama_context_default_params();

        /*
         * حافظه محافظه‌کارانه برای موبایل.
         */
        ctx_params.n_ctx = 2048;
        ctx_params.n_batch = 512;
        ctx_params.n_ubatch = 512;

        int threads = get_thread_count();

        ctx_params.n_threads =
            static_cast<uint32_t>(threads);

        ctx_params.n_threads_batch =
            static_cast<uint32_t>(threads);

        llama_context *ctx =
            llama_new_context_with_model(
                model,
                ctx_params
            );

        if (!ctx) {

            LOGE(
                "llama_new_context_with_model failed"
            );

            llama_free_model(model);

            return 0;
        }

        /*
         * Seed ثابت نیست؛ llama.cpp از RNG خودش استفاده می‌کند.
         */
        llama_set_rng_seed(
            ctx,
            static_cast<uint32_t>(
                LLAMA_DEFAULT_SEED
            )
        );

        NativeModel *handle =
            new NativeModel();

        handle->model = model;
        handle->ctx = ctx;

        LOGD(
            "Model handle created: %p",
            handle
        );

        return reinterpret_cast<jlong>(handle);

    } catch (const std::exception &e) {

        LOGE(
            "Model loading exception: %s",
            e.what()
        );

        return 0;
    }
}

// ============================================================
// Inference
// ============================================================

JNIEXPORT jstring JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeRunInference(
        JNIEnv *env,
        jobject thiz,
        jlong modelPtr,
        jstring prompt,
        jint maxTokens,
        jfloat temperature,
        jfloat topP) {

    (void) thiz;

    if (!modelPtr) {
        return make_result(
            env,
            "Error: invalid model handle"
        );
    }

    if (!prompt) {
        return make_result(
            env,
            "Error: prompt is null"
        );
    }

    NativeModel *handle =
        reinterpret_cast<NativeModel *>(modelPtr);

    if (!handle ||
        !handle->model ||
        !handle->ctx) {

        return make_result(
            env,
            "Error: model is not ready"
        );
    }

    std::string promptText =
        jstring_to_utf8(env, prompt);

    if (promptText.empty()) {
        return make_result(
            env,
            "Error: empty prompt"
        );
    }

    int max_new_tokens =
        static_cast<int>(maxTokens);

    if (max_new_tokens <= 0) {
        max_new_tokens = 128;
    }

    max_new_tokens =
        std::min(max_new_tokens, 2048);

    LOGD(
        "Inference started. max_tokens=%d temp=%f top_p=%f",
        max_new_tokens,
        temperature,
        topP
    );

    try {

        /*
         * ----------------------------------------------------
         * 1. Tokenize
         * ----------------------------------------------------
         */
        std::vector<llama_token> prompt_tokens;

        if (!tokenize_prompt(
                handle->model,
                promptText,
                prompt_tokens)) {

            return make_result(
                env,
                "Error: tokenization failed"
            );
        }

        const int32_t prompt_count =
            static_cast<int32_t>(
                prompt_tokens.size()
            );

        /*
         * ----------------------------------------------------
         * 2. Decode prompt فقط یک بار
         * ----------------------------------------------------
         */
        llama_batch prompt_batch =
            llama_batch_get_one(
                prompt_tokens.data(),
                prompt_count,
                0,
                0
            );

        int decode_result =
            llama_decode(
                handle->ctx,
                prompt_batch
            );

        if (decode_result != 0) {

            LOGE(
                "Prompt llama_decode failed: %d",
                decode_result
            );

            return make_result(
                env,
                "Error: prompt decode failed"
            );
        }

        /*
         * ----------------------------------------------------
         * 3. Generate
         * ----------------------------------------------------
         */
        std::string response;

        std::vector<llama_token> history =
            prompt_tokens;

        response.reserve(
            static_cast<size_t>(
                max_new_tokens * 4
            )
        );

        for (int i = 0;
             i < max_new_tokens;
             ++i) {

            llama_token token =
                sample_next_token(
                    handle->ctx,
                    handle->model,
                    history,
                    temperature,
                    topP
                );

            if (token < 0) {

                LOGE(
                    "Sampling returned invalid token"
                );

                break;
            }

            /*
             * پایان طبیعی تولید.
             */
            if (llama_token_is_eog(
                    handle->model,
                    token)) {

                LOGD(
                    "EOG token received"
                );

                break;
            }

            /*
             * تبدیل token به text.
             */
            std::string piece =
                token_to_piece(
                    handle->model,
                    token
                );

            if (!piece.empty()) {
                response += piece;
            }

            history.push_back(token);

            /*
             * ------------------------------------------------
             * مهم:
             * فقط token جدید را decode می‌کنیم.
             * ------------------------------------------------
             */
            llama_batch next_batch =
                llama_batch_get_one(
                    &history.back(),
                    1,
                    prompt_count + i,
                    0
                );

            decode_result =
                llama_decode(
                    handle->ctx,
                    next_batch
                );

            if (decode_result != 0) {

                LOGE(
                    "Token decode failed at step %d: %d",
                    i,
                    decode_result
                );

                break;
            }
        }

        LOGD(
            "Inference finished. chars=%zu",
            response.size()
        );

        return make_result(
            env,
            response
        );

    } catch (const std::exception &e) {

        LOGE(
            "Inference exception: %s",
            e.what()
        );

        return make_result(
            env,
            std::string(
                "Error: "
            ) + e.what()
        );
    }
}

// ============================================================
// Unload model
// ============================================================

JNIEXPORT void JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeUnloadModel(
        JNIEnv *env,
        jobject thiz,
        jlong modelPtr) {

    (void) env;
    (void) thiz;

    if (!modelPtr) {
        return;
    }

    NativeModel *handle =
        reinterpret_cast<NativeModel *>(modelPtr);

    LOGD(
        "Unloading model handle: %p",
        handle
    );

    if (handle->ctx) {
        llama_free(handle->ctx);
        handle->ctx = nullptr;
    }

    if (handle->model) {
        llama_free_model(handle->model);
        handle->model = nullptr;
    }

    delete handle;

    LOGD("Model unloaded");
}

// ============================================================
// Free engine
// ============================================================

JNIEXPORT void JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeFreeEngine(
        JNIEnv *env,
        jobject thiz) {

    (void) env;
    (void) thiz;

    std::lock_guard<std::mutex> lock(g_mutex);

    if (!g_engine_initialized) {
        return;
    }

    LOGD("Freeing llama.cpp backend...");

    llama_backend_free();

    g_engine_initialized = false;

    LOGD("Llama backend freed");
}
