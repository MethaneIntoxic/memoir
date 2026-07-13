param(
    [string]$Serial = '',
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$mobileRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = Split-Path -Parent $mobileRoot
$toolchainsRoot = Join-Path $repositoryRoot 'output\toolchains'
$androidSdkRoot = Join-Path $toolchainsRoot 'android-sdk'
$apkPath = Join-Path $mobileRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
$evidenceRoot = Join-Path $repositoryRoot 'output\android-device-acceptance'
$packageName = 'local.memoir.mobile'
$testClass = 'local.memoir.mobile.AndroidRuntimeInferenceSmokeTest'
$minimumMemoryKiB = 7000000
$minimumDataFreeKiB = 2000000

$javaExecutable = Get-ChildItem -Path (Join-Path $toolchainsRoot 'jdk-21') -Recurse -Filter java.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\bin\\java\.exe$' } |
    Select-Object -First 1
if (-not $javaExecutable) {
    throw 'Repository-local JDK 21 is missing. Run npm run bootstrap:android -- -AcceptAndroidSdkLicenses.'
}

$adb = Join-Path $androidSdkRoot 'platform-tools\adb.exe'
if (-not (Test-Path -LiteralPath $adb)) {
    throw 'Repository-local adb is missing. Run npm run bootstrap:android -- -AcceptAndroidSdkLicenses.'
}

$env:JAVA_HOME = $javaExecutable.Directory.Parent.FullName
$env:ANDROID_HOME = $androidSdkRoot
$env:ANDROID_SDK_ROOT = $androidSdkRoot
$env:Path = "$env:JAVA_HOME\bin;$androidSdkRoot\platform-tools;$env:Path"

function Invoke-Adb {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    $output = & $adb @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "adb failed: $($Arguments -join ' ')`n$($output -join "`n")"
    }
    return $output
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
    throw "Memoir requires an 8 GB RAM-class device; usable memory is $memoryKiB KiB."
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

if (-not $SkipBuild) {
    Push-Location $mobileRoot
    try {
        & npm.cmd run build:android:debug
        if ($LASTEXITCODE -ne 0) { throw 'Android debug build failed.' }
    } finally {
        Pop-Location
    }
}
if (-not (Test-Path -LiteralPath $apkPath)) {
    throw "Debug APK not found: $apkPath"
}

& node (Join-Path $PSScriptRoot 'verify-android-apk.mjs') --apk $apkPath --abi arm64-v8a |
    Tee-Object -FilePath (Join-Path $evidenceRoot 'apk-verification.json')
if ($LASTEXITCODE -ne 0) { throw 'Android APK verification failed.' }

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

    Push-Location (Join-Path $mobileRoot 'android')
    try {
        & .\gradlew.bat :app:connectedDebugAndroidTest "-Pandroid.testInstrumentationRunnerArguments.class=$testClass" --stacktrace
        if ($LASTEXITCODE -ne 0) { throw 'Physical-device native inference instrumentation failed.' }
    } finally {
        Pop-Location
    }

    Invoke-Adb -s $Serial shell dumpsys meminfo $packageName |
        Set-Content -LiteralPath (Join-Path $evidenceRoot 'meminfo.txt')
    [ordered]@{
        ok = $true
        serial = $Serial
        abi = $abi
        apiLevel = $apiLevel
        memoryKiB = $memoryKiB
        dataFreeKiB = $dataFreeKiB
        airplaneMode = $true
        testClass = $testClass
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $evidenceRoot 'result.json')
    Write-Output "Android physical-device native inference acceptance passed. Evidence: $evidenceRoot"
} finally {
    & $adb -s $Serial logcat -d | Set-Content -LiteralPath (Join-Path $evidenceRoot 'logcat.txt')
    Remove-Item Env:ANDROID_SERIAL -ErrorAction SilentlyContinue
}
