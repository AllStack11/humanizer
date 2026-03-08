import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createTheme, MantineProvider } from "@mantine/core";
import StyleModal from "./StyleModal.jsx";

const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "lg",
  fontFamily: "Manrope, Inter, system-ui, sans-serif",
});

function renderWithMantine(ui) {
  return render(<MantineProvider theme={theme}>{ui}</MantineProvider>);
}

describe("StyleModal", () => {
  test("adds pasted text with blank lines as a single style piece", () => {
    renderWithMantine(
      <StyleModal
        hasProfile={false}
        loading={false}
        onTrainProfile={async () => true}
        onClose={() => {}}
      />
    );

    fireEvent.change(
      screen.getByPlaceholderText("Paste writing snippets. Each paste is added as one style piece."),
      { target: { value: "First paragraph.\n\nSecond paragraph." } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Add to style pool" }));

    expect(screen.getByText("Style Pieces (2)")).toBeInTheDocument();
  });

  test("normalizes legacy q&a sample type changes before submit", async () => {
    const onTrainProfile = vi.fn(async () => true);

    renderWithMantine(
      <StyleModal
        hasProfile={false}
        loading={false}
        onTrainProfile={onTrainProfile}
        onClose={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText("Piece 1"), { target: { value: "question" } });
    fireEvent.change(screen.getAllByRole("textbox")[1], {
      target: { value: "How are you feeling about the launch and what still feels risky to you right now? Please answer candidly and with specifics." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create profile" }));

    await waitFor(() => {
      expect(onTrainProfile).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 1,
          type: "question",
        }),
      ]);
    });
  });

  test("shows profile coverage summary inside the modal", () => {
    renderWithMantine(
      <StyleModal
        hasProfile={false}
        loading={false}
        health={{ score: 35, typeCoverage: 1, sampleCount: 0 }}
        profileLabel="Work"
        sampleCount={0}
        onTrainProfile={async () => true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/0 samples • Work profile needs onboarding/i)).toBeInTheDocument();
    expect(screen.getByText(/coverage 1\/5/i)).toBeInTheDocument();
  });
});
