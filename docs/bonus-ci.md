# Bonus – CI integration

## 1. Goals

- Every commit and pull request gets **automatic, fast feedback** (within minutes).
- `main` stays releasable: a pull request cannot be merged while a required check is red.
- The full, slower regression (all browsers) still runs regularly.
- Results are easy to read: which test failed, why, with trace, screenshot and logs.

## 2. The pipeline in this repository (GitHub Actions)

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every **pull request**, on every
**push to `main`**, **nightly** (schedule) and **manually** (`workflow_dispatch`).

```text
pull_request / push ──┬── api-tests        npm ci → type-check → 48 API tests                      (~1 min)
                      ├── e2e-tests        Angular + Playwright install → Login tests in Chromium
                      └── selenium-tests   Angular build → app on :3000 → mvn test (headless Chrome)
nightly schedule ─────── the same jobs, e2e-tests as a matrix: Chromium + Firefox + WebKit
```

| Job | What happens |
| --- | --- |
| **api-tests** | Checkout, Node 22 with npm cache, `npm ci`, `tsc --noEmit`, `playwright test --project=api`. `playwright.config.ts` starts the API itself. |
| **e2e-tests** | Installs the Angular app and only the browser it needs (`npx playwright install --with-deps <browser>`). The config starts the API and `ng serve`. |
| **selenium-tests** | Java 21 with Maven cache; builds the Angular app, starts it with the API in the background, waits for `/api/health`, then runs `mvn test`. |
| All jobs | The HTML report, the JUnit XML, traces and screenshots are uploaded as artifacts (`if: !cancelled()`, so also when tests fail). |

The jobs run **in parallel**. `concurrency` cancels a run that a newer commit has made outdated,
and `fail-fast: false` lets every browser finish so that all failures are visible.

A second workflow, [`.github/workflows/docker.yml`](../.github/workflows/docker.yml), checks the
Docker Compose test environment: when the Docker setup or the dependencies change (and on demand)
it builds the images and runs both suites in containers. It is separate from `ci.yml`, so the
fast feedback on every commit does not wait for image builds.

## 3. Processes and tools that keep it reliable

| Area | Practice |
| --- | --- |
| **Quality gate** | Branch protection on `main`: the jobs are *required status checks*, together with a code review. |
| **Test selection** | Fast checks on every pull request (API + Chromium; the `@smoke` tag for very large suites) and the full cross-browser regression nightly. |
| **Speed** | Parallel jobs, a browser matrix, Playwright workers, and `--shard=x/n` for big suites (see the GitLab example). |
| **Stability** | `retries: 2` **only on CI**, with a trace recorded on the first retry; `forbidOnly` so a forgotten `test.only` fails the build. Flaky tests get a ticket and are fixed or quarantined, not ignored. Tests are independent, with no shared state. |
| **Reporting** | The Playwright `github` reporter annotates failures on the pull request; JUnit XML feeds the CI test view (Jenkins `junit`, GitLab `reports:junit`) and can be imported into **Jira Xray** as a test execution. |
| **Environments and secrets** | By default the system under test is started inside the job (Playwright `webServer` or Docker Compose). For a shared staging environment the same suite gets `BASE_URL` / `API_URL`, and the credentials come from **CI secrets**, never from the repository. |
| **Notifications** | A failing `main` or nightly run posts to the team channel (Teams or Slack) with a link to the report. |
| **Dependencies** | npm and Maven caches; `npm ci` with a committed `package-lock.json` for reproducible installs; Dependabot or Renovate to keep Playwright, Selenium and the actions up to date. |

## 4. Tools I have used or know

**GitLab CI (used in my previous role).** I built the GitLab pipelines for a suite of about 500
automated tests, with `@smoke` and `@regression` tags so the right subset could be run when
needed. The full run had grown to 4–8 hours. I reviewed and fixed the flaky and failing tests,
which cut several hours from the run, and splitting it across 4 parallel GitLab jobs brought the
whole suite under one hour. The same idea, sharded jobs with JUnit reports, is in
[`ci-examples/.gitlab-ci.yml`](../ci-examples/.gitlab-ci.yml):

```yaml
e2e-regression:
  extends: .playwright
  parallel:
    matrix:
      - BROWSER: [chromium, firefox, webkit]
        SHARD: ["1/4", "2/4", "3/4", "4/4"]
  before_script:
    - (cd app-under-test/task-manager-web && npm ci)
    - cd playwright-tests
    - npm ci
  script:
    - npx playwright test --project=$BROWSER --shard=$SHARD
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

**GitHub Actions** is the pipeline of this repository (above). It runs automatically once the
repository is pushed to GitHub.

**Jenkins:** [`ci-examples/Jenkinsfile`](../ci-examples/Jenkinsfile) is a declarative pipeline that
runs both suites through `docker-compose.yml` on a Docker agent. It publishes the JUnit results
with the `junit` step and archives the Playwright report and the screenshots:

```groovy
stage('Playwright: API + E2E') {
  steps { sh 'docker compose run --rm playwright-tests --project=api --project=chromium' }
}
stage('Selenium + JUnit: Delete Task') {
  steps { sh 'docker compose --profile selenium run --rm selenium-tests' }
}
post {
  always {
    junit testResults: 'playwright-tests/reports/junit.xml, selenium-junit-tests/target/surefire-reports/*.xml',
          allowEmptyResults: true
  }
}
```
