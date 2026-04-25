import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useHQMetrics } from "./useHQMetrics";

// Resolved value shape matching Supabase responses
type QueryResult = { data: unknown[] | null; error: { message: string } | null; count?: number | null };

function makeChain(result: QueryResult) {
  // Returns a thenable chain where any method call returns itself (supports .select().eq().not() etc.)
  const chain: unknown = new Proxy(
    {
      then(resolve: (v: QueryResult) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve(result).then(resolve, reject);
      },
    },
    {
      get(target, prop) {
        if (prop === "then") return (target as Record<string, unknown>)[prop as string];
        return () => chain;
      },
    }
  );
  return chain;
}

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function setupMocks({
  collections = { data: [], error: null },
  collection_items = { data: [], error: null },
  collection_seals = { data: [], error: null },
  strategic_alerts = { data: [], error: null, count: 0 },
}: Partial<Record<string, QueryResult>> = {}) {
  const tableMap: Record<string, QueryResult> = {
    collections,
    collection_items,
    collection_seals,
    strategic_alerts,
  };
  mockFrom.mockImplementation((table: string) => makeChain(tableMap[table] ?? { data: [], error: null }));
}

describe("useHQMetrics", () => {
  it("starts in loading state", () => {
    setupMocks();
    const { result } = renderHook(() => useHQMetrics());
    expect(result.current.isLoading).toBe(true);
  });

  it("sets isLoading false after queries resolve", async () => {
    setupMocks();
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("counts active capsules (excludes idea and exported)", async () => {
    setupMocks({
      collections: {
        data: [
          { id: "a", lifecycle_status: "idea" },
          { id: "b", lifecycle_status: "exported" },
          { id: "c", lifecycle_status: "approved_for_production" },
          { id: "d", lifecycle_status: "in_production" },
        ],
        error: null,
      },
    });
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeCapsules).toBe(2);
  });

  it("counts all non-null lifecycle_status as active when not idea/exported", async () => {
    setupMocks({
      collections: {
        data: [
          { id: "a", lifecycle_status: "strategy_review" },
          { id: "b", lifecycle_status: "mockup_stage" },
        ],
        error: null,
      },
    });
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeCapsules).toBe(2);
  });

  it("computes avgMargin as average of all margins", async () => {
    setupMocks({
      collection_items: {
        data: [{ margin: 60 }, { margin: 70 }, { margin: 80 }],
        error: null,
      },
    });
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.avgMargin).toBeCloseTo((60 + 70 + 80) / 3, 5);
  });

  it("avgMargin is null when no margin data exists", async () => {
    setupMocks({ collection_items: { data: [], error: null } });
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.avgMargin).toBeNull();
  });

  it("sealCoverage is 0 when no active collections exist", async () => {
    setupMocks({
      collections: {
        data: [{ id: "a", lifecycle_status: "idea" }],
        error: null,
      },
    });
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sealCoverage).toBe(0);
  });

  it("sealCoverage is 100 when all active collections have all 3 seals", async () => {
    setupMocks({
      collections: {
        data: [{ id: "col1", lifecycle_status: "in_production" }],
        error: null,
      },
      collection_seals: {
        data: [
          { collection_id: "col1", seal_type: "brand_dna", status: "approved" },
          { collection_id: "col1", seal_type: "finance_gate", status: "approved" },
          { collection_id: "col1", seal_type: "production_ready", status: "approved" },
        ],
        error: null,
      },
    });
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sealCoverage).toBe(100);
  });

  it("sealCoverage is 50 when 1 of 2 active collections is fully sealed", async () => {
    setupMocks({
      collections: {
        data: [
          { id: "col1", lifecycle_status: "in_production" },
          { id: "col2", lifecycle_status: "in_production" },
        ],
        error: null,
      },
      collection_seals: {
        data: [
          { collection_id: "col1", seal_type: "brand_dna", status: "approved" },
          { collection_id: "col1", seal_type: "finance_gate", status: "approved" },
          { collection_id: "col1", seal_type: "production_ready", status: "approved" },
          // col2 only has 2 seals — not fully covered
          { collection_id: "col2", seal_type: "brand_dna", status: "approved" },
          { collection_id: "col2", seal_type: "finance_gate", status: "approved" },
        ],
        error: null,
      },
    });
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sealCoverage).toBe(50);
  });

  it("sealCoverage ignores unknown seal types", async () => {
    setupMocks({
      collections: {
        data: [{ id: "col1", lifecycle_status: "in_production" }],
        error: null,
      },
      collection_seals: {
        data: [
          { collection_id: "col1", seal_type: "brand_dna", status: "approved" },
          { collection_id: "col1", seal_type: "finance_gate", status: "approved" },
          { collection_id: "col1", seal_type: "unknown_type", status: "approved" }, // should not count
        ],
        error: null,
      },
    });
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // col1 only has 2 of 3 required seals → 0% coverage
    expect(result.current.sealCoverage).toBe(0);
  });

  it("sealCoverage ignores seals from inactive collections", async () => {
    setupMocks({
      collections: {
        data: [
          { id: "active", lifecycle_status: "in_production" },
          { id: "idle", lifecycle_status: "idea" },
        ],
        error: null,
      },
      collection_seals: {
        data: [
          // all 3 seals on the INACTIVE collection — should not affect coverage
          { collection_id: "idle", seal_type: "brand_dna", status: "approved" },
          { collection_id: "idle", seal_type: "finance_gate", status: "approved" },
          { collection_id: "idle", seal_type: "production_ready", status: "approved" },
        ],
        error: null,
      },
    });
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sealCoverage).toBe(0);
  });

  it("reads openAlerts from the count field", async () => {
    setupMocks({
      strategic_alerts: { data: [], error: null, count: 7 },
    });
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.openAlerts).toBe(7);
  });

  it("sets errors.activeCapsules and leaves activeCapsules null when collections query fails", async () => {
    setupMocks({
      collections: { data: null, error: { message: "DB error" } },
    });
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeCapsules).toBeNull();
    expect(result.current.errors.activeCapsules).toContain("DB error");
  });

  it("sets errors.sealCoverage when seals query fails", async () => {
    setupMocks({
      collections: {
        data: [{ id: "col1", lifecycle_status: "in_production" }],
        error: null,
      },
      collection_seals: { data: null, error: { message: "Seals unavailable" } },
    });
    const { result } = renderHook(() => useHQMetrics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sealCoverage).toBeNull();
    expect(result.current.errors.sealCoverage).toBeTruthy();
  });
});
