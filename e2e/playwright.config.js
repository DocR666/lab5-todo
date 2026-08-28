import { defineConfig } from '@playwright/test'

// E2E tests hit the real, already-running stack (Caddy + Tomcat + Postgres)
// at http://localhost:3000 — see README.md in this directory for prereqs.
// Nothing here starts the app; that's deliberate, unlike the other test
// layers this one can't fake or spin up on its own.
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  // Tests share one real Postgres-backed backend (not an isolated DB per
  // test), so they're kept sequential rather than parallelized to avoid
  // racy interleaved writes between tests.
  fullyParallel: false,
  workers: 1,
  retries: 0,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
