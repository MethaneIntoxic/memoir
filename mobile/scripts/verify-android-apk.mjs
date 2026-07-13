import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..', '..')
const argumentsByName = new Map()
for (let index = 2; index < process.argv.length; index += 2) {
  argumentsByName.set(process.argv[index], process.argv[index + 1])
}

const apkPath = path.resolve(repositoryRoot, argumentsByName.get('--apk') || 'mobile/android/app/build/outputs/apk/debug/app-debug.apk')
const expectedAbi = argumentsByName.get('--abi') || 'arm64-v8a'
const expectedPackage = 'local.memoir.mobile'
const expectedModelEntry = 'assets/memoir-models/Qwen_Qwen3.5-0.8B-Q5_K_M.gguf'
const forbiddenPermissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
]

function resolveBuildTool(name) {
  const executable = process.platform === 'win32' ? `${name}.exe` : name
  const sdkRoots = [
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    path.join(repositoryRoot, 'output', 'toolchains', 'android-sdk'),
  ].filter(Boolean)

  for (const sdkRoot of sdkRoots) {
    const candidate = path.join(sdkRoot, 'build-tools', '35.0.0', executable)
    if (existsSync(candidate)) {
      return candidate
    }
  }
  throw new Error(`Android build tool ${executable} was not found in build-tools 35.0.0.`)
}

function run(executable, args) {
  return execFileSync(executable, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
}

function resolveApkSignerJar() {
  const aaptPath = resolveBuildTool('aapt')
  const jarPath = path.join(path.dirname(aaptPath), 'lib', 'apksigner.jar')
  if (!existsSync(jarPath)) {
    throw new Error('Android apksigner.jar was not found in build-tools 35.0.0.')
  }
  return jarPath
}

function resolveJava() {
  if (process.env.JAVA_HOME) {
    const executable = path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
    if (existsSync(executable)) {
      return executable
    }
  }
  return process.platform === 'win32' ? 'java.exe' : 'java'
}

if (!existsSync(apkPath)) {
  throw new Error(`Android APK not found: ${apkPath}`)
}
if (!['arm64-v8a', 'x86_64'].includes(expectedAbi)) {
  throw new Error(`Unsupported expected ABI: ${expectedAbi}`)
}

const aapt = resolveBuildTool('aapt')
const apksignerJar = resolveApkSignerJar()
const permissions = run(aapt, ['dump', 'permissions', apkPath])
const entries = run(aapt, ['list', apkPath]).split(/\r?\n/).filter(Boolean)

if (!permissions.includes(`package: ${expectedPackage}`)) {
  throw new Error(`APK package is not ${expectedPackage}.`)
}
for (const permission of forbiddenPermissions) {
  if (permissions.includes(permission)) {
    throw new Error(`Offline-only APK declares forbidden permission ${permission}.`)
  }
}

const modelEntries = entries.filter((entry) => entry.startsWith('assets/memoir-models/'))
if (modelEntries.length !== 1 || modelEntries[0] !== expectedModelEntry) {
  throw new Error(`APK model allowlist mismatch: ${modelEntries.join(', ') || 'none'}`)
}
if (entries.some((entry) => /mmproj/i.test(entry))) {
  throw new Error('APK unexpectedly contains a projector model.')
}

const packagedAbis = [...new Set(entries.flatMap((entry) => {
  const match = entry.match(/^lib\/([^/]+)\//)
  return match ? [match[1]] : []
}))]
if (packagedAbis.length !== 1 || packagedAbis[0] !== expectedAbi) {
  throw new Error(`APK ABI allowlist mismatch: ${packagedAbis.join(', ') || 'none'}`)
}
if (!entries.includes(`lib/${expectedAbi}/libmemoirllama.so`)) {
  throw new Error(`APK is missing lib/${expectedAbi}/libmemoirllama.so.`)
}
if (entries.some((entry) => /libc\+\+_shared\.so$/i.test(entry))) {
  throw new Error('APK unexpectedly depends on libc++_shared.so.')
}

run(resolveJava(), ['-jar', apksignerJar, 'verify', '--verbose', apkPath])
const sha256 = createHash('sha256').update(readFileSync(apkPath)).digest('hex').toUpperCase()
console.log(JSON.stringify({
  ok: true,
  apk: path.relative(repositoryRoot, apkPath).replaceAll(path.sep, '/'),
  package: expectedPackage,
  abi: expectedAbi,
  model: expectedModelEntry,
  forbiddenPermissionsAbsent: forbiddenPermissions,
  sha256,
}, null, 2))
