// Typ pliku od innej osoby (wspólne materiały, załączniki zgłoszeń) pochodzi z bazy - wpisał go ten,
// kto plik wgrał. Plik otwierany z typem "text/html" albo "image/svg+xml" uruchomiłby skrypt w
// Planerze z sesją osoby, która go otwiera. Dlatego wyświetlamy tylko bezpieczne typy, a resztę
// przeglądarka może jedynie pobrać (application/octet-stream).

const SAFE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
])

export function safeBlobType(type: string | null | undefined): string {
  const clean = (type ?? '').toLowerCase().split(';')[0].trim()
  return SAFE_TYPES.has(clean) ? clean : 'application/octet-stream'
}
