# End-to-End (E2E) Tests — Playwright

These are the only tests in the repo that drive a **real browser against the
real, fully-running stack**. Unlike the other test layers, nothing here is
faked:

| Layer | What's faked | This suite |
|---|---|---|
| Backend unit (`TodoControllerTest`) | Real DB — mocked `TodoRepository` | — |
| Backend integration (`*IT.java`, Testcontainers) | Real Tomcat/HTTP — throwaway container instead | — |
| Frontend unit (Vitest + RTL) | Real backend — mocked via MSW | — |
| Contract (Postman) | Nothing faked, but only checks the API shape | — |
| **E2E (this directory)** | **Nothing.** Real Postgres, real Tomcat, real Caddy, real browser | ✅ |

That means it's also the only layer that **cannot run on its own** — you
must have the whole stack up first.

## Prerequisites — start these first

Follow the main [README.md](../README.md), specifically:

1. **Step 3** — PostgreSQL running, `tododb` database + `todouser` role created
2. **Step 4** — Backend built and deployed to Tomcat (`mvn clean package`, WAR
   copied to `/var/lib/tomcat10/webapps/`, Tomcat started)
3. **Step 6** — Frontend built (`cd frontend && npm run build`) — E2E tests
   hit the built `frontend/dist`, not the `npm run dev` dev server
4. **Step 8** — Caddy running from the project root (`caddy run`), so the app
   is reachable at **`http://localhost:3000`**

Sanity-check before running the E2E suite:

```bash
curl -I http://localhost:3000/              # expect 200 (Caddy serving the built frontend)
curl -s http://localhost:3000/api/todos     # expect a JSON array with 3 seeded tasks
```

If either of those fails, fix that first — an E2E failure on top of a stack
that isn't actually up just wastes time chasing the wrong problem.

## Install and run

```bash
cd e2e
npm install
npm run install-browsers   # downloads the Chromium build Playwright drives (first time only)
npm run test
```

Other useful commands:

```bash
npm run test:headed   # watch the browser while tests run, instead of headless
npm run test:ui       # Playwright's interactive UI mode — step through, inspect, time-travel
npm run report        # open the HTML report from the last run
```

## What's covered (`tests/`)

| File | Scenario |
|---|---|
| `load-seeded-tasks.spec.js` | The 3 sample tasks from `data.sql` appear on load |
| `create-task.spec.js` | Submitting the form adds a task to the list |
| `toggle-complete.spec.js` | Checking a task applies the `completed` class + strikethrough style, matching `TaskItem.jsx`/`App.css` |
| `delete-task.spec.js` | A deleted task disappears **and stays gone after a page reload** — proves the delete round-tripped through the real backend/Postgres, not just local React state |
| `filter-tabs.spec.js` | All/Active/Completed show the correct subset |

## Why tests clean up after themselves

These tests write to your **real, persistent** `tododb` database — there's
no throwaway container or mock to reset between runs. Every test that
creates a task gives it a timestamped unique title (`utils.js`'s
`uniqueTitle()`) and deletes it again before finishing, so running the suite
repeatedly doesn't pile up junk rows or interfere with the seeded-data check
in `load-seeded-tasks.spec.js`. If a test fails partway through, its
leftover row is safe to delete by hand from the UI or `psql`.
