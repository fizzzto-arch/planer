// Powiadomienia push w przeglądarce: czy da się je włączyć, subskrypcja tego urządzenia.
import { VAPID_PUBLIC_KEY } from './pushConfig'

// 'ios-browser' = iPhone w zwykłym Safari: powiadomienia działają tylko w aplikacji z ekranu początkowego.
export type PushSupport = 'ok' | 'ios-browser' | 'unsupported'

const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const isStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches

export function pushSupport(): PushSupport {
  if (isIos() && !isStandalone()) return 'ios-browser'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'ok'
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // bez service workera nie ma tylko powiadomień - reszta Planera działa normalnie
  })
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'ok') return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

// Prosi o zgodę (musi być wywołane stuknięciem użytkownika) i zapisuje to urządzenie w usłudze push.
export async function subscribe(): Promise<PushSubscription> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('denied')
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) })
}

// Id dokumentu urządzenia: skrót adresu subskrypcji (ten sam telefon = ten sam dokument).
export async function deviceId(subscription: PushSubscription): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subscription.endpoint))
  return [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Krótka nazwa urządzenia do listy w ustawieniach.
export function deviceLabel(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua) || isIos()) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Mac/.test(ua)) return 'Mac'
  return 'Przeglądarka'
}
