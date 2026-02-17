import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SessionDetailModal } from "../SessionDetailModal";
import { sessionsApi, exerciseSetsApi } from "@/lib/api";
import type { TrainingSession, SessionExercise } from "@/types";

// Mock the API
vi.mock("@/lib/api", () => ({
  sessionsApi: {
    getExercises: vi.fn(),
    update: vi.fn(),
  },
  exerciseSetsApi: {
    listForSession: vi.fn().mockResolvedValue([]),
    createForSession: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the useDarkStyles hook
vi.mock("@/hooks/useDarkStyles", () => ({
  useDarkStyles: () => ({
    darkStyles: {
      modal: {},
    },
    theme: {
      colors: {
        primary: "#007bff",
        secondary: "#6c757d",
        text: "#000000",
        background: "#ffffff",
      },
    },
  }),
}));

// Mock the useDashboardApp hook
vi.mock("@/hooks/useDashboardApp", () => ({
  useDashboardApp: () => ({
    app: {
      id: 1,
      trainer_id: 1,
      name: "BMX Training",
      discipline_type: "bmx",
    },
    trainer: {
      id: 1,
      email: "test@example.com",
      name: "Test Trainer",
      discipline_type: "bmx",
    },
  }),
}));

describe("SessionDetailModal", () => {
  const mockSession: TrainingSession = {
    id: 1,
    trainer_id: 1,
    client_id: 1,
    location_id: null,
    session_group_id: null,
    scheduled_at: "2024-01-15T10:00:00Z",
    started_at: "2024-01-15T10:05:00Z",
    duration_minutes: 60,
    notes: "Test session notes",
    status: "completed",
    is_paid: false,
    paid_at: null,
    session_doc: null,
    created_at: "2024-01-15T09:00:00Z",
    updated_at: "2024-01-15T11:00:00Z",
  };

  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display lap times when BMX exercises exist", async () => {
    const mockExercises: SessionExercise[] = [
      {
        id: 1,
        session_id: 1,
        session_group_id: null,
        exercise_template_id: null,
        exercise_set_id: null,
        custom_name: "Toma de Tiempo BMX",
        data: {
          lap_times_ms: [65432, 63210, 64890],
          total_duration_ms: 193532,
          lap_count: 3,
        },
        order_index: 0,
        created_at: "2024-01-15T10:30:00Z",
      },
    ];

    vi.mocked(sessionsApi.getExercises).mockResolvedValue(mockExercises);

    render(
      <SessionDetailModal session={mockSession} onClose={mockOnClose} onUpdate={mockOnUpdate} />
    );

    // Wait for exercises to load
    await waitFor(() => {
      expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
    });

    // Check that lap times section is displayed in the Tiempos tab
    const tiemposTab = screen.getByText("Tiempos");
    expect(tiemposTab).toBeInTheDocument();

    // Click on Tiempos tab
    tiemposTab.click();

    await waitFor(() => {
      expect(screen.getByText("Medición #1")).toBeInTheDocument();
    });

    // Check lap times are formatted correctly (MM:SS.CS)
    expect(screen.getAllByText("01:05.43").length).toBeGreaterThanOrEqual(1); // 65432ms = 1:05.43
    expect(screen.getAllByText("01:03.21").length).toBeGreaterThanOrEqual(1); // 63210ms = 1:03.21
    expect(screen.getAllByText("01:04.89").length).toBeGreaterThanOrEqual(1); // 64890ms = 1:04.89

    // Check average and best time statistics are displayed
    expect(screen.getByText(/Tiempo Promedio/)).toBeInTheDocument();
    expect(screen.getByText(/Mejor Tiempo/)).toBeInTheDocument();
  });

  it("should display multiple measurements grouped separately", async () => {
    const mockExercises: SessionExercise[] = [
      {
        id: 1,
        session_id: 1,
        session_group_id: null,
        exercise_template_id: null,
        exercise_set_id: null,
        custom_name: "Toma de Tiempo BMX",
        data: {
          lap_times_ms: [65000, 64000],
          total_duration_ms: 129000,
          lap_count: 2,
        },
        order_index: 0,
        created_at: "2024-01-15T10:30:00Z",
      },
      {
        id: 2,
        session_id: 1,
        session_group_id: null,
        exercise_template_id: null,
        exercise_set_id: null,
        custom_name: "Toma de Tiempo BMX",
        data: {
          lap_times_ms: [62000, 63000, 61000],
          total_duration_ms: 186000,
          lap_count: 3,
        },
        order_index: 1,
        created_at: "2024-01-15T10:45:00Z",
      },
    ];

    vi.mocked(sessionsApi.getExercises).mockResolvedValue(mockExercises);

    render(
      <SessionDetailModal session={mockSession} onClose={mockOnClose} onUpdate={mockOnUpdate} />
    );

    await waitFor(() => {
      expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
    });

    // Click on Tiempos tab
    const tiemposTab = screen.getByText("Tiempos");
    tiemposTab.click();

    await waitFor(() => {
      // Check both measurements are displayed
      expect(screen.getByText("Medición #1")).toBeInTheDocument();
      expect(screen.getByText("Medición #2")).toBeInTheDocument();
    });
  });

  it("should calculate split times correctly", async () => {
    const mockExercises: SessionExercise[] = [
      {
        id: 1,
        session_id: 1,
        session_group_id: null,
        exercise_template_id: null,
        exercise_set_id: null,
        custom_name: "Toma de Tiempo BMX",
        data: {
          lap_times_ms: [60000, 60000, 60000], // 1:00.00 each
          total_duration_ms: 180000,
          lap_count: 3,
        },
        order_index: 0,
        created_at: "2024-01-15T10:30:00Z",
      },
    ];

    vi.mocked(sessionsApi.getExercises).mockResolvedValue(mockExercises);

    render(
      <SessionDetailModal session={mockSession} onClose={mockOnClose} onUpdate={mockOnUpdate} />
    );

    await waitFor(() => {
      expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
    });

    // Click on Tiempos tab
    const tiemposTab = screen.getByText("Tiempos");
    tiemposTab.click();

    await waitFor(() => {
      // Check that lap times are displayed
      expect(screen.getAllByText("01:00.00").length).toBeGreaterThanOrEqual(3);
    });
  });

  it("should not display lap times section when no BMX exercises exist", async () => {
    const mockExercises: SessionExercise[] = [
      {
        id: 1,
        session_id: 1,
        session_group_id: null,
        exercise_template_id: 5,
        exercise_set_id: null,
        custom_name: "Some Other Exercise",
        data: {
          reps: 10,
          sets: 3,
        },
        order_index: 0,
        created_at: "2024-01-15T10:30:00Z",
      },
    ];

    vi.mocked(sessionsApi.getExercises).mockResolvedValue(mockExercises);

    render(
      <SessionDetailModal session={mockSession} onClose={mockOnClose} onUpdate={mockOnUpdate} />
    );

    await waitFor(() => {
      expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
    });

    // Tiempos tab should not be rendered for non-BMX exercises
    expect(screen.queryByText("Tiempos")).toBeInTheDocument(); // Tab still exists for BMX trainer

    // But when clicked, there should be no measurements
    const tiemposTab = screen.getByText("Tiempos");
    tiemposTab.click();

    await waitFor(() => {
      expect(screen.queryByText(/Medición #/)).not.toBeInTheDocument();
    });
  });

  it("should not display lap times section when exercises array is empty", async () => {
    vi.mocked(sessionsApi.getExercises).mockResolvedValue([]);

    render(
      <SessionDetailModal session={mockSession} onClose={mockOnClose} onUpdate={mockOnUpdate} />
    );

    await waitFor(() => {
      expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
    });

    // Tiempos tab should exist but show no measurements
    const tiemposTab = screen.getByText("Tiempos");
    tiemposTab.click();

    await waitFor(() => {
      expect(screen.queryByText(/Medición #/)).not.toBeInTheDocument();
    });
  });

  it("should display table headers correctly", async () => {
    const mockExercises: SessionExercise[] = [
      {
        id: 1,
        session_id: 1,
        session_group_id: null,
        exercise_template_id: null,
        exercise_set_id: null,
        custom_name: "Toma de Tiempo BMX",
        data: {
          lap_times_ms: [65000],
          total_duration_ms: 65000,
          lap_count: 1,
        },
        order_index: 0,
        created_at: "2024-01-15T10:30:00Z",
      },
    ];

    vi.mocked(sessionsApi.getExercises).mockResolvedValue(mockExercises);

    render(
      <SessionDetailModal session={mockSession} onClose={mockOnClose} onUpdate={mockOnUpdate} />
    );

    await waitFor(() => {
      expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
    });

    // Click on Tiempos tab
    const tiemposTab = screen.getByText("Tiempos");
    tiemposTab.click();

    await waitFor(() => {
      // Check table headers (no "Tiempo Parcial" column anymore)
      expect(screen.getByText("#")).toBeInTheDocument();
      expect(screen.getByText("Tiempo de Vuelta")).toBeInTheDocument();
      expect(screen.queryByText("Tiempo Parcial")).not.toBeInTheDocument();
    });
  });

  it("should format lap times with leading zeros correctly", async () => {
    const mockExercises: SessionExercise[] = [
      {
        id: 1,
        session_id: 1,
        session_group_id: null,
        exercise_template_id: null,
        exercise_set_id: null,
        custom_name: "Toma de Tiempo BMX",
        data: {
          lap_times_ms: [5432], // 0:05.43
          total_duration_ms: 5432,
          lap_count: 1,
        },
        order_index: 0,
        created_at: "2024-01-15T10:30:00Z",
      },
    ];

    vi.mocked(sessionsApi.getExercises).mockResolvedValue(mockExercises);

    render(
      <SessionDetailModal session={mockSession} onClose={mockOnClose} onUpdate={mockOnUpdate} />
    );

    await waitFor(() => {
      expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
    });

    // Click on Tiempos tab
    const tiemposTab = screen.getByText("Tiempos");
    tiemposTab.click();

    await waitFor(() => {
      // Check that short times have leading zeros
      expect(screen.getAllByText("00:05.43").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("should handle exercises fetch error gracefully", async () => {
    vi.mocked(sessionsApi.getExercises).mockRejectedValue(new Error("Network error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SessionDetailModal session={mockSession} onClose={mockOnClose} onUpdate={mockOnUpdate} />
    );

    await waitFor(() => {
      expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
    });

    // Error should be logged
    expect(consoleSpy).toHaveBeenCalledWith("Error fetching data:", expect.any(Error));

    // Modal should still render with Tiempos tab (but no measurements)
    expect(screen.getByText("Tiempos")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
