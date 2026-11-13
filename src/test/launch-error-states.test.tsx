import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = { data: unknown; error: { message: string } | null };

const tableResults: Record<string, QueryResult> = {};

// Chainable, thenable stand-in for the Supabase query builder: every filter
// method returns the same builder, and awaiting it resolves the table's result.
function builderFor(table: string) {
  const resolve = () => Promise.resolve(tableResults[table] ?? { data: [], error: null });
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "neq", "in", "order", "limit", "insert", "update"]) {
    builder[method] = () => builder;
  }
  builder.maybeSingle = resolve;
  builder.then = (onFulfilled: (value: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    resolve().then(onFulfilled, onRejected);
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => builderFor(table)),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1" } } })),
    },
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@/components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import Launch from "@/pages/Launch";
import { LaunchChecklist } from "@/components/launch/LaunchChecklist";
import { toast } from "sonner";

const MANUAL_TASKS = [{ id: "t1", title: "Brand rules locked", status: "todo" }];

beforeEach(() => {
  for (const key of Object.keys(tableResults)) delete tableResults[key];
  tableResults.planner_tasks = { data: MANUAL_TASKS, error: null };
  vi.mocked(toast.error).mockClear();
});

describe("Launch page — collections query errors", () => {
  it("shows an explicit error instead of the empty state when collections fail to load", async () => {
    tableResults.collections = { data: null, error: { message: "permission denied" } };

    render(<Launch />);

    expect(await screen.findByText(/Erreur de chargement des collections/)).toBeInTheDocument();
    expect(screen.getByText(/permission denied/)).toBeInTheDocument();
    expect(screen.queryByText("Aucune collection active trouvée.")).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Impossible de charger les collections.");
  });

  it("still shows the empty state when the query succeeds with no rows", async () => {
    tableResults.collections = { data: [], error: null };

    render(<Launch />);

    expect(await screen.findByText("Aucune collection active trouvée.")).toBeInTheDocument();
    expect(screen.queryByText(/Erreur de chargement des collections/)).not.toBeInTheDocument();
  });
});

describe("LaunchChecklist — gate query errors", () => {
  const passingData = () => {
    tableResults.collection_seals = {
      data: [
        { seal_type: "brand_dna", status: "approved" },
        { seal_type: "finance_gate", status: "approved" },
        { seal_type: "production_ready", status: "approved" },
      ],
      error: null,
    };
    tableResults.collection_items = { data: [{ margin: 60 }, { margin: 70 }], error: null };
    tableResults.collection_scores = { data: { final_score: 90, adn_alignment: 85 }, error: null };
  };

  it.each(["collection_seals", "collection_items", "collection_scores"])(
    "surfaces an error state (not GATES BLOQUÉS) when %s fails",
    async (failingTable) => {
      passingData();
      tableResults[failingTable] = { data: null, error: { message: `${failingTable} unavailable` } };

      render(<LaunchChecklist collectionId="col-1" />);

      expect(await screen.findByText("VÉRIFICATION IMPOSSIBLE")).toBeInTheDocument();
      expect(screen.queryByText("GATES BLOQUÉS")).not.toBeInTheDocument();
      expect(screen.getByText(new RegExp(`${failingTable} unavailable`))).toBeInTheDocument();
      expect(screen.getAllByText("Erreur")).toHaveLength(3);
      expect(toast.error).toHaveBeenCalledWith("Impossible de vérifier les portes système.");
    },
  );

  it("still reports GATES BLOQUÉS when data loads and a gate genuinely fails", async () => {
    passingData();
    tableResults.collection_items = { data: [{ margin: 30 }], error: null };

    render(<LaunchChecklist collectionId="col-1" />);

    expect(await screen.findByText("GATES BLOQUÉS")).toBeInTheDocument();
    expect(screen.getByText("Insuffisant")).toBeInTheDocument();
  });

  it("passes all three gates when every query succeeds", async () => {
    passingData();

    render(<LaunchChecklist collectionId="col-1" />);

    await waitFor(() => expect(screen.getByText("Approuvé")).toBeInTheDocument());
    expect(screen.getAllByText("Passé")).toHaveLength(2);
    expect(screen.queryByText("VÉRIFICATION IMPOSSIBLE")).not.toBeInTheDocument();
  });
});
