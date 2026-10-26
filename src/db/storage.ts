import type { CardProject } from '../types'

const DB_NAME = 'card-skin-studio'
const DB_VERSION = 1
const STORE = 'projects'

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB non disponible sur ce navigateur.'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Ouverture IndexedDB échouée.'))
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const store = t.objectStore(STORE)
        const req = fn(store)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('Opération de stockage échouée.'))
        t.onabort = () =>
          reject(t.error ?? new Error("Transaction interrompue — stockage peut-être plein."))
      }),
  )
}

export async function getAllProjects(): Promise<CardProject[]> {
  try {
    const all = await tx<CardProject[]>('readonly', (s) => s.getAll())
    return all.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch (e) {
    console.error('getAllProjects', e)
    return []
  }
}

export async function getProject(id: string): Promise<CardProject | undefined> {
  return tx<CardProject | undefined>('readonly', (s) => s.get(id))
}

export async function saveProject(p: CardProject): Promise<void> {
  p.updatedAt = Date.now()
  try {
    await tx('readwrite', (s) => s.put(p))
  } catch (e) {
    const err = e as Error
    if (/quota|full|plein/i.test(err.message)) {
      throw new Error(
        "Stockage saturé. Supprimez d'anciens projets ou réduisez la taille des images importées.",
      )
    }
    throw err
  }
}

export async function deleteProject(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id))
}

export async function clearAll(): Promise<void> {
  await tx('readwrite', (s) => s.clear())
}

export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate()
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 }
  }
  return null
}

// ---- Backup (export / import of all projects as JSON) -----------------------
export async function exportBackup(): Promise<Blob> {
  const projects = await getAllProjects()
  const payload = {
    app: 'card-skin-studio',
    version: 1,
    exportedAt: new Date().toISOString(),
    projects,
  }
  return new Blob([JSON.stringify(payload)], { type: 'application/json' })
}

export async function importBackup(text: string): Promise<number> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Fichier de sauvegarde invalide (JSON illisible).')
  }
  const obj = data as { app?: string; projects?: CardProject[] }
  if (obj.app !== 'card-skin-studio' || !Array.isArray(obj.projects)) {
    throw new Error("Ce fichier n'est pas une sauvegarde Card Skin Studio.")
  }
  let count = 0
  for (const p of obj.projects) {
    if (p && typeof p.id === 'string' && Array.isArray(p.layers)) {
      await saveProject(p)
      count++
    }
  }
  return count
}
