import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DefectDetailView } from "@/components/defects/defect-detail-view";
import type { DefectDetail } from "@/lib/defects";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const full: DefectDetail = {
  id: "DEF-101",
  title: "Login fails on Safari",
  status: "open",
  severity: "high",
  area: "Login",
  reportedAt: "2026-10-01",
  description: "Tapping Sign in does nothing on Safari 17",
  assignee: "Dana Lee",
  attachments: [
    { name: "screenshot.png", url: "https://files.test/screenshot.png" },
    { name: "trace.log", url: "https://files.test/trace.log" },
  ],
  comments: [{ id: "c1", author: "Sam", body: "Reproduced on 17.1", createdAt: "2026-10-02T10:00:00Z" }],
};

describe("DefectDetailView", () => {
  it("shows heading, status, severity, assignee, area and description", () => {
    render(<DefectDetailView defect={full} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("DEF-101 Login fails on Safari");
    expect(screen.getByText("Open")).toBeTruthy();
    expect(screen.getByText("High")).toBeTruthy();
    expect(screen.getByText("Assignee: Dana Lee")).toBeTruthy();
    expect(screen.getByText("Area: Login")).toBeTruthy();
    expect(screen.getByText("Tapping Sign in does nothing on Safari 17")).toBeTruthy();
  });

  it("shows in-progress status", () => {
    render(<DefectDetailView defect={{ ...full, status: "in_progress" }} />);
    expect(screen.getByText("In progress")).toBeTruthy();
  });

  it("lists attachments as links", () => {
    render(<DefectDetailView defect={full} />);
    expect(screen.getByRole("link", { name: "screenshot.png" }).getAttribute("href")).toBe(
      "https://files.test/screenshot.png",
    );
    expect(screen.getByRole("link", { name: "trace.log" })).toBeTruthy();
    expect(screen.queryByText("No attachments yet")).toBeNull();
  });

  it("lists comments", () => {
    render(<DefectDetailView defect={full} />);
    expect(screen.getByText("Reproduced on 17.1")).toBeTruthy();
    expect(screen.queryByText("No comments yet")).toBeNull();
  });

  it("shows empty states and Unassigned", () => {
    render(<DefectDetailView defect={{ ...full, attachments: [], comments: [], assignee: null }} />);
    expect(screen.getByText("No attachments yet")).toBeTruthy();
    expect(screen.getByText("No comments yet")).toBeTruthy();
    expect(screen.getByText("Assignee: Unassigned")).toBeTruthy();
  });

  it("links back to the list", () => {
    render(<DefectDetailView defect={full} />);
    expect(screen.getByRole("link", { name: /back to list/i }).getAttribute("href")).toBe("/defects");
  });

  it("has no assign, status or comment controls", () => {
    render(<DefectDetailView defect={full} />);
    expect(screen.queryByRole("button", { name: /assign|change status|post comment/i })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
