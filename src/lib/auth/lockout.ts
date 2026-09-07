/**
 * Login lockout policy. SPEC.md §12 phase 2: "wrong password locks out after
 * 5 tries."
 *
 * Pure functions over a state object so the policy is testable without a
 * database or a clock, and so there is exactly one place that decides.
 */

export const MAX_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

export type LockoutState = {
  readonly failedLoginAttempts: number;
  readonly lockedUntil: Date | null;
};

export type LockoutTransition = {
  readonly failedLoginAttempts: number;
  readonly lockedUntil: Date | null;
  /** True when this particular failure is the one that tripped the lock. */
  readonly justLocked: boolean;
};

export function isLocked(state: LockoutState, now: Date = new Date()): boolean {
  return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
}

/** Whole minutes remaining, rounded up — what the Thai error message shows. */
export function minutesRemaining(state: LockoutState, now: Date = new Date()): number {
  if (!state.lockedUntil) return 0;
  const ms = state.lockedUntil.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 60_000);
}

/**
 * Apply a failed attempt. Reaching MAX_ATTEMPTS sets the lock; the counter is
 * not reset at that point, so the account stays locked rather than granting a
 * fresh set of five the moment the window lapses.
 */
export function registerFailure(state: LockoutState, now: Date = new Date()): LockoutTransition {
  // An expired lock starts a fresh count.
  const base =
    state.lockedUntil && state.lockedUntil.getTime() <= now.getTime()
      ? 0
      : state.failedLoginAttempts;

  const attempts = base + 1;
  if (attempts >= MAX_ATTEMPTS) {
    return {
      failedLoginAttempts: attempts,
      lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS),
      justLocked: !isLocked(state, now),
    };
  }
  return { failedLoginAttempts: attempts, lockedUntil: null, justLocked: false };
}

/** Applied on a successful login. */
export const CLEARED: LockoutTransition = {
  failedLoginAttempts: 0,
  lockedUntil: null,
  justLocked: false,
};

/** Attempts left before the lock trips. */
export function attemptsRemaining(state: LockoutState, now: Date = new Date()): number {
  if (isLocked(state, now)) return 0;
  return Math.max(0, MAX_ATTEMPTS - state.failedLoginAttempts);
}
