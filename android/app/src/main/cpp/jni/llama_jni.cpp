#include <jni.h>

#include <android/log.h>

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <exception>
#include <limits>
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

// ============================================================
// Native model handle
// ============================================================

struct NativeModel {
    llama_model * model = nullptr;
    llama_context * ctx = nullptr;
};

// Global synchronization.
// llama_context is not intended to be used concurrently.
std::mutex g_mutex;

bool g_engine_initialized = false;

// ============================================================
// Java String -> UTF-8 std::string
// ============================================================

std::string jstring_to_utf8(
        JNIEnv *env,
        jstring value) {

    if (!value) {
        return {};
    }

    const char *chars =
        env->GetStringUTFChars(value, nullptr);

    if (!chars) {
        return {};
    }

    std::string result(chars);

    env->ReleaseStringUTFChars(
        value,
        chars
    );

    return result;
}

// ============================================================
// std::string -> Java String
// ============================================================

jstring make_result(
        JNIEnv *env,
        const std::string &text) {

    return env->NewStringUTF(
        text.c_str()
    );
}

// ============================================================
// Android CPU thread count
// ============================================================

int get_thread_count() {

    unsigned int hw =
        std::thread::hardware_concurrency();

    if (hw == 0) {
        return 4;
    }

    /*
     * برای موبایل فعلاً حداکثر 4 thread.
     * بعداً می‌توانیم adaptive tuning انجام دهیم.
     */
    return static_cast<int>(
        std::max(
            1u,
            std::min(hw, 4u)
        )
    );
}

// ============================================================
// Tokenize prompt
// ============================================================

bool tokenize_prompt(
        llama_model *model,
        const std::string &prompt,
        std::vector<llama_token> &tokens) {

    if (!model) {
        LOGE("tokenize_prompt: model is null");
        return false;
    }

    if (prompt.empty()) {
        LOGE("tokenize_prompt: prompt is empty");
        return false;
    }

    if (prompt.size() >
        static_cast<size_t>(
            std::numeric_limits<int32_t>::max()
        )) {

        LOGE("Prompt is too large");
        return false;
    }

    const int32_t text_len =
        static_cast<int32_t>(
            prompt.size()
        );

    /*
     * --------------------------------------------------------
     * مرحله اول:
     *
     * طبق API llama.cpp:
     * اگر buffer کافی نباشد، llama_tokenize مقدار منفی
     * برمی‌گرداند و قدر مطلق آن تعداد توکن مورد نیاز است.
     * --------------------------------------------------------
     */

    int32_t required =
        llama_tokenize(
            model,
            prompt.c_str(),
            text_len,
            nullptr,
            0,
            true,
            true
        );

    if (required == 0) {
        LOGE("llama_tokenize returned 0");
        return false;
    }

    if (required < 0) {
        required = -required;
    }

    if (required <= 0) {
        LOGE(
            "Invalid required token count: %d",
            required
        );
        return false;
    }

    /*
     * جلوگیری از allocation غیرمنطقی.
     */
    constexpr int32_t MAX_PROMPT_TOKENS = 32768;

    if (required > MAX_PROMPT_TOKENS) {
        LOGE(
            "Prompt requires too many tokens: %d",
            required
        );
        return false;
    }

    tokens.resize(
        static_cast<size_t>(required)
    );

    /*
     * --------------------------------------------------------
     * مرحله دوم:
     * Tokenization واقعی
     * --------------------------------------------------------
     */

    int32_t n_tokens =
        llama_tokenize(
            model,
            prompt.c_str(),
            text_len,
            tokens.data(),
            required,
            true,
            true
        );

    if (n_tokens < 0) {
        /*
         * در حالت عادی نباید اینجا رخ دهد چون buffer
         * بر اساس مرحله اول به اندازه کافی بزرگ است.
         */
        int32_t needed = -n_tokens;

        LOGE(
            "llama_tokenize buffer still too small: %d",
            needed
        );

        if (needed <= 0 ||
            needed > MAX_PROMPT_TOKENS) {

            tokens.clear();
            return false;
        }

        tokens.resize(
            static_cast<size_t>(needed)
        );

        n_tokens =
            llama_tokenize(
                model,
                prompt.c_str(),
                text_len,
                tokens.data(),
                needed,
                true,
                true
            );
    }

    if (n_tokens <= 0) {

        LOGE(
            "llama_tokenize failed: %d",
            n_tokens
        );

        tokens.clear();
        return false;
    }

    tokens.resize(
        static_cast<size_t>(n_tokens)
    );

    LOGD(
        "Prompt tokenized: %d tokens",
        n_tokens
    );

    return true;
}

// ============================================================
// Sampling
// ============================================================

llama_token sample_next_token(
        llama_context *ctx,
        llama_model *model,
        float temperature,
        float top_p) {

    if (!ctx || !model) {
        return -1;
    }

    const int32_t n_vocab =
        llama_n_vocab(model);

    if (n_vocab <= 0) {
        LOGE("Invalid vocabulary size");
        return -1;
    }

    /*
     * فقط آخرین logits را می‌گیریم.
     */
    float *logits =
        llama_get_logits_ith(
            ctx,
            -1
        );

    if (!logits) {
        LOGE("llama_get_logits_ith returned null");
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
     * --------------------------------------------------------
     * Temperature
     * --------------------------------------------------------
     */

    float temp =
        static_cast<float>(temperature);

    if (!std::isfinite(temp) ||
        temp <= 0.0f) {

        temp = 0.7f;
    }

    temp =
        std::clamp(
            temp,
            0.05f,
            2.0f
        );

    llama_sample_temp(
        ctx,
        &candidate_array,
        temp
    );

    /*
     * --------------------------------------------------------
     * Top-P
     * --------------------------------------------------------
     */

    float p =
        static_cast<float>(top_p);

    if (!std::isfinite(p)) {
        p = 0.9f;
    }

    p =
        std::clamp(
            p,
            0.05f,
            1.0f
        );

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
     * انتخاب تصادفی با RNG داخلی llama.cpp
     */
    return llama_sample_token(
        ctx,
        &candidate_array
    );
}

// ============================================================
// Token -> text piece
// ============================================================

std::string token_to_piece(
        llama_model *model,
        llama_token token) {

    if (!model) {
        return {};
    }

    /*
     * ابتدا buffer معمولی.
     */
    std::vector<char> buffer(256);

    int32_t n =
        llama_token_to_piece(
            model,
            token,
            buffer.data(),
            static_cast<int32_t>(
                buffer.size()
            ),
            0,
            false
        );

    /*
     * اگر buffer کوچک بود، مقدار منفی یعنی
     * تعداد مورد نیاز.
     */
    if (n < 0) {

        int32_t required = -n;

        if (required <= 0 ||
            required > 1024 * 1024) {

            LOGE(
                "Invalid token piece size: %d",
                required
            );

            return {};
        }

        buffer.resize(
            static_cast<size_t>(required)
        );

        n =
            llama_token_to_piece(
                model,
                token,
                buffer.data(),
                static_cast<int32_t>(
                    buffer.size()
                ),
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
// 1. Engine initialization
// ============================================================

JNIEXPORT jboolean JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeInitEngine(
        JNIEnv *env,
        jobject thiz) {

    (void) env;
    (void) thiz;

    std::lock_guard<std::mutex> lock(
        g_mutex
    );

    if (g_engine_initialized) {

        LOGD(
            "Llama engine already initialized"
        );

        return JNI_TRUE;
    }

    LOGD(
        "Initializing llama.cpp backend..."
    );

    try {

        llama_backend_init();

        g_engine_initialized = true;

        LOGD(
            "Llama engine initialized successfully"
        );

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
// 2. Load GGUF model
// ============================================================

JNIEXPORT jlong JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeLoadModel(
        JNIEnv *env,
        jobject thiz,
        jstring modelPath) {

    (void) thiz;

    std::lock_guard<std::mutex> lock(
        g_mutex
    );

    if (!g_engine_initialized) {

        LOGE(
            "Engine is not initialized"
        );

        return 0;
    }

    if (!modelPath) {

        LOGE(
            "modelPath is null"
        );

        return 0;
    }

    std::string path =
        jstring_to_utf8(
            env,
            modelPath
        );

    if (path.empty()) {

        LOGE(
            "Model path is empty"
        );

        return 0;
    }

    LOGD(
        "Loading GGUF model: %s",
        path.c_str()
    );

    try {

        // ----------------------------------------------------
        // Model parameters
        // ----------------------------------------------------

        llama_model_params model_params =
            llama_model_default_params();

        /*
         * فعلاً CPU-only.
         */
        model_params.n_gpu_layers = 0;

        llama_model *model =
            llama_load_model_from_file(
                path.c_str(),
                model_params
            );

        if (!model) {

            LOGE(
                "llama_load_model_from_file failed"
            );

            return 0;
        }

        LOGD(
            "Model loaded successfully"
        );

        // ----------------------------------------------------
        // Context parameters
        // ----------------------------------------------------

        llama_context_params ctx_params =
            llama_context_default_params();

        /*
         * مقدار محافظه‌کارانه برای Android.
         */
        ctx_params.n_ctx = 2048;
        ctx_params.n_batch = 512;
        ctx_params.n_ubatch = 512;

        int threads =
            get_thread_count();

        ctx_params.n_threads =
            static_cast<uint32_t>(
                threads
            );

        ctx_params.n_threads_batch =
            static_cast<uint32_t>(
                threads
            );

        LOGD(
            "Creating context: n_ctx=%u n_batch=%u n_ubatch=%u threads=%d",
            ctx_params.n_ctx,
            ctx_params.n_batch,
            ctx_params.n_ubatch,
            threads
        );

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
         * Seed پیش‌فرض llama.cpp.
         * LLAMA_DEFAULT_SEED = 0xFFFFFFFF
         * یعنی seed تصادفی.
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

        return reinterpret_cast<jlong>(
            handle
        );

    } catch (const std::exception &e) {

        LOGE(
            "Model loading exception: %s",
            e.what()
        );

        return 0;
    }
}

// ============================================================
// 3. Run inference
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

    /*
     * context فقط توسط یک inference در هر لحظه استفاده شود.
     */
    std::lock_guard<std::mutex> lock(
        g_mutex
    );

    if (!g_engine_initialized) {

        return make_result(
            env,
            "Error: engine is not initialized"
        );
    }

    NativeModel *handle =
        reinterpret_cast<NativeModel *>(
            modelPtr
        );

    if (!handle ||
        !handle->model ||
        !handle->ctx) {

        return make_result(
            env,
            "Error: model is not ready"
        );
    }

    std::string promptText =
        jstring_to_utf8(
            env,
            prompt
        );

    if (promptText.empty()) {

        return make_result(
            env,
            "Error: empty prompt"
        );
    }

    int max_new_tokens =
        static_cast<int>(
            maxTokens
        );

    if (max_new_tokens <= 0) {
        max_new_tokens = 128;
    }

    /*
     * حداکثر فعلی.
     */
    max_new_tokens =
        std::min(
            max_new_tokens,
            2048
        );

    LOGD(
        "Inference started. max_tokens=%d temp=%f top_p=%f",
        max_new_tokens,
        temperature,
        topP
    );

    try {

        // ----------------------------------------------------
        // 0. پاک کردن KV cache
        // ----------------------------------------------------

        /*
         * هر درخواست باید مستقل باشد.
         *
         * بدون این خط، KV cache درخواست قبلی ممکن است
         * روی inference بعدی اثر بگذارد.
         */
        llama_kv_cache_clear(
            handle->ctx
        );

        LOGD(
            "KV cache cleared"
        );

        // ----------------------------------------------------
        // 1. Tokenize
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // 2. Context capacity check
        // ----------------------------------------------------

        const uint32_t n_ctx =
            llama_n_ctx(
                handle->ctx
            );

        if (
            static_cast<uint64_t>(
                prompt_count
            ) >=
            static_cast<uint64_t>(
                n_ctx
            )
        ) {

            LOGE(
                "Prompt too long: %d tokens, context=%u",
                prompt_count,
                n_ctx
            );

            return make_result(
                env,
                "Error: prompt exceeds context size"
            );
        }

        /*
         * حداکثر تعداد توکن‌هایی که واقعاً می‌توانیم
         * تولید کنیم.
         */
        int allowed_new_tokens =
            static_cast<int>(
                n_ctx -
                static_cast<uint32_t>(
                    prompt_count
                )
            );

        allowed_new_tokens =
            std::min(
                allowed_new_tokens,
                max_new_tokens
            );

        if (allowed_new_tokens <= 0) {

            return make_result(
                env,
                "Error: no context space for generation"
            );
        }

        // ----------------------------------------------------
        // 3. Decode prompt
        // ----------------------------------------------------

        /*
         * prompt را فقط یک بار decode می‌کنیم.
         */
        llama_batch prompt_batch =
            llama_batch_get_one(
                prompt_tokens.data(),
                prompt_count,
                0,
                0
            );

        int32_t decode_result =
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

        LOGD(
            "Prompt decoded successfully: %d tokens",
            prompt_count
        );

        // ----------------------------------------------------
        // 4. Generate
        // ----------------------------------------------------

        std::string response;

        response.reserve(
            static_cast<size_t>(
                allowed_new_tokens * 4
            )
        );

        /*
         * فقط برای نگهداری tokenهای تولیدشده.
         */
        std::vector<llama_token> generated_tokens;

        generated_tokens.reserve(
            static_cast<size_t>(
                allowed_new_tokens
            )
        );

        for (
            int i = 0;
            i < allowed_new_tokens;
            ++i
        ) {

            // ------------------------------------------------
            // Sample next token
            // ------------------------------------------------

            llama_token token =
                sample_next_token(
                    handle->ctx,
                    handle->model,
                    temperature,
                    topP
                );

            if (token < 0) {

                LOGE(
                    "Sampling returned invalid token at step %d",
                    i
                );

                break;
            }

            // ------------------------------------------------
            // End of generation
            // ------------------------------------------------

            if (
                llama_token_is_eog(
                    handle->model,
                    token
                )
            ) {

                LOGD(
                    "EOG token received at step %d",
                    i
                );

                break;
            }

            // ------------------------------------------------
            // Token -> text
            // ------------------------------------------------

            std::string piece =
                token_to_piece(
                    handle->model,
                    token
                );

            if (!piece.empty()) {
                response += piece;
            }

            generated_tokens.push_back(
                token
            );

            // ------------------------------------------------
            // Decode generated token
            // ------------------------------------------------

            /*
             * موقعیت token جدید:
             *
             * prompt_count + i
             */
            llama_batch next_batch =
                llama_batch_get_one(
                    &generated_tokens.back(),
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

        // ----------------------------------------------------
        // 5. Result
        // ----------------------------------------------------

        LOGD(
            "Inference finished. generated_tokens=%zu chars=%zu",
            generated_tokens.size(),
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

    } catch (...) {

        LOGE(
            "Inference unknown exception"
        );

        return make_result(
            env,
            "Error: unknown native inference error"
        );
    }
}

// ============================================================
// 4. Unload model
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

    std::lock_guard<std::mutex> lock(
        g_mutex
    );

    NativeModel *handle =
        reinterpret_cast<NativeModel *>(
            modelPtr
        );

    if (!handle) {
        return;
    }

    LOGD(
        "Unloading model handle: %p",
        handle
    );

    if (handle->ctx) {

        llama_free(
            handle->ctx
        );

        handle->ctx = nullptr;
    }

    if (handle->model) {

        llama_free_model(
            handle->model
        );

        handle->model = nullptr;
    }

    delete handle;

    LOGD(
        "Model unloaded successfully"
    );
}

// ============================================================
// 5. Free engine
// ============================================================

JNIEXPORT void JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeFreeEngine(
        JNIEnv *env,
        jobject thiz) {

    (void) env;
    (void) thiz;

    std::lock_guard<std::mutex> lock(
        g_mutex
    );

    if (!g_engine_initialized) {
        return;
    }

    LOGD(
        "Freeing llama.cpp backend..."
    );

    /*
     * توجه:
     * قبل از nativeFreeEngine باید Java لزوماً
     * nativeUnloadModel را صدا زده باشد.
     */

    llama_backend_free();

    g_engine_initialized = false;

    LOGD(
        "Llama backend freed"
    );
}
