import { vi } from "vitest";

type QueryResult = { data: unknown; error: null | { message: string }; count?: number };

function makeChain(result: QueryResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "neq", "not", "is", "in", "filter", "order", "limit", "single", "head"];
  for (const m of methods) {
    chain[m] = vi.fn(() => Promise.resolve(result));
  }
  // Allow chaining (non-terminal calls return the chain itself)
  for (const m of methods) {
    chain[m] = vi.fn((..._args: unknown[]) => ({
      ...chain,
      then: (resolve: (v: QueryResult) => unknown) => Promise.resolve(result).then(resolve),
      [Symbol.toStringTag]: "Promise",
    }));
  }
  chain.then = (resolve: (v: QueryResult) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

export function createMockSupabase(tableResults: Record<string, QueryResult>) {
  return {
    from: vi.fn((table: string) => makeChain(tableResults[table] ?? { data: [], error: null })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOtp: vi.fn(() => Promise.resolve({ error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
  };
}
