import { existsSync } from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
// Without an explicit host Node listens on "::" (IPv4 + IPv6) when available, so "localhost" works everywhere.
const host = process.env.HOST || undefined;

// Serve the Angular production build too: STATIC_DIR if set, otherwise the build output next to this API (if built).
const defaultWebBuild = fileURLToPath(new URL('../../task-manager-web/dist/task-manager-web/browser', import.meta.url));
const staticDir = process.env.STATIC_DIR || (existsSync(defaultWebBuild) ? defaultWebBuild : undefined);

const server = http.createServer(
  createApp({
    staticDir,
    logRequests: process.env.LOG_REQUESTS === 'true',
    tokenTtlSeconds: Number(process.env.TOKEN_TTL_SECONDS ?? 3600),
  }),
);

server.listen(port, host, () => {
  console.log(`Task API listening on http://localhost:${port}/api`);
  if (staticDir) console.log(`Serving the web app from ${staticDir} on http://localhost:${port}/`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
  });
}
