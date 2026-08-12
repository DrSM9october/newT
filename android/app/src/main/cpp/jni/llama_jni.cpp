#include <jni.h>

#include <android/log.h>

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <memory>
#include <mutex>
#include <string>
#include <vector>

#include "llama.h"

#define LOG_TAG "LinguaAI-llamaJNI"

#define LOGI(...) \
    __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)

#define LOGE(...) \
    __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace {

std::mutex g_engine_mutex;

bool g_engine_initialized = false;

/*
 * The Java layer owns the model pointer returned by
 * nativeLoadModel().
 *
 * Native model/context are stored together so that the
 * returned pointer is always a single valid native handle.
 */
struct NativeModel {
    llama_model *model = nullptr;
    llama_context *context = nullptr;

    int32_t n_ctx = 2048;
};

static std::string jstring_to_string(
        JNIEnv *env,
        jstring value) {

    if (env == nullptr || value == nullptr) {
        return std::string();
    }

    const char *chars =
            env->GetStringUTFChars(value, nullptr);

    if (chars == nullptr) {
        return std::string();
    }

    std::string result(chars);

    env->ReleaseStringUTFChars(
            value,
            chars
    );

    return result;
}

static jstring string_to_jstring(
        JNIEnv *env,
        const std::string &value) {

    if (env == nullptr) {
        return nullptr;
    }

    return env->NewStringUTF(
            value.c_str()
    );
}

static void release_native_model(
        NativeModel *native_model) {

    if (native_model == nullptr) {
        return;
    }

    if (native_model->context != nullptr) {

        llama_free(
                native_model->context
        );

        native_model->context = nullptr;
    }

    if (native_model->model != nullptr) {

        llama_model_free(
                native_model->model
        );

        native_model->model = nullptr;
    }

    delete native_model;
}

static int32_t tokenize_prompt(
        const llama_vocab *vocab,
        const std::string &prompt,
        std::vector<llama_token> &tokens) {

    if (vocab == nullptr) {
        return -1;
    }

    /*
     * First call obtains the required token count.
     *
     * The false flag means:
     *   do not add BOS automatically.
     *
     * We handle prompt formatting explicitly.
     */
    int32_t required =
            llama_tokenize(
                    vocab,
                    prompt.c_str(),
                    static_cast<int32_t>(prompt.size()),
                    nullptr,
                    0,
                    true,
                    true
            );

    if (required <= 0) {
        return -1;
    }

    tokens.resize(
            static_cast<size_t>(required)
    );

    int32_t actual =
            llama_tokenize(
                    vocab,
                    prompt.c_str(),
                    static_cast<int32_t>(prompt.size()),
                    tokens.data(),
                    required,
                    true,
                    true
            );

    if (actual < 0) {
        return -1;
    }

    tokens.resize(
            static_cast<size_t>(actual)
    );

    return actual;
}

static llama_token select_token_greedy(
        llama_context *ctx,
        int32_t vocab_size) {

    if (ctx == nullptr || vocab_size <= 0) {
        return 0;
    }

    const float *logits =
            llama_get_logits(
                    ctx
            );

    if (logits == nullptr) {
        return 0;
    }

    int32_t best_token = 0;
    float best_logit = -INFINITY;

    for (int32_t token = 0;
         token < vocab_size;
         ++token) {

        const float value =
                logits[token];

        if (std::isnan(value)) {
            continue;
        }

        if (value > best_logit) {

            best_logit = value;
            best_token = token;
        }
    }

    return static_cast<llama_token>(
            best_token
    );
}

static llama_token sample_token(
        llama_context *ctx,
        float temperature,
        float top_p,
        std::mt19937 &rng) {

    if (ctx == nullptr) {
        return 0;
    }

    const int32_t vocab_size =
            llama_vocab_n_tokens(
                    llama_get_model_vocab(
                            llama_get_model(ctx)
                    )
            );

    if (vocab_size <= 0) {
        return 0;
    }

    const float *logits =
            llama_get_logits(
                    ctx
            );

    if (logits == nullptr) {
        return 0;
    }

    /*
     * Temperature <= 0 means greedy decoding.
     */
    if (temperature <= 0.0f) {

        return select_token_greedy(
                ctx,
                vocab_size
        );
    }

    struct Candidate {
        llama_token token;
        float logit;
        float probability;
    };

    std::vector<Candidate> candidates;

    candidates.reserve(
            static_cast<size_t>(vocab_size)
    );

    float max_logit = -INFINITY;

    for (int32_t i = 0;
         i < vocab_size;
         ++i) {

        const float value =
                logits[i];

        if (std::isnan(value)) {
            continue;
        }

        if (value > max_logit) {
            max_logit = value;
        }
    }

    if (!std::isfinite(max_logit)) {
        return 0;
    }

    double probability_sum = 0.0;

    for (int32_t i = 0;
         i < vocab_size;
         ++i) {

        const float value =
                logits[i];

        if (std::isnan(value)) {
            continue;
        }

        const double scaled =
                static_cast<double>(
                        value - max_logit
                ) /
                static_cast<double>(
                        temperature
                );

        const double probability =
                std::exp(scaled);

        if (!std::isfinite(probability)) {
            continue;
        }

        candidates.push_back({
                static_cast<llama_token>(i),
                value,
                static_cast<float>(probability)
        });

        probability_sum += probability;
    }

    if (candidates.empty() ||
        probability_sum <= 0.0) {

        return 0;
    }

    for (Candidate &candidate :
            candidates) {

        candidate.probability =
                static_cast<float>(
                        static_cast<double>(
                                candidate.probability
                        ) /
                        probability_sum
                );
    }

    /*
     * Sort by probability for top-p.
     */
    std::sort(
            candidates.begin(),
            candidates.end(),
            [](const Candidate &a,
               const Candidate &b) {

                return a.probability >
                       b.probability;
            }
    );

    float effective_top_p =
            top_p;

    if (effective_top_p <= 0.0f) {
        effective_top_p = 1.0f;
    }

    if (effective_top_p > 1.0f) {
        effective_top_p = 1.0f;
    }

    std::vector<Candidate> filtered;

    filtered.reserve(
            candidates.size()
    );

    float cumulative = 0.0f;

    for (const Candidate &candidate :
            candidates) {

        filtered.push_back(
                candidate
        );

        cumulative +=
                candidate.probability;

        if (cumulative >=
                effective_top_p) {

            break;
        }
    }

    float filtered_sum = 0.0f;

    for (const Candidate &candidate :
            filtered) {

        filtered_sum +=
                candidate.probability;
    }

    if (filtered.empty() ||
        filtered_sum <= 0.0f) {

        return select_token_greedy(
                ctx,
                vocab_size
        );
    }

    std::uniform_real_distribution<float>
            distribution(
                    0.0f,
                    filtered_sum
            );

    float random_value =
            distribution(rng);

    for (const Candidate &candidate :
            filtered) {

        random_value -=
                candidate.probability;

        if (random_value <= 0.0f) {

            return candidate.token;
        }
    }

    return filtered.back().token;
}

} // namespace

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeInitEngine(
        JNIEnv *env,
        jobject thiz) {

    (void) env;
    (void) thiz;

    std::lock_guard<std::mutex> lock(
            g_engine_mutex
    );

    if (g_engine_initialized) {

        LOGI(
                "llama.cpp backend already initialized"
        );

        return JNI_TRUE;
    }

    try {

        llama_backend_init();

        g_engine_initialized = true;

        LOGI(
                "llama.cpp backend initialized"
        );

        return JNI_TRUE;

    } catch (...) {

        g_engine_initialized = false;

        LOGE(
                "Exception while initializing llama.cpp backend"
        );

        return JNI_FALSE;
    }
}

extern "C"
JNIEXPORT jlong JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeLoadModel(
        JNIEnv *env,
        jobject thiz,
        jstring modelPath) {

    (void) thiz;

    if (env == nullptr ||
        modelPath == nullptr) {

        LOGE(
                "nativeLoadModel: invalid arguments"
        );

        return 0;
    }

    const std::string path =
            jstring_to_string(
                    env,
                    modelPath
            );

    if (path.empty()) {

        LOGE(
                "nativeLoadModel: empty model path"
        );

        return 0;
    }

    {
        std::lock_guard<std::mutex> lock(
                g_engine_mutex
        );

        if (!g_engine_initialized) {

            LOGI(
                    "Backend not initialized; initializing now"
            );

            llama_backend_init();

            g_engine_initialized = true;
        }
    }

    LOGI(
            "Loading GGUF model: %s",
            path.c_str()
    );

    llama_model_params model_params =
            llama_model_default_params();

    /*
     * Android memory is usually limited.
     *
     * mmap is left enabled by llama.cpp's defaults.
     */
    model_params.use_mmap = true;

    llama_model *model =
            llama_model_load_from_file(
                    path.c_str(),
                    model_params
            );

    if (model == nullptr) {

        LOGE(
                "Failed to load GGUF model: %s",
                path.c_str()
        );

        return 0;
    }

    llama_context_params context_params =
            llama_context_default_params();

    /*
     * Conservative defaults suitable for Android.
     *
     * These can be changed later if required by the
     * target device/model.
     */
    context_params.n_ctx = 2048;
    context_params.n_batch = 512;
    context_params.n_ubatch = 512;
    context_params.n_threads = 4;
    context_params.n_threads_batch = 4;

    llama_context *context =
            llama_init_from_model(
                    model,
                    context_params
            );

    if (context == nullptr) {

        LOGE(
                "Failed to create llama context"
        );

        llama_model_free(
                model
        );

        return 0;
    }

    NativeModel *native_model =
            new NativeModel();

    native_model->model =
            model;

    native_model->context =
            context;

    native_model->n_ctx =
            context_params.n_ctx;

    LOGI(
            "GGUF model loaded successfully"
    );

    return reinterpret_cast<jlong>(
            native_model
    );
}

extern "C"
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

    if (env == nullptr) {
        return nullptr;
    }

    if (modelPtr == 0) {

        return string_to_jstring(
                env,
                "Error: invalid native model pointer"
        );
    }

    if (prompt == nullptr) {

        return string_to_jstring(
                env,
                "Error: empty prompt"
        );
    }

    NativeModel *native_model =
            reinterpret_cast<NativeModel *>(
                    modelPtr
            );

    if (native_model == nullptr ||
        native_model->model == nullptr ||
        native_model->context == nullptr) {

        return string_to_jstring(
                env,
                "Error: native model is not initialized"
        );
    }

    const std::string input =
            jstring_to_string(
                    env,
                    prompt
            );

    if (input.empty()) {

        return string_to_jstring(
                env,
                "Error: empty prompt"
        );
    }

    int requested_tokens =
            static_cast<int>(
                    maxTokens
            );

    if (requested_tokens <= 0) {
        requested_tokens = 128;
    }

    /*
     * Prevent an impossible generation length.
     */
    const int max_context =
            static_cast<int>(
                    native_model->n_ctx
            );

    if (requested_tokens >= max_context) {

        requested_tokens =
                std::max(
                        1,
                        max_context - 64
                );
    }

    float temp =
            static_cast<float>(
                    temperature
            );

    float top_p =
            static_cast<float>(
                    topP
            );

    if (!std::isfinite(temp)) {
        temp = 0.7f;
    }

    if (!std::isfinite(top_p)) {
        top_p = 0.9f;
    }

    if (temp < 0.0f) {
        temp = 0.0f;
    }

    if (top_p <= 0.0f) {
        top_p = 1.0f;
    }

    if (top_p > 1.0f) {
        top_p = 1.0f;
    }

    LOGI(
            "Starting inference. maxTokens=%d temperature=%f topP=%f",
            requested_tokens,
            temp,
            top_p
    );

    const llama_vocab *vocab =
            llama_model_get_vocab(
                    native_model->model
            );

    if (vocab == nullptr) {

        return string_to_jstring(
                env,
                "Error: model vocabulary is unavailable"
        );
    }

    std::vector<llama_token> prompt_tokens;

    const int32_t token_count =
            tokenize_prompt(
                    vocab,
                    input,
                    prompt_tokens
            );

    if (token_count <= 0) {

        LOGE(
                "Failed to tokenize prompt"
        );

        return string_to_jstring(
                env,
                "Error: failed to tokenize prompt"
        );
    }

    if (token_count >=
            native_model->n_ctx) {

        return string_to_jstring(
                env,
                "Error: prompt is too long for context"
        );
    }

    /*
     * Clear the context before every independent request.
     */
    llama_memory_clear(
            llama_get_memory(
                    native_model->context
            ),
            true
    );

    llama_batch batch =
            llama_batch_init(
                    static_cast<int32_t>(
                            prompt_tokens.size()
                    ),
                    0,
                    1
            );

    if (batch.token == nullptr ||
        batch.pos == nullptr ||
        batch.n_seq_id == nullptr ||
        batch.seq_id == nullptr ||
        batch.logits == nullptr) {

        llama_batch_free(
                batch
        );

        return string_to_jstring(
                env,
                "Error: failed to allocate llama batch"
        );
    }

    /*
     * Feed prompt tokens.
     *
     * Only the final prompt token requests logits.
     */
    for (int32_t i = 0;
         i < token_count;
         ++i) {

        batch.token[i] =
                prompt_tokens[
                        static_cast<size_t>(i)
                ];

        batch.pos[i] = i;

        batch.n_seq_id[i] = 1;

        batch.seq_id[i][0] = 0;

        batch.logits[i] =
                (i == token_count - 1)
                ? 1
                : 0;
    }

    batch.n_tokens =
            token_count;

    if (llama_decode(
            native_model->context,
            batch
    ) != 0) {

        llama_batch_free(
                batch
        );

        LOGE(
                "llama_decode failed while processing prompt"
        );

        return string_to_jstring(
                env,
                "Error: llama_decode failed"
        );
    }

    llama_batch_free(
            batch
    );

    /*
     * Random generator for temperature/top-p sampling.
     */
    std::random_device random_device;

    std::mt19937 rng(
            random_device()
    );

    std::string output;

    output.reserve(
            static_cast<size_t>(
                    requested_tokens
            ) * 4
    );

    llama_token eos_token =
            llama_vocab_eos(
                    vocab
            );

    llama_token eot_token =
            llama_vocab_eot(
                    vocab
            );

    llama_token eom_token =
            llama_vocab_eom(
                    vocab
            );

    int32_t current_position =
            token_count;

    for (int step = 0;
         step < requested_tokens;
         ++step) {

        llama_token next_token =
                sample_token(
                        native_model->context,
                        temp,
                        top_p,
                        rng
                );

        if (next_token == eos_token ||
            next_token == eot_token ||
            next_token == eom_token) {

            break;
        }

        /*
         * Convert token to UTF-8 piece.
         */
        char piece[8192];

        const int32_t piece_length =
                llama_token_to_piece(
                        vocab,
                        next_token,
                        piece,
                        static_cast<int32_t>(
                                sizeof(piece)
                        ),
                        0,
                        true
                );

        if (piece_length < 0) {

            LOGE(
                    "llama_token_to_piece failed"
            );

            break;
        }

        if (piece_length > 0) {

            output.append(
                    piece,
                    static_cast<size_t>(
                            piece_length
                    )
            );
        }

        /*
         * Prepare next one-token batch.
         */
        llama_batch next_batch =
                llama_batch_init(
                        1,
                        0,
                        1
                );

        if (next_batch.token == nullptr ||
            next_batch.pos == nullptr ||
            next_batch.n_seq_id == nullptr ||
            next_batch.seq_id == nullptr ||
            next_batch.logits == nullptr) {

            llama_batch_free(
                    next_batch
            );

            LOGE(
                    "Failed to allocate generation batch"
            );

            break;
        }

        next_batch.token[0] =
                next_token;

        next_batch.pos[0] =
                current_position;

        next_batch.n_seq_id[0] =
                1;

        next_batch.seq_id[0][0] =
                0;

        next_batch.logits[0] =
                1;

        next_batch.n_tokens =
                1;

        const int decode_result =
                llama_decode(
                        native_model->context,
                        next_batch
                );

        llama_batch_free(
                next_batch
        );

        if (decode_result != 0) {

            LOGE(
                    "llama_decode failed during generation"
            );

            break;
        }

        ++current_position;

        if (current_position >=
                native_model->n_ctx - 1) {

            LOGI(
                    "Context limit reached"
            );

            break;
        }
    }

    LOGI(
            "Inference completed. Output length=%zu",
            output.size()
    );

    if (output.empty()) {

        output =
                "Error: model returned empty output";
    }

    return string_to_jstring(
            env,
            output
    );
}

extern "C"
JNIEXPORT void JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeUnloadModel(
        JNIEnv *env,
        jobject thiz,
        jlong modelPtr) {

    (void) env;
    (void) thiz;

    if (modelPtr == 0) {
        return;
    }

    NativeModel *native_model =
            reinterpret_cast<NativeModel *>(
                    modelPtr
            );

    LOGI(
            "Unloading native model"
    );

    release_native_model(
            native_model
    );
}

extern "C"
JNIEXPORT void JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeFreeEngine(
        JNIEnv *env,
        jobject thiz) {

    (void) env;
    (void) thiz;

    std::lock_guard<std::mutex> lock(
            g_engine_mutex
    );

    if (!g_engine_initialized) {
        return;
    }

    LOGI(
            "Freeing llama.cpp backend"
    );

    llama_backend_free();

    g_engine_initialized = false;
}
