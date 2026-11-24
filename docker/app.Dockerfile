# System under test in one container: the Angular production build is served by the
# zero-dependency Node.js API, so the web app and the REST API share one origin
# (http://task-app:3000 in docker-compose.yml).

# Stage 1 - production build of the Angular app. Debian-based, the same libc as the CI runners,
# so the platform-specific build tools from the lockfile (esbuild, Rollup) are the ones CI uses.
FROM node:22-slim AS web-build
ENV NG_CLI_ANALYTICS=false
WORKDIR /web
COPY app-under-test/task-manager-web/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY app-under-test/task-manager-web/ ./
RUN npm run build

# Stage 2 - runtime: a small image with only Node.js, the API and the static build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    STATIC_DIR=/app/public
COPY app-under-test/task-api/ ./
COPY --from=web-build /web/dist/task-manager-web/browser ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --retries=12 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "src/server.js"]
