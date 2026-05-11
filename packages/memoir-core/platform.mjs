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

export { nativeBridgeContracts, releaseArtifacts }
