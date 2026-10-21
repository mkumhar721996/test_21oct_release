import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoadFailure } from "@/components/defects/load-failure";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

beforeEach(() => {
  refresh.mockReset();
});

describe("LoadFailure", () => {
  it("shows the message with Try again inside the alert and no raw error", () => {
    render(<LoadFailure />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("We couldn't load the defect list.");
    expect(alert.textContent).not.toMatch(/500|TypeError|GET \/defects/);
    const btn = within(alert).getByRole("button", { name: "Try again" });
    expect(btn.className).toContain("btn-secondary");
    fireEvent.click(btn);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("says so and refocuses Try again when the retry fails again", async () => {
    render(<LoadFailure />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });
    expect(await screen.findByText(/It still didn't load/)).toBeTruthy();
    const btn = screen.getByRole("button", { name: "Try again" });
    expect(document.activeElement).toBe(btn);
  });

  it("shows the retrying state and fires refresh once while pending", async () => {
    let settle: () => void = () => {};
    refresh.mockImplementation(() => new Promise<void>((r) => (settle = r)));
    render(<LoadFailure />);
    const btn = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status", { name: "Loading defects" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trying again…", hidden: true }).hasAttribute("disabled")).toBe(true);
    await act(async () => {
      settle();
    });
  });
});
