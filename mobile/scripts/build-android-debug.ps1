$ErrorActionPreference = 'Stop'

$mobileRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = Split-Path -Parent $mobileRoot
$toolchainsRoot = Join-Path $repositoryRoot 'output\toolchains'
$androidSdkRoot = Join-Path $toolchainsRoot 'android-sdk'
$javaExecutable = Get-ChildItem -Path (Join-Path $toolchainsRoot 'jdk-21') -Recurse -Filter java.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\bin\\java\.exe$' } |
    Select-Object -First 1

if (-not $javaExecutable -or -not (Test-Path -LiteralPath (Join-Path $androidSdkRoot 'platforms\android-36\android.jar'))) {
    throw 'Android toolchain is incomplete. Run npm run bootstrap:android -- -AcceptAndroidSdkLicenses after reviewing the Android SDK licenses.'
}

$env:JAVA_HOME = $javaExecutable.Directory.Parent.FullName
$env:ANDROID_HOME = $androidSdkRoot
$env:ANDROID_SDK_ROOT = $androidSdkRoot
$env:Path = "$env:JAVA_HOME\bin;$androidSdkRoot\platform-tools;$env:Path"

Push-Location $mobileRoot
try {
    & npm.cmd run cap:sync
    if ($LASTEXITCODE -ne 0) {
        throw 'Capacitor synchronization failed.'
    }

    Push-Location (Join-Path $mobileRoot 'android')
    try {
        & .\gradlew.bat :app:assembleDebug
        if ($LASTEXITCODE -ne 0) {
            throw 'Android debug build failed.'
        }
    } finally {
        Pop-Location
    }

    & node (Join-Path $PSScriptRoot 'verify-android-apk.mjs') `
        --apk (Join-Path $mobileRoot 'android\app\build\outputs\apk\debug\app-debug.apk') `
        --abi arm64-v8a
    if ($LASTEXITCODE -ne 0) {
        throw 'Android debug APK verification failed.'
    }
} finally {
    Pop-Location
}
