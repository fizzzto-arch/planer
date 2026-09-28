// Kolory typów zajęć: domyślne jak w USOS, z możliwością własnych.
import type { CSSProperties } from 'react'
import { typeSlug } from './usos'

// Wartości domyślne (motyw jasny) - te same co w index.css.
export const DEFAULT_TYPE_COLORS: Record<string, string> = {
  WYK: '#4f7fd1',
  CWI: '#ee9a35',
  LAB: '#82ad35',
  PRO: '#d9b61c',
  SEM: '#16a2a8',
  LEK: '#9b6ad6',
  WF: '#e05a5a',
  INNE: '#7a7a85',
}

export type TypeColors = Record<string, string> // typ -> "#rrggbb", tylko zmienione

const STORAGE_KEY = 'planer.type-colors'

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

export function parseTypeColors(raw: Record<string, unknown>): TypeColors {
  const colors: TypeColors = {}
  for (const type of Object.keys(DEFAULT_TYPE_COLORS)) {
    if (isHexColor(raw[type])) colors[type] = raw[type].toLowerCase()
  }
  return colors
}

export function loadLocalColors(): TypeColors {
  try {
    return parseTypeColors(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'))
  } catch {
    return {}
  }
}

export function saveLocalColors(colors: TypeColors): void {
  try {
    if (Object.keys(colors).length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
  } catch {
    // brak zapisu - kolory zostaną do przeładowania
  }
}

// Zmiennie CSS nadpisujące kolory domyślne (w obu motywach), np. { '--c-wyk': '#ff0000' }.
export function colorVariables(colors: TypeColors): CSSProperties {
  return Object.fromEntries(
    Object.entries(colors).map(([type, hex]) => [`--c-${typeSlug(type)}`, hex]),
  ) as CSSProperties
}
