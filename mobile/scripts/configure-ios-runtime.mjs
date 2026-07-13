import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const packagePath = fileURLToPath(new URL('../ios/App/CapApp-SPM/Package.swift', import.meta.url))

const packageSource = `// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "CapApp-SPM", targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.3.3")
    ],
    targets: [
        .binaryTarget(
            name: "llama",
            url: "https://github.com/ggml-org/llama.cpp/releases/download/b8931/llama-b8931-xcframework.zip",
            checksum: "1c70dd0c300115d1accb2c70d008d28d29022be7e86235dbce68b0c9478f5dbb"
        ),
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                "llama"
            ]
        )
    ]
)
`

const current = await readFile(packagePath, 'utf8').catch(() => '')
if (current !== packageSource) {
  await writeFile(packagePath, packageSource, 'utf8')
}

console.log('Memoir iOS runtime package configured')
