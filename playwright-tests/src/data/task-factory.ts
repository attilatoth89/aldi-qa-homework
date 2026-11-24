import { randomUUID } from 'node:crypto';

/** Task statuses accepted by the API. */
export const TASK_STATUS = { TODO: 'todo', IN_PROGRESS: 'in_progress', DONE: 'done' } as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

/** Fields a client may send on POST /tasks and PUT /tasks/{id}. */
export type TaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string | null;
};

/** Task as returned by the API. */
export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Unique, recognisable titles: parallel workers never collide and leftovers are easy to spot. */
export function uniqueTitle(prefix = 'PW API task'): string {
  return `${prefix} ${randomUUID().slice(0, 8)}`;
}

/** Builds a valid task payload; tests override only what matters for the scenario. */
export function buildTask(overrides: Partial<TaskInput> = {}): TaskInput {
  return {
    title: uniqueTitle(),
    description: 'Created by the Playwright API suite',
    status: TASK_STATUS.TODO,
    dueDate: '2026-12-31',
    ...overrides,
  };
}
