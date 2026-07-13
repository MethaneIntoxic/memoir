# Security and Privacy

## Runtime boundary

- Browser development may send sanitized photos/text to the user-configured local API. A non-local URL expands the trust boundary and is not the supported private default.
- Packaged Electron uses a loopback-only embedded runtime.
- Android/iOS inference is native and fail-closed. Mobile never falls through to HTTP.
- Android’s final merged APK is verified to contain neither `INTERNET` nor `ACCESS_NETWORK_STATE`.

## Photo and prompt handling

- The renderer bounds source bytes, decoded pixels, dimensions, image count, and total payload, then re-encodes working copies.
- Mobile native staging accepts only bounded JPEG/PNG/WebP with matching magic bytes.
- ML Kit/Vision generates bounded labels for at most five photos. Native code deletes staged bytes and places only labels plus ordered story data in the text prompt.
- User notes/music/text are treated as quoted data. Model output cannot select paths, URLs, native actions, or share targets.

## Model handling

- Mobile assets are pinned by immutable source revision, exact size, and SHA-256.
- Android copies through a flushed `.part` file, verifies, and activates atomically in app-private storage. Prepare-time rehash repairs same-size corruption.
- iOS verifies the protected bundled resource and excludes local data from backup where configured.
- Both platforms reject unsupported memory class before inference; Android also rejects insufficient copy storage.

## Archive and export

- Saved memoirs live in IndexedDB/WebView app data. This is local but not encrypted-at-rest vault storage.
- Archive clearing removes the app’s records but is not a forensic secure erase of OS/browser caches or prior exports.
- Export filenames, MIME types, decoded sizes, and canonical destinations are allowlisted. Native exports are written only to bounded app-private temporary directories and shared through scoped platform mechanisms.
- Exported files leave the app-private boundary and become user-managed.

## Input/output hardening

- Portable archive import enforces safe paths, entry counts/sizes, image MIME/magic/pixels, string bounds, and schema validity.
- HTML rendering escapes authored/model text and uses a restrictive preview context.
- Native bridge methods validate job ids, asset ids, tones, strings, model state, and counts before work.
- Diagnostics/smokes avoid raw photos, prompts, generated memoir text, private paths, or native exception detail.

## Claims not made

- No cloud backup, multi-user boundary, secure enclave media vault, forensic deletion, or protection from a compromised/unlocked device.
- No broad mobile privacy/release claim until physical offline traffic evidence and final iOS privacy/compliance review exist.
