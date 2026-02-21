import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditAppConfigModal } from "../EditAppConfigModal";
import { themes } from "@/themes";
import { trainersApi, appsApi, uploadsApi } from "@/lib/api";

// Mock API
vi.mock("@/lib/api", () => ({
  trainersApi: {
    update: vi.fn(),
  },
  appsApi: {
    update: vi.fn(),
  },
  uploadsApi: {
    uploadImage: vi.fn(),
  },
}));

// Mock ImageUpload since we are testing other mechanics
vi.mock("@/components/ImageUpload", () => ({
  ImageUpload: ({ onImageSelected, label, currentImage }: any) => (
    <div data-testid="mock-image-upload">
      <label>{label}</label>
      {currentImage && <span>Current: {currentImage}</span>}
      <button
        type="button"
        onClick={() => {
          // Simulate selecting a file
          const file = new File(["dummy content"], "logo.png", { type: "image/png" });
          onImageSelected(file);
        }}
      >
        Select Image
      </button>
    </div>
  ),
}));

// Mock LogoColorPicker as it assumes complex browser functionality
vi.mock("@/components/LogoColorPicker", () => ({
  default: ({ onColorsSelected, onCancel, onColorsCleared }: any) => (
    <div data-testid="mock-color-picker">
      Mock Color Picker
      <button
        type="button"
        onClick={() =>
          onColorsSelected({
            primary: "#ff0000",
            secondary: "#00ff00",
            background: "#ffffff",
            text: "#000000",
          })
        }
      >
        Select Colors
      </button>
      <button type="button" onClick={onColorsCleared}>
        Clear Colors
      </button>
      <button type="button" onClick={onCancel}>
        Cancel Custom Color
      </button>
    </div>
  ),
}));

const mockApp = {
  id: 1,
  trainer_id: 1,
  name: "Test App",
  theme_id: "ocean-breeze",
  theme_config: {
    colors: themes[0].colors,
    fonts: themes[0].fonts,
  },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockTrainer = {
  id: 1,
  name: "Test Trainer",
  email: "test@example.com",
  phone: "+1234567890",
  google_id: null,
  logo_url: "https://example.com/logo.png",
  discipline_type: "physio",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("EditAppConfigModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    URL.createObjectURL = vi.fn(() => "blob:mock-url");
  });

  const setup = () => {
    return render(
      <EditAppConfigModal
        app={mockApp}
        trainer={mockTrainer}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
  };

  it("renders with current config values", () => {
    setup();

    expect(screen.getByLabelText(/Nombre de la Aplicación/i)).toHaveValue("Test App");
    expect(screen.getByLabelText(/Número de Teléfono/i)).toHaveValue("+1234567890");

    // Test that the current logo is displayed in the mock
    expect(screen.getByText(/Current: https:\/\/example.com\/logo.png/i)).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    setup();

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("updates app name and phone without changing theme or logo", async () => {
    setup();

    fireEvent.change(screen.getByLabelText(/Nombre de la Aplicación/i), {
      target: { value: "Updated App Name" },
    });
    fireEvent.change(screen.getByLabelText(/Número de Teléfono/i), {
      target: { value: "+1987654321" },
    });

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(trainersApi.update).toHaveBeenCalledWith(1, {
        phone: "+1987654321",
        logo_url: "https://example.com/logo.png",
      });
      expect(appsApi.update).toHaveBeenCalledWith(1, {
        name: "Updated App Name",
        theme_id: expect.any(String),
        theme_config: {
          colors: expect.any(Object),
          fonts: expect.any(Object),
        },
      });
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("handles empty names correctly (does not fire API)", async () => {
    setup();

    fireEvent.change(screen.getByLabelText(/Nombre de la Aplicación/i), {
      target: { value: "   " },
    });

    const submitBtn = screen.getByRole("button", { name: /guardar cambios/i });
    expect(submitBtn).toBeDisabled();

    // Verify it cannot be submitted
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(trainersApi.update).not.toHaveBeenCalled();
      expect(appsApi.update).not.toHaveBeenCalled();
    });
  });

  it("changes to Logo theme mode and requires logo color extraction", async () => {
    setup();

    // Select Logo Theme Mode tab
    const logoThemeTab = screen.getByRole("button", { name: /crear desde logo/i });
    fireEvent.click(logoThemeTab);

    // Initial load requires custom colors if not already "custom-logo" theme
    expect(screen.getByTestId("mock-color-picker")).toBeInTheDocument();

    // Save changes without selecting colors should be disabled
    const submitBtn = screen.getByRole("button", { name: /guardar cambios/i });
    expect(submitBtn).toBeDisabled();

    // Simulate click just in case
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(appsApi.update).not.toHaveBeenCalled();
    });

    // Select Colors in the mock
    fireEvent.click(screen.getByRole("button", { name: /select colors/i }));

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(appsApi.update).toHaveBeenCalledWith(1, {
        name: "Test App",
        theme_id: "custom-logo",
        theme_config: expect.objectContaining({
          colors: {
            primary: "#ff0000",
            secondary: "#00ff00",
            background: "#ffffff",
            text: "#000000",
          },
        }),
      });
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("uploads a new logo image", async () => {
    (uploadsApi.uploadImage as any).mockResolvedValueOnce({
      url: "https://example.com/new-logo.png",
    });

    setup();

    // Select a file
    fireEvent.click(screen.getByRole("button", { name: /select image/i }));

    // Save updates
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(uploadsApi.uploadImage).toHaveBeenCalled();
      expect(trainersApi.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          logo_url: "https://example.com/new-logo.png",
        })
      );
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("displays server error message if request fails", async () => {
    (appsApi.update as any).mockRejectedValueOnce(new Error("Database error"));

    setup();

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(screen.getByText(/database error/i)).toBeInTheDocument();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    // Check loading text resets
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeInTheDocument();
  });
});
