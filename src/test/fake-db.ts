// A minimal stand-in for the Drizzle client, just enough for server
// action tests: every query-builder call chains, and awaiting the chain
// resolves to the next queued result for that kind of query (select,
// insert, update, delete). Inserted/updated values are recorded so tests
// can assert on what would have been written.

type Op = "select" | "insert" | "update" | "delete" | "execute";

export type FakeDb = ReturnType<typeof createFakeDb>;

export function createFakeDb() {
  const queues: Record<Op, unknown[][]> = { select: [], insert: [], update: [], delete: [], execute: [] };
  const inserted: { values: unknown }[] = [];
  const updated: { set: unknown }[] = [];
  const deleted: number[] = [];

  function chain(op: Op, onValues?: (v: unknown) => void): unknown {
    const builder: Record<string, unknown> = {};
    const passthrough = ["from", "where", "limit", "innerJoin", "leftJoin", "orderBy", "returning"];
    for (const name of passthrough) builder[name] = () => builder;
    builder.values = (v: unknown) => {
      onValues?.(v);
      return builder;
    };
    builder.set = (v: unknown) => {
      onValues?.(v);
      return builder;
    };
    builder.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
      const next = queues[op].shift();
      if (next) {
        resolve(next);
      } else if (op === "insert") {
        // Default: echo the inserted row back with an id, like .returning().
        const last = inserted[inserted.length - 1]?.values;
        resolve(Array.isArray(last) ? last : [{ id: `id-${inserted.length}`, ...(last as object) }]);
      } else {
        resolve([]);
      }
      return Promise.resolve().catch(reject);
    };
    return builder;
  }

  const db = {
    select: () => chain("select"),
    insert: () => chain("insert", (values) => inserted.push({ values })),
    update: () => chain("update", (set) => updated.push({ set })),
    delete: () => {
      deleted.push(deleted.length);
      return chain("delete");
    },
    execute: async () => queues.execute.shift() ?? [],
    transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(db),
  };

  return {
    db,
    inserted,
    updated,
    deleted,
    /** Queue the result the next `await` of this kind of query returns. */
    queue(op: Op, rows: unknown[]) {
      queues[op].push(rows);
    },
    reset() {
      for (const q of Object.values(queues)) q.length = 0;
      inserted.length = 0;
      updated.length = 0;
      deleted.length = 0;
    },
  };
}

/** next/navigation's redirect() throws to abort rendering; tests replace it
 * with this so the destination can be asserted on. */
export class RedirectError extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
