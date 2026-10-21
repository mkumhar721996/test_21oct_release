import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NewDefectState } from "@/app/defects/new/actions";
import { NewDefectForm } from "@/components/defects/new-defect-form";

vi.mock("@/app/defects/new/actions", () => ({ createDefectAction: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

const withTitleError: NewDefectState = {
  errors: { title: "Enter a title for the defect." },
  values: { title: "", severity: "high", area: "Billing", steps: "1. Open billing" },
};

function chooseFile(name: string) {
  const input = screen.getByLabelText("Attach file input") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(["x"], name)] } });
}

describe("NewDefectForm", () => {
  it("shows all five fields with Medium selected (AC 3)", () => {
    render(<NewDefectForm />);
    expect(screen.getByLabelText("Title")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Severity" })).toBeTruthy();
    expect(screen.getByLabelText("Area")).toBeTruthy();
    expect(screen.getByLabelText("Steps to reproduce")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Attach file" })).toBeTruthy();
    expect((screen.getByLabelText("Medium") as HTMLInputElement).checked).toBe(true);
  });

  it("shows the missing-title error beside the title and keeps the other entries (AC 5, 6)", () => {
    render(<NewDefectForm initial={withTitleError} />);
    const title = screen.getByLabelText("Title");
    expect(title.getAttribute("aria-invalid")).toBe("true");
    expect(title.getAttribute("aria-describedby")).toBe(screen.getByText("Enter a title for the defect.").id);
    expect((screen.getByLabelText("High") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Area") as HTMLSelectElement).value).toBe("Billing");
    expect((screen.getByLabelText("Steps to reproduce") as HTMLTextAreaElement).value).toBe("1. Open billing");
  });

  it("offers Submit enabled and Cancel linking to the list (AC 4, 11)", () => {
    const { container } = render(<NewDefectForm />);
    expect((screen.getByRole("button", { name: "Submit defect" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole("link", { name: "Cancel" }).getAttribute("href")).toBe("/defects");
    expect(container.querySelectorAll(".btn-primary")).toHaveLength(1);
    for (const id of ["defect-title", "defect-area", "defect-steps"]) {
      expect(container.querySelector(`#${id}`)?.closest(".field")).toBeTruthy();
    }
  });

  it("shows an upload failure beside Attach file, keeps entries and keeps the control usable (AC 7, 8, 9)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "That file is too large. Choose one under 10 MB." }) }),
    );
    render(<NewDefectForm />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Crash" } });
    fireEvent.click(screen.getByLabelText("Critical"));
    chooseFile("big.png");

    const error = await screen.findByText("That file is too large. Choose one under 10 MB.");
    const attach = screen.getByRole("button", { name: "Attach file" }) as HTMLButtonElement;
    expect(attach.getAttribute("aria-describedby")).toBe(error.id);
    expect(attach.disabled).toBe(false);
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Crash");
    expect((screen.getByLabelText("Critical") as HTMLInputElement).checked).toBe(true);
  });

  it("clears the error and shows the name after a later good file (AC 9)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "Nope." }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ attachmentId: "a1", name: "ok.png" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<NewDefectForm />);
    chooseFile("virus.exe");
    await screen.findByText("Nope.");
    chooseFile("ok.png");
    await waitFor(() => expect(screen.queryByText("Nope.")).toBeNull());
    expect(await screen.findByText("ok.png")).toBeTruthy();
  });
});
