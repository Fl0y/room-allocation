// Testele pe baza de date reală (Lotul 5c), separate de `npm test`: au nevoie de PostgreSQL pornit.
// Rulare: npm run test:db   (adresa: RA_DATABASE_URL sau .env, implicit containerul din docker-compose.yml)

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/db/**/*.dbtest.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // fiecare fișier își creează propria bază de date de test; rulate pe rând, ca să nu concureze între ele
    fileParallelism: false,
  },
});
