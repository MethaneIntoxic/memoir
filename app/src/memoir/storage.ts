import type { Memoir } from './types.ts'
import { normalizeApiBase, parseMemoirList } from './validation.ts'

const archiveKey = 'memoir.archive.v2'
const legacyArchiveKey = 'memoir.archive.v1'
const apiBaseKey = 'memoir.api-base.v2'
const legacyApiBaseKey = 'memoir.api-base.v1'
const archiveDatabaseName = 'memoir.client'
const archiveDatabaseVersion = 1
const archiveObjectStoreName = 'archive'
const archiveRecordKey = 'memoir.archive'

type ArchiveStoreV2 = {
  version: 2
  updatedAt: string
  memoirs: unknown[]
}

type ArchiveStoreV3 = {
  version: 3
  updatedAt: string
  memoirs: unknown[]
}

type ApiBaseStore = {
  version: 1
  apiBase: string
}

type StoredJson = {
  exists: boolean
  value: unknown | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getLocalStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

function getIndexedDb(): IDBFactory | null {
  return typeof window === 'undefined' ? null : window.indexedDB ?? null
}

function readStoredJson(key: string): StoredJson {
  const storage = getLocalStorage()
  const rawValue = storage?.getItem(key) ?? null

  if (rawValue === null) {
    return { exists: false, value: null }
  }

  try {
    return { exists: true, value: JSON.parse(rawValue) }
  } catch {
    return { exists: true, value: null }
  }
}

function readJson(key: string): unknown | null {
  return readStoredJson(key).value
}

function isArchiveStoreV2(value: unknown): value is ArchiveStoreV2 {
  return isRecord(value) && value.version === 2 && typeof value.updatedAt === 'string' && Array.isArray(value.memoirs)
}

function isArchiveStoreV3(value: unknown): value is ArchiveStoreV3 {
  return isRecord(value) && value.version === 3 && typeof value.updatedAt === 'string' && Array.isArray(value.memoirs)
}

function isApiBaseStore(value: unknown): value is ApiBaseStore {
  return isRecord(value) && value.version === 1 && typeof value.apiBase === 'string'
}

function isKnownArchivePayload(value: unknown): boolean {
  return Array.isArray(value) || isArchiveStoreV2(value) || isArchiveStoreV3(value)
}

export function parseArchiveMemoirs(value: unknown): Memoir[] {
  if (Array.isArray(value)) {
    return parseMemoirList(value)
  }

  if (isArchiveStoreV2(value) || isArchiveStoreV3(value)) {
    return parseMemoirList(value.memoirs)
  }

  return []
}

export function createArchiveStore(memoirs: Memoir[], updatedAt = new Date().toISOString()): ArchiveStoreV3 {
  return {
    version: 3,
    updatedAt,
    memoirs,
  }
}

function readArchiveFromLocalStorage(): { exists: boolean; memoirs: Memoir[] } {
  const currentArchive = readStoredJson(archiveKey)
  if (currentArchive.exists) {
    return {
      exists: true,
      memoirs: parseArchiveMemoirs(currentArchive.value),
    }
  }

  const legacyArchive = readStoredJson(legacyArchiveKey)
  return {
    exists: legacyArchive.exists,
    memoirs: parseArchiveMemoirs(legacyArchive.value),
  }
}

function writeArchiveToLocalStorage(memoirs: Memoir[]): boolean {
  const storage = getLocalStorage()
  if (!storage) {
    return false
  }

  const payload = {
    version: 2,
    updatedAt: new Date().toISOString(),
    memoirs,
  } satisfies ArchiveStoreV2

  storage.setItem(archiveKey, JSON.stringify(payload))
  storage.removeItem(legacyArchiveKey)
  return true
}

function clearLocalArchiveStorage(): boolean {
  const storage = getLocalStorage()
  if (!storage) {
    return false
  }

  storage.removeItem(archiveKey)
  storage.removeItem(legacyArchiveKey)
  return true
}

function openArchiveDatabase(): Promise<IDBDatabase> {
  const indexedDb = getIndexedDb()
  if (!indexedDb) {
    return Promise.reject(new Error('IndexedDB unavailable'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDb.open(archiveDatabaseName, archiveDatabaseVersion)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(archiveObjectStoreName)) {
        database.createObjectStore(archiveObjectStoreName)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Archive database open failed'))
  })
}

async function readArchiveFromIndexedDb(): Promise<{ exists: boolean; value: unknown | null }> {
  const database = await openArchiveDatabase()

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(archiveObjectStoreName, 'readonly')
      const request = transaction.objectStore(archiveObjectStoreName).get(archiveRecordKey)
      let result: { exists: boolean; value: unknown | null } = { exists: false, value: null }

      request.onsuccess = () => {
        result = {
          exists: request.result !== undefined,
          value: request.result ?? null,
        }
      }

      request.onerror = () => reject(request.error ?? new Error('Archive read failed'))
      transaction.oncomplete = () => resolve(result)
      transaction.onabort = () => reject(transaction.error ?? new Error('Archive read aborted'))
      transaction.onerror = () => reject(transaction.error ?? new Error('Archive read failed'))
    })
  } finally {
    database.close()
  }
}

async function writeArchiveToIndexedDb(memoirs: Memoir[]): Promise<void> {
  const database = await openArchiveDatabase()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(archiveObjectStoreName, 'readwrite')
      transaction.objectStore(archiveObjectStoreName).put(createArchiveStore(memoirs), archiveRecordKey)
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error ?? new Error('Archive write aborted'))
      transaction.onerror = () => reject(transaction.error ?? new Error('Archive write failed'))
    })
  } finally {
    database.close()
  }
}

async function clearIndexedDbArchive(): Promise<void> {
  const database = await openArchiveDatabase()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(archiveObjectStoreName, 'readwrite')
      transaction.objectStore(archiveObjectStoreName).delete(archiveRecordKey)
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error ?? new Error('Archive clear aborted'))
      transaction.onerror = () => reject(transaction.error ?? new Error('Archive clear failed'))
    })
  } finally {
    database.close()
  }
}

export async function readArchive(): Promise<Memoir[]> {
  if (!getIndexedDb()) {
    return readArchiveFromLocalStorage().memoirs
  }

  try {
    const storedArchive = await readArchiveFromIndexedDb()
    if (storedArchive.exists && isKnownArchivePayload(storedArchive.value)) {
      return parseArchiveMemoirs(storedArchive.value)
    }

    const legacyArchive = readArchiveFromLocalStorage()
    if (legacyArchive.exists) {
      await writeArchiveToIndexedDb(legacyArchive.memoirs)
      clearLocalArchiveStorage()
      return legacyArchive.memoirs
    }

    return storedArchive.exists ? [] : legacyArchive.memoirs
  } catch {
    return readArchiveFromLocalStorage().memoirs
  }
}

export async function writeArchive(memoirs: Memoir[]): Promise<void> {
  try {
    await writeArchiveToIndexedDb(memoirs)
    clearLocalArchiveStorage()
  } catch {
    if (!writeArchiveToLocalStorage(memoirs)) {
      throw new Error('Archive storage unavailable')
    }
  }
}

export async function clearArchiveStorage(): Promise<void> {
  const indexedDbCleared = await clearIndexedDbArchive()
    .then(() => true)
    .catch(() => false)

  const localArchiveCleared = clearLocalArchiveStorage()
  if (!indexedDbCleared && !localArchiveCleared) {
    throw new Error('Archive storage unavailable')
  }
}

export function readApiBase(): string {
  const desktopApiBase =
    typeof window !== 'undefined' && typeof window.memoirDesktop?.apiBase === 'string'
      ? window.memoirDesktop.apiBase
      : ''

  if (desktopApiBase) {
    return normalizeApiBase(desktopApiBase)
  }

  const saved = readJson(apiBaseKey)
  if (isApiBaseStore(saved)) {
    return normalizeApiBase(saved.apiBase)
  }

  const storage = getLocalStorage()
  return normalizeApiBase(storage?.getItem(legacyApiBaseKey) || '/api')
}

export function writeApiBase(apiBase: string) {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  const payload = {
    version: 1,
    apiBase: normalizeApiBase(apiBase),
  } satisfies ApiBaseStore

  storage.setItem(apiBaseKey, JSON.stringify(payload))
  storage.removeItem(legacyApiBaseKey)
}