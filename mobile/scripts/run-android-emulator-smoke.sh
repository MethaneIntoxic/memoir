#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
android_root="$repo_root/mobile/android"
evidence_root="$repo_root/output"
apk_path="$android_root/app/build/outputs/apk/debug/app-debug.apk"
apk_entries="$evidence_root/android-emulator-apk-entries.txt"

mkdir -p "$evidence_root"

capture_logcat() {
  adb logcat -d > "$evidence_root/android-emulator-logcat.txt" 2>&1 || true
}
trap capture_logcat EXIT

cd "$android_root"
./gradlew :app:assembleDebug -PmemoirEmulatorSmoke=true --stacktrace

node "$repo_root/mobile/scripts/verify-android-apk.mjs" --apk "$apk_path" --abi x86_64

zipinfo -1 "$apk_path" > "$apk_entries"
grep -Fxq 'lib/x86_64/libmemoirllama.so' "$apk_entries"
if grep -q '^lib/arm64-v8a/' "$apk_entries"; then
  echo 'The emulator smoke APK unexpectedly contains arm64-v8a libraries.' >&2
  exit 1
fi
sha256sum "$apk_path" > "$evidence_root/android-emulator-apk-sha256.txt"

./gradlew :app:connectedDebugAndroidTest \
  -PmemoirEmulatorSmoke=true \
  -Pandroid.testInstrumentationRunnerArguments.class=local.memoir.mobile.AndroidRuntimeInferenceSmokeTest \
  --stacktrace
