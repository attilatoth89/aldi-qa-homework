import { randomUUID } from 'node:crypto';
import { HttpError } from './http.js';

export const TASK_STATUSES = ['todo', 'in_progress', 'done'];
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidCalendarDate(value) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Validates a create (POST) or full-replace (PUT) payload.
 * Only client-editable fields are read: id, createdAt and updatedAt are always set by the server.
 */
export function validateTaskInput(body) {
  const details = [];

  let title = body.title;
  if (title === undefined || title === null) {
    details.push({ field: 'title', message: 'Title is required.' });
  } else if (typeof title !== 'string') {
    details.push({ field: 'title', message: 'Title must be a string.' });
  } else {
    title = title.trim();
    if (title.length === 0) {
      details.push({ field: 'title', message: 'Title must not be empty.' });
    } else if (title.length > TITLE_MAX_LENGTH) {
      details.push({ field: 'title', message: `Title must be at most ${TITLE_MAX_LENGTH} characters.` });
    }
  }

  let description = body.description ?? '';
  if (typeof description !== 'string') {
    details.push({ field: 'description', message: 'Description must be a string.' });
  } else if (description.length > DESCRIPTION_MAX_LENGTH) {
    details.push({
      field: 'description',
      message: `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`,
    });
  }

  const status = body.status ?? 'todo';
  if (!TASK_STATUSES.includes(status)) {
    details.push({ field: 'status', message: `Status must be one of: ${TASK_STATUSES.join(', ')}.` });
  }

  const dueDate = body.dueDate ?? null;
  if (dueDate !== null && (typeof dueDate !== 'string' || !isValidCalendarDate(dueDate))) {
    details.push({ field: 'dueDate', message: 'Due date must be a valid date in YYYY-MM-DD format.' });
  }

  if (details.length) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed.', { details });
  }
  return { title, description, status, dueDate };
}

export function assertValidTaskId(id) {
  if (!UUID_PATTERN.test(id)) {
    throw new HttpError(400, 'INVALID_ID', 'Task id must be a UUID.');
  }
}

/** Strips internal fields (the owner) from the stored task. */
function toPublic(task) {
  const { ownerId: _ownerId, ...publicFields } = task;
  return publicFields;
}

/** In-memory task repository. Every task belongs to the user who created it. */
export class TaskStore {
  /** @type {Map<string, object>} */
  #tasks = new Map();

  list(ownerId) {
    return [...this.#tasks.values()].filter((task) => task.ownerId === ownerId).map(toPublic);
  }

  create(ownerId, input) {
    const now = new Date().toISOString();
    const task = { id: randomUUID(), ...input, createdAt: now, updatedAt: now, ownerId };
    this.#tasks.set(task.id, task);
    return toPublic(task);
  }

  find(ownerId, id) {
    return toPublic(this.#getOwnedTask(ownerId, id));
  }

  replace(ownerId, id, input) {
    const existing = this.#getOwnedTask(ownerId, id);
    // updatedAt is always strictly later than the previous value, even within the same millisecond.
    const previous = Date.parse(existing.updatedAt);
    const updatedAt = new Date(Math.max(Date.now(), previous + 1)).toISOString();
    const updated = { ...existing, ...input, updatedAt };
    this.#tasks.set(id, updated);
    return toPublic(updated);
  }

  delete(ownerId, id) {
    this.#getOwnedTask(ownerId, id);
    this.#tasks.delete(id);
  }

  /** Returns the stored task or throws 404. Other users' tasks are reported as "not found" so they are not leaked. */
  #getOwnedTask(ownerId, id) {
    const task = this.#tasks.get(id);
    if (!task || task.ownerId !== ownerId) {
      throw new HttpError(404, 'NOT_FOUND', `Task ${id} not found.`);
    }
    return task;
  }
}
