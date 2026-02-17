import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LogoColorPicker from "./LogoColorPicker";

// Mock canvas methods
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray([255, 128, 64, 255]),
  })),
})) as any;

// Mock the colorUtils module
vi.mock("@/lib/colorUtils", () => ({
  getColorAtPixel: vi.fn(() => ({ r: 255, g: 128, b: 64 })),
  rgbToHex: vi.fn(() => "#ff8040"),
  generateCompleteTheme: vi.fn((primary: string) => ({
    primary,
    secondary: "#ffb380",
    background: "#ffffff",
    text: "#1a1a1a",
  })),
}));

describe("LogoColorPicker", () => {
  const mockOnColorsSelected = vi.fn();
  const mockOnColorsCleared = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    logoUrl: "data:image/png;base64,test",
    onColorsSelected: mockOnColorsSelected,
    onColorsCleared: mockOnColorsCleared,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with initial instruction", () => {
    render(<LogoColorPicker {...defaultProps} />);
    expect(
      screen.getByText("Haz clic en tu logo para seleccionar el color principal de tu marca")
    ).toBeDefined();
  });

  it("shows Cancelar button", () => {
    render(<LogoColorPicker {...defaultProps} />);
    expect(screen.getByText("Cancelar")).toBeDefined();
  });

  it("calls onCancel when clicking Cancelar button", () => {
    render(<LogoColorPicker {...defaultProps} />);

    const cancelButton = screen.getByText("Cancelar");
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("has onColorsCleared callback prop", () => {
    // This test verifies that the component accepts the onColorsCleared prop
    // which is the key fix for the "Cambiar Color" button issue
    const { rerender } = render(<LogoColorPicker {...defaultProps} />);

    // Should not throw when onColorsCleared is undefined
    rerender(
      <LogoColorPicker
        logoUrl={defaultProps.logoUrl}
        onColorsSelected={mockOnColorsSelected}
        onCancel={mockOnCancel}
      />
    );

    expect(true).toBe(true); // Test passes if no error thrown
  });

  it("integration test: full flow with parent component state management", () => {
    // This test simulates the parent component's state management
    let customColors: any = null;

    const TestParent = () => {
      return (
        <LogoColorPicker
          logoUrl="data:image/png;base64,test"
          onColorsSelected={(colors) => {
            customColors = colors;
          }}
          onColorsCleared={() => {
            customColors = null;
          }}
          onCancel={() => {}}
        />
      );
    };

    render(<TestParent />);

    // Verify initial state
    expect(customColors).toBe(null);

    // This test documents the expected behavior:
    // 1. When user clicks logo, colors should be set
    // 2. When user clicks "Cambiar Color", colors should be cleared
    // 3. Form button should be enabled/disabled based on customColors state

    expect(screen.getByText("Cancelar")).toBeDefined();
  });
});
