# Lab 6 — Full Testing Suite + Docker

Lab 5 introduced two of these as optional/take-home material (backend unit
tests, contract tests). Lab 6 completes the full testing pyramid for this
app: **9 test types**, numbered here from fastest/most-isolated to
slowest/most-real. Each layer catches a class of bug the ones above it
can't — a passing unit test doesn't mean the real database agrees, and a
passing integration test doesn't mean a real user's click path works.

**Types 1–3 need nothing but the source code.** Types 4–9 need the stack
running (steps 3, 4, 6, 8 in [LAB5.md](./LAB5.md)) — Type 4 additionally
needs Docker, since it spins up a real, throwaway PostgreSQL container.

| # | Type | Layer | Command | Report saved to |
|---|---|---|---|---|
| 1 | Static analysis | Frontend | `cd frontend && npm run lint` | console only |
| 2 | Unit | Backend | `cd backend && mvn test` | `backend/target/surefire-reports/` |
| 3 | Unit | Frontend | `cd frontend && npm run test` | console only |
| 4 | Integration | Backend | `cd backend && mvn verify` | `backend/target/failsafe-reports/` |
| 5 | Integration | Frontend | `cd frontend && npm run test` (runs alongside #3) | console only |
| 6 | Contract | API | `npx newman run postman/Lab5-Todo-API.postman_collection.json` | console only |
| 7 | Smoke | Caddy | `./caddy/smoke-test.sh` | console only |
| 8 | End-to-end (E2E) | Full stack | `cd e2e && npm run test` | `e2e/playwright-report/index.html` |
| 9 | Manual / exploratory | Full stack | Swagger UI | — |

All report paths above (`target/`, `e2e/playwright-report/`,
`e2e/test-results/`) are gitignored — local build artifacts, not something
you commit.

## 1. Static Analysis (ESLint)

Same as Lab 5 step 7 — catches bugs (unused vars, hook-rule violations)
before the app even runs:

```bash
cd frontend
npm run lint
```

## 2. Backend Unit Tests

Same as Lab 5 step 5 — `backend/src/test/java/.../TodoControllerTest.java`
runs against a **mocked** `TodoRepository`, no real database:

```bash
cd backend
mvn test
```

## 3. Frontend Unit Tests

Same as Lab 5 step 7 — component tests
(`frontend/src/components/__tests__/*.test.jsx`) plus `App.test.jsx`'s
initial-load and 502-banner checks, network mocked via MSW (Mock Service
Worker):

```bash
cd frontend
npm run test
```

## 4. Backend Integration Tests (Testcontainers)

New in Lab 6. Unlike the mocked-repository unit tests, these hit a **real**
PostgreSQL — started automatically in a throwaway Docker container per test
run, not your actual `tododb`:

- `backend/src/test/java/com/lab5/todo/repository/TodoRepositoryIT.java` —
  real `TodoRepository`: save→find, update→find, delete→confirm gone
- `backend/src/test/java/com/lab5/todo/controller/TodoControllerIT.java` —
  real HTTP calls (`TestRestTemplate`) through the real controller into the
  real repository: create→fetch, update→fetch, delete→404, get-all

Requires Docker running. Named `*IT.java` (not `*Test.java`) so they're
picked up by Maven **Failsafe**, not Surefire:

```bash
cd backend
mvn verify
```

`mvn test` deliberately does **not** run these — only `mvn verify` does.
That split matters: unit tests should stay fast enough to run on every
save, while spinning up a Docker container each time is a heavier,
deliberate step.

## 5. Frontend Integration Tests

New in Lab 6, and a different thing from Type 3 above — not one component
in isolation, but multiple real components **composed together** (real
`TaskForm` + `TaskList`/`TaskItem` + `FilterTabs` + `ErrorBanner`, only the
network mocked via MSW), checking that an action on one component flows
correctly through `App`'s state into another component's rendered output:

- `frontend/src/App.integration.test.jsx` — submitting `TaskForm` updates
  the real `TaskList`; toggling a `TaskItem` checkbox updates what
  `FilterTabs`-filtered views show; dismissing `ErrorBanner` clears it

```bash
cd frontend
npm run test   # runs alongside the Type 3 unit tests, same command
```

## 6. Contract Tests (Postman/Newman)

Same as Lab 5 step 5 — verifies the API's *shape* (status codes, response
field types), independent of implementation:

```bash
npx newman run postman/Lab5-Todo-API.postman_collection.json
```

Defaults to `http://localhost:3000/api` (through Caddy). Edit the
collection's `baseUrl` variable to `http://localhost:8080/todo/api` to test
the backend in isolation.

## 7. Smoke Tests (Caddy)

New in Lab 6 — automates the manual curl checks from Lab 5 step 9 into one
script with clear pass/fail output, instead of running each curl by hand:

```bash
./caddy/smoke-test.sh
```

Covers: Caddyfile config validation, static file serving independent of
the backend, reverse-proxy routing (502 not 404 when the backend is down),
security headers present, and SPA fallback. Requires Caddy running from the
project root, backend stopped first — see `caddy/smoke-test.sh`'s header
comment.

## 8. End-to-End (E2E) Tests

New in Lab 6 — the only layer that fakes **nothing**: a real browser
(Playwright/Chromium) driving the real built frontend, through real Caddy,
into real Tomcat, against your real `tododb`:

```bash
cd e2e
npm install
npm run install-browsers   # first time only
npm run test
```

Covers: seeded tasks load, creating a task via the form, marking a task
complete (checks the actual `completed` class + strikethrough style),
deleting a task and confirming it's still gone after a page reload (proves
it round-tripped through the real backend, not just local UI state), and
the All/Active/Completed filter tabs. See `e2e/README.md` for prerequisites
— this is the one layer that genuinely cannot run without the full stack up.

## 9. Manual / Exploratory Testing (Swagger UI)

Same as Lab 5 step 4h — try requests by hand against the live API:

`http://localhost:8080/todo/swagger-ui/index.html`

---

# Lab 6 — Docker: Build & Run Locally

The same 3-tier app from Lab 5 — Postgres, backend, Caddy(+frontend) — now
containerized. Nothing about the app changed; only *how it's deployed* did.

**These 4 files don't exist in your checkout yet — you're creating them.**
Copy each file's content below exactly into the path shown, then follow
the build/run steps after.

### Install Docker (if needed)

```bash
docker --version
docker compose version
```

If either is missing:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # lets you run docker without sudo
```

(Log out and back in for the group change to take effect.)

### Create `backend/Dockerfile`

```dockerfile
# Multi-stage build: same todo.war artifact Lab 5 taught, now built and run
# entirely inside Docker — no local JDK/Maven install required.

# ===== Stage 1: build the WAR =====
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

# Copy just the pom first so dependency resolution is cached separately from
# source changes (a source-only edit won't re-download every dependency).
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests
# Tests are deliberately skipped here — see the testing sections above for
# how to run all 9 test types; the image build isn't where that happens.

# ===== Stage 2: run it on Tomcat =====
FROM tomcat:10.1-jdk17-temurin
RUN rm -rf /usr/local/tomcat/webapps/*
COPY --from=build /build/target/todo.war /usr/local/tomcat/webapps/todo.war

EXPOSE 8080
CMD ["catalina.sh", "run"]
```

### Create `caddy/Dockerfile`

```dockerfile
# Multi-stage build: Node builds the same frontend/dist Lab 5 built by hand,
# then Caddy serves it + reverse-proxies to the backend — same single
# process doing both jobs, same Caddyfile, just containerized.
#
# Build context must be the PROJECT ROOT (not caddy/), since this needs both
# frontend/ and caddy/Caddyfile. See docker-compose.yml.

# ===== Stage 1: build the frontend =====
FROM node:20-alpine AS build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ===== Stage 2: serve it with Caddy =====
FROM caddy:2.8-alpine
WORKDIR /srv

# Mirrors the exact relative layout Caddy expects when run from the project
# root on bare metal (`root * frontend/dist` in the Caddyfile) — so the
# Caddyfile itself needs zero path changes between bare-metal and Docker.
COPY --from=build /build/dist ./frontend/dist
COPY caddy/Caddyfile ./caddy/Caddyfile

EXPOSE 3000
CMD ["caddy", "run", "--config", "caddy/Caddyfile"]
```

### Update `caddy/Caddyfile`

Your existing Lab 5 `Caddyfile` still works as-is on bare metal. For
Docker, replace the `reverse_proxy` line inside the `handle /api/*` block
with the env-var-aware version — the full file should end up looking like
this:

```caddyfile
:3000 {
	encode gzip

	header {
		X-Frame-Options "DENY"
		X-Content-Type-Options "nosniff"
		X-XSS-Protection "1; mode=block"
	}

	# ===== STUDENT TODO =====
	# {$BACKEND_HOST:localhost} and {$BACKEND_PORT:8080} are Caddy env-var
	# placeholders with a default after the colon:
	#   - Bare metal (Lab 5): if your Tomcat listens on a different port
	#     (e.g. 8888), edit the "8080" default below directly.
	#   - Docker (Lab 6): leave the defaults as-is — docker-compose.yml sets
	#     BACKEND_HOST/BACKEND_PORT as environment variables instead, since
	#     "localhost" doesn't mean the backend container from in here.
	# =========================
	handle /api/* {
		rewrite * /todo{uri}
		reverse_proxy {$BACKEND_HOST:localhost}:{$BACKEND_PORT:8080}
	}

	# Serve the built React app for everything else.
	# Path is relative to Caddy's working directory — run `caddy run` from
	# the project root (see LAB5.md), not from inside caddy/.
	handle {
		root * frontend/dist
		try_files {path} /index.html
		file_server
	}
}
```

### Create `docker-compose.yml` (at the project root)

```yaml
# Lab 6: the same 3-tier app from Lab 5, containerized. Host ports match
# the bare-metal defaults exactly (3000, 8080, 5432), so everything built in
# earlier Lab 6 steps — the Postman collection, e2e/, caddy/smoke-test.sh —
# should run unchanged against this stack too.

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: tododb
      POSTGRES_USER: todouser
      POSTGRES_PASSWORD: TodoPass123!
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U todouser -d tododb"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: tododb
      DB_USER: todouser
      DB_PASSWORD: TodoPass123!
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

  caddy:
    build:
      context: .
      dockerfile: caddy/Dockerfile
    environment:
      BACKEND_HOST: backend
      BACKEND_PORT: 8080
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres-data:
```

### What each file does

| File | What it does |
|---|---|
| `backend/Dockerfile` | Multi-stage build: Maven compiles `todo.war`, then it runs on `tomcat:10.1-jdk17-temurin` — same WAR-on-Tomcat model as Lab 5, just containerized |
| `caddy/Dockerfile` | Multi-stage build: Node builds `frontend/dist`, then Caddy serves it + proxies `/api/*` — same single process as Lab 5, containerized |
| `docker-compose.yml` | Wires all 3 services together: Postgres, backend, Caddy |

### Why `localhost` isn't used inside `docker-compose.yml`

On bare metal, the backend talks to `localhost:5432` and Caddy proxies to
`localhost:8080`, because everything runs directly on your machine. Inside
Docker, each service is its own container — they reach each other by
**service name**, not `localhost`. That's why `docker-compose.yml` sets
`DB_HOST=postgres` and `BACKEND_HOST=backend` as environment variables,
which `application.properties` and the `Caddyfile` now read via
`${DB_HOST:localhost}` / `{$BACKEND_HOST:localhost}` — the part after the
colon is the bare-metal default, used automatically when no environment
variable is set (i.e. still exactly Lab 5's behavior on bare metal).

### Build and run

```bash
docker compose build
docker compose up -d
```

Check it's up:

```bash
curl http://localhost:3000/                # frontend, expect 200
curl http://localhost:3000/api/todos        # API through Caddy, expect the 3 seeded tasks
```

Or just open `http://localhost:3000` in a browser — same app, same seeded
data, same everything, now running from 3 containers instead of 3
systemd/manual processes.

### Re-run all 9 tests against this stack

Host ports are identical to bare metal (`3000`, `8080`, `5432`), so
**every test from steps 1–9 above should pass unchanged** — that's the
point of matching the ports. Re-run them now to confirm: contract,
smoke, and E2E tests hit the running containers directly; `mvn verify`
spins up its own separate, throwaway Postgres via Testcontainers (nothing
to do with `docker-compose.yml`'s Postgres) and works the same either way.

### Stop it

```bash
docker compose down      # stops and removes containers; your data survives
docker compose down -v   # also deletes the Postgres volume — full reset
```

---

## Lab 6 — Observation Book

Answer these in your lab observation book, same as Lab 5's. Questions 1–6
are about the testing suite; 7–12 are about the Docker setup. Both sets are
about understanding *why* things are built the way they are — not just
that you ran the commands.

1. What's the actual difference between `mvn test` and `mvn verify` in
   this project, and why does `TodoControllerIT.java` only run under one
   of them?
2. The frontend has both `App.test.jsx` and `App.integration.test.jsx`.
   Both use MSW to fake the network — so what's actually different about
   what each one tests?
3. `TodoRepositoryIT.java` spins up a real PostgreSQL container instead of
   using your actual `tododb`. Why does that matter — what would a
   mocked-repository unit test never be able to catch that this can?
4. Of the 9 test types in this lab, which ones would still pass even if
   Caddy were completely misconfigured (wrong port, broken proxy rule)?
   Which ones would fail? Explain the difference.
5. `e2e/tests/utils.js` deletes every task it creates before the test
   finishes. Why does this matter here specifically, in a way it wouldn't
   for the backend integration tests?
6. Pick one test type from Lab 6 you didn't get to run yourself (or that
   failed for you). What do you think it would have caught that the
   others couldn't?
7. `docker-compose.yml` sets `DB_HOST=postgres` for the backend service, but
   `application.properties` defaults to `localhost` when that variable
   isn't set. Why doesn't `localhost` work between containers, and what
   would actually break if you deleted that one environment variable line?
8. `backend/Dockerfile` has two `FROM` lines (a multi-stage build). What
   specifically gets copied from the first stage into the second, and what
   would go wrong (or just get worse) if you wrote it as a single stage
   instead?
9. `docker-compose.yml` makes the backend wait for Postgres's healthcheck
   (`condition: service_healthy`) instead of just `depends_on: postgres`.
   What's the practical difference, and what failure would you expect to
   see if that healthcheck weren't there?
10. The Postgres service uses a named volume (`postgres-data`). What
    happens to your todos after `docker compose down`? What about after
    `docker compose down -v`? Why the difference?
11. `caddy/Dockerfile`'s build context in `docker-compose.yml` is the
    project root (`.`), not `caddy/` itself. Why does building that image
    need access to files outside the `caddy/` directory?
12. You ran the exact same Postman collection, Playwright suite, and
    `smoke-test.sh` against both the bare-metal stack and the Dockerized
    one, without changing a single test file. What specific design choice
    in `docker-compose.yml` made that possible?
