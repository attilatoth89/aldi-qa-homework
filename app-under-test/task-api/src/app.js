import { AuthService } from './auth.js';
import { HttpError, methodNotAllowed, readJsonBody, sendError, sendJson, sendNoContent } from './http.js';
import { serveStatic } from './static.js';
import { TaskStore, assertValidTaskId, validateTaskInput } from './tasks.js';

const API_PREFIX = '/api';
const TASK_ROUTE = /^\/tasks\/([^/]+)$/;

/**
 * Creates the request handler.
 * All API routes live under /api (e.g. POST /api/tasks). Everything else is served from `staticDir`
 * (the Angular production build) when it is configured, so one process can host the whole app.
 */
export function createApp({ staticDir, logRequests = false, tokenTtlSeconds } = {}) {
  const auth = new AuthService({ tokenTtlSeconds });
  const tasks = new TaskStore();

  async function handleApi(req, res, route) {
    const { method } = req;

    if (route === '/health') {
      if (method !== 'GET') throw methodNotAllowed(method, route, ['GET']);
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (route === '/auth/login') {
      if (method !== 'POST') throw methodNotAllowed(method, route, ['POST']);
      const body = await readJsonBody(req);
      sendJson(res, 200, auth.login(body));
      return;
    }

    if (route === '/tasks') {
      if (method !== 'GET' && method !== 'POST') throw methodNotAllowed(method, route, ['GET', 'POST']);
      const user = auth.authenticate(req);

      if (method === 'GET') {
        sendJson(res, 200, tasks.list(user.id));
        return;
      }
      const input = validateTaskInput(await readJsonBody(req));
      const created = tasks.create(user.id, input);
      sendJson(res, 201, created, { Location: `${API_PREFIX}/tasks/${created.id}` });
      return;
    }

    const taskMatch = TASK_ROUTE.exec(route);
    if (taskMatch) {
      if (!['GET', 'PUT', 'DELETE'].includes(method)) {
        throw methodNotAllowed(method, '/tasks/{id}', ['GET', 'PUT', 'DELETE']);
      }
      const user = auth.authenticate(req);

      let id;
      try {
        id = decodeURIComponent(taskMatch[1]);
      } catch {
        throw new HttpError(400, 'INVALID_ID', 'Task id must be a UUID.');
      }
      assertValidTaskId(id);

      if (method === 'GET') {
        sendJson(res, 200, tasks.find(user.id, id));
        return;
      }
      if (method === 'PUT') {
        tasks.find(user.id, id); // 404 before reading the body
        const input = validateTaskInput(await readJsonBody(req));
        sendJson(res, 200, tasks.replace(user.id, id, input));
        return;
      }
      tasks.delete(user.id, id);
      sendNoContent(res);
      return;
    }

    throw new HttpError(404, 'NOT_FOUND', `Route ${method} ${API_PREFIX}${route} not found.`);
  }

  return async function handleRequest(req, res) {
    const startedAt = Date.now();
    try {
      const { pathname } = new URL(req.url ?? '/', 'http://localhost');

      if (pathname === API_PREFIX || pathname.startsWith(`${API_PREFIX}/`)) {
        await handleApi(req, res, pathname.slice(API_PREFIX.length) || '/');
      } else if (staticDir && (req.method === 'GET' || req.method === 'HEAD')) {
        await serveStatic(req, res, staticDir, pathname);
      } else {
        throw new HttpError(404, 'NOT_FOUND', `Route ${req.method} ${pathname} not found.`);
      }
    } catch (error) {
      sendError(res, error);
    } finally {
      if (logRequests) {
        console.log(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - startedAt} ms)`);
      }
    }
  };
}
