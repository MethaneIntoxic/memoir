param(
    [switch]$AcceptAndroidSdkLicenses
)

$ErrorActionPreference = 'Stop'

$mobileRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = Split-Path -Parent $mobileRoot
$toolchainsRoot = Join-Path $repositoryRoot 'output\toolchains'
$jdkRoot = Join-Path $toolchainsRoot 'jdk-21'
$androidSdkRoot = Join-Path $toolchainsRoot 'android-sdk'
$downloadsRoot = Join-Path $toolchainsRoot 'downloads'
$jdkArchive = Join-Path $downloadsRoot 'microsoft-jdk-21-windows-x64.zip'
$commandLineToolsArchive = Join-Path $downloadsRoot 'commandlinetools-win-14742923_latest.zip'

New-Item -ItemType Directory -Force -Path $downloadsRoot, $jdkRoot, $androidSdkRoot | Out-Null

function Invoke-VerifiedDownload {
    param(
        [Parameter(Mandatory)] [string]$Uri,
        [Parameter(Mandatory)] [string]$Destination
    )

    if (Test-Path -LiteralPath $Destination) {
        return
    }

    $temporary = "$Destination.part"
    Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
    & curl.exe -L --fail --retry 3 --output $temporary $Uri
    if ($LASTEXITCODE -ne 0) {
        throw "Download failed: $Uri"
    }
    Move-Item -LiteralPath $temporary -Destination $Destination
}

$javaExecutable = Get-ChildItem -Path $jdkRoot -Recurse -Filter java.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\bin\\java\.exe$' } |
    Select-Object -First 1

if (-not $javaExecutable) {
    Invoke-VerifiedDownload `
        -Uri 'https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip' `
        -Destination $jdkArchive
    Expand-Archive -LiteralPath $jdkArchive -DestinationPath $jdkRoot -Force
    $javaExecutable = Get-ChildItem -Path $jdkRoot -Recurse -Filter java.exe |
        Where-Object { $_.FullName -match '\\bin\\java\.exe$' } |
        Select-Object -First 1
}

if (-not $javaExecutable) {
    throw 'Portable JDK installation did not produce bin\java.exe.'
}

$env:JAVA_HOME = $javaExecutable.Directory.Parent.FullName
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

$sdkManager = Join-Path $androidSdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
if (-not (Test-Path -LiteralPath $sdkManager)) {
    Invoke-VerifiedDownload `
        -Uri 'https://dl.google.com/android/repository/commandlinetools-win-14742923_latest.zip' `
        -Destination $commandLineToolsArchive

    $extractionRoot = Join-Path $androidSdkRoot 'cmdline-tools-extracted'
    Remove-Item -LiteralPath $extractionRoot -Recurse -Force -ErrorAction SilentlyContinue
    Expand-Archive -LiteralPath $commandLineToolsArchive -DestinationPath $extractionRoot -Force
    $latestRoot = Join-Path $androidSdkRoot 'cmdline-tools\latest'
    Remove-Item -LiteralPath $latestRoot -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $latestRoot) | Out-Null
    Move-Item -LiteralPath (Join-Path $extractionRoot 'cmdline-tools') -Destination $latestRoot
    Remove-Item -LiteralPath $extractionRoot -Recurse -Force
}

if (-not $AcceptAndroidSdkLicenses) {
    Write-Host 'The portable JDK and Android command-line tools are ready.'
    Write-Host 'Android SDK packages require accepting the Google Android SDK licenses.'
    Write-Host 'After reviewing those licenses, run:'
    Write-Host '  npm run bootstrap:android -- -AcceptAndroidSdkLicenses'
    exit 2
}

$env:ANDROID_HOME = $androidSdkRoot
$env:ANDROID_SDK_ROOT = $androidSdkRoot
$sdkManagerJar = Join-Path $androidSdkRoot 'cmdline-tools\latest\lib\sdkmanager-classpath.jar'
if (-not (Test-Path -LiteralPath $sdkManagerJar)) {
    throw 'Android SDK command-line tools are missing sdkmanager-classpath.jar.'
}

$sdkManagerMainClass = 'com.android.sdklib.tool.sdkmanager.SdkManagerCli'
$sdkManagerJavaArgs = @(
    "-Dcom.android.sdklib.toolsdir=$(Split-Path -Parent (Split-Path -Parent $sdkManager))",
    '-classpath',
    $sdkManagerJar,
    $sdkManagerMainClass
)

function Invoke-SdkManagerCli {
    param(
        [Parameter(Mandatory)] [string[]]$Arguments,
        [switch]$AcceptLicenses
    )

    $allArguments = @($sdkManagerJavaArgs) + $Arguments
    $quotedArguments = $allArguments | ForEach-Object {
        '"' + ($_ -replace '"', '\"') + '"'
    }

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $javaExecutable.FullName
    $startInfo.Arguments = $quotedArguments -join ' '
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardInput = $AcceptLicenses
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    if (-not $process.Start()) {
        throw 'Failed to start Android SDK manager.'
    }

    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    if ($AcceptLicenses) {
        $answers = ((1..100 | ForEach-Object { 'y' }) -join "`r`n") + "`r`n"
        $process.StandardInput.Write($answers)
        $process.StandardInput.Close()
    }

    $process.WaitForExit()
    $stdout = $stdoutTask.Result
    $stderr = $stderrTask.Result
    $combinedOutput = @($stdout, $stderr) -join "`n"
    $combinedOutput.TrimEnd() -split "`r?`n" | ForEach-Object { Write-Host $_ }

    return [PSCustomObject]@{
        ExitCode = $process.ExitCode
        Output = $combinedOutput
    }
}

# sdkmanager.bat and the native PowerShell pipeline can both consume redirected
# input on Windows. The explicit process stream above delivers answers directly
# to SdkManagerCli and captures output so skipped packages cannot look successful.
$licenseResult = Invoke-SdkManagerCli `
    -Arguments @("--sdk_root=$androidSdkRoot", '--licenses') `
    -AcceptLicenses
if ($licenseResult.ExitCode -ne 0 -or $licenseResult.Output -match 'licenses? not accepted|Skipping following packages') {
    throw 'Android SDK license acceptance did not complete.'
}

$installResult = Invoke-SdkManagerCli -Arguments @(
    "--sdk_root=$androidSdkRoot",
    'platform-tools',
    'platforms;android-36',
    'build-tools;35.0.0',
    'cmake;3.22.1',
    'ndk;27.0.12077973'
)
if ($installResult.ExitCode -ne 0 -or $installResult.Output -match 'license is not accepted|Skipping following packages') {
    throw 'Android SDK package installation failed.'
}

$requiredToolPaths = @(
    (Join-Path $androidSdkRoot 'platform-tools\adb.exe'),
    (Join-Path $androidSdkRoot 'platforms\android-36\android.jar'),
    (Join-Path $androidSdkRoot 'build-tools\35.0.0\aapt2.exe'),
    (Join-Path $androidSdkRoot 'cmake\3.22.1\bin\cmake.exe'),
    (Join-Path $androidSdkRoot 'ndk\27.0.12077973\source.properties')
)
$missingToolPaths = $requiredToolPaths | Where-Object { -not (Test-Path -LiteralPath $_) }
if ($missingToolPaths) {
    throw "Android SDK package installation was incomplete. Missing: $($missingToolPaths -join ', ')"
}

$sdkPropertyPath = $androidSdkRoot.Replace('\', '/').Replace(':', '\:')
$localProperties = Join-Path $mobileRoot 'android\local.properties'
Set-Content -LiteralPath $localProperties -Encoding ascii -Value "sdk.dir=$sdkPropertyPath"

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_HOME=$androidSdkRoot"
Write-Host 'Android toolchain bootstrap complete.'
