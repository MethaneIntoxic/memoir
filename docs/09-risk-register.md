# Risk Register

| ID | Risk | Current control | Remaining gate |
|---|---|---|---|
| R1 | Archive loss after app/site data clearing | Explicit local-storage language and portable export | Encrypted durable storage/backup design |
| R2 | Privacy claims exceed implementation | Mobile fail-closed routing; Android final APK has no network permission; bounded local labels | Physical offline traffic evidence and final archive privacy report |
| R3 | Unsupported phone OOMs during preparation/inference | 8 GB-class runtime gate; bounded model/context/assets | Lowest-supported-device memory/thermal acceptance |
| R4 | Model asset is missing or corrupt | Pinned size/hash; atomic Android copy; prepare-time full verification | Corruption/recovery device exercise |
| R5 | Model output invents details or breaks order | Grounding prompts, schema validation, exact asset-order check | Wider fixture and usability review |
| R6 | Cancellation is slow during load or generation | Job ids, native per-token checks, staged-cache clearing | Physical cancel-latency measurement and recovery run |
| R7 | Export is mistaken for private storage | Export-boundary copy; portable schema/size validation | Native share/PDF device behavior and user education |
| R8 | Simulator evidence is mistaken for phone support | Separate physical acceptance document and release-readiness status | Signed ARM phone runs |
| R9 | Unsigned/stale artifacts are distributed | Fail-closed Android release signing; final-APK verifier | Signing, provenance, and clean-device release acceptance |
| R10 | Dependency or manifest drift adds network capability | Pinned native revisions/dependencies and merged APK permission verification | Keep verifier mandatory in every release lane |
| R11 | iOS submission toolchain is outdated | Unsigned arm64 build validates source/linkage | Xcode 26+ archive, validation, upload, TestFlight run |
| R12 | WebView persistence/export differs by platform | Shared contract tests and browser QA | Physical Android/iOS archive/import/export acceptance |

The highest current risks are hardware memory/thermal behavior, unvalidated mobile export/share, signing/provenance, and overstating simulator results. None should be hidden by a green source build.
