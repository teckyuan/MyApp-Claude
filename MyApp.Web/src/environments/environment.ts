export const environment = {
  /**
   * Relative URLs go through the dev-server proxy (proxy.conf.json), so no CORS setup is needed in development.
   * For a deployed build, point these at the API origin (and add that origin to Cors:AllowedOrigins in the API).
   */
  apiUrl: '/api/v1',
  healthUrl: '/health/ready',
  /** Replaced with true by environment.mock.ts in the `mock` configuration. */
  useMock: false,
};
