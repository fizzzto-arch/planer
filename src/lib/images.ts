// Zdjęcia przed wysłaniem: zmniejszone do JPEG - z kilku MB robi się kilkaset kB (darmowa baza ma
// 1 GiB na wszystkich). Pliki, których przeglądarka nie odczyta jako obraz, zostają bez zmian.

export interface PreparedFile {
  name: string
  type: string
  bytes: Uint8Array
}

async function draw(file: Blob, maxSide: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvas
}

const isPhoto = (file: File) => file.type.startsWith('image/') && file.type !== 'image/gif'

// Zdjęcie najwyżej maxSide px (JPEG); inny plik - bez zmian.
export async function shrinkImage(file: File, maxSide = 1920, quality = 0.85): Promise<PreparedFile> {
  const original = async (): Promise<PreparedFile> => ({
    name: file.name,
    type: file.type || 'application/octet-stream',
    bytes: new Uint8Array(await file.arrayBuffer()),
  })
  if (!isPhoto(file)) return original()
  try {
    const canvas = await draw(file, maxSide)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return original()
    return { name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', bytes: new Uint8Array(await blob.arrayBuffer()) }
  } catch {
    return original()
  }
}

// Miniatura do listy (kilka kB, JPEG jako data URL); null - to nie zdjęcie albo się nie dało.
export async function thumbnail(file: File, maxSide = 160): Promise<string | null> {
  if (!isPhoto(file)) return null
  try {
    return (await draw(file, maxSide)).toDataURL('image/jpeg', 0.6)
  } catch {
    return null
  }
}
