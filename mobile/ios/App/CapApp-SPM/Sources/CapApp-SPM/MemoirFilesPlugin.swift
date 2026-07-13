import Capacitor
import Foundation
import UIKit

private struct MemoirShareFileRequest: Codable {
    let name: String
    let mimeType: String
    let base64Data: String
}

@objc(MemoirFilesPlugin)
public final class MemoirFilesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MemoirFilesPlugin"
    public let jsName = "MemoirFiles"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareFile", returnType: CAPPluginReturnPromise)
    ]

    private let maximumBase64Characters = 64 * 1024 * 1024
    private let maximumFileBytes = 48 * 1024 * 1024
    private let allowedMIMETypes: Set<String> = [
        "text/html",
        "application/json",
        "application/zip",
        "application/vnd.memoir+zip"
    ]

    @objc public func shareFile(_ call: CAPPluginCall) {
        let request: MemoirShareFileRequest
        do {
            request = try call.decode(MemoirShareFileRequest.self)
        } catch {
            call.reject("native-export-invalid-request")
            return
        }

        let validName = request.name.range(
            of: #"^[A-Za-z0-9][A-Za-z0-9._ -]{0,119}$"#,
            options: .regularExpression
        ) != nil && !request.name.contains("..")
        guard validName else {
            call.reject("native-export-invalid-name")
            return
        }
        guard allowedMIMETypes.contains(request.mimeType.lowercased()) else {
            call.reject("native-export-invalid-mime")
            return
        }
        guard request.base64Data.count <= maximumBase64Characters,
              let data = Data(base64Encoded: request.base64Data),
              !data.isEmpty,
              data.count <= maximumFileBytes else {
            call.reject("native-export-file-too-large")
            return
        }

        do {
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent("memoir-exports", isDirectory: true)
            try? FileManager.default.removeItem(at: directory)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let target = directory.appendingPathComponent(request.name, isDirectory: false)
            guard target.deletingLastPathComponent().standardizedFileURL == directory.standardizedFileURL else {
                throw NSError(domain: "MemoirFiles", code: 1, userInfo: [
                    NSLocalizedDescriptionKey: "native-export-invalid-name"
                ])
            }
            try data.write(to: target, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            var protectedTarget = target
            try protectedTarget.setResourceValues(values)

            DispatchQueue.main.async { [weak self] in
                guard let presenter = self?.bridge?.viewController else {
                    call.reject("native-export-share-unavailable")
                    return
                }
                let share = UIActivityViewController(activityItems: [target], applicationActivities: nil)
                if let popover = share.popoverPresentationController {
                    popover.sourceView = presenter.view
                    popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
                }
                presenter.present(share, animated: true) {
                    call.resolve(["shared": true, "name": request.name])
                }
            }
        } catch {
            let message = (error as NSError).localizedDescription
            call.reject(message.hasPrefix("native-export-") ? message : "native-export-write-failed")
        }
    }
}
