// Testy reguł bazy (rules-tests/) na emulatorze Firestore - osobno od zwykłych testów,
// bo potrzebują uruchomionego emulatora (npm run test:rules uruchamia go sam).
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['rules-tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Jedna baza w emulatorze - pliki testów po kolei, żeby nie czyściły sobie danych.
    fileParallelism: false,
  },
})
