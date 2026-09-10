param(
    [string]$Serial = '',
    [ValidateSet('Debug', 'Release')]
    [string]$BuildType = 'Debug',
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$mobileRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = Split-Path -Parent $mobileRoot
$toolchainsRoot = Join-Path $repositoryRoot 'output\toolchains'
$androidSdkRoot = Join-Path $toolchainsRoot 'android-sdk'
$buildTypeName = $BuildType.ToLowerInvariant()
$apkPath = if ($BuildType -eq 'Release') {
    Join-Path $mobileRoot 'android\app\build\outputs\apk\release\app-release.apk'
} else {
    Join-Path $mobileRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
}
$evidenceBase = if ($BuildType -eq 'Release') {
    Join-Path $repositoryRoot 'output\android-release-acceptance'
} else {
    Join-Path $repositoryRoot 'output\android-device-acceptance'
}
$runId = Get-Date -Format 'yyyyMMdd-HHmmss'
$evidenceRoot = Join-Path $evidenceBase $runId
$packageName = 'local.memoir.mobile'
$testPackageName = 'local.memoir.mobile.test'
$testClass = 'local.memoir.mobile.AndroidRuntimeInferenceSmokeTest'
$minimumMemoryKiB = 3500000
$minimumDataFreeKiB = 2000000

$javaExecutable = Get-ChildItem -Path (Join-Path $toolchainsRoot 'jdk-21') -Recurse -Filter java.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\bin\\java\.exe$' } |
    Select-Object -First 1
if (-not $javaExecutable) {
    throw 'Repository-local JDK 21 is missing. Run npm run bootstrap:android -- -AcceptAndroidSdkLicenses.'
}

$adb = Join-Path $androidSdkRoot 'platform-tools\adb.exe'
$apksignerJar = Join-Path $androidSdkRoot 'build-tools\35.0.0\lib\apksigner.jar'
if (-not (Test-Path -LiteralPath $adb)) {
    throw 'Repository-local adb is missing. Run npm run bootstrap:android -- -AcceptAndroidSdkLicenses.'
}
if (-not (Test-Path -LiteralPath $apksignerJar)) {
    throw 'Repository-local apksigner.jar is missing. Run npm run bootstrap:android -- -AcceptAndroidSdkLicenses.'
}

$env:JAVA_HOME = $javaExecutable.Directory.Parent.FullName
$env:ANDROID_HOME = $androidSdkRoot
$env:ANDROID_SDK_ROOT = $androidSdkRoot
$env:Path = "$env:JAVA_HOME\bin;$androidSdkRoot\platform-tools;$env:Path"
$env:GRADLE_OPTS = '-Dorg.gradle.workers.max=2 -Dorg.gradle.parallel=false'
$env:CMAKE_BUILD_PARALLEL_LEVEL = '2'

function Invoke-Adb {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    $output = & $adb @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "adb failed: $($Arguments -join ' ')`n$($output -join "`n")"
    }
    return $output
}

function Get-ApkSignerSha256 {
    param([string]$Path)
    $output = & $javaExecutable.FullName -jar $apksignerJar verify --print-certs $Path 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "APK certificate verification failed for $Path.`n$($output -join "`n")"
    }
    $text = $output -join "`n"
    if ($text -notmatch 'Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F]+)') {
        throw "APK signer digest was not reported for $Path."
    }
    return $Matches[1].ToUpperInvariant()
}

if ($BuildType -eq 'Release') {
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
        throw "Release acceptance requires signing configuration. Missing: $($missingSigningVariables -join ', ')."
    }
    if (-not (Test-Path -LiteralPath $env:MEMOIR_ANDROID_KEYSTORE -PathType Leaf)) {
        throw 'MEMOIR_ANDROID_KEYSTORE must point to an existing keystore file.'
    }
}

New-Item -ItemType Directory -Force -Path $evidenceRoot | Out-Null

$deviceLines = @(& $adb devices -l) |
    Select-Object -Skip 1 |
    Where-Object { $_ -match '\S+\s+device(?:\s|$)' }
if ($Serial) {
    $selected = $deviceLines | Where-Object { ($_ -split '\s+')[0] -eq $Serial }
    if (@($selected).Count -ne 1) {
        throw "Authorized Android device '$Serial' was not found."
    }
} else {
    if (@($deviceLines).Count -ne 1) {
        throw "Connect exactly one authorized physical Android device, or pass -Serial. Found $(@($deviceLines).Count)."
    }
    $Serial = ($deviceLines[0] -split '\s+')[0]
}

if ($Serial -like 'emulator-*' -or (Invoke-Adb -s $Serial shell getprop ro.kernel.qemu | Select-Object -First 1).Trim() -eq '1') {
    throw 'The physical-device acceptance runner refuses Android emulators.'
}

$abi = (Invoke-Adb -s $Serial shell getprop ro.product.cpu.abi | Select-Object -First 1).Trim()
if ($abi -ne 'arm64-v8a') {
    throw "Memoir requires an arm64-v8a device; connected device reports '$abi'."
}
$apiLevel = [int]((Invoke-Adb -s $Serial shell getprop ro.build.version.sdk | Select-Object -First 1).Trim())
if ($apiLevel -lt 24) {
    throw "Memoir requires Android API 24 or newer; connected device reports API $apiLevel."
}
$memInfo = Invoke-Adb -s $Serial shell cat /proc/meminfo
$memTotalLine = $memInfo | Where-Object { $_ -match '^MemTotal:' } | Select-Object -First 1
if (-not $memTotalLine -or $memTotalLine -notmatch '^MemTotal:\s+(\d+)\s+kB') {
    throw 'Could not read physical device memory.'
}
$memoryKiB = [int64]$Matches[1]
if ($memoryKiB -lt $minimumMemoryKiB) {
    throw "Memoir requires a 4 GB RAM-class device; usable memory is $memoryKiB KiB."
}
$dataDf = Invoke-Adb -s $Serial shell df -k /data
$dataLine = $dataDf | Select-Object -Last 1
$dataFields = @($dataLine -split '\s+' | Where-Object { $_ })
if ($dataFields.Count -lt 4) {
    throw 'Could not read free /data storage.'
}
$dataFreeKiB = [int64]$dataFields[3]
if ($dataFreeKiB -lt $minimumDataFreeKiB) {
    throw "Memoir needs at least $minimumDataFreeKiB KiB free under /data; device reports $dataFreeKiB KiB."
}
$airplaneMode = (Invoke-Adb -s $Serial shell settings get global airplane_mode_on | Select-Object -First 1).Trim()
if ($airplaneMode -ne '1') {
    throw 'Enable Airplane Mode and disable Wi-Fi before running acceptance. This script will not change device connectivity.'
}
$wifiState = (Invoke-Adb -s $Serial shell settings get global wifi_on | Select-Object -First 1).Trim()
if ($wifiState -ne '0') {
    throw 'Disable Wi-Fi before running acceptance. Airplane Mode alone is insufficient because Wi-Fi can be re-enabled separately.'
}

$deviceModel = (Invoke-Adb -s $Serial shell getprop ro.product.model | Select-Object -First 1).Trim()
$androidVersion = (Invoke-Adb -s $Serial shell getprop ro.build.version.release | Select-Object -First 1).Trim()
Invoke-Adb -s $Serial shell dumpsys thermalservice |
    Set-Content -LiteralPath (Join-Path $evidenceRoot 'thermal-before.txt')
Invoke-Adb -s $Serial shell dumpsys battery |
    Set-Content -LiteralPath (Join-Path $evidenceRoot 'battery-before.txt')

if (-not $SkipBuild) {
    Push-Location $mobileRoot
    try {
        if ($BuildType -eq 'Release') {
            & npm.cmd run build:android:apk
        } else {
            & npm.cmd run build:android:debug
        }
        if ($LASTEXITCODE -ne 0) { throw "Android $BuildType build failed." }
    } finally {
        Pop-Location
    }
}
if (-not (Test-Path -LiteralPath $apkPath)) {
    throw "$BuildType APK not found: $apkPath"
}

& node (Join-Path $PSScriptRoot 'verify-android-apk.mjs') `
    --apk $apkPath `
    --abi arm64-v8a `
    --build-type $buildTypeName |
    Tee-Object -FilePath (Join-Path $evidenceRoot 'apk-verification.json')
if ($LASTEXITCODE -ne 0) { throw 'Android APK verification failed.' }
$appSignerSha256 = Get-ApkSignerSha256 -Path $apkPath

$env:ANDROID_SERIAL = $Serial
Invoke-Adb -s $Serial logcat -c | Out-Null
try {
    Invoke-Adb -s $Serial install -r -t $apkPath |
        Tee-Object -FilePath (Join-Path $evidenceRoot 'install.txt')
    Invoke-Adb -s $Serial shell pm clear $packageName |
        Tee-Object -FilePath (Join-Path $evidenceRoot 'clear-data.txt')

    $packageDump = Invoke-Adb -s $Serial shell dumpsys package $packageName
    $packageDump | Set-Content -LiteralPath (Join-Path $evidenceRoot 'package.txt')
    if (($packageDump -join "`n") -match 'android\.permission\.(INTERNET|ACCESS_NETWORK_STATE)') {
        throw 'Installed package exposes a forbidden network permission.'
    }

    $inferenceTimer = [System.Diagnostics.Stopwatch]::StartNew()
    if ($BuildType -eq 'Release') {
        Push-Location (Join-Path $mobileRoot 'android')
        try {
            & .\gradlew.bat :app:assembleDebugAndroidTest --no-daemon --max-workers=2
            if ($LASTEXITCODE -ne 0) { throw 'Android instrumentation APK build failed.' }
        } finally {
            Pop-Location
        }

        $testApk = Join-Path $mobileRoot 'android\app\build\outputs\apk\androidTest\debug\app-debug-androidTest.apk'
        $signedTestApk = Join-Path $evidenceRoot 'memoir-release-acceptance-test.apk'
        if (-not (Test-Path -LiteralPath $testApk)) {
            throw "Android instrumentation APK not found: $testApk"
        }
        & $javaExecutable.FullName -jar $apksignerJar sign --ks $env:MEMOIR_ANDROID_KEYSTORE --ks-pass env:MEMOIR_ANDROID_KEYSTORE_PASSWORD --ks-key-alias $env:MEMOIR_ANDROID_KEY_ALIAS --key-pass env:MEMOIR_ANDROID_KEY_PASSWORD --out $signedTestApk $testApk
        if ($LASTEXITCODE -ne 0) { throw 'Signing the release acceptance test APK failed.' }
        $testSignerSha256 = Get-ApkSignerSha256 -Path $signedTestApk
        if ($testSignerSha256 -ne $appSignerSha256) {
            throw 'Release app and instrumentation APK signer certificates do not match.'
        }

        Invoke-Adb -s $Serial install -r -t $signedTestApk |
            Tee-Object -FilePath (Join-Path $evidenceRoot 'test-install.txt')
        $instrumentationOutput = Invoke-Adb -s $Serial shell am instrument -w -r -e class $testClass "$testPackageName/androidx.test.runner.AndroidJUnitRunner"
        $instrumentationOutput | Set-Content -LiteralPath (Join-Path $evidenceRoot 'instrumentation.txt')
        $instrumentationText = $instrumentationOutput -join "`n"
        if ($instrumentationText -notmatch 'OK \(\d+ test' -or $instrumentationText -notmatch 'INSTRUMENTATION_CODE:\s*-1') {
            throw "Release native inference instrumentation failed.`n$instrumentationText"
        }
    } else {
        Push-Location (Join-Path $mobileRoot 'android')
        try {
            & .\gradlew.bat :app:connectedDebugAndroidTest "-Pandroid.testInstrumentationRunnerArguments.class=$testClass" --stacktrace --no-daemon --max-workers=2 |
                Tee-Object -FilePath (Join-Path $evidenceRoot 'instrumentation.txt')
            if ($LASTEXITCODE -ne 0) { throw 'Physical-device native inference instrumentation failed.' }
        } finally {
            Pop-Location
        }
    }
    $inferenceTimer.Stop()

    Invoke-Adb -s $Serial shell dumpsys meminfo $packageName |
        Set-Content -LiteralPath (Join-Path $evidenceRoot 'meminfo.txt')
    Invoke-Adb -s $Serial shell dumpsys thermalservice |
        Set-Content -LiteralPath (Join-Path $evidenceRoot 'thermal-after.txt')
    Invoke-Adb -s $Serial shell dumpsys battery |
        Set-Content -LiteralPath (Join-Path $evidenceRoot 'battery-after.txt')

    $runtimeLog = Invoke-Adb -s $Serial logcat -d
    $runtimeLogText = $runtimeLog -join "`n"
    if ($runtimeLogText -match 'ANR in local\.memoir\.mobile|FATAL EXCEPTION[\s\S]{0,1000}local\.memoir\.mobile|OutOfMemoryError') {
        throw 'Android acceptance detected an ANR, app crash, or out-of-memory failure.'
    }
    if ($runtimeLogText -match 'data:image\/(png|jpeg|webp)|Android smoke day\. Friends spent') {
        throw 'Android acceptance detected raw photo data or private prompt text in logcat.'
    }

    $resultJson = [ordered]@{
        ok = $true
        buildType = $buildTypeName
        apkBytes = (Get-Item -LiteralPath $apkPath).Length
        apkSha256 = (Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash
        apkSignerSha256 = $appSignerSha256
        serial = $Serial
        deviceModel = $deviceModel
        androidVersion = $androidVersion
        abi = $abi
        apiLevel = $apiLevel
        memoryKiB = $memoryKiB
        dataFreeKiB = $dataFreeKiB
        airplaneMode = $true
        wifiDisabled = $true
        testClass = $testClass
        inferenceElapsedMs = $inferenceTimer.ElapsedMilliseconds
    } | ConvertTo-Json
    [IO.File]::WriteAllText(
        (Join-Path $evidenceRoot 'result.json'),
        $resultJson,
        [Text.UTF8Encoding]::new($false)
    )
    Write-Output "Android $BuildType physical-device native inference acceptance passed. Evidence: $evidenceRoot"
} finally {
    & $adb -s $Serial logcat -d | Set-Content -LiteralPath (Join-Path $evidenceRoot 'logcat.txt')
    if ($BuildType -eq 'Release') {
        & $adb -s $Serial uninstall $testPackageName 2>&1 | Out-Null
    }
    Remove-Item Env:ANDROID_SERIAL -ErrorAction SilentlyContinue
}
