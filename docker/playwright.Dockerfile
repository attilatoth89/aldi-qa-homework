# Playwright test runner. The official image already contains Node.js, the browsers and every
# OS library they need. Keep the tag in sync with the @playwright/test version in package.json.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /tests
COPY playwright-tests/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY playwright-tests/ ./

ENV CI=true
ENTRYPOINT ["npx", "playwright", "test"]
# Default selection; override it, e.g.: docker compose run --rm playwright-tests --project=firefox
CMD ["--project=api", "--project=chromium"]
