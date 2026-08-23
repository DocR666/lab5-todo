# Lab 5 — Full-Stack Todo App (Spring Boot + React + Caddy)

A 3-tier student lab: a Spring Boot REST API backed by PostgreSQL, a React
(Vite) frontend, and Caddy acting as a reverse proxy / static file server in
front of both.

```
├── backend/    Spring Boot REST API (deployed as a WAR to Tomcat)
├── frontend/   React (Vite) single-page app
├── caddy/      Caddyfile (reverse proxy + static hosting)
├── postman/    Postman collection for API contract testing
└── README.md   This guide
```

Architecture:

```
Browser --> Caddy (:3000) --> /api/*  --> Tomcat (:8080/todo) --> PostgreSQL (:5432)
                           --> /*      --> frontend/dist (static files)
```

Every file you actually need to edit is marked with a
`===== STUDENT TODO =====` comment block — search for that string if you
just want the list of things to change.

## Lab Time Budget (2.5 hours)

| Time | What |
|---|---|
| ~2 hours | Steps **1, 2, 3, 4, 6, 8, 10** — get the app running end to end |
| ~15–20 min | Buffer for debugging (something *will* go wrong — that's normal, see step 4/8) |
| ~15 min | Fill in the **Observation Book** (last section of this guide) |

**Steps 5, 7, and 9 (the isolated testing sections) are optional / take-home.**
If you finish the core steps early, do them in the remaining lab time;
otherwise complete them at home before the deadline your instructor gives
you.

---

## 1. Fork the Repo

1. Go to **https://github.com/mit-cse-pdc/lab5-todo**.
2. Click **Fork** (top right) to fork it into your own GitHub account.

---

## 2. Clone the Repo

Clone **your fork** (not the original) — replace `<your-username>` below:

```bash
git clone https://github.com/<your-username>/lab5-todo.git
cd lab5-todo
```

---

## 3. Database (PostgreSQL) Setup

*(Instructions below are for Debian — that's what the lab machines run.)*

**Check if PostgreSQL is installed and running:**

```bash
psql --version
sudo systemctl status postgresql
```

**If it's not installed:**

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

**Either way**, log in as the `postgres` superuser and create the database,
a dedicated role, and grant it the permissions it needs. On Debian, the
`postgres` OS user connects via **peer authentication** — use `sudo -u postgres`
rather than `-U postgres`:

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE tododb;
CREATE USER todouser WITH PASSWORD 'TodoPass123!';
GRANT ALL PRIVILEGES ON DATABASE tododb TO todouser;

-- Connect to tododb and grant schema privileges (PostgreSQL 15+ requires this)
\c tododb
GRANT ALL ON SCHEMA public TO todouser;
```

> When connecting later as `todouser` (e.g. in step 10), use
> `psql -U todouser -d tododb -h localhost` — the `-h localhost` forces a
> password-authenticated TCP connection instead of peer auth, which would
> otherwise reject a non-`postgres` OS user.

> **Table name note:** the `Todo` entity maps to a table named `todo`
> (singular), specifically to avoid colliding with any other app's `todos`
> table that might already exist in the same database.

---

## 4. Backend REST API (Spring Boot) — Install, Configure, Build, Deploy

### 4a. Check if Tomcat is installed

The lab machines already have **Tomcat 10** installed via `apt` (package
`tomcat10` — required specifically because it's Jakarta EE, matching Spring
Boot 3). Verify it:

```bash
dpkg -l | grep tomcat10
sudo systemctl status tomcat10
```

**If it's not installed** (e.g. you're setting this up on your own machine):

```bash
sudo apt update
sudo apt install -y tomcat10
sudo systemctl enable --now tomcat10
```

On Debian, the package lays things out as:
- `CATALINA_HOME` (binaries): `/usr/share/tomcat10`
- `CATALINA_BASE` (config/webapps/logs — this is what you actually care
  about): `/var/lib/tomcat10`
- webapps directory: `/var/lib/tomcat10/webapps`
- logs: `/var/log/tomcat10/catalina.out`

By default Tomcat listens on port `8080` — note the port either way, you'll
need it in step 8.

### 4b. Update database properties

Edit `backend/src/main/resources/application.properties` (marked
`STUDENT TODO`) to point at the database/role you created in step 3:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/tododb
spring.datasource.username=todouser
spring.datasource.password=TodoPass123!
```

### 4c. Sample data

You don't need to add sample records yourself — `backend/src/main/resources/data.sql`
seeds 3 sample tasks automatically the first time the API starts against an
empty `todo` table (it's idempotent, so re-deploys/restarts won't duplicate
them).

### 4d. Compile, build, and package the WAR

This needs JDK 17 and Maven. Check first — these aren't part of the
Tomcat/Caddy/npm set that's pre-installed:

```bash
mvn -version
```

If that fails:

```bash
sudo apt install -y openjdk-17-jdk maven
```

Then build:

```bash
cd backend
mvn clean package
```

This compiles the code, **runs the unit/contract tests** (see step 5), and
produces `backend/target/todo.war`. If you just want the WAR without
running tests, use `mvn clean package -DskipTests`.

### 4e. Deploy to Tomcat

```bash
sudo cp target/todo.war /var/lib/tomcat10/webapps/todo.war
```

(`sudo` is needed because `/var/lib/tomcat10/webapps` isn't writable by
your regular user.) Tomcat unpacks it automatically and hosts the app under
the context path `/todo`.

### 4f. Start Tomcat

```bash
sudo systemctl restart tomcat10   # (re)starts and picks up the new WAR
```

To check it's actually running, or to watch logs while it starts:

```bash
sudo systemctl status tomcat10
tail -f /var/log/tomcat10/catalina.out
```

To stop it: `sudo systemctl stop tomcat10`.

### 4g. Access the API endpoint

Browser or curl (GET only — browsers can't easily send POST/PUT/DELETE):

```bash
curl http://localhost:8080/todo/api/todos
```

You should get back a JSON array of 3 sample tasks.

### 4h. Test the API from Postman or Swagger

- **Swagger UI** (interactive API docs, built in — no extra setup):
  `http://localhost:8080/todo/swagger-ui/index.html`
  (raw OpenAPI spec at `http://localhost:8080/todo/v3/api-docs`)
- **Postman**: import `postman/Lab5-Todo-API.postman_collection.json` into
  Postman and run it (see step 5 for what it actually checks).

---

## 5. API Testing — Unit Testing (No Database) & Contract Testing *(Optional / Take-Home)*

**Unit / slice tests** (`backend/src/test/java/.../TodoControllerTest.java`)
run against a **mocked** `TodoRepository` — no real PostgreSQL connection is
made at all. They check controller logic: sorting, validation (`400` on a
blank title), `404` on a missing id, `201`/`204` on create/delete.

```bash
cd backend
mvn test
```

**Contract tests** verify the API's *shape* — status codes and response
field types — independent of the implementation, using the Postman
collection at `postman/Lab5-Todo-API.postman_collection.json`. Run it
either in the Postman GUI, or headlessly with Newman:

```bash
npx newman run postman/Lab5-Todo-API.postman_collection.json
```

By default it targets `http://localhost:3000/api` (through Caddy — see
step 8). To test the backend in isolation before Caddy is even running,
edit the collection's `baseUrl` variable to `http://localhost:8080/todo/api`.

| Test type | What it proves | Command |
|---|---|---|
| Unit / slice (Spring `@WebMvcTest`) | Controller logic is correct without a DB | `mvn test` |
| Contract (Postman/Newman) | The API's status codes & response shape match spec | `npx newman run postman/Lab5-Todo-API.postman_collection.json` |
| Manual (Swagger UI) | Exploratory — try requests by hand | Open `swagger-ui/index.html` in a browser |

---

## 6. Frontend (ReactJS) — Install and Configure

The lab machines already have `npm` installed via `apt`. Verify with
`npm --version`; if it's missing, `sudo apt install -y npm`.

```bash
cd frontend
npm install
npm run build
```

This compiles the React app into static assets at **`frontend/dist`** —
note this path down, you'll need it in step 8.

(Optional, for local development with hot reload: `npm run dev` — but note
the dev server does not proxy `/api`, so use the Caddy setup in step 8 for
full end-to-end testing.)

---

## 7. Frontend UI Testing (No Backend API) *(Optional / Take-Home)*

**Component/unit tests** (`frontend/src/**/__tests__/*.test.jsx` and
`frontend/src/App.test.jsx`) use React Testing Library with the network
mocked via MSW (Mock Service Worker) — no real backend is ever contacted.
They cover form validation, button/checkbox wiring, filter behavior, and
the 502 error banner (by mocking a 502 response).

```bash
cd frontend
npm run test         # run once
npm run test:watch   # re-run on file changes
```

**Static analysis** catches bugs (unused vars, hook-rule violations, etc.)
before the app even runs:

```bash
npm run lint
```

| Test type | What it proves | Command |
|---|---|---|
| Component/unit (RTL + Vitest) | Components behave correctly in isolation | `npm run test` |
| Mocked-network (MSW) | App logic (loading, error banner) works without a real API | included in `npm run test` — see `App.test.jsx` |
| Static analysis (ESLint) | No obvious bugs / bad patterns before runtime | `npm run lint` |

---

## 8. Webserver/Reverse Proxy (Caddy) — Install and Configure

The lab machines already have Caddy installed via `apt`. **Check it's
there:**

```bash
caddy version
```

**If it's not installed:**

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

> Note: `apt install caddy` also enables a system-wide `caddy.service`
> serving `/etc/caddy/Caddyfile` on ports 80/443. That's a separate
> instance from the one you'll run below — it won't conflict, since this
> project's Caddyfile listens on `:3000`.

**Either way**, open `caddy/Caddyfile` (marked `STUDENT TODO`) and check:

- `:3000` — the port Caddy listens on. Change it if `3000` is taken on your
  machine.
- `root * frontend/dist` — the frontend build output from step 6. No change
  needed unless you moved things around.
- `reverse_proxy localhost:8080` — update the port here if your Tomcat
  (step 4a) listens somewhere other than `8080`.

Validate the config before running it:

```bash
caddy validate --config ./caddy/Caddyfile
```

Then, **from the project root** (not from inside `caddy/` — the frontend
path above is relative to Caddy's working directory):

```bash
caddy run --config ./caddy/Caddyfile
```

Caddy will:
- Serve the built frontend (`frontend/dist`) on `http://localhost:3000`
- Proxy any `/api/*` request to the backend running on Tomcat
- Inject security headers (`X-Frame-Options`, `X-Content-Type-Options`,
  `X-XSS-Protection`) on every response

---

## 9. Webserver/Reverse Proxy Testing (No UI, No Backend API) *(Optional / Take-Home)*

These check Caddy's own behavior, independent of whether the frontend logic
or backend API are actually correct.

**Static file serving** — with the backend stopped, Caddy should still
serve the built frontend:

```bash
curl -I http://localhost:3000/
```

Expect `HTTP/1.1 200 OK`.

**Reverse proxy is actually proxying** (not just serving a static 404) —
with the backend stopped:

```bash
curl -i http://localhost:3000/api/todos
```

Expect `502 Bad Gateway`, **not** `404`. A 404 here would mean the
`handle /api/*` block isn't matching correctly.

**Security headers are injected:**

```bash
curl -I http://localhost:3000/
```

Expect to see `X-Frame-Options`, `X-Content-Type-Options`, and
`X-XSS-Protection` in the response headers.

**SPA fallback works** — an unknown path should still return the app shell,
not a 404:

```bash
curl -i http://localhost:3000/some/random/path
```

Expect `HTTP/1.1 200 OK` with `index.html` content.

| Test type | What it proves | Command |
|---|---|---|
| Config validation | Caddyfile syntax is correct | `caddy validate --config ./caddy/Caddyfile` |
| Static file serving | Frontend is served independent of the backend | `curl -I http://localhost:3000/` (backend stopped) |
| Reverse proxy routing | `/api/*` is forwarded, not swallowed | `curl -i http://localhost:3000/api/todos` (backend stopped, expect 502) |
| Security headers | Headers are actually present | `curl -I http://localhost:3000/` |
| SPA fallback | Unknown paths still serve the app | `curl -i http://localhost:3000/some/random/path` |

---

## 10. Test the Application from a Browser

**Ensure all three are up:**

```bash
sudo systemctl status postgresql
sudo systemctl status tomcat10
```

(and Caddy running in your terminal from step 8, via `caddy run --config ./caddy/Caddyfile`).

Then open `http://localhost:3000` and manually test every feature:

1. You should see the 3 seeded tasks (varying priority badges and due
   dates).
2. **Create**: add a task via the form (title, description, priority, due
   date).
3. **Read**: confirm it appears with the correct priority badge color
   (HIGH=red, MEDIUM=yellow, LOW=green).
4. **Update**: check the checkbox to mark it complete (strikethrough
   applies) and use Edit to change its details.
5. **Delete**: remove a task and confirm it disappears immediately.
6. **Filter**: use the All / Active / Completed tabs.
7. **Persistence**: restart Tomcat (`sudo systemctl restart tomcat10`) and
   reload — your data should still be there.
8. **Error handling**: stop Tomcat (`sudo systemctl stop tomcat10`) while
   Caddy is still running, reload or try an action — you should see:
   *"502 Bad Gateway: Backend API service is down or unreachable."*
   (Remember to `sudo systemctl start tomcat10` again afterwards.)
9. Verify directly in PostgreSQL:
   ```bash
   psql -U todouser -d tododb -h localhost -c "SELECT * FROM todo;"
   ```

---

## Observation Book

Answer these in your lab observation book. Write in your own words — these
are checking your understanding of *why* things work, not just that you
followed the steps.

**Core questions (answer these — based on steps 1–4, 6, 8, 10):**

1. Trace the path of a request when you click "Add Task" in the browser at
   `http://localhost:3000`. Which of the three tiers (Caddy, Spring
   Boot/Tomcat, PostgreSQL) handles each part of that request, and in what
   order?
2. What HTTP status code does the API return when you `POST` a todo with a
   blank title? Where in the code is that enforced, and why does it happen
   automatically without the controller writing an `if` check for it?
3. What status code does `GET /api/todos/{id}` return for an id that
   doesn't exist? Why 404 and not, say, an empty response with status 200?
4. `application.properties` sets `spring.jpa.hibernate.ddl-auto=update`.
   What would change if this were `create-drop` instead, and why would that
   be a bad choice for this lab specifically?
5. `data.sql` uses `INSERT ... ON CONFLICT (id) DO NOTHING`. What would go
   wrong on the *second* Tomcat restart if that `ON CONFLICT` clause were
   removed?
6. When you stopped Tomcat and reloaded the app (through Caddy), you saw a
   "502 Bad Gateway" banner. In your own words, explain why Caddy returns
   `502` here specifically, rather than `404` or hanging forever.
7. The `Caddyfile` has a note that `caddy run` must be executed **from the
   project root**, not from inside `caddy/`. Why does the directory you run
   the command from affect whether `root * frontend/dist` finds the right
   files?
8. Describe **one specific problem** you personally ran into during setup
   (a permission error, a wrong path, a port already in use, a typo — pick
   a real one) — what the error message said, how you diagnosed it, and
   what fixed it.
9. The `Todo` entity's table is named `todo` (singular), not `todos`. What
   specific problem was this naming choice designed to avoid?

**Bonus questions (only if you completed the optional steps 5, 7, and/or 9):**

10. What's the difference between a *unit test* and a *contract test*? Give
    one concrete example of each from this project.
11. Why do the frontend tests use MSW to fake the API instead of hitting
    the real backend? What would break about the tests if they *did* hit
    the real backend?
12. `curl -I http://localhost:3000/` and `curl -i http://localhost:3000/api/todos`
    (with the backend stopped) test two different things about Caddy. What
    is each one actually checking?

---

## API Reference

| Method | Path                        | Description                                  |
|--------|-----------------------------|-----------------------------------------------|
| GET    | `/api/todos`                | List all todos (`?sort=dueDate` or `?sort=priority`) |
| GET    | `/api/todos/{id}`           | Get a single todo (404 if not found)         |
| POST   | `/api/todos`                | Create a todo (201 Created)                  |
| PUT    | `/api/todos/{id}`           | Update a todo                                |
| DELETE | `/api/todos/{id}`           | Delete a todo (204 No Content)               |

Full interactive reference: Swagger UI at
`http://localhost:8080/todo/swagger-ui/index.html` once the backend is
running.
