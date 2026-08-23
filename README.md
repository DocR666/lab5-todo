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

**Check if PostgreSQL is installed:**

```bash
psql --version
```

> On Windows, if `psql` isn't recognized, either PostgreSQL isn't installed
> yet, or its `bin` folder just isn't on your PATH (e.g.
> `C:\Program Files\PostgreSQL\17\bin`).

**If it's not installed**, install PostgreSQL from
[postgresql.org/download](https://www.postgresql.org/download/) (or your
platform's package manager) and make sure the service is running before
continuing.

**Either way**, log in as a superuser and create the database, a dedicated
role, and grant it the permissions it needs:

```sql
-- psql -U postgres

CREATE DATABASE tododb;
CREATE USER todouser WITH PASSWORD 'TodoPass123!';
GRANT ALL PRIVILEGES ON DATABASE tododb TO todouser;

-- Connect to tododb and grant schema privileges (PostgreSQL 15+ requires this)
\c tododb
GRANT ALL ON SCHEMA public TO todouser;
```

> **Table name note:** the `Todo` entity maps to a table named `todo`
> (singular), specifically to avoid colliding with any other app's `todos`
> table that might already exist in the same database.

---

## 4. Backend REST API (Spring Boot) — Install, Configure, Build, Deploy

### 4a. Check if Tomcat is installed

```bash
catalina.sh version    # or catalina.bat version on Windows, if it's on PATH
```

**If it's not installed** (Tomcat 10 is required — Jakarta EE namespace,
matches Spring Boot 3):

```powershell
Invoke-WebRequest -Uri "https://dlcdn.apache.org/tomcat/tomcat-10/v10.1.59/bin/apache-tomcat-10.1.59.zip" -OutFile "$env:USERPROFILE\Downloads\tomcat.zip"
Expand-Archive -Path "$env:USERPROFILE\Downloads\tomcat.zip" -DestinationPath "$env:USERPROFILE\tomcat" -Force

$env:CATALINA_HOME = "$env:USERPROFILE\tomcat\apache-tomcat-10.1.59"
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot"   # match your JDK 17 install
```

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

```bash
cd backend
mvn clean package
```

This compiles the code, **runs the unit/contract tests** (see step 5), and
produces `backend/target/todo.war`. If you just want the WAR without
running tests, use `mvn clean package -DskipTests`.

### 4e. Deploy to Tomcat

```bash
cp target/todo.war <TOMCAT_HOME>/webapps/todo.war
```

Tomcat unpacks it automatically and hosts the app under the context path
`/todo`.

### 4f. Start Tomcat

```powershell
& "$env:CATALINA_HOME\bin\startup.bat"      # starts in a new window, returns immediately
# or, to watch logs directly in the current terminal:
& "$env:CATALINA_HOME\bin\catalina.bat" run
```

To stop it: `& "$env:CATALINA_HOME\bin\shutdown.bat"`.

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

## 5. API Testing — Unit Testing (No Database) & Contract Testing

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

## 7. Frontend UI Testing (No Backend API)

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

**Check if Caddy is installed:**

```bash
caddy version
```

**If it's not installed**, get it from
[caddyserver.com/docs/install](https://caddyserver.com/docs/install) (e.g.
`winget install CaddyServer.Caddy` on Windows).

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

## 9. Webserver/Reverse Proxy Testing (No UI, No Backend API)

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

**Ensure all three are up:** PostgreSQL (step 3), Tomcat (step 4f), Caddy
(step 8).

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
7. **Persistence**: restart Tomcat
   (`shutdown.bat` then `startup.bat`) and reload — your data should still
   be there.
8. **Error handling**: stop Tomcat while Caddy is still running, reload or
   try an action — you should see: *"502 Bad Gateway: Backend API service
   is down or unreachable."*
9. Verify directly in PostgreSQL:
   ```bash
   psql -U todouser -d tododb -c "SELECT * FROM todo;"
   ```

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
