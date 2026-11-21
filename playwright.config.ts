// Testele de interfață (Lotul 6b, D40): fluxurile principale în Chromium, pe o bază de date de test.
// Rulare: npm run test:e2e   (construiește aplicația, pornește scripts/e2e-server.ts, rulează tests/e2e/)
// Deocamdată doar în mediul lui Claude (D43); pe Mac, browserele se instalează cu `npx playwright install chromium`.

import { defineConfig } from '@playwright/test';

const PORT = 3200;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${PORT}`, locale: 'ro-RO' },
  webServer: {
    command: 'node scripts/e2e-server.ts',
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { E2E_PORT: String(PORT) },
  },
});
