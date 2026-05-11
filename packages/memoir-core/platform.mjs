const releaseArtifacts = {
  web: {
    kind: 'static-hosting-bundle',
    extension: 'zip',
    storeUpload: false,
  },
  windows: {
    kind: 'portable-or-installer-exe',
    extension: 'exe',
    storeUpload: false,
  },
  android: {
    kind: 'android-app-bundle',
    extension: 'aab',
    storeUpload: true,
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
  RuntimeAdapter: ['health', 'generate', 'rewrite', 'cancel'],
  ExportAdapter: ['writeMemoir', 'writeHtml', 'writePdf', 'share'],
}

const qwen35Q5Runtime = {
  modelId: 'qwen3.5-0.8b-q5_K_M',
  runtimeId: 'embedded-llama',
  quantization: 'Q5_K_M',
  modelFileName: 'Qwen_Qwen3.5-0.8B-Q5_K_M.gguf',
  modelSha256: '1214AFEBFE07D894E550505E3DAB6E913953A3FB123EA425D7D7731962479FCA',
  modelSizeBytes: 625860768,
  mmprojFileName: 'mmproj-Qwen_Qwen3.5-0.8B-f16.gguf',
  mmprojSha256: '1DC1351C82E41B48EDB55FD6DDFA7CA60FB5A16B3D5ABF3CE7054880DD022847',
  mmprojSizeBytes: 204987104,
  contextSize: 8192,
  maxTokens: 768,
  minimumMemoryClass: '8gb-ram',
}

const mobileRuntimeManifests = {
  android: {
    ...qwen35Q5Runtime,
    deliveryMode: 'play-asset-delivery',
  },
  ios: {
    ...qwen35Q5Runtime,
    deliveryMode: 'deferred-ios-archive',
  },
}

export { mobileRuntimeManifests, nativeBridgeContracts, releaseArtifacts }
