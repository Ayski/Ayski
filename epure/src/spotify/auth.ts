// Authentification Spotify : "Authorization Code with PKCE", sans backend ni Client Secret.
// Les jetons restent dans le localStorage du téléphone.

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const AUTH_URL = 'https://accounts.spotify.com/authorize'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'

export const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
  'user-library-modify',
]

const K_TOKENS = 'epure.tokens'
const K_VERIFIER = 'epure.pkce.verifier'
const K_STATE = 'epure.pkce.state'

interface Tokens {
  access: string
  refresh: string
  /** Date d'expiration du jeton d'accès (ms epoch). */
  expiresAt: number
}

/** L'URI de retour suit l'origine courante : 127.0.0.1:5173 en dev, le domaine Vercel en prod. */
export function redirectUri(): string {
  return `${window.location.origin}/callback`
}

// --- petits utilitaires de stockage (Safari en navigation privée peut lever) ---
function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function lsSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* stockage indisponible : on continue en mémoire */
  }
}
function lsDel(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* rien */
  }
}

let memory: Tokens | null = null
function readTokens(): Tokens | null {
  if (memory) return memory
  const raw = lsGet(K_TOKENS)
  if (!raw) return null
  try {
    memory = JSON.parse(raw) as Tokens
    return memory
  } catch {
    return null
  }
}
function writeTokens(t: Tokens | null) {
  memory = t
  if (t) lsSet(K_TOKENS, JSON.stringify(t))
  else lsDel(K_TOKENS)
}

// --- abonnement à l'état connecté / déconnecté ---
const listeners = new Set<() => void>()
export function subscribeAuth(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export function isLoggedIn(): boolean {
  return readTokens() !== null
}
function notify() {
  listeners.forEach((fn) => fn())
}

// --- PKCE ---
function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}
async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Envoie l'utilisateur sur la page d'autorisation Spotify. */
export async function login(): Promise<void> {
  const verifier = randomString(64)
  const state = randomString(16)
  lsSet(K_VERIFIER, verifier)
  lsSet(K_STATE, state)
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
    state,
  })
  window.location.assign(`${AUTH_URL}?${params}`)
}

/**
 * À appeler au démarrage : si on revient de Spotify sur /callback, échange le code
 * contre des jetons. Renvoie un message d'erreur lisible, ou null si tout va bien.
 */
let callbackResult: Promise<string | null> | null = null
export function handleCallback(): Promise<string | null> {
  // Mémorisé : le code d'autorisation ne peut servir qu'une seule fois.
  callbackResult ??= exchangeCode()
  return callbackResult
}

async function exchangeCode(): Promise<string | null> {
  if (window.location.pathname !== '/callback') return null
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const error = params.get('error')
  const state = params.get('state')
  // On nettoie l'URL quoi qu'il arrive pour ne pas rejouer le code au rechargement.
  window.history.replaceState({}, '', '/')

  if (error) return error === 'access_denied' ? 'Connexion annulée.' : `Spotify a refusé la connexion (${error}).`
  const verifier = lsGet(K_VERIFIER)
  if (!code || !verifier || state !== lsGet(K_STATE)) {
    return 'La connexion a été interrompue. Réessaie.'
  }
  lsDel(K_VERIFIER)
  lsDel(K_STATE)
  const startedIn = epoch
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri(),
        client_id: CLIENT_ID,
        code_verifier: verifier,
      }),
    })
    if (!res.ok) return 'Spotify a refusé l’échange du code. Vérifie la redirect URI dans ton dashboard.'
    const json = await res.json()
    if (startedIn !== epoch) return null
    storeTokenResponse(json)
    notify()
    return null
  } catch {
    return 'Impossible de joindre Spotify. Vérifie ta connexion.'
  }
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}
function storeTokenResponse(json: TokenResponse) {
  const previous = readTokens()
  writeTokens({
    access: json.access_token,
    // Spotify renvoie parfois un nouveau refresh token : on garde l'ancien sinon.
    refresh: json.refresh_token ?? previous?.refresh ?? '',
    expiresAt: Date.now() + json.expires_in * 1000,
  })
  scheduleRefresh()
}

/** Augmente à chaque déconnexion : une réponse de jeton arrivée après est ignorée. */
let epoch = 0

export function logout() {
  epoch++
  if (refreshTimer) clearTimeout(refreshTimer)
  writeTokens(null)
  notify()
}

// --- rafraîchissement ---
let refreshing: Promise<string | null> | null = null

/** Rafraîchit le jeton (un seul appel à la fois). Renvoie null si la session est perdue. */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const tokens = readTokens()
    if (!tokens?.refresh) {
      logout()
      return null
    }
    const startedIn = epoch
    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh,
          client_id: CLIENT_ID,
        }),
      })
      if (res.status === 400 || res.status === 401) {
        // Refresh token expiré ou révoqué : retour propre à l'écran de connexion.
        logout()
        return null
      }
      if (!res.ok) return tokens.access
      const json = await res.json()
      // Déconnexion pendant l'appel : on ne ressuscite pas la session.
      if (startedIn !== epoch) return null
      storeTokenResponse(json)
      return readTokens()?.access ?? null
    } catch {
      // Hors connexion : on garde le jeton actuel, l'appel suivant réessaiera.
      return tokens.access
    }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

/** Jeton d'accès valide, rafraîchi une minute avant son expiration. */
export async function getAccessToken(): Promise<string | null> {
  const tokens = readTokens()
  if (!tokens) return null
  if (Date.now() > tokens.expiresAt - 60_000) return refreshAccessToken()
  return tokens.access
}

let refreshTimer: ReturnType<typeof setTimeout> | undefined
/** Programme le prochain rafraîchissement tant que l'app reste ouverte. */
export function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer)
  const tokens = readTokens()
  if (!tokens) return
  const delay = Math.max(5_000, tokens.expiresAt - Date.now() - 90_000)
  refreshTimer = setTimeout(() => void refreshAccessToken(), delay)
}
