/**
 * Cross-tab leader election with the Web Locks API.
 *
 * Every open tab asks for the same named lock. The browser grants it to one
 * tab at a time, and that tab is the "leader" (for example the only one that
 * runs scheduled exports). When the leader tab closes or reloads, the browser
 * releases the lock and the next waiting tab becomes leader.
 *
 * Browsers without Web Locks (very old ones) fall back to "every tab leads",
 * which is the previous behaviour.
 */

/** The subset of the LockManager API used here (lets tests pass a fake). */
export interface LockManagerLike {
  request(name: string, options: { signal?: AbortSignal }, callback: () => Promise<void>): Promise<unknown>;
}

function defaultLocks(): LockManagerLike | undefined {
  return typeof navigator !== "undefined" && "locks" in navigator ? (navigator.locks as LockManagerLike) : undefined;
}

/**
 * Wait for leadership of `name`. Calls `onChange(true)` once this tab becomes the leader.
 * Returns a cleanup function that gives up the lock (or stops waiting for it).
 */
export function electLeader(name: string, onChange: (isLeader: boolean) => void, locks: LockManagerLike | null | undefined = defaultLocks()): () => void {
  if (!locks) {
    onChange(true);
    return () => onChange(false);
  }

  const controller = new AbortController();
  let release: (() => void) | null = null;
  let stopped = false;

  locks
    .request(name, { signal: controller.signal }, () => {
      if (stopped) return Promise.resolve();
      onChange(true);
      // Hold the lock until cleanup resolves this promise.
      return new Promise<void>((resolve) => {
        release = resolve;
      });
    })
    .catch(() => {
      /* AbortError: cleanup ran while we were still waiting in the queue */
    });

  return () => {
    stopped = true;
    controller.abort();
    if (release) {
      release();
      release = null;
      onChange(false);
    }
  };
}
