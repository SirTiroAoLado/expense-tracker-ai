import { describe, expect, it } from "vitest";
import { electLeader, type LockManagerLike } from "./leader";

// Node implements the real Web Locks API (navigator.locks), so two calls to
// electLeader() in one process behave like two browser tabs competing for the lock.
const locks = navigator.locks as unknown as LockManagerLike;
const tick = () => new Promise((r) => setTimeout(r, 10));

/** A simulated tab: records its leadership state. */
function openTab(name: string) {
  const tab = { leader: false, changes: [] as boolean[], close: () => {} };
  tab.close = electLeader(
    name,
    (v) => {
      tab.leader = v;
      tab.changes.push(v);
    },
    locks,
  );
  return tab;
}

describe("electLeader (H-2: only one tab runs schedules)", () => {
  it("makes exactly one of two tabs the leader", async () => {
    const a = openTab("t1");
    const b = openTab("t1");
    await tick();
    expect([a.leader, b.leader]).toEqual([true, false]);
    a.close();
    b.close();
  });

  it("hands leadership to the next tab when the leader closes", async () => {
    const a = openTab("t2");
    const b = openTab("t2");
    const c = openTab("t2");
    await tick();
    a.close();
    await tick();
    expect([a.leader, b.leader, c.leader]).toEqual([false, true, false]);
    b.close();
    await tick();
    expect(c.leader).toBe(true);
    c.close();
  });

  it("never makes a tab leader after it closed while still waiting", async () => {
    const a = openTab("t3");
    const b = openTab("t3");
    await tick();
    b.close(); // closed while waiting in the queue
    a.close();
    await tick();
    expect(b.changes).toEqual([]);
    // The lock is free again for a new tab.
    const c = openTab("t3");
    await tick();
    expect(c.leader).toBe(true);
    c.close();
  });

  it("survives React StrictMode's mount → unmount → mount", async () => {
    const first = openTab("t4");
    first.close(); // immediate cleanup, as StrictMode does in development
    const second = openTab("t4");
    await tick();
    expect(first.leader).toBe(false);
    expect(second.leader).toBe(true);
    second.close();
  });

  it("falls back to 'every tab leads' without Web Locks", () => {
    const states: boolean[] = [];
    const close = electLeader("t5", (v) => states.push(v), null);
    expect(states).toEqual([true]);
    close();
    expect(states).toEqual([true, false]);
  });
});
