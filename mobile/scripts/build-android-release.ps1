$ErrorActionPreference = 'Stop'

$mobileRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = Split-Path -Parent $mobileRoot
$toolchainsRoot = Join-Path $repositoryRoot 'output\toolchains'
$androidSdkRoot = Join-Path $toolchainsRoot 'android-sdk'
$requiredSigningVariables = @(
    'MEMOIR_ANDROID_KEYSTORE',
    'MEMOIR_ANDROID_KEYSTORE_PASSWORD',
    'MEMOIR_ANDROID_KEY_ALIAS',
    'MEMOIR_ANDROID_KEY_PASSWORD'
)
$missingSigningVariables = @($requiredSigningVariables | Where-Object {
    [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_))
})

if ($missingSigningVariables.Count -gt 0) {
    throw "Memoir release signing is not configured. Missing: $($missingSigningVariables -join ', ')."
}
if (-not (Test-Path -LiteralPath $env:MEMOIR_ANDROID_KEYSTORE -PathType Leaf)) {
    throw 'MEMOIR_ANDROID_KEYSTORE must point to an existing keystore file.'
}

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
$env:GRADLE_OPTS = '-Dorg.gradle.workers.max=2 -Dorg.gradle.parallel=false'
$env:CMAKE_BUILD_PARALLEL_LEVEL = '2'
$releaseApk = Join-Path $mobileRoot 'android\app\build\outputs\apk\release\app-release.apk'

Push-Location $mobileRoot
try {
    & npm.cmd run cap:sync
    if ($LASTEXITCODE -ne 0) {
        throw 'Capacitor synchronization failed.'
    }

    Push-Location (Join-Path $mobileRoot 'android')
    try {
        & .\gradlew.bat :app:assembleRelease --no-daemon --max-workers=2
        if ($LASTEXITCODE -ne 0) {
            throw 'Android release build failed.'
        }
    } finally {
        Pop-Location
    }

    & node (Join-Path $PSScriptRoot 'verify-android-apk.mjs') `
        --apk $releaseApk `
        --abi arm64-v8a `
        --build-type release
    if ($LASTEXITCODE -ne 0) {
        throw 'Android release APK verification failed.'
    }

    $metadataPath = Join-Path $mobileRoot 'android\app\build\outputs\apk\release\output-metadata.json'
    $buildMetadata = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
    $versionName = [string]$buildMetadata.elements[0].versionName
    $distributionDirectory = Join-Path $repositoryRoot 'output\releases\android'
    $distributionApk = Join-Path $distributionDirectory "Memoir-$versionName-android-arm64.apk"
    $distributionMetadata = Join-Path $distributionDirectory "Memoir-$versionName-android-arm64.json"
    New-Item -ItemType Directory -Path $distributionDirectory -Force | Out-Null
    Copy-Item -LiteralPath $releaseApk -Destination $distributionApk -Force

    $artifact = Get-Item -LiteralPath $distributionApk
    $artifactHash = (Get-FileHash -LiteralPath $distributionApk -Algorithm SHA256).Hash
    $distributionJson = [ordered]@{
        ok = $true
        artifact = $artifact.FullName
        bytes = $artifact.Length
        sha256 = $artifactHash
        package = 'local.memoir.mobile'
        versionName = $versionName
        abi = 'arm64-v8a'
        buildType = 'release'
        builtAtUtc = [DateTime]::UtcNow.ToString('o')
    } | ConvertTo-Json
    [IO.File]::WriteAllText($distributionMetadata, $distributionJson, [Text.UTF8Encoding]::new($false))

    Write-Host "Signed Android release: $distributionApk"
    Write-Host "SHA256: $artifactHash"
} finally {
    Pop-Location
}
