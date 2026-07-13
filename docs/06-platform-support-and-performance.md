# Platform Support and Performance

## Evidence-based support statement

| Platform | Implemented | Automated evidence | Remaining release gate |
|---|---|---|---|
| Browser development | Shared UI, archive, local HTTP generation/fallback, editing, export | Unit tests, production build, lint, Playwright QA | Broader browser matrix if publicly supported |
| Windows desktop | Electron shell, embedded llama runtime, portable EXE | Packaged layout, single-file, and real-model quality smokes | Code signing and clean-machine release acceptance |
| Android | Capacitor app, arm64 JNI llama inference, ML Kit photo context, verified private model | arm64 APK build/inspection and x86_64 emulator inference | Supported arm64 phone, offline public flow, performance/thermal, signed release |
| iOS | Capacitor app, Swift llama inference, Vision photo context, protected model/data | Simulator inference and unsigned arm64 Release build | Signed supported iPhone, offline public flow, performance/thermal, Xcode 26 archive/TestFlight |

Memoir is not “mobile release ready” until the physical gates in `docs/15-physical-device-acceptance.md` are recorded.

## Mobile constraints

- Android and iOS require an arm64 device in the 8 GB RAM class. Runtime preparation fails clearly on lower-memory devices.
- The bundled model is 625,860,768 bytes. Android also needs free app storage for its verified private copy; the device runner requires at least 2,000,000 KiB free under `/data` before installation/testing.
- Android production/debug packaging is arm64-only. x86_64 exists only behind the exact emulator-smoke Gradle property and cannot be used for a Release task.
- The first five sanitized photos receive on-device classifier labels. All selected photos remain ordered in the story contract.
- Native generation is CPU-only. Simulator/emulator timings are not representative of phone latency, thermals, or memory pressure.

## Client processing

- 3 to 10 photos per memoir.
- Mobile working copies are resized to a 960 px longest side and JPEG quality 0.68.
- Individual native staged images and decoded pixel counts are bounded before classification.
- Raw photo bytes are deleted from the native staging cache after labeling and are not inserted into the llama prompt.

## Storage and export

- The archive is IndexedDB in the active browser/WebView profile. Clearing app/site data removes it.
- Portable `.memoir` and HTML exports are deterministic and schema-validated.
- PDF still uses a browser print-oriented path, and mobile file/share behavior requires physical-device verification.
- Exported files are outside the app-private privacy boundary.

## Performance claims allowed today

- Real local generation works in packaged Windows, Android emulator, and iOS Simulator evidence paths.
- Android arm64 and iOS arm64 Release binaries compile with the pinned model/runtime.
- No claim is made yet for phone latency, supported-device breadth, thermal sustainability, peak memory, or background-resume completion.
