import UIKit
import Capacitor

#if MEMOIR_CI_INFERENCE_SMOKE
import CapApp_SPM
import Darwin
#endif

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        protectMemoirLocalData()
#if MEMOIR_CI_INFERENCE_SMOKE
        if ProcessInfo.processInfo.environment["MEMOIR_CI_INFERENCE_SMOKE"] == "1" {
            runCIInferenceSmoke()
        }
#endif
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
        protectMemoirLocalData()
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    private func protectMemoirLocalData() {
        let fileManager = FileManager.default
        let directories = [
            fileManager.urls(for: .libraryDirectory, in: .userDomainMask).first?.appendingPathComponent("WebKit", isDirectory: true),
            fileManager.urls(for: .libraryDirectory, in: .userDomainMask).first?.appendingPathComponent("WebsiteData", isDirectory: true),
            fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first,
        ].compactMap { $0 }

        for directory in directories where fileManager.fileExists(atPath: directory.path) {
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            var mutableDirectory = directory
            try? mutableDirectory.setResourceValues(values)
            try? fileManager.setAttributes(
                [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
                ofItemAtPath: directory.path
            )
        }
    }

#if MEMOIR_CI_INFERENCE_SMOKE
    private func runCIInferenceSmoke() {
        DispatchQueue.global(qos: .userInitiated).async {
            let started = DispatchTime.now().uptimeNanoseconds
            do {
                guard let modelURL = Bundle.main.url(
                    forResource: "Qwen_Qwen3.5-0.8B-Q5_K_M",
                    withExtension: "gguf"
                ) else {
                    throw CIInferenceSmokeError.modelMissing
                }
                let values = try modelURL.resourceValues(forKeys: [.fileSizeKey])
                guard values.fileSize == 625_860_768 else {
                    throw CIInferenceSmokeError.modelSizeMismatch
                }

                let engine = MemoirRuntimeEngine()
                let output = try engine.generate(
                    modelURL: modelURL,
                    prompt: "Return a short JSON object with an ok boolean.",
                    jobID: "ios-ci-inference-smoke",
                    maxTokens: 32
                )
                let outputBytes = output.trimmingCharacters(in: .whitespacesAndNewlines).utf8.count
                guard outputBytes > 0 else {
                    throw CIInferenceSmokeError.emptyOutput
                }

                let elapsedMS = (DispatchTime.now().uptimeNanoseconds - started) / 1_000_000
                emitCIInferenceSmokeLine(
                    "MEMOIR_IOS_INFERENCE_SMOKE_OK output_bytes=\(outputBytes) elapsed_ms=\(elapsedMS)"
                )
                Darwin.exit(EXIT_SUCCESS)
            } catch {
                let elapsedMS = (DispatchTime.now().uptimeNanoseconds - started) / 1_000_000
                emitCIInferenceSmokeLine(
                    "MEMOIR_IOS_INFERENCE_SMOKE_FAIL code=native-inference-failed elapsed_ms=\(elapsedMS)"
                )
                Darwin.exit(EXIT_FAILURE)
            }
        }
    }
#endif

}

#if MEMOIR_CI_INFERENCE_SMOKE
private enum CIInferenceSmokeError: Error {
    case modelMissing
    case modelSizeMismatch
    case emptyOutput
}

private func emitCIInferenceSmokeLine(_ line: String) {
    FileHandle.standardOutput.write(Data((line + "\n").utf8))
}
#endif
