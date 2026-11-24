import { test, expect } from '../../src/fixtures/api-fixtures';
import type { TasksApi } from '../../src/api/tasks-api';
import { TASK_STATUS, buildTask, uniqueTitle, type Task, type TaskInput } from '../../src/data/task-factory';
import { expectError, expectTaskContract } from '../../src/utils/api-assertions';

// URLs and ids
const TASKS_PATH = '/tasks';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000'; // a well-formed UUID that never belongs to a task
const MALFORMED_ID = 'not-a-uuid';

// HTTP status codes
const OK_STATUS = 200;
const CREATED_STATUS = 201;
const NO_CONTENT_STATUS = 204;
const BAD_REQUEST_STATUS = 400;
const UNAUTHORIZED_STATUS = 401;
const NOT_FOUND_STATUS = 404;
const UNSUPPORTED_MEDIA_TYPE_STATUS = 415;

// Error codes in the response body
const VALIDATION_ERROR_CODE = 'VALIDATION_ERROR';
const INVALID_JSON_CODE = 'INVALID_JSON';
const INVALID_ID_CODE = 'INVALID_ID';
const NOT_FOUND_CODE = 'NOT_FOUND';
const UNAUTHORIZED_CODE = 'UNAUTHORIZED';
const UNSUPPORTED_MEDIA_TYPE_CODE = 'UNSUPPORTED_MEDIA_TYPE';

// Expected response details
const EXPECTED_AUTH_SCHEME = 'Bearer'; // WWW-Authenticate header of a 401
const EMPTY_BODY = '';
const DEFAULT_FIELDS = { description: '', status: TASK_STATUS.TODO, dueDate: null }; // stored for omitted optional fields

// Test data
const MAX_TITLE_LENGTH = 200;
const LONGEST_VALID_TITLE = 'x'.repeat(MAX_TITLE_LENGTH);
const TOO_LONG_TITLE = 'x'.repeat(MAX_TITLE_LENGTH + 1);
const WHITESPACE = '   ';
const ANY_TITLE = 'Any title';
const ANY_DESCRIPTION = 'Any description';
const UNKNOWN_STATUS = 'later';
const IMPOSSIBLE_DATE = '2026-02-30';
const WRONG_FORMAT_DATE = '31/12/2026';
const MALFORMED_JSON_BODY = '{"title": "unterminated';
const PLAIN_TEXT_BODY = 'title=Plain text';
const ARRAY_PAYLOAD = [{ title: ANY_TITLE }];

// Together with buildTask() every optional field gets a non-default value
const CUSTOM_FIELDS: Partial<TaskInput> = { status: TASK_STATUS.IN_PROGRESS, dueDate: '2026-12-24' };

// Every field differs from what buildTask() creates, so the full replacement is visible
const REPLACEMENT_FIELDS: Partial<TaskInput> = {
  description: 'Updated by the PUT test',
  status: TASK_STATUS.DONE,
  dueDate: '2027-01-15',
};

// Values a client must not be able to set
const SERVER_MANAGED_FIELDS = { id: 'client-chosen-id', createdAt: '2000-01-01T00:00:00.000Z', ownerId: 'u-9999' };

// Invalid payloads: one test is generated for each row
const INVALID_PAYLOADS: Array<{ scenario: string; payload: Record<string, unknown>; invalidFields: string[] }> = [
  { scenario: 'a missing title', payload: { description: ANY_DESCRIPTION }, invalidFields: ['title'] },
  { scenario: 'a blank title', payload: { title: WHITESPACE }, invalidFields: ['title'] },
  { scenario: 'a title of 201 characters', payload: { title: TOO_LONG_TITLE }, invalidFields: ['title'] },
  { scenario: 'a title that is not a string', payload: { title: 42 }, invalidFields: ['title'] },
  { scenario: 'an unknown status', payload: { title: ANY_TITLE, status: UNKNOWN_STATUS }, invalidFields: ['status'] },
  { scenario: 'an impossible due date', payload: { title: ANY_TITLE, dueDate: IMPOSSIBLE_DATE }, invalidFields: ['dueDate'] },
  { scenario: 'a due date in the wrong format', payload: { title: ANY_TITLE, dueDate: WRONG_FORMAT_DATE }, invalidFields: ['dueDate'] },
  { scenario: 'several invalid fields at once', payload: { title: '', status: UNKNOWN_STATUS, dueDate: WRONG_FORMAT_DATE }, invalidFields: ['dueDate', 'status', 'title'] },
];
const INVALID_UPDATE = { payload: { title: '', status: UNKNOWN_STATUS }, invalidFields: ['status', 'title'] };

// Every protected endpoint, for the authentication matrix
const PROTECTED_CALLS: Array<{ endpoint: string; call: (api: TasksApi) => ReturnType<TasksApi['get']> }> = [
  { endpoint: 'POST /tasks', call: (api) => api.create(buildTask()) },
  { endpoint: 'GET /tasks/{id}', call: (api) => api.get(NON_EXISTENT_ID) },
  { endpoint: 'PUT /tasks/{id}', call: (api) => api.update(NON_EXISTENT_ID, buildTask()) },
  { endpoint: 'DELETE /tasks/{id}', call: (api) => api.delete(NON_EXISTENT_ID) },
];

// Messages shown in the report when a check fails
const ASSERTION_MESSAGES = {
  setupCreateTask: 'test data setup: create task',
  locationPointsToTask: 'the Location header points to the new task',
  newTaskTimestampsEqual: 'a new task has the same createdAt and updatedAt',
  updatedAtMovesForward: 'updatedAt moves forward on update',
  taskUnchanged: 'the task is unchanged',
  firstDeleteSucceeds: 'the first delete succeeds',
  taskStillExists: 'the owner still has the task',
};

test.describe('Tasks API', () => {
  test.describe('POST /tasks - create a task', () => {
    test('creates a task: 201, Location header and the stored representation', { tag: '@smoke' }, async ({ tasksApi }) => {
      const payload = buildTask(CUSTOM_FIELDS);
      const response = await tasksApi.create(payload);
      expect(response.status()).toBe(CREATED_STATUS);
      const task = await response.json();
      expectTaskContract(task);
      expect(task).toMatchObject(payload);
      expect(task.createdAt, ASSERTION_MESSAGES.newTaskTimestampsEqual).toBe(task.updatedAt);
      const location = response.headers()['location'];
      expect(location, ASSERTION_MESSAGES.locationPointsToTask).toMatch(new RegExp(`${TASKS_PATH}/${task.id}$`));
      const readBack = await tasksApi.get(task.id);
      expect(readBack.status()).toBe(OK_STATUS);
      expect(await readBack.json()).toEqual(task);
    });

    test('applies the defaults when only the required title is sent', async ({ tasksApi }) => {
      const title = uniqueTitle();
      const response = await tasksApi.create({ title });
      expect(response.status()).toBe(CREATED_STATUS);
      expect(await response.json()).toMatchObject({ title, ...DEFAULT_FIELDS });
    });

    test('trims surrounding whitespace from the title', async ({ tasksApi }) => {
      const title = uniqueTitle();
      const response = await tasksApi.create({ title: `${WHITESPACE}${title}${WHITESPACE}` });
      expect(response.status()).toBe(CREATED_STATUS);
      expect((await response.json()).title).toBe(title);
    });

    test('accepts a title of exactly 200 characters (upper boundary)', async ({ tasksApi }) => {
      const response = await tasksApi.create({ title: LONGEST_VALID_TITLE });
      expect(response.status()).toBe(CREATED_STATUS);
      expect((await response.json()).title).toBe(LONGEST_VALID_TITLE);
    });

    test('ignores server-managed fields sent by the client', async ({ tasksApi }) => {
      const response = await tasksApi.create({ ...buildTask(), ...SERVER_MANAGED_FIELDS });
      expect(response.status()).toBe(CREATED_STATUS);
      const task = await response.json();
      expectTaskContract(task); // no ownerId in the response
      expect(task.id).not.toBe(SERVER_MANAGED_FIELDS.id);
      expect(task.createdAt).not.toBe(SERVER_MANAGED_FIELDS.createdAt);
    });

    for (const { scenario, payload, invalidFields } of INVALID_PAYLOADS) {
      test(`rejects ${scenario} with 400 VALIDATION_ERROR`, async ({ tasksApi }) => {
        const response = await tasksApi.create(payload);
        await expectError(response, BAD_REQUEST_STATUS, VALIDATION_ERROR_CODE, invalidFields);
      });
    }

    test('rejects malformed JSON with 400 INVALID_JSON', async ({ tasksApi }) => {
      const response = await tasksApi.createRaw(MALFORMED_JSON_BODY, 'application/json');
      await expectError(response, BAD_REQUEST_STATUS, INVALID_JSON_CODE);
    });

    test('rejects a JSON array body with 400', async ({ tasksApi }) => {
      const response = await tasksApi.create(ARRAY_PAYLOAD);
      await expectError(response, BAD_REQUEST_STATUS, VALIDATION_ERROR_CODE);
    });

    test('rejects a non-JSON content type with 415', async ({ tasksApi }) => {
      const response = await tasksApi.createRaw(PLAIN_TEXT_BODY, 'text/plain');
      await expectError(response, UNSUPPORTED_MEDIA_TYPE_STATUS, UNSUPPORTED_MEDIA_TYPE_CODE);
    });
  });


  test.describe('GET /tasks/{id} - retrieve a task', () => {
    test('returns 200 and the task', { tag: '@smoke' }, async ({ tasksApi, createdTask }) => {
      const response = await tasksApi.get(createdTask.id);
      expect(response.status()).toBe(OK_STATUS);
      const task = await response.json();
      expectTaskContract(task);
      expect(task).toEqual(createdTask);
    });

    test('returns 404 for a task that does not exist', async ({ tasksApi }) => {
      const response = await tasksApi.get(NON_EXISTENT_ID);
      await expectError(response, NOT_FOUND_STATUS, NOT_FOUND_CODE);
    });

    test('returns 400 when the id is not a UUID', async ({ tasksApi }) => {
      const response = await tasksApi.get(MALFORMED_ID);
      await expectError(response, BAD_REQUEST_STATUS, INVALID_ID_CODE);
    });

    test("returns 404 for another user's task (no data leak)", async ({ otherUserTasksApi, createdTask }) => {
      const response = await otherUserTasksApi.get(createdTask.id);
      await expectError(response, NOT_FOUND_STATUS, NOT_FOUND_CODE);
    });
  });


  test.describe('PUT /tasks/{id} - update a task', () => {
    test('replaces the task: 200 with the new state, which is persisted', { tag: '@smoke' }, async ({ tasksApi, createdTask }) => {
      const changes = buildTask(REPLACEMENT_FIELDS);
      const response = await tasksApi.update(createdTask.id, changes);
      expect(response.status()).toBe(OK_STATUS);
      const updated = await response.json();
      expectTaskContract(updated);
      expect(updated).toMatchObject({ ...changes, id: createdTask.id, createdAt: createdTask.createdAt });
      expect(Date.parse(updated.updatedAt), ASSERTION_MESSAGES.updatedAtMovesForward).toBeGreaterThan(
        Date.parse(createdTask.updatedAt),
      );
      const readBack = await tasksApi.get(createdTask.id);
      expect(await readBack.json()).toEqual(updated);
    });

    test('resets omitted optional fields to their defaults (full replacement)', async ({ tasksApi }) => {
      const created = await tasksApi.create(buildTask(CUSTOM_FIELDS));
      expect(created.status(), ASSERTION_MESSAGES.setupCreateTask).toBe(CREATED_STATUS);
      const task: Task = await created.json();
      const response = await tasksApi.update(task.id, { title: task.title });
      expect(response.status()).toBe(OK_STATUS);
      expect(await response.json()).toMatchObject(DEFAULT_FIELDS);
    });

    test('rejects an invalid payload with 400 and leaves the task unchanged', async ({ tasksApi, createdTask }) => {
      const response = await tasksApi.update(createdTask.id, INVALID_UPDATE.payload);
      await expectError(response, BAD_REQUEST_STATUS, VALIDATION_ERROR_CODE, INVALID_UPDATE.invalidFields);
      const readBack = await tasksApi.get(createdTask.id);
      expect(await readBack.json(), ASSERTION_MESSAGES.taskUnchanged).toEqual(createdTask);
    });

    test('returns 404 for a task that does not exist', async ({ tasksApi }) => {
      const response = await tasksApi.update(NON_EXISTENT_ID, buildTask());
      await expectError(response, NOT_FOUND_STATUS, NOT_FOUND_CODE);
    });

    test("returns 404 when updating another user's task and does not change it", async ({ tasksApi, otherUserTasksApi, createdTask }) => {
      const response = await otherUserTasksApi.update(createdTask.id, buildTask());
      await expectError(response, NOT_FOUND_STATUS, NOT_FOUND_CODE);
      const readBack = await tasksApi.get(createdTask.id);
      expect(await readBack.json(), ASSERTION_MESSAGES.taskUnchanged).toEqual(createdTask);
    });
  });
  

  test.describe('DELETE /tasks/{id} - delete a task', () => {
    test('deletes the task: 204 with an empty body, then GET returns 404', { tag: '@smoke' }, async ({ tasksApi, createdTask }) => {
      const response = await tasksApi.delete(createdTask.id);
      expect(response.status()).toBe(NO_CONTENT_STATUS);
      expect(await response.text()).toBe(EMPTY_BODY);
      await expectError(await tasksApi.get(createdTask.id), NOT_FOUND_STATUS, NOT_FOUND_CODE);
    });

    test('returns 404 when the task has already been deleted', async ({ tasksApi, createdTask }) => {
      const firstDelete = await tasksApi.delete(createdTask.id);
      expect(firstDelete.status(), ASSERTION_MESSAGES.firstDeleteSucceeds).toBe(NO_CONTENT_STATUS);
      const secondDelete = await tasksApi.delete(createdTask.id);
      await expectError(secondDelete, NOT_FOUND_STATUS, NOT_FOUND_CODE);
    });

    test('returns 404 for a task that does not exist', async ({ tasksApi }) => {
      const response = await tasksApi.delete(NON_EXISTENT_ID);
      await expectError(response, NOT_FOUND_STATUS, NOT_FOUND_CODE);
    });

    test('does not let another user delete the task', async ({ tasksApi, otherUserTasksApi, createdTask }) => {
      const response = await otherUserTasksApi.delete(createdTask.id);
      await expectError(response, NOT_FOUND_STATUS, NOT_FOUND_CODE);
      const readBack = await tasksApi.get(createdTask.id);
      expect(readBack.status(), ASSERTION_MESSAGES.taskStillExists).toBe(OK_STATUS);
    });
  });

  test.describe('Authentication', () => {
    for (const { endpoint, call } of PROTECTED_CALLS) {
      test(`${endpoint} without a token returns 401`, async ({ anonymousTasksApi }) => {
        const response = await call(anonymousTasksApi);
        await expectError(response, UNAUTHORIZED_STATUS, UNAUTHORIZED_CODE);
        expect(response.headers()['www-authenticate']).toBe(EXPECTED_AUTH_SCHEME);
      });

      test(`${endpoint} with an invalid token returns 401`, async ({ invalidTokenTasksApi }) => {
        const response = await call(invalidTokenTasksApi);
        await expectError(response, UNAUTHORIZED_STATUS, UNAUTHORIZED_CODE);
      });
    }
  });

  test('supports the whole lifecycle: create, read, update, delete', { tag: '@smoke' }, async ({ tasksApi }) => {
    let task!: Task;
    await test.step('POST /tasks -> 201', async () => {
      const response = await tasksApi.create(buildTask());
      expect(response.status()).toBe(CREATED_STATUS);
      task = await response.json();
    });
    await test.step('GET /tasks/{id} -> 200', async () => {
      const response = await tasksApi.get(task.id);
      expect(response.status()).toBe(OK_STATUS);
      expect(await response.json()).toEqual(task);
    });
    await test.step('PUT /tasks/{id} -> 200', async () => {
      const response = await tasksApi.update(task.id, buildTask({ title: task.title, status: TASK_STATUS.DONE }));
      expect(response.status()).toBe(OK_STATUS);
      expect((await response.json()).status).toBe(TASK_STATUS.DONE);
    });
    await test.step('DELETE /tasks/{id} -> 204', async () => {
      expect((await tasksApi.delete(task.id)).status()).toBe(NO_CONTENT_STATUS);
    });
    await test.step('GET /tasks/{id} -> 404 after deletion', async () => {
      expect((await tasksApi.get(task.id)).status()).toBe(NOT_FOUND_STATUS);
    });
  });
});