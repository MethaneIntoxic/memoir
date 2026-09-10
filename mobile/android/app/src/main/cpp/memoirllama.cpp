#include "llama.h"

#include <android/log.h>
#include <jni.h>

#include <algorithm>
#include <chrono>
#include <mutex>
#include <stdexcept>
#include <string>
#include <thread>
#include <unordered_set>
#include <vector>

namespace {
constexpr const char * LOG_TAG = "MemoirLlama";
constexpr int MIN_CONTEXT_TOKENS = 1024;
constexpr int MAX_CONTEXT_TOKENS = 2048;
constexpr int PROMPT_BATCH_TOKENS = 512;
constexpr int THREAD_HEADROOM = 2;
constexpr int MIN_GENERATION_TOKENS = 8;
constexpr int MAX_GENERATION_TOKENS = 900;
constexpr size_t MAX_GRAMMAR_BYTES = 32 * 1024;

std::mutex g_mutex;
std::mutex g_cancel_mutex;
std::string g_model_path;
llama_model * g_model = nullptr;
bool g_backends_loaded = false;
std::unordered_set<std::string> g_cancelled_jobs;

std::string jstring_to_string(JNIEnv * env, jstring value) {
    if (value == nullptr) {
        return "";
    }

    const char * chars = env->GetStringUTFChars(value, nullptr);
    if (chars == nullptr) {
        return "";
    }

    std::string output(chars);
    env->ReleaseStringUTFChars(value, chars);
    return output;
}

jstring string_to_jstring(JNIEnv * env, const std::string & value) {
    return env->NewStringUTF(value.c_str());
}

void set_error(JNIEnv * env, const std::string & message) {
    jclass exception_class = env->FindClass("java/lang/IllegalStateException");
    if (exception_class != nullptr) {
        env->ThrowNew(exception_class, message.c_str());
    }
}

bool is_cancelled(const std::string & job_id) {
    if (job_id.empty()) {
        return false;
    }

    std::lock_guard<std::mutex> lock(g_cancel_mutex);
    return g_cancelled_jobs.find(job_id) != g_cancelled_jobs.end();
}

void clear_cancelled(const std::string & job_id) {
    if (job_id.empty()) {
        return;
    }

    std::lock_guard<std::mutex> lock(g_cancel_mutex);
    g_cancelled_jobs.erase(job_id);
}

bool ensure_model_loaded(const std::string & model_path) {
    if (g_model != nullptr && g_model_path == model_path) {
        return true;
    }

    if (!g_backends_loaded) {
        llama_log_set([](ggml_log_level level, const char * text, void *) {
            if (level >= GGML_LOG_LEVEL_ERROR) {
                __android_log_write(ANDROID_LOG_ERROR, LOG_TAG, text);
            }
        }, nullptr);
        ggml_backend_load_all();
        g_backends_loaded = true;
    }

    if (g_model != nullptr) {
        llama_model_free(g_model);
        g_model = nullptr;
        g_model_path.clear();
    }

    llama_model_params model_params = llama_model_default_params();
    model_params.n_gpu_layers = 0;
    model_params.use_mmap = true;
    model_params.use_mlock = false;

    g_model = llama_model_load_from_file(model_path.c_str(), model_params);
    if (g_model == nullptr) {
        return false;
    }

    g_model_path = model_path;
    return true;
}

std::string apply_chat_template(llama_model * model, const std::string & prompt) {
    const char * tmpl = llama_model_chat_template(model, nullptr);
    const std::string system =
        "You are Memoir's private on-device storyteller. Return strict JSON only. "
        "Stay grounded in the user-provided asset order and notes.";

    std::vector<llama_chat_message> messages = {
        { "system", system.c_str() },
        { "user", prompt.c_str() },
    };

    int formatted_size = llama_chat_apply_template(tmpl, messages.data(), messages.size(), true, nullptr, 0);
    if (formatted_size <= 0) {
        return prompt;
    }

    std::vector<char> formatted(static_cast<size_t>(formatted_size));
    int actual_size = llama_chat_apply_template(tmpl, messages.data(), messages.size(), true, formatted.data(), formatted.size());
    if (actual_size <= 0) {
        return prompt;
    }

    return std::string(formatted.data(), static_cast<size_t>(actual_size));
}

std::vector<llama_token> tokenize_prompt(const llama_vocab * vocab, const std::string & prompt) {
    const int token_count = -llama_tokenize(vocab, prompt.c_str(), prompt.size(), nullptr, 0, true, true);
    if (token_count <= 0) {
        return {};
    }

    std::vector<llama_token> tokens(static_cast<size_t>(token_count));
    const int actual = llama_tokenize(vocab, prompt.c_str(), prompt.size(), tokens.data(), tokens.size(), true, true);
    if (actual < 0) {
        return {};
    }

    tokens.resize(static_cast<size_t>(actual));
    return tokens;
}

std::string token_to_piece(const llama_vocab * vocab, llama_token token) {
    char buffer[512];
    const int size = llama_token_to_piece(vocab, token, buffer, sizeof(buffer), 0, true);
    if (size < 0) {
        return "";
    }

    return std::string(buffer, static_cast<size_t>(size));
}

bool json_object_complete(const std::string & value) {
    bool started = false;
    bool in_string = false;
    bool escaped = false;
    int depth = 0;

    for (char character : value) {
        if (!started) {
            if (character == '{') {
                started = true;
                depth = 1;
            }
            continue;
        }
        if (escaped) {
            escaped = false;
            continue;
        }
        if (in_string && character == '\\') {
            escaped = true;
            continue;
        }
        if (character == '"') {
            in_string = !in_string;
            continue;
        }
        if (in_string) {
            continue;
        }
        if (character == '{') {
            depth += 1;
        } else if (character == '}' && --depth == 0) {
            return true;
        }
    }

    return false;
}

std::string generate_text(
    const std::string & model_path,
    const std::string & prompt,
    const std::string & job_id,
    const std::string & grammar,
    int max_tokens
) {
    std::lock_guard<std::mutex> lock(g_mutex);

    if (grammar.empty() || grammar.size() > MAX_GRAMMAR_BYTES) {
        throw std::runtime_error("native-ai-invalid-grammar");
    }

    if (is_cancelled(job_id)) {
        throw std::runtime_error("native-ai-generation-cancelled");
    }

    if (!ensure_model_loaded(model_path)) {
        throw std::runtime_error("native-ai-model-load-failed");
    }

    if (is_cancelled(job_id)) {
        throw std::runtime_error("native-ai-generation-cancelled");
    }

    const llama_vocab * vocab = llama_model_get_vocab(g_model);
    const std::string formatted_prompt = apply_chat_template(g_model, prompt);
    std::vector<llama_token> prompt_tokens = tokenize_prompt(vocab, formatted_prompt);
    if (prompt_tokens.empty()) {
        throw std::runtime_error("native-ai-tokenize-failed");
    }

    const int predicted_tokens = std::max(MIN_GENERATION_TOKENS, std::min(max_tokens, MAX_GENERATION_TOKENS));
    const int required_context = static_cast<int>(prompt_tokens.size()) + predicted_tokens + 32;
    if (required_context > MAX_CONTEXT_TOKENS) {
        throw std::runtime_error("native-ai-context-too-large");
    }
    const int n_ctx = std::max(MIN_CONTEXT_TOKENS, required_context);
    const int online_threads = static_cast<int>(std::thread::hardware_concurrency());
    const int n_threads = std::max(2, std::min(4, online_threads - THREAD_HEADROOM));

    llama_context_params ctx_params = llama_context_default_params();
    ctx_params.n_ctx = static_cast<uint32_t>(n_ctx);
    ctx_params.n_batch = PROMPT_BATCH_TOKENS;
    ctx_params.n_ubatch = PROMPT_BATCH_TOKENS;
    ctx_params.n_threads = n_threads;
    ctx_params.n_threads_batch = n_threads;
    ctx_params.no_perf = true;

    llama_context * ctx = llama_init_from_model(g_model, ctx_params);
    if (ctx == nullptr) {
        throw std::runtime_error("native-ai-context-init-failed");
    }

    llama_sampler * sampler = llama_sampler_chain_init(llama_sampler_chain_default_params());
    llama_sampler_chain_add(sampler, llama_sampler_init_grammar(vocab, grammar.c_str(), "root"));
    llama_sampler_chain_add(sampler, llama_sampler_init_top_k(40));
    llama_sampler_chain_add(sampler, llama_sampler_init_top_p(0.90f, 1));
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(0.30f));
    llama_sampler_chain_add(sampler, llama_sampler_init_dist(LLAMA_DEFAULT_SEED));

    std::string output;
    llama_token sampled_token{};
    int generated_count = 0;
    const auto generation_started = std::chrono::steady_clock::now();

    for (size_t offset = 0; offset < prompt_tokens.size(); offset += PROMPT_BATCH_TOKENS) {
        if (is_cancelled(job_id)) {
            llama_sampler_free(sampler);
            llama_free(ctx);
            throw std::runtime_error("native-ai-generation-cancelled");
        }
        const int batch_size = static_cast<int>(
            std::min<size_t>(PROMPT_BATCH_TOKENS, prompt_tokens.size() - offset)
        );
        llama_batch prompt_batch = llama_batch_get_one(prompt_tokens.data() + offset, batch_size);
        if (llama_decode(ctx, prompt_batch) != 0) {
            llama_sampler_free(sampler);
            llama_free(ctx);
            throw std::runtime_error("native-ai-decode-failed");
        }
    }

    for (int generated = 0; generated < predicted_tokens; generated += 1) {
        if (is_cancelled(job_id)) {
            llama_sampler_free(sampler);
            llama_free(ctx);
            throw std::runtime_error("native-ai-generation-cancelled");
        }

        sampled_token = llama_sampler_sample(sampler, ctx, -1);
        generated_count = generated + 1;
        if (llama_vocab_is_eog(vocab, sampled_token)) {
            break;
        }

        std::string piece = token_to_piece(vocab, sampled_token);
        output += piece;
        if (json_object_complete(output)) {
            break;
        }

        llama_batch token_batch = llama_batch_get_one(&sampled_token, 1);
        if (llama_decode(ctx, token_batch) != 0) {
            llama_sampler_free(sampler);
            llama_free(ctx);
            throw std::runtime_error("native-ai-decode-failed");
        }
    }

    llama_sampler_free(sampler);
    llama_free(ctx);
    clear_cancelled(job_id);
    const auto elapsed_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - generation_started
    ).count();
    __android_log_print(
        ANDROID_LOG_INFO,
        LOG_TAG,
        "generation-complete tokens=%d chars=%zu elapsedMs=%lld jsonComplete=%s",
        generated_count,
        output.size(),
        static_cast<long long>(elapsed_ms),
        json_object_complete(output) ? "true" : "false"
    );
    return output;
}
}

extern "C" JNIEXPORT jstring JNICALL
Java_local_memoir_mobile_MemoirRuntimePlugin_nativeRuntimeStatus(JNIEnv * env, jclass) {
    return string_to_jstring(env, "llama.cpp-android-jni-ready");
}

extern "C" JNIEXPORT jstring JNICALL
Java_local_memoir_mobile_MemoirRuntimePlugin_nativeGenerate(
    JNIEnv * env,
    jclass,
    jstring model_path,
    jstring prompt,
    jstring job_id,
    jstring grammar,
    jint max_tokens
) {
    const std::string job_id_value = jstring_to_string(env, job_id);
    try {
        const std::string result = generate_text(
            jstring_to_string(env, model_path),
            jstring_to_string(env, prompt),
            job_id_value,
            jstring_to_string(env, grammar),
            static_cast<int>(max_tokens)
        );
        return string_to_jstring(env, result);
    } catch (const std::exception & error) {
        clear_cancelled(job_id_value);
        set_error(env, error.what());
        return nullptr;
    }
}

extern "C" JNIEXPORT void JNICALL
Java_local_memoir_mobile_MemoirRuntimePlugin_nativeCancel(JNIEnv * env, jclass, jstring job_id) {
    std::lock_guard<std::mutex> lock(g_cancel_mutex);
    if (g_cancelled_jobs.size() >= 1024) {
        g_cancelled_jobs.clear();
    }
    g_cancelled_jobs.insert(jstring_to_string(env, job_id));
}

extern "C" JNIEXPORT void JNICALL
Java_local_memoir_mobile_MemoirRuntimePlugin_nativeUnload(JNIEnv *, jclass) {
    std::lock_guard<std::mutex> lock(g_mutex);
    if (g_model != nullptr) {
        llama_model_free(g_model);
        g_model = nullptr;
        g_model_path.clear();
    }
}
