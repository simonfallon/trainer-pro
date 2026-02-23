import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionModal } from "./SessionModal";
import { TrainingSession, Client, Location, SessionStatus } from "@/types";

// Mock CSS if needed (though vitest setup usually handles this, we'll keep it simple)
vi.mock("./calendar.css", () => ({}));

describe("SessionModal", () => {
  const mockClients: Client[] = [
    {
      id: 1,
      name: "Ana García",
      email: "ana@test.com",
      phone: "1234567890",
      created_at: "",
      updated_at: "",
    } as unknown as Client,
    {
      id: 2,
      name: "Carlos Rodríguez",
      email: "carlos@test.com",
      phone: "0987654321",
      created_at: "",
      updated_at: "",
    } as unknown as Client,
  ];

  const mockLocations: Location[] = [
    {
      id: 1,
      name: "Gym",
      type: "gym",
      created_at: "",
      updated_at: "",
      trainer_id: 1,
    } as unknown as Location,
  ];

  const defaultProps = {
    mode: "create" as const,
    clients: mockClients,
    locations: mockLocations,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onStatusChange: vi.fn(),
    onDelete: vi.fn(),
    initialDate: new Date("2026-02-04T10:00:00"),
  };

  it("renders correctly in create mode", () => {
    render(<SessionModal {...defaultProps} />);
    expect(screen.getByText("Programar Sesión")).toBeInTheDocument();
    expect(screen.getByText("Selecciona uno o más clientes")).toBeInTheDocument();
    expect(screen.getByText("Guardar")).toBeInTheDocument();
  });

  it("pre-selects clients when initialClientIds is provided in create mode", () => {
    render(<SessionModal {...defaultProps} initialClientIds={[2]} />);
    expect(screen.getByText("Carlos Rodríguez")).toBeInTheDocument();
  });

  it("allows selecting multiple clients", () => {
    render(<SessionModal {...defaultProps} />);

    // Open dropdown
    fireEvent.click(screen.getByText("Selecciona uno o más clientes"));

    // Select Ana
    const anaOption = screen.getByText("Ana García");
    fireEvent.click(anaOption);

    // Select Carlos
    const carlosOption = screen.getByText("Carlos Rodríguez");
    fireEvent.click(carlosOption);

    // Labels should be updated?
    // Note: The UI updates the SUMMARY text based on selection.
    expect(screen.getByText("2 clientes seleccionados")).toBeInTheDocument();
  });

  it('closes dropdown when clicking "Listo"', () => {
    render(<SessionModal {...defaultProps} />);

    // Open dropdown
    const dropdownTrigger = screen.getByText("Selecciona uno o más clientes");
    fireEvent.click(dropdownTrigger);

    // Verify "Listo" button is visible
    const doneButton = screen.getByText("Listo");
    expect(doneButton).toBeVisible();

    // Click Done
    fireEvent.click(doneButton);

    // Verify dropdown is gone (clicked outside logic removed, so this tests explicit close)
    expect(doneButton).not.toBeVisible();
  });

  it("calls onSave with multiple client_ids", async () => {
    render(<SessionModal {...defaultProps} />);

    // Select clients
    fireEvent.click(screen.getByText("Selecciona uno o más clientes"));
    fireEvent.click(screen.getByText("Ana García"));
    fireEvent.click(screen.getByText("Carlos Rodríguez"));
    fireEvent.click(screen.getByText("Listo"));

    // Submit
    fireEvent.click(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          client_ids: [1, 2],
          duration_minutes: 60, // default
        })
      );
    });
  });

  it("validates form before submission (date and client required)", () => {
    render(<SessionModal {...defaultProps} />);

    // Button should be disabled initially if client_ids is empty?
    // Let's check the code: disabled={submitting || formData.client_ids.length === 0 || !formData.date}

    const saveButton = screen.getByText("Guardar");
    expect(saveButton).toBeDisabled();

    // Select client
    fireEvent.click(screen.getByText("Selecciona uno o más clientes"));
    fireEvent.click(screen.getByText("Ana García"));
    fireEvent.click(screen.getByText("Listo"));

    // Now should be enabled (date is pre-filled from initialDate in useEffect)
    expect(saveButton).toBeEnabled();
  });

  it("displays multiple clients in view mode", () => {
    const groupSessions: TrainingSession[] = [
      {
        id: 1,
        trainer_id: 1,
        client_id: 1,
        scheduled_at: "2026-02-04T10:00:00",
        duration_minutes: 60,
        status: "scheduled",
        created_at: "",
        updated_at: "",
        session_group_id: 100,
        location_id: null,
        notes: null,
        is_paid: false,
        paid_at: null,
      } as TrainingSession,
      {
        id: 2,
        trainer_id: 1,
        client_id: 2,
        scheduled_at: "2026-02-04T10:00:00",
        duration_minutes: 60,
        status: "scheduled",
        created_at: "",
        updated_at: "",
        session_group_id: 100,
        location_id: null,
        notes: null,
        is_paid: false,
        paid_at: null,
      } as TrainingSession,
    ];

    render(
      <SessionModal
        {...defaultProps}
        mode="view"
        session={groupSessions[0]}
        groupSessions={groupSessions}
      />
    );

    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("Carlos Rodríguez")).toBeInTheDocument();
  });
});
