/**
 * Environment-specific settings in one place. Every value can be overridden with an
 * environment variable, so the same suite runs locally, in Docker and in CI
 * (see .env.example for the full list).
 */
const withTrailingSlash = (url: string): string => (url.endsWith('/') ? url : `${url}/`);

export const env = {
  /** URL of the Angular web application. */
  baseUrl: process.env.BASE_URL ?? 'http://localhost:4200',

  /**
   * Base URL of the REST API. It always ends with "/" and the API clients use relative paths
   * ("tasks", not "/tasks"), so a base path such as /api or /api/v1 is never dropped.
   */
  apiUrl: withTrailingSlash(process.env.API_URL ?? 'http://localhost:3000/api'),

  /** The bundled demo servers are only started when no external environment is configured. */
  startLocalApi: !process.env.API_URL,
  startLocalWeb: !process.env.BASE_URL,
} as const;
