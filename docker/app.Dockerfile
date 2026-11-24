# System under test in one container: the Angular production build is served by the
# zero-dependency Node.js API, so the web app and the REST API share one origin (http://app:3000).

# Stage 1 - production build of the Angular app
FROM node:22-alpine AS web-build
WORKDIR /web
COPY app-under-test/task-manager-web/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY app-under-test/task-manager-web/ ./
RUN npm run build

# Stage 2 - runtime
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
