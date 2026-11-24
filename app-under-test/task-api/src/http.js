/**
 * Small HTTP helpers so the API can run on plain Node.js without any dependency.
 */

export class HttpError extends Error {
  /**
   * @param {number} status   HTTP status code
   * @param {string} code     machine-readable error code, e.g. "VALIDATION_ERROR"
   * @param {string} message  human-readable message
   * @param {object} [options]
   * @param {Array<{field: string, message: string}>} [options.details]
   * @param {Record<string, string>} [options.headers]
   */
  constructor(status, code, message, { details, headers } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers ?? {};
  }
}

export function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

export function sendNoContent(res, headers = {}) {
  res.writeHead(204, { 'Cache-Control': 'no-store', ...headers });
  res.end();
}

export function sendError(res, error) {
  if (res.headersSent) {
    res.destroy(error);
    return;
  }
  if (error instanceof HttpError) {
    const body = { error: error.code, message: error.message };
    if (error.details?.length) body.details = error.details;
    sendJson(res, error.status, body, error.headers);
    return;
  }
  console.error('Unexpected error while handling the request:', error);
  sendJson(res, 500, { error: 'INTERNAL_ERROR', message: 'Unexpected server error.' });
}

/**
 * Reads and parses a JSON request body.
 * 415 - wrong Content-Type, 413 - body too large, 400 - empty / malformed JSON or not an object.
 */
export function readJsonBody(req, { limitBytes = 100 * 1024 } = {}) {
  const contentType = req.headers['content-type'] ?? '';
  if (!/^application\/json\b/i.test(contentType)) {
    // Drain the request so the client is not left waiting.
    req.resume();
    return Promise.reject(
      new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.'),
    );
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        tooLarge = true;
        return; // keep draining, but stop collecting
      }
      chunks.push(chunk);
    });

    req.on('error', reject);

    req.on('end', () => {
      if (tooLarge) {
        reject(new HttpError(413, 'PAYLOAD_TOO_LARGE', `Request body must not exceed ${limitBytes} bytes.`));
        return;
      }
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (raw === '') {
        reject(new HttpError(400, 'INVALID_JSON', 'Request body must not be empty.'));
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        reject(new HttpError(400, 'INVALID_JSON', 'Request body is not valid JSON.'));
        return;
      }
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        reject(new HttpError(400, 'VALIDATION_ERROR', 'Request body must be a JSON object.'));
        return;
      }
      resolve(parsed);
    });
  });
}

export function methodNotAllowed(method, route, allowed) {
  return new HttpError(405, 'METHOD_NOT_ALLOWED', `Method ${method} is not allowed on ${route}.`, {
    headers: { Allow: allowed.join(', ') },
  });
}
