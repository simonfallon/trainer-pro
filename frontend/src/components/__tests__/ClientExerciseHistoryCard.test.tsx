import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ClientExerciseHistoryCard } from "../ClientExerciseHistoryCard";
import * as api from "@/lib/api";

// Mock dependencies
vi.mock("@/lib/api", () => ({
  clientsApi: {
    getExerciseHistory: vi.fn(),
    getSessions: vi.fn(),
  },
  exerciseSetsApi: {
    listForSession: vi.fn(),
  },
}));

// Mock useSWR
vi.mock("swr", () => ({
  default: vi.fn((key, fetcher) => {
    // Return loading state if key is null
    if (!key) return { data: undefined, isLoading: false };

    // Simulate SWR returning data based on the fetcher
    if (key === "/clients/1/exercise-history") {
      return {
        data: { exercises: [], history: [] },
        isLoading: false,
      };
    }

    return { data: undefined, isLoading: true };
  }),
}));

describe("ClientExerciseHistoryCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state correctly", () => {
    render(<ClientExerciseHistoryCard clientId={1} />);

    expect(screen.getByText("Historial de Ejercicios")).toBeInTheDocument();
    expect(
      screen.getByText("No hay ejercicios registrados para este cliente.")
    ).toBeInTheDocument();
  });
});
