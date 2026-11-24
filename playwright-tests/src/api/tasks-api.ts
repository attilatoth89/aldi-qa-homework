import type { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * API object model for the /tasks endpoints.
 *
 * - Methods return the raw APIResponse, so every test asserts the status code and body itself.
 * - Paths are relative ("tasks", no leading slash) so they resolve below the configured API base URL.
 * - Every task created through this client is remembered and removed by cleanup(),
 *   which the fixture calls after each test, so tests never leave data behind.
 */
export class TasksApi {
  private readonly createdIds = new Set<string>();

  constructor(private readonly request: APIRequestContext) {}

  async create(payload: unknown): Promise<APIResponse> {
    const response = await this.request.post('tasks', { data: payload });
    await this.remember(response);
    return response;
  }

  /**
   * Sends a body exactly as given, e.g. malformed JSON or a non-JSON content type.
   * A Buffer is used on purpose: with a JSON content type Playwright would JSON-encode a plain string again.
   */
  async createRaw(body: string, contentType: string): Promise<APIResponse> {
    const response = await this.request.post('tasks', {
      data: Buffer.from(body, 'utf8'),
      headers: { 'Content-Type': contentType },
    });
    await this.remember(response);
    return response;
  }

  list(): Promise<APIResponse> {
    return this.request.get('tasks');
  }

  get(id: string): Promise<APIResponse> {
    return this.request.get(`tasks/${encodeURIComponent(id)}`);
  }

  update(id: string, payload: unknown): Promise<APIResponse> {
    return this.request.put(`tasks/${encodeURIComponent(id)}`, { data: payload });
  }

  delete(id: string): Promise<APIResponse> {
    return this.request.delete(`tasks/${encodeURIComponent(id)}`);
  }

  /** Deletes every task created through this client (404 = already deleted by the test, which is fine). */
  async cleanup(): Promise<void> {
    for (const id of this.createdIds) {
      const response = await this.delete(id);
      if (![204, 404].includes(response.status())) {
        console.warn(`Cleanup of task ${id} returned HTTP ${response.status()}`);
      }
    }
    this.createdIds.clear();
  }

  private async remember(response: APIResponse): Promise<void> {
    if (response.status() === 201) {
      const { id } = (await response.json()) as { id: string };
      this.createdIds.add(id);
    }
  }
}
