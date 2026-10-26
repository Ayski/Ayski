// Image import + export helpers tuned for Safari / iOS.

const MAX_DIM = 1600 // downscale cap to keep IndexedDB payloads reasonable

export interface ImportedImage {
  src: string
  width: number
  height: number
}

export function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp,image/heic,image/*'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    // iOS requires the element to be interactable; click within the user gesture
    input.click()
  })
}

export async function fileToDownscaledImage(file: File): Promise<ImportedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Fichier non pris en charge. Choisissez une image.')
  }
  const dataUrl = await readAsDataURL(file)
  const img = await loadImage(dataUrl)
  const { width, height } = img
  if (Math.max(width, height) <= MAX_DIM) {
    return { src: dataUrl, width, height }
  }
  const scale = MAX_DIM / Math.max(width, height)
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  const out = canvas.toDataURL('image/jpeg', 0.9)
  return { src: out, width: w, height: h }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('Lecture du fichier impossible.'))
    r.readAsDataURL(file)
  })
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image illisible ou corrompue.'))
    img.src = src
  })
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(meta)?.[1] ?? 'application/octet-stream'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// Try the native Web Share sheet (works in Safari iOS for files); fall back to download.
export async function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: blob.type })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare && nav.canShare({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch {
      // user cancelled or share failed — fall through to download
    }
  }
  downloadBlob(blob, filename)
  return 'downloaded'
}
