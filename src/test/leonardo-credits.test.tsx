import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeonardoCredits } from "@/components/LeonardoCredits";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

const invokeMock = vi.mocked(supabase.functions.invoke);

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LeonardoCredits />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

describe("LeonardoCredits", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("renders successful Leonardo credits", async () => {
    invokeMock.mockResolvedValue({
      data: {
        apiPaidTokens: 1250,
        apiSubscriptionTokens: 750,
      },
      error: null,
    });

    renderWithProviders();

    expect(
      await screen.findByText((text) => text.replace(/\D/g, "") === "2000")
    ).toBeInTheDocument();
    expect(screen.getByText("Leo")).toBeInTheDocument();
  });

  it("renders a quiet unavailable state when the lookup fails", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new Error("provider secret is not configured"),
    });

    renderWithProviders();

    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Leo")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("provider secret is not configured")).not.toBeInTheDocument();
  });
});
