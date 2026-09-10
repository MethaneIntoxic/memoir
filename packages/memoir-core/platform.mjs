const releaseArtifacts = {
  windows: {
    kind: 'portable-or-installer-exe',
    extension: 'exe',
    storeUpload: false,
  },
  android: {
    kind: 'android-sideload-apk',
    extension: 'apk',
    storeUpload: false,
  },
  ios: {
    kind: 'xcode-archive',
    extension: 'xcarchive',
    storeUpload: true,
  },
}

const nativeBridgeContracts = {
  StorageAdapter: ['list', 'load', 'save', 'delete', 'clear'],
  PhotoAdapter: ['pick', 'sanitize'],
  RuntimeAdapter: ['health', 'prepare', 'stageAsset', 'clearStagedAssets', 'generate', 'rewrite', 'cancel'],
  ExportAdapter: ['writeMemoir', 'writeHtml', 'writePdf', 'share'],
  MemoirRuntime: ['health', 'prepare', 'stageAsset', 'clearStagedAssets', 'generateMemoir', 'rewrite', 'cancelGeneration'],
  MemoirFiles: ['shareFile', 'shareFiles'],
}

const qwen35Q5Runtime = {
  modelId: 'qwen3.5-0.8b-q5_K_M',
  runtimeId: 'embedded-llama',
  quantization: 'Q5_K_M',
  modelFileName: 'Qwen_Qwen3.5-0.8B-Q5_K_M.gguf',
  modelSource: 'https://huggingface.co/bartowski/Qwen_Qwen3.5-0.8B-GGUF/resolve/6f447fc6494c4b0f7dc269f8c39da6c61555a0de/Qwen_Qwen3.5-0.8B-Q5_K_M.gguf',
  modelSha256: '1214AFEBFE07D894E550505E3DAB6E913953A3FB123EA425D7D7731962479FCA',
  modelSizeBytes: 625860768,
  contextSize: 4096,
  maxTokens: 768,
  minimumMemoryClass: '8gb-ram',
}

const mobileRuntimeManifests = {
  android: {
    ...qwen35Q5Runtime,
    contextSize: 2048,
    maxTokens: 392,
    minimumMemoryClass: '4gb-ram',
    deliveryMode: 'direct-apk-assets',
  },
  ios: {
    ...qwen35Q5Runtime,
    deliveryMode: 'bundled-app-resource',
  },
}

export { mobileRuntimeManifests, nativeBridgeContracts, releaseArtifacts }
