# System under test

The assignment describes an Angular web application with a login and a task management REST
API, but provides neither. This folder contains small, self-contained versions of both, so every
automated test in the repository can be executed locally, in Docker and in CI. They stand in for
the real system: the tests only depend on the documented behaviour and on stable test hooks, and
`BASE_URL` / `API_URL` point them at another environment.

| Folder | What it is |
| --- | --- |
| [`task-api`](task-api) | REST API on Node.js, **no dependencies**, data in memory: `POST /api/auth/login`, `GET/POST /api/tasks`, `GET/PUT/DELETE /api/tasks/{id}`, `GET /api/health`. It also serves the Angular production build when one exists. |
| [`task-manager-web`](task-manager-web) | Angular 21 app (standalone components, signals, zoneless change detection, reactive forms, functional guard and interceptor): **Login** page and **My tasks** page with add and delete (confirmation dialog). |

Demo accounts: `demo@example.com` / `Demo123!` and `other@example.com` / `Other123!`.

## Running it

Development mode, from the repository root: the API runs on :3000 and the Angular dev server
on :4200, which proxies `/api` to the API.

```bash
# Terminal 1
npm start --prefix app-under-test/task-api

# Terminal 2
npm install --prefix app-under-test/task-manager-web
npm start --prefix app-under-test/task-manager-web    # http://localhost:4200
```

Production-like mode: one process serves the built app and the API on :3000.

```bash
npm run start:app                                     # http://localhost:3000
```

The Playwright config starts both servers automatically, so this is only needed for manual
exploration or for the Selenium suite.

## API settings (environment variables)

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | IPv4 + IPv6 on all interfaces | Bind address |
| `STATIC_DIR` | `../task-manager-web/dist/task-manager-web/browser` if it exists | Folder of the web build to serve |
| `TOKEN_TTL_SECONDS` | `3600` | Lifetime of access tokens |
| `LOG_REQUESTS` | `false` | Log every request with its status code and duration |

The full API contract, with the expected status codes, is in
[docs/task-3-api-testing.md](../docs/task-3-api-testing.md). The login behaviour (acceptance
criteria) is in [docs/task-2-frontend-testing.md](../docs/task-2-frontend-testing.md).
