import { expect, type APIResponse } from '@playwright/test';
import type { Task } from '../data/task-factory';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TASK_FIELDS = ['createdAt', 'description', 'dueDate', 'id', 'status', 'title', 'updatedAt'];

/**
 * Response contract of a task: exactly the documented fields with the documented types.
 * The exact key check also catches internal fields (e.g. the owner) leaking into the response.
 */
export function expectTaskContract(body: unknown): asserts body is Task {
  expect(body, 'task must be a JSON object').toEqual(expect.any(Object));
  const task = body as Record<string, unknown>;

  expect(Object.keys(task).sort(), 'task must expose exactly the documented fields').toEqual(TASK_FIELDS);
  expect(task).toMatchObject({
    id: expect.stringMatching(UUID_PATTERN),
    title: expect.any(String),
    description: expect.any(String),
    status: expect.stringMatching(/^(todo|in_progress|done)$/),
    createdAt: expect.stringMatching(ISO_DATE_TIME_PATTERN),
    updatedAt: expect.stringMatching(ISO_DATE_TIME_PATTERN),
  });
  expect(
    task.dueDate === null || (typeof task.dueDate === 'string' && DATE_PATTERN.test(task.dueDate)),
    `dueDate must be null or YYYY-MM-DD, got ${JSON.stringify(task.dueDate)}`,
  ).toBe(true);
}

export interface ErrorBody {
  error: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

/** Asserts the status code and the standard error body: { error, message, details? }. */
export async function expectError(
  response: APIResponse,
  status: number,
  code: string,
  invalidFields: string[] = [],
): Promise<ErrorBody> {
  expect(response.status(), `HTTP status of ${response.url()}`).toBe(status);
  expect(response.headers()['content-type']).toContain('application/json');

  const body = (await response.json()) as ErrorBody;
  expect(body).toMatchObject({ error: code, message: expect.any(String) });

  if (invalidFields.length > 0) {
    const fields = (body.details ?? []).map((detail) => detail.field).sort();
    expect(fields, 'fields reported as invalid').toEqual([...invalidFields].sort());
  }
  return body;
}
