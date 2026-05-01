import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BrandBook from "@/pages/BrandBook";
import { TooltipProvider } from "@/components/ui/tooltip";

const storageRemove = vi.fn();
const brandFilesDeleteEq = vi.fn();

vi.mock("@/components/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <TooltipProvider>{children}</TooltipProvider>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "brand_files") {
        return {
          select: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "brand-file-1",
                    file_name: "brand-guide.pdf",
                    file_type: "pdf",
                    file_size: 2048,
                    storage_path: "user-1/brand-guide.pdf",
                    created_at: "2026-05-01T00:00:00.000Z",
                  },
                ],
                error: null,
              }),
          }),
          delete: () => ({
            eq: brandFilesDeleteEq,
          }),
        };
      }

      if (table === "brand_rules") {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: "https://example.test/file.pdf" } }),
        remove: storageRemove,
      }),
    },
  },
}));

describe("BrandBook file delete confirmation", () => {
  beforeEach(() => {
    storageRemove.mockResolvedValue({ data: null, error: null });
    brandFilesDeleteEq.mockResolvedValue({ data: null, error: null });
  });

  it("requires confirmation before deleting a Brand Book file", async () => {
    render(<BrandBook />);

    const deleteButton = await screen.findByRole("button", {
      name: "Delete Brand Book file brand-guide.pdf",
    });

    expect(deleteButton).toHaveAttribute("title", "Delete brand-guide.pdf");

    fireEvent.click(deleteButton);

    expect(storageRemove).not.toHaveBeenCalled();
    expect(brandFilesDeleteEq).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog", {
      name: "Delete Brand Book file?",
    });
    expect(dialog).toHaveTextContent(
      'This will remove "brand-guide.pdf" from the Brand Book hub. This action cannot be undone.'
    );

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(storageRemove).not.toHaveBeenCalled();
    expect(brandFilesDeleteEq).not.toHaveBeenCalled();

    fireEvent.click(deleteButton);

    const reopenedDialog = await screen.findByRole("alertdialog", {
      name: "Delete Brand Book file?",
    });
    fireEvent.click(within(reopenedDialog).getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => {
      expect(storageRemove).toHaveBeenCalledWith(["user-1/brand-guide.pdf"]);
      expect(brandFilesDeleteEq).toHaveBeenCalledWith("id", "brand-file-1");
    });
  });
});
