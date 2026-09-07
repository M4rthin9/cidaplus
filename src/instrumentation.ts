/**
 * Runs once when the server process starts, before the first request.
 * SPEC.md §11: "Fail fast at boot with a Zod-validated env module."
 *
 * Next catches a throw from `register()` and keeps the process alive serving
 * 500s. On a single VPS that is the worst outcome: the container stays "running"
 * so `restart: unless-stopped` never fires, and the only symptom is a dead site.
 * Exit instead, so the failure is loud and the restart policy can act on it.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertEnv } = await import("@/lib/env");
  try {
    assertEnv();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n[boot] ${message}\n`);
    process.exit(1);
  }
}
