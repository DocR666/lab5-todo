# Lab 5 — Full-Stack Todo App (Spring Boot + React + Caddy)

A 3-tier student lab: a Spring Boot REST API backed by PostgreSQL, a React
(Vite) frontend, and Caddy acting as a reverse proxy / static file server in
front of both.

```
├── backend/    Spring Boot REST API (deployed as a WAR to Tomcat)
├── frontend/   React (Vite) single-page app
├── caddy/      Caddyfile (reverse proxy + static hosting)
└── README.md   This guide
```

Architecture:

```
Browser --> Caddy (:3000) --> /api/*  --> Tomcat (:8080/todo) --> PostgreSQL (:5432)
                           --> /*      --> frontend/dist (static files)
```

## What you'll do in this lab

1. Fork and clone this repository.
2. Point the backend at **your** PostgreSQL server, then compile, build, and
   package the Spring Boot API as a WAR, and deploy it to Tomcat.
3. Compile and build the React frontend.
4. Update the Caddy config to point at your frontend build directory and
   your backend API endpoint.
5. Test the application end to end.
6. Complete the exercises (provided separately by your instructor).

Each of these is a numbered section below. Every file you actually need to
edit is marked with a `===== STUDENT TODO =====` comment block — search for
that string if you just want the list of things to change.

---

## 1. Fork & Clone

1. Fork this repository to your own GitHub account (use the **Fork** button
   on the repo page).
2. Clone your fork locally:

   ```bash
   git clone https://github.com/<your-username>/<repo-name>.git
   cd <repo-name>
   ```

3. You'll be working entirely inside this clone — `backend/`, `frontend/`,
   and `caddy/` are independent pieces you'll configure and run separately.

---

## 2. Backend: Configure, Build, Package, Deploy

### 2a. PostgreSQL Setup

Install PostgreSQL and make sure the server is running, then create the
database and a dedicated user:

```sql
-- Connect as a superuser, e.g.: psql -U postgres

CREATE DATABASE tododb;
CREATE USER todouser WITH PASSWORD 'TodoPass123!';
GRANT ALL PRIVILEGES ON DATABASE tododb TO todouser;

-- Connect to tododb and grant schema privileges (PostgreSQL 15+ requires this)
\c tododb
GRANT ALL ON SCHEMA public TO todouser;
```

> On Windows, if `psql` isn't recognized, add PostgreSQL's `bin` folder
> (e.g. `C:\Program Files\PostgreSQL\17\bin`) to your PATH, or call it by
> full path.

> **Table name note:** the `Todo` entity maps to a table named `todo`
> (singular — not `todos`), specifically to avoid colliding with any other
> app's `todos` table that might already exist in the same database. If
> you're certain your database is otherwise empty, you can rename it in
> `Todo.java` (`@Table(name = ...)`) and `data.sql`.

### 2b. Point the backend at your database

Edit `backend/src/main/resources/application.properties` — it's marked with
a `STUDENT TODO` block. Update the URL, username, and password to match the
database/role you just created (or your institution's shared DB server, if
you were given one):

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/tododb
spring.datasource.username=todouser
spring.datasource.password=TodoPass123!
```

### 2c. Install Tomcat (if you don't already have it)

Tomcat 10 is required (Jakarta EE namespace, matches Spring Boot 3). No
admin rights needed — the ZIP distribution works fine anywhere:

```powershell
Invoke-WebRequest -Uri "https://dlcdn.apache.org/tomcat/tomcat-10/v10.1.59/bin/apache-tomcat-10.1.59.zip" -OutFile "$env:USERPROFILE\Downloads\tomcat.zip"
Expand-Archive -Path "$env:USERPROFILE\Downloads\tomcat.zip" -DestinationPath "$env:USERPROFILE\tomcat" -Force

# point CATALINA_HOME / JAVA_HOME at your installs (persist with setx, or set per-session)
$env:CATALINA_HOME = "$env:USERPROFILE\tomcat\apache-tomcat-10.1.59"
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot"   # match your JDK 17 install
```

By default Tomcat listens on port `8080` — if yours uses a different port
(e.g. `8888`), remember that for step 4.

### 2d. Compile, build, and package the WAR

```bash
cd backend
mvn clean package -DskipTests
```

This produces `backend/target/todo.war`.

### 2e. Deploy to Tomcat

```bash
cp target/todo.war <TOMCAT_HOME>/webapps/todo.war
```

Tomcat unpacks it automatically and hosts the app under the context path
`/todo`. On startup, Hibernate creates/updates the `todo` table
(`ddl-auto=update`) and `data.sql` seeds 3 sample tasks (idempotent via
`ON CONFLICT (id) DO NOTHING`, so re-deploys won't duplicate or error).

Start Tomcat:

```powershell
& "$env:CATALINA_HOME\bin\startup.bat"      # starts in a new window, returns immediately
# or, to watch logs directly in the current terminal:
& "$env:CATALINA_HOME\bin\catalina.bat" run
```

To stop it: `& "$env:CATALINA_HOME\bin\shutdown.bat"`.

Sanity check directly against Tomcat (bypassing Caddy):

```bash
curl http://localhost:8080/todo/api/todos
```

You should get back a JSON array of 3 sample tasks.

---

## 3. Frontend: Compile & Build

```bash
cd frontend
npm install
npm run build
```

This compiles the React app into static assets at `frontend/dist`.

(Optional, for local development with hot reload: `npm run dev` — but note
the dev server does not proxy `/api`, so use the Caddy setup below for full
end-to-end testing.)

---

## 4. Caddy: Point It at Your Build & API

Open `caddy/Caddyfile` — it's marked with a `STUDENT TODO` block. There are
two things to check:

- `root * frontend/dist` — already points at the frontend build output from
  step 3. No change needed unless you moved things around.
- `reverse_proxy localhost:8080` — update the port if your Tomcat (step 2c)
  listens somewhere other than `8080`.

Install [Caddy](https://caddyserver.com/docs/install) if you don't have it,
then **from the project root** (not from inside `caddy/` — the path above is
relative to Caddy's working directory) run:

```bash
caddy run --config ./caddy/Caddyfile
```

Caddy will:
- Serve the built frontend (`frontend/dist`) on `http://localhost:3000`
- Proxy any `/api/*` request to the backend running on Tomcat
- Inject security headers (`X-Frame-Options`, `X-Content-Type-Options`,
  `X-XSS-Protection`) on every response

---

## 5. Test the Application

1. Open `http://localhost:3000` in a browser. You should see the 3 seeded
   tasks (varying priority badges and due dates).

2. Exercise full CRUD from the UI:
   - **Create**: add a task via the form (title, description, priority, due
     date).
   - **Read**: confirm it appears in the list with the correct priority
     badge color (HIGH=red, MEDIUM=yellow, LOW=green).
   - **Update**: check the checkbox to mark it complete (strikethrough
     applies) and use Edit to change its details.
   - **Delete**: remove a task and confirm it disappears immediately.
   - **Filter**: use the All / Active / Completed tabs to confirm filtering
     works.

3. Verify the data landed in PostgreSQL:

   ```bash
   psql -U todouser -d tododb -c "SELECT * FROM todo;"
   ```

4. Confirm persistence across a restart:

   ```powershell
   & "$env:CATALINA_HOME\bin\shutdown.bat"
   & "$env:CATALINA_HOME\bin\startup.bat"
   ```

   Reload `http://localhost:3000` — your previously created/edited tasks
   should still be there (thanks to `ddl-auto=update` and the
   `ON CONFLICT` seed data, nothing gets wiped or duplicated).

5. Test the error banner: stop Tomcat while Caddy is still running, then
   reload `http://localhost:3000` or try an action. Caddy returns `502 Bad
   Gateway`, and the frontend should show:
   *"502 Bad Gateway: Backend API service is down or unreachable."*

---

## 6. Exercises

Your instructor will provide a separate set of exercises building on this
working baseline. Make sure steps 1–5 above are fully working before
starting them.

---

## API Reference

| Method | Path                        | Description                                  |
|--------|-----------------------------|-----------------------------------------------|
| GET    | `/api/todos`                | List all todos (`?sort=dueDate` or `?sort=priority`) |
| GET    | `/api/todos/{id}`           | Get a single todo (404 if not found)         |
| POST   | `/api/todos`                | Create a todo (201 Created)                  |
| PUT    | `/api/todos/{id}`           | Update a todo                                |
| DELETE | `/api/todos/{id}`           | Delete a todo (204 No Content)               |
