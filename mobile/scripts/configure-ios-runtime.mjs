import { execFile } from 'node:child_process'
import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const packagePath = fileURLToPath(new URL('../ios/App/CapApp-SPM/Package.swift', import.meta.url))
const brandIconPath = fileURLToPath(new URL('../../app/public/icons/memoir-icon-1024.png', import.meta.url))
const iosAppIconPath = fileURLToPath(
  new URL('../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', import.meta.url),
)
const iosBrandingPaths = [
  iosAppIconPath,
  new URL('../ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png', import.meta.url),
  new URL('../ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png', import.meta.url),
  new URL('../ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png', import.meta.url),
].map(fileURLToPath)

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

const brandIcon = await readFile(brandIconPath)
for (const targetPath of iosBrandingPaths) {
  const currentIcon = await readFile(targetPath).catch(() => null)
  if (!currentIcon?.equals(brandIcon)) {
    await copyFile(brandIconPath, targetPath)
  }
}

if (process.platform === 'darwin') {
  await execFileAsync('sips', ['--resampleHeightWidth', '1024', '1024', iosAppIconPath])
  const { stdout } = await execFileAsync('sips', ['--getProperty', 'pixelWidth', '--getProperty', 'pixelHeight', iosAppIconPath])
  if (!/pixelWidth:\s*1024/.test(stdout) || !/pixelHeight:\s*1024/.test(stdout)) {
    throw new Error('Memoir iOS app icon must be exactly 1024x1024 after configuration')
  }
}

console.log('Memoir iOS runtime package and branding configured')
