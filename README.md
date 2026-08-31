# CCDL Todo App

A 3-tier full-stack lab project: a Spring Boot REST API backed by
PostgreSQL, a React (Vite) frontend, and Caddy acting as a reverse proxy /
static file server in front of both. Built up progressively across labs —
one evolving app, not a separate project per lab.

```
├── backend/    Spring Boot REST API (deployed as a WAR to Tomcat)
├── frontend/   React (Vite) single-page app
├── caddy/      Caddyfile (reverse proxy + static hosting)
├── postman/    Postman collection for API contract testing
├── e2e/        Playwright end-to-end tests (added in Lab 6)
├── docs/       Per-lab instructions — start here for your current lab
└── README.md   This file
```

Architecture:

```
Browser --> Caddy (:3000) --> /api/*  --> Tomcat (:8080/todo) --> PostgreSQL (:5432)
                           --> /*      --> frontend/dist (static files)
```

## Which lab are you on?

Each lab has its own instructions and Observation Book — go to the one
your instructor assigned:

- **[docs/LAB5.md](docs/LAB5.md)** — Full-Stack 3-Tier Application Deployment
- **[docs/LAB6.md](docs/LAB6.md)** — Full Testing Suite (unit / integration /
  contract / smoke / E2E) + Docker

Every file you actually need to edit is marked with a
`===== STUDENT TODO =====` comment block — search for that string if you
just want the list of things to change for your current lab.

## Starting a lab for the first time

```bash
git clone https://github.com/<your-username>/ccdl-todoapp.git
cd ccdl-todoapp
git remote add upstream https://github.com/mit-cse-pdc/ccdl-todoapp.git
git fetch upstream tag <lab-tag>          # e.g. lab5-starter, lab6-starter
git checkout -b master <lab-tag>
```

Then follow that lab's doc from `docs/`. When you're done, push to your
own fork:

```bash
git push -u origin master
```

(Always check out the specific tag for *your* lab — don't rely on
whatever `master` currently is, since it may already include later labs'
content.)
