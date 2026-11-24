# Bonus – Docker

## What Docker is

Docker packages an application with everything it needs to run (runtime, libraries, OS
packages, configuration) into an **image**. A **container** is a running instance of an image:
an isolated process that shares the host's kernel. It starts in seconds and is much lighter than
a virtual machine.

Images are built in layers from a `Dockerfile`, versioned with tags and shared through
registries (Docker Hub, Microsoft Container Registry, a company registry). **Docker Compose**
describes several containers in one YAML file (application, database, test runner, browser
grid) together with their network, startup order and health checks.

## Why it is useful for a QA engineer

| Benefit | In practice |
| --- | --- |
| **The same environment everywhere** | The laptop, the CI runner and a colleague's machine run identical images, so "works on my machine" goes away and failures can be reproduced. |
| **Pinned tool versions** | The Playwright image contains the browsers and OS libraries that match the Playwright version; the JDK and Maven versions are fixed too. No more "the browser updated overnight". |
| **Disposable test environments** | Start the application, a database and mocks for one run, test against a known state, then throw everything away: no leftover data and no fights over a shared test server. |
| **Dependencies on demand** | Databases, message brokers, mock servers (e.g. WireMock) or a Selenium Grid start with one command, without installing anything. |
| **Parallel, scalable execution** | Run several test containers, or a grid with several browser nodes. |
| **Testing specific versions** | Run the exact image that goes to production, or an older one to reproduce a customer's bug. |
| **Quick onboarding and CI portability** | `docker compose run …` replaces a setup wiki, and the same compose file runs in GitHub Actions, GitLab CI or Jenkins. |

## The example in this repository

```text
docker-compose.yml
├── task-app          docker/app.Dockerfile                        Angular build + REST API on :3000, with a health check
├── playwright-tests  docker/playwright.Dockerfile                 mcr.microsoft.com/playwright:v1.63.0-noble
├── selenium-chrome   selenium/standalone-chrome:4.54.0-20261124   Selenium Grid with Chrome     (profile "selenium")
└── selenium-tests    maven:3.9-eclipse-temurin-21                 runs the JUnit suite against it (profile "selenium")
```

**The application image** ([`docker/app.Dockerfile`](../docker/app.Dockerfile)) is a multi-stage
build. The first stage compiles the Angular app on Debian, the same libc as the CI runners, so the
platform-specific build tools from the lockfile are the ones CI already uses. The runtime stage is a
small Alpine image with only Node.js, the API and the static build, and it runs as a non-root user.
A `HEALTHCHECK` calls `/api/health`.

**The test runner image** ([`docker/playwright.Dockerfile`](../docker/playwright.Dockerfile)):

```dockerfile
FROM mcr.microsoft.com/playwright:v1.63.0-noble   # same version as @playwright/test
WORKDIR /tests
COPY playwright-tests/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY playwright-tests/ ./
ENV CI=true
ENTRYPOINT ["npx", "playwright", "test"]
CMD ["--project=api", "--project=chromium"]
```

**Orchestration** ([`docker-compose.yml`](../docker-compose.yml), excerpt):

```yaml
playwright-tests:
  build: { context: ., dockerfile: docker/playwright.Dockerfile }
  depends_on:
    task-app:
      condition: service_healthy # tests start only when the app answers, no sleep
  environment:
    BASE_URL: http://task-app:3000 # an external target, so the config does not start local servers
    API_URL: http://task-app:3000/api
  ipc: host
  volumes:
    - ./playwright-tests/reports:/tests/reports # HTML + JUnit reports end up on the host
```

### Running it

```bash
docker compose run --rm playwright-tests                          # API + Chromium E2E
docker compose run --rm playwright-tests --project=firefox        # any Playwright arguments
docker compose --profile selenium run --rm selenium-tests         # Selenium + JUnit via the Chrome container
docker compose --profile selenium down -v                         # clean up
```

`run` starts the dependencies first and waits for their health checks. The exit code of the test
container becomes the exit code of the command, so a CI job fails when a test fails.

### Verified on GitHub Actions

[`.github/workflows/docker.yml`](../.github/workflows/docker.yml) runs exactly these commands on a
GitHub runner whenever the Docker setup or the dependencies change, and on demand: it builds the
images, runs the Playwright suites and the Selenium suite in containers, prints the container logs
when something fails and uploads the reports.

## Practices applied

- Image tags are pinned: the Playwright image equals the `@playwright/test` version, and the
  Selenium Grid image equals the Selenium client version in `pom.xml`.
- Multi-stage build, `.dockerignore` (no `node_modules` or reports in the build context),
  non-root runtime user.
- Health checks with `depends_on: condition: service_healthy` instead of fixed waits.
- The application service is called `task-app`, not `app`. `.app` is an HSTS-preloaded top-level
  domain, and Chrome applies that rule to the plain hostname `app` as well, so `http://app:3000`
  is forced to HTTPS and fails with `ERR_SSL_PROTOCOL_ERROR`. The Selenium suite in the Chrome
  container hit exactly this on its first run.
- `ipc: host` for Chromium (recommended by Playwright) and `shm_size: 2gb` for the Selenium
  Chrome container, so browsers do not crash on a small `/dev/shm`.
- Reports are written to mounted volumes; credentials come from environment variables at run
  time and are never baked into an image.
