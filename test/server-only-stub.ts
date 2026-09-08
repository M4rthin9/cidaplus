/**
 * `server-only` throws on import outside a React Server Component, which is the
 * whole point of it — but that also breaks unit tests of server modules. Vitest
 * aliases the package to this no-op so the guard still protects the client
 * bundle at build time while the tests can run.
 */
export {};
