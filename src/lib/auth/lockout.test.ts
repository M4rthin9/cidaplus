import { describe, expect, it } from "vitest";
import type { LockoutState } from "./lockout";
import {
  CLEARED,
  LOCK_DURATION_MS,
  MAX_ATTEMPTS,
  attemptsRemaining,
  isLocked,
  minutesRemaining,
  registerFailure,
} from "./lockout";

const t0 = new Date("2026-09-07T10:00:00Z");
const clear: LockoutState = { failedLoginAttempts: 0, lockedUntil: null };

describe("registerFailure", () => {
  it("locks on exactly the fifth failure, not the fourth — SPEC.md §12", () => {
    let state: LockoutState = clear;
    for (let i = 1; i < MAX_ATTEMPTS; i += 1) {
      state = registerFailure(state, t0);
      expect(state.lockedUntil).toBeNull();
      expect(isLocked(state, t0)).toBe(false);
    }
    expect(state.failedLoginAttempts).toBe(MAX_ATTEMPTS - 1);

    const locked = registerFailure(state, t0);
    expect(locked.failedLoginAttempts).toBe(MAX_ATTEMPTS);
    expect(locked.lockedUntil).not.toBeNull();
    expect(locked.justLocked).toBe(true);
    expect(isLocked(locked, t0)).toBe(true);
  });

  it("locks for the configured duration", () => {
    let state: LockoutState = clear;
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) state = registerFailure(state, t0);
    expect(state.lockedUntil?.getTime()).toBe(t0.getTime() + LOCK_DURATION_MS);
  });

  it("counts down the attempts left", () => {
    let state: LockoutState = clear;
    expect(attemptsRemaining(state, t0)).toBe(5);
    state = registerFailure(state, t0);
    expect(attemptsRemaining(state, t0)).toBe(4);
  });

  it("stays locked while the window is open", () => {
    let state: LockoutState = clear;
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) state = registerFailure(state, t0);
    const midway = new Date(t0.getTime() + LOCK_DURATION_MS / 2);
    expect(isLocked(state, midway)).toBe(true);
    expect(attemptsRemaining(state, midway)).toBe(0);
  });

  it("starts a fresh count once the lock expires", () => {
    let state: LockoutState = clear;
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) state = registerFailure(state, t0);

    const after = new Date(t0.getTime() + LOCK_DURATION_MS + 1000);
    expect(isLocked(state, after)).toBe(false);

    const next = registerFailure(state, after);
    expect(next.failedLoginAttempts).toBe(1);
    expect(next.lockedUntil).toBeNull();
  });

  it("does not report justLocked twice for an already-locked account", () => {
    let state: LockoutState = clear;
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) state = registerFailure(state, t0);
    const again = registerFailure(state, new Date(t0.getTime() + 1000));
    expect(again.justLocked).toBe(false);
  });
});

describe("minutesRemaining", () => {
  it("rounds up, so 30 seconds left reads as 1 minute", () => {
    const state: LockoutState = {
      failedLoginAttempts: 5,
      lockedUntil: new Date(t0.getTime() + 30_000),
    };
    expect(minutesRemaining(state, t0)).toBe(1);
  });

  it("is zero when nothing is locked", () => {
    expect(minutesRemaining(clear, t0)).toBe(0);
  });
});

describe("CLEARED", () => {
  it("resets the counter on a successful login", () => {
    expect(CLEARED.failedLoginAttempts).toBe(0);
    expect(CLEARED.lockedUntil).toBeNull();
    expect(isLocked(CLEARED, t0)).toBe(false);
  });
});
