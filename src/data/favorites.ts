const KEY = 'css-fav-templates'

function read(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export function getFavorites(): string[] {
  return [...read()]
}

export function isFavorite(key: string): boolean {
  return read().has(key)
}

export function toggleFavorite(key: string): boolean {
  const s = read()
  if (s.has(key)) s.delete(key)
  else s.add(key)
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]))
  } catch {
    /* ignore */
  }
  return s.has(key)
}
