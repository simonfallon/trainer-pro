import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from "vitest";
import ClientsPage from "./page";
import { useDashboardApp } from "@/hooks/useDashboardApp";
import { useSearchParams } from "next/navigation";
import { clientsApi } from "@/lib/api";

// Mock dependencies
vi.mock("@/hooks/useDashboardApp");
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: vi.fn(),
}));
vi.mock("@/lib/api");
vi.mock("swr", () => ({
  __esModule: true,
  default: () => ({
    data: [],
    isLoading: false,
    mutate: vi.fn(),
  }),
  mutate: vi.fn(),
}));

describe("ClientsPage Navigation", () => {
  beforeEach(() => {
    (useDashboardApp as Mock).mockReturnValue({
      app: { id: "app-123", trainer_id: "trainer-123" },
      trainer: { name: "Test Trainer" },
    });
    (clientsApi.list as Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should open the Add Client modal when ?new=true is present", async () => {
    // Mock search params to return "true" for "new"
    (useSearchParams as Mock).mockReturnValue({
      get: (key: string) => (key === "new" ? "true" : null),
    });

    render(<ClientsPage />);

    // Expect the modal title to be visible
    await waitFor(() => {
      expect(screen.getByText("Agregar Nuevo Cliente")).toBeInTheDocument();
    });
  });

  it("should NOT open the Add Client modal when ?new=true is NOT present", async () => {
    // Mock search params to return null
    (useSearchParams as Mock).mockReturnValue({
      get: (key: string) => null,
    });

    render(<ClientsPage />);

    // Expect the modal title NOT to be visible
    expect(screen.queryByText("Agregar Nuevo Cliente")).not.toBeInTheDocument();
  });
});
