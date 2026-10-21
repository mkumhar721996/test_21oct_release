import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRouter } from "next/navigation";
import { DefectRow } from "@/components/defects/defect-row";
import type { Defect } from "@/lib/defects";

vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));

const defect: Defect = {
  id: "DEF-101",
  title: "Login button unresponsive",
  status: "open",
  severity: "high",
  area: "Login",
  reportedAt: "2026-10-20",
};

const push = vi.fn();
beforeEach(() => {
  push.mockClear();
  vi.mocked(useRouter).mockReturnValue({ push } as never);
});

function renderRow(d: Defect = defect) {
  render(
    <table>
      <tbody>
        <DefectRow defect={d} />
      </tbody>
    </table>,
  );
}

describe("DefectRow", () => {
  it("opens the defect when the row is clicked (AC 8)", () => {
    renderRow();
    fireEvent.click(screen.getByRole("row"));
    expect(push).toHaveBeenCalledWith("/defects/DEF-101");
  });

  it("lets the title link navigate itself without a double push", () => {
    renderRow();
    const link = screen.getByRole("link", { name: defect.title });
    fireEvent.click(link);
    expect(push).not.toHaveBeenCalled();
    expect(link.getAttribute("href")).toBe("/defects/DEF-101");
  });

  it("shows title, status, severity, area and reported date (AC 9)", () => {
    renderRow();
    const row = screen.getByRole("row", { name: /Login button unresponsive/ });
    expect(within(row).getByText("Open")).toBeTruthy();
    expect(within(row).getByText("High")).toBeTruthy();
    expect(within(row).getByText("Login")).toBeTruthy();
    expect(within(row).getByText("20 Oct 2026")).toBeTruthy();
    expect(within(row).getByText("DEF-101")).toBeTruthy();
  });

  it("labels in-progress status and critical severity", () => {
    renderRow({ ...defect, status: "in_progress", severity: "critical" });
    expect(screen.getByText("In progress")).toBeTruthy();
    expect(screen.getByText("Critical")).toBeTruthy();
  });
});
