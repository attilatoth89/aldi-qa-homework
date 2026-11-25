# QA Automation Engineer homework – ALDI

[![CI](https://github.com/attilatoth89/aldi-qa-homework/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/attilatoth89/aldi-qa-homework/actions/workflows/ci.yml)
[![Docker](https://github.com/attilatoth89/aldi-qa-homework/actions/workflows/docker.yml/badge.svg?branch=main&event=push)](https://github.com/attilatoth89/aldi-qa-homework/actions/workflows/docker.yml)

My solution to the homework assignment for the QA Automation Engineer position. Each task has its
own document in [`docs/`](docs), and all the code is executable: every push runs 70 automated
tests on GitHub Actions (48 API, 14 E2E in Chromium, 8 Selenium), and a nightly run adds Firefox
and WebKit to the E2E suite. A second workflow builds the Docker Compose environment and runs the
same suites in containers.

**Author:** Attila Tóth

| Task | Deliverable | Where |
| --- | --- | --- |
| **1 – Manual testing** | 3 test cases for "Add to Shopping List" on aldi.us (positive and negative), the test case fields, the bug report fields and a sample bug report. Based on an exploratory session on the live site; the test cases were also run by hand, and the sample bug is a real issue found in that run | [docs/task-1-manual-testing.md](docs/task-1-manual-testing.md) |
| **2 – Frontend testing** | Setup steps and a Playwright + TypeScript E2E suite for the Angular **Login** (successful login, invalid password, validation, security, session): 14 tests | [docs/task-2-frontend-testing.md](docs/task-2-frontend-testing.md), [`playwright-tests/tests/e2e`](playwright-tests/tests/e2e) |
| **3 – API testing** | Playwright API suite for `POST /tasks`, `GET`, `PUT`, `DELETE /tasks/{id}` with the expected status codes and responses: 38 tests, plus 10 login API tests | [docs/task-3-api-testing.md](docs/task-3-api-testing.md), [`playwright-tests/tests/api`](playwright-tests/tests/api) |
| **Bonus – Docker** | What Docker is and why it helps QA, plus a Docker Compose test environment that a GitHub Actions workflow builds and runs | [docs/bonus-docker.md](docs/bonus-docker.md), [`docker-compose.yml`](docker-compose.yml) |
| **Bonus – JUnit + Selenium** | Maven project (Java 21, JUnit 5, Selenium 4) for the **Delete Task** feature: 8 tests | [docs/bonus-junit-selenium.md](docs/bonus-junit-selenium.md), [`selenium-junit-tests`](selenium-junit-tests) |
| **Bonus – CI** | GitHub Actions pipeline for every push and pull request with a nightly cross-browser run, plus Jenkins and GitLab CI examples | [docs/bonus-ci.md](docs/bonus-ci.md), [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |

## Quick start

Prerequisites: **Node.js 22 LTS** with npm. Optional: Java 21 and Maven 3.9 for the Selenium
suite, Docker for the containerised run.

```bash
npm run setup    # installs the Angular app, the Playwright project and the browsers
npm test         # 48 API tests + 14 E2E tests in Chromium; the app starts automatically
```

| Command (repository root) | What it does |
| --- | --- |
| `npm run test:api` | API suite only (no browser, no Angular needed) |
| `npm run test:e2e` | Login E2E suite in Chromium |
| `npm run test:cross-browser` | API + E2E in Chromium, Firefox and WebKit |
| `npm run start:app`, then `npm run test:selenium` in a second terminal | Builds and serves the app on :3000, then runs the Selenium + JUnit suite |
| `docker compose run --rm playwright-tests` | Playwright suites in containers |
| `docker compose --profile selenium run --rm selenium-tests` | Selenium suite in containers |

Reports: `playwright-tests/reports/html` (open with `npm run report --prefix playwright-tests`) and
`selenium-junit-tests/target/surefire-reports`.

## Repository structure

```text
.
├── docs/                      answers and explanations per task (+ screenshots of aldi.us)
├── app-under-test/            the system under test (see app-under-test/README.md)
│   ├── task-api/              REST API: login + tasks (Node.js, no dependencies)
│   └── task-manager-web/      Angular 21 app: login + task list with delete
├── playwright-tests/          Task 2 + Task 3: Playwright + TypeScript
│   ├── playwright.config.ts   projects api / chromium / firefox / webkit, webServer, reporters
│   ├── src/                   config, test data, page objects, API clients, fixtures, assertions
│   └── tests/                 e2e/login.spec.ts, api/tasks.api.spec.ts, api/auth.api.spec.ts
├── selenium-junit-tests/      Bonus: Maven, JUnit 5, Selenium 4 (Delete Task)
├── docker/, docker-compose.yml
├── .github/workflows/ci.yml   CI pipeline
└── ci-examples/               Jenkinsfile, .gitlab-ci.yml
```

## Key decisions

- **Executable out of the box.** The assignment describes an Angular app and a task API but
  provides neither, so the repository contains small versions of both. `playwright.config.ts`
  starts them, so `npm test` needs no manual setup.
- **The same tests run against any environment.** `BASE_URL`, `API_URL` and the `TEST_USER_*`
  variables switch the target and the credentials. When they are set, the local servers are not
  started.
- **The test pyramid in practice.** The API suite checks the contract cheaply and thoroughly (status
  codes, validation, authorisation, response schema). The UI suite checks the user journeys. The
  Selenium suite arranges and verifies through the API and acts in the browser.
- **Reliable by design.** No fixed waits; web-first assertions or explicit waits; every test
  creates its own uniquely named data and cleans it up; tests run in parallel in any order.
- **Useful failures.** Trace on retry, screenshots and video on failure, an HTML report locally,
  and JUnit XML and pull-request annotations on CI.

## Tech stack

| Area | Tools |
| --- | --- |
| Test automation | Playwright 1.63 with TypeScript; Selenium 4.54 + JUnit 5.14 (Java 21, Maven) |
| System under test | Angular 21, Node.js 22 |
| Environment and CI | Docker / Docker Compose, GitHub Actions (with Jenkins and GitLab CI examples) |

> The demo accounts (`demo@example.com` / `Demo123!`, `other@example.com` / `Other123!`) exist
> only in the local demo API.
