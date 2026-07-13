import Foundation
import llama

enum MemoirRuntimeEngineError: Error {
    case modelLoad
    case contextCreate
    case tokenize
    case decode
    case cancelled
    case emptyOutput

    var code: String {
        switch self {
        case .modelLoad: return "native-ai-model-load-failed"
        case .contextCreate: return "native-ai-context-init-failed"
        case .tokenize: return "native-ai-tokenize-failed"
        case .decode: return "native-ai-decode-failed"
        case .cancelled: return "native-ai-generation-cancelled"
        case .emptyOutput: return "native-ai-empty-response"
        }
    }
}

public final class MemoirRuntimeEngine: @unchecked Sendable {
    private var model: OpaquePointer?
    private var modelPath = ""
    private let cancellationLock = NSLock()
    private var cancelledJobs = Set<String>()

    public init() {
        llama_backend_init()
    }

    deinit {
        unload()
        llama_backend_free()
    }

    public func cancel(jobID: String) {
        cancellationLock.lock()
        if cancelledJobs.count >= 1_024 {
            cancelledJobs.removeAll(keepingCapacity: true)
        }
        cancelledJobs.insert(jobID)
        cancellationLock.unlock()
    }

    public func unload() {
        if let model {
            llama_model_free(model)
            self.model = nil
            modelPath = ""
        }
    }

    public func generate(modelURL: URL, prompt: String, jobID: String, maxTokens: Int) throws -> String {
        defer { clearCancellation(jobID: jobID) }
        if isCancelled(jobID: jobID) {
            throw MemoirRuntimeEngineError.cancelled
        }

        let loadedModel = try loadModel(at: modelURL)
        guard let vocabulary = llama_model_get_vocab(loadedModel) else {
            throw MemoirRuntimeEngineError.modelLoad
        }

        let formattedPrompt = qwenChatPrompt(prompt)
        let promptTokens = try tokenize(formattedPrompt, vocabulary: vocabulary)
        let predictedTokens = max(32, min(maxTokens, 900))
        let contextSize = min(4_096, max(2_048, promptTokens.count + predictedTokens + 32))
        let threadCount = max(1, min(4, ProcessInfo.processInfo.activeProcessorCount))

        var contextParameters = llama_context_default_params()
        contextParameters.n_ctx = UInt32(contextSize)
        contextParameters.n_batch = UInt32(min(contextSize, max(512, promptTokens.count)))
        contextParameters.n_threads = Int32(threadCount)
        contextParameters.n_threads_batch = Int32(threadCount)
        contextParameters.no_perf = true

        guard let context = llama_init_from_model(loadedModel, contextParameters) else {
            throw MemoirRuntimeEngineError.contextCreate
        }
        defer { llama_free(context) }

        var batch = llama_batch_init(Int32(max(512, promptTokens.count + 1)), 0, 1)
        defer { llama_batch_free(batch) }
        for (index, token) in promptTokens.enumerated() {
            batchAdd(&batch, token: token, position: Int32(index), logits: index == promptTokens.count - 1)
        }

        guard llama_decode(context, batch) == 0 else {
            throw MemoirRuntimeEngineError.decode
        }

        let sampler = llama_sampler_chain_init(llama_sampler_chain_default_params())
        llama_sampler_chain_add(sampler, llama_sampler_init_top_k(40))
        llama_sampler_chain_add(sampler, llama_sampler_init_top_p(0.90, 1))
        llama_sampler_chain_add(sampler, llama_sampler_init_temp(0.70))
        llama_sampler_chain_add(sampler, llama_sampler_init_dist(UInt32.random(in: UInt32.min...UInt32.max)))
        defer { llama_sampler_free(sampler) }

        var output = ""
        var position = Int32(promptTokens.count)
        for _ in 0..<predictedTokens {
            if isCancelled(jobID: jobID) {
                throw MemoirRuntimeEngineError.cancelled
            }

            let nextToken = llama_sampler_sample(sampler, context, -1)
            if llama_vocab_is_eog(vocabulary, nextToken) {
                break
            }
            output += tokenPiece(nextToken, vocabulary: vocabulary)

            batchClear(&batch)
            batchAdd(&batch, token: nextToken, position: position, logits: true)
            position += 1
            guard llama_decode(context, batch) == 0 else {
                throw MemoirRuntimeEngineError.decode
            }
        }

        let trimmed = output.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            throw MemoirRuntimeEngineError.emptyOutput
        }
        return trimmed
    }

    private func loadModel(at url: URL) throws -> OpaquePointer {
        if let model, modelPath == url.path {
            return model
        }
        unload()

        var parameters = llama_model_default_params()
        parameters.n_gpu_layers = 0
        parameters.use_mmap = true
        parameters.use_mlock = false

        let loaded = url.path.withCString { path in
            llama_model_load_from_file(path, parameters)
        }
        guard let loaded else {
            throw MemoirRuntimeEngineError.modelLoad
        }
        model = loaded
        modelPath = url.path
        return loaded
    }

    private func tokenize(_ text: String, vocabulary: OpaquePointer) throws -> [llama_token] {
        var tokens = Array<llama_token>(repeating: 0, count: text.utf8.count + 8)
        let count = text.withCString { characters in
            tokens.withUnsafeMutableBufferPointer { buffer in
                llama_tokenize(
                    vocabulary,
                    characters,
                    Int32(text.utf8.count),
                    buffer.baseAddress,
                    Int32(buffer.count),
                    true,
                    true
                )
            }
        }
        guard count > 0 else {
            throw MemoirRuntimeEngineError.tokenize
        }
        return Array(tokens.prefix(Int(count)))
    }

    private func tokenPiece(_ token: llama_token, vocabulary: OpaquePointer) -> String {
        var bytes = Array<CChar>(repeating: 0, count: 128)
        var count = bytes.withUnsafeMutableBufferPointer { buffer in
            llama_token_to_piece(vocabulary, token, buffer.baseAddress, Int32(buffer.count), 0, true)
        }
        if count < 0 {
            bytes = Array<CChar>(repeating: 0, count: Int(-count))
            count = bytes.withUnsafeMutableBufferPointer { buffer in
                llama_token_to_piece(vocabulary, token, buffer.baseAddress, Int32(buffer.count), 0, true)
            }
        }
        guard count > 0 else { return "" }
        let data = Data(bytes.prefix(Int(count)).map { UInt8(bitPattern: $0) })
        return String(data: data, encoding: .utf8) ?? ""
    }

    private func qwenChatPrompt(_ prompt: String) -> String {
        """
        <|im_start|>system
        You are Memoir's private on-device storyteller. Return strict JSON only and remain grounded in user-provided data.<|im_end|>
        <|im_start|>user
        \(prompt)<|im_end|>
        <|im_start|>assistant
        """
    }

    private func isCancelled(jobID: String) -> Bool {
        cancellationLock.lock()
        defer { cancellationLock.unlock() }
        return cancelledJobs.contains(jobID)
    }

    private func clearCancellation(jobID: String) {
        cancellationLock.lock()
        cancelledJobs.remove(jobID)
        cancellationLock.unlock()
    }
}

private func batchClear(_ batch: inout llama_batch) {
    batch.n_tokens = 0
}

private func batchAdd(_ batch: inout llama_batch, token: llama_token, position: llama_pos, logits: Bool) {
    let index = Int(batch.n_tokens)
    batch.token[index] = token
    batch.pos[index] = position
    batch.n_seq_id[index] = 1
    batch.seq_id[index]![0] = 0
    batch.logits[index] = logits ? 1 : 0
    batch.n_tokens += 1
}
