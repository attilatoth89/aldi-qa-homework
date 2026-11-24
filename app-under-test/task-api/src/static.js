import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from './http.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

/**
 * Serves the production build of the Angular app (single-page application).
 * Unknown paths without a file extension fall back to index.html so client-side routes work.
 */
export async function serveStatic(req, res, rootDir, urlPath) {
  const root = path.resolve(rootDir);

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    throw new HttpError(400, 'BAD_REQUEST', 'Malformed URL.');
  }

  let filePath = path.resolve(root, `.${decodedPath}`);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    throw new HttpError(404, 'NOT_FOUND', 'File not found.'); // path traversal attempt
  }

  if (!(await fileExists(filePath))) {
    const looksLikeFile = path.extname(decodedPath) !== '';
    if (looksLikeFile) {
      throw new HttpError(404, 'NOT_FOUND', 'File not found.');
    }
    filePath = path.join(root, 'index.html');
  }

  const extension = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream',
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  await new Promise((resolve, reject) => {
    createReadStream(filePath).on('error', reject).on('end', resolve).pipe(res);
  });
}
