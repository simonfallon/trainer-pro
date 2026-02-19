import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExerciseSetForm } from "./ExerciseSetForm";
import { exerciseTemplatesApi } from "@/lib/api";
import type { ExerciseSet, ExerciseTemplate } from "@/types";

// Mock the API
vi.mock("@/lib/api", () => ({
  exerciseTemplatesApi: {
    autocomplete: vi.fn(),
  },
}));

// Mock the hooks
vi.mock("@/hooks/useDarkStyles", () => ({
  useDarkStyles: () => ({
    theme: {
      colors: {
        primary: "#007bff",
        secondary: "#6c757d",
        text: "#000",
        background: "#fff",
      },
    },
    darkStyles: {
      modal: {},
    },
  }),
}));

vi.mock("@/hooks/useDashboardApp", () => ({
  useDashboardApp: () => ({
    app: {
      id: 1,
      name: "Test App",
      trainer_id: 1,
    },
  }),
}));

describe("ExerciseSetForm - Autocomplete", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const sessionId = 123;

  const mockTemplates: ExerciseTemplate[] = [
    {
      id: 1,
      trainer_app_id: 1,
      name: "Peso muerto",
      discipline_type: "physio",
      field_schema: {
        repeticiones: { type: "integer", label: "Repeticiones", required: true },
        series: { type: "integer", label: "Series", required: true },
      },
      usage_count: 10,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: 2,
      trainer_app_id: 1,
      name: "Peso muerto rumano",
      discipline_type: "physio",
      field_schema: {
        repeticiones: { type: "integer", label: "Repeticiones", required: true },
      },
      usage_count: 5,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show autocomplete suggestions when typing", async () => {
    const mockAutocomplete = vi.mocked(exerciseTemplatesApi.autocomplete);
    mockAutocomplete.mockResolvedValue(mockTemplates);

    render(<ExerciseSetForm sessionId={sessionId} onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Add an exercise
    const addButton = screen.getByText("+ Agregar Ejercicio");
    fireEvent.click(addButton);

    // Type in the exercise name input
    const input = screen.getByPlaceholderText(/empieza a escribir para buscar/i);
    fireEvent.change(input, { target: { value: "Peso" } });

    // Wait for suggestions to appear
    await waitFor(
      () => {
        expect(mockAutocomplete).toHaveBeenCalledWith(1, "Peso", 1000);
      },
      { timeout: 1000 }
    );

    expect(screen.getByText("Peso muerto")).toBeInTheDocument();
    expect(screen.getByText("Peso muerto rumano")).toBeInTheDocument();
  });

  it("should search with empty query on focus", async () => {
    const mockAutocomplete = vi.mocked(exerciseTemplatesApi.autocomplete);
    mockAutocomplete.mockResolvedValue(mockTemplates);

    render(<ExerciseSetForm sessionId={sessionId} onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Add an exercise
    const addButton = screen.getByText("+ Agregar Ejercicio");
    fireEvent.click(addButton);

    // Focus on the input
    const input = screen.getByPlaceholderText(/empieza a escribir para buscar/i);
    fireEvent.focus(input);

    // Wait for API call
    await waitFor(
      () => {
        expect(mockAutocomplete).toHaveBeenCalledWith(1, "", 1000);
      },
      { timeout: 1000 }
    );
  });

  it("should select template when clicked", async () => {
    const mockAutocomplete = vi.mocked(exerciseTemplatesApi.autocomplete);
    mockAutocomplete.mockResolvedValue(mockTemplates);

    render(<ExerciseSetForm sessionId={sessionId} onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Add an exercise
    const addButton = screen.getByText("+ Agregar Ejercicio");
    fireEvent.click(addButton);

    // Type in the exercise name input
    const input = screen.getByPlaceholderText(
      /empieza a escribir para buscar/i
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Peso" } });

    // Wait for suggestions
    await waitFor(
      () => {
        expect(screen.getByText("Peso muerto")).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    // Click on suggestion
    const suggestion = screen.getByText("Peso muerto");
    fireEvent.click(suggestion);

    // Input should be updated with selected template name
    await waitFor(() => {
      expect(input.value).toBe("Peso muerto");
    });
  });

  it("should debounce search requests", async () => {
    const mockAutocomplete = vi.mocked(exerciseTemplatesApi.autocomplete);
    mockAutocomplete.mockResolvedValue(mockTemplates);

    render(<ExerciseSetForm sessionId={sessionId} onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Add an exercise
    const addButton = screen.getByText("+ Agregar Ejercicio");
    fireEvent.click(addButton);

    const input = screen.getByPlaceholderText(/empieza a escribir para buscar/i);

    // Type multiple characters quickly
    fireEvent.change(input, { target: { value: "P" } });
    fireEvent.change(input, { target: { value: "Pe" } });
    fireEvent.change(input, { target: { value: "Pes" } });
    fireEvent.change(input, { target: { value: "Peso" } });

    // Should only call API once with final value
    await waitFor(
      () => {
        expect(mockAutocomplete).toHaveBeenCalledTimes(1);
        expect(mockAutocomplete).toHaveBeenCalledWith(1, "Peso", 1000);
      },
      { timeout: 1000 }
    );
  });

  it("should hide suggestions on blur", async () => {
    const mockAutocomplete = vi.mocked(exerciseTemplatesApi.autocomplete);
    mockAutocomplete.mockResolvedValue(mockTemplates);

    render(<ExerciseSetForm sessionId={sessionId} onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Add an exercise
    const addButton = screen.getByText("+ Agregar Ejercicio");
    fireEvent.click(addButton);

    // Type in the exercise name input
    const input = screen.getByPlaceholderText(/empieza a escribir para buscar/i);
    fireEvent.change(input, { target: { value: "Peso" } });

    // Wait for suggestions
    await waitFor(
      () => {
        expect(screen.getByText("Peso muerto")).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    // Blur the input
    fireEvent.blur(input);

    // Wait for blur timeout (200ms)
    await waitFor(
      () => {
        expect(screen.queryByText("Peso muerto")).not.toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it("should handle API errors gracefully", async () => {
    const mockAutocomplete = vi.mocked(exerciseTemplatesApi.autocomplete);
    mockAutocomplete.mockRejectedValue(new Error("API Error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ExerciseSetForm sessionId={sessionId} onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Add an exercise
    const addButton = screen.getByText("+ Agregar Ejercicio");
    fireEvent.click(addButton);

    // Type in the exercise name input
    const input = screen.getByPlaceholderText(/empieza a escribir para buscar/i);
    fireEvent.change(input, { target: { value: "Peso" } });

    // Wait for error handling
    await waitFor(
      () => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error fetching autocomplete suggestions:",
          expect.any(Error)
        );
      },
      { timeout: 1000 }
    );

    // Component should still be functional
    expect(input).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
