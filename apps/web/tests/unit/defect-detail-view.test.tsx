import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DefectDetailView } from "@/components/defects/defect-detail-view";
import { saveDefectChange } from "@/lib/defect-actions";
import type { DefectDetail, Person, Viewer } from "@/lib/defects";

vi.mock("@/lib/defect-actions", () => ({ saveDefectChange: vi.fn() }));

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
  version: 1,
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

  it("has no comment controls", () => {
    render(<DefectDetailView defect={full} />);
    expect(screen.queryByRole("button", { name: /post comment/i })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});

const viewerWith = (role: Viewer["roles"][number]): Viewer => ({ name: "Vic", roles: [role] });
const sam: Person = { id: "p1", name: "Sam Ortiz", roles: ["tester"] };
const people: Person[] = [sam, { id: "p2", name: "Mia Fox", roles: ["manager"] }];
const mocked = vi.mocked(saveDefectChange);
const setup = (defect: DefectDetail = full, viewer: Viewer | null = viewerWith("tester"), list = people) =>
  render(<DefectDetailView defect={defect} viewer={viewer} people={list} />);
const click = (name: string, role = "button") => fireEvent.click(screen.getByRole(role, { name }));
const assignOf = (name: string) => {
  click("Assign");
  click(name, "menuitem");
};

describe("assign and change status", () => {
  beforeEach(() => mocked.mockReset());

  it.each(["tester", "manager", "lead"] as const)("opens both lists for a %s (AC 1, 3)", (role) => {
    setup(full, viewerWith(role));
    click("Assign");
    expect(screen.getByRole("menu", { name: /assign/i })).toBeTruthy();
    click("Change status");
    expect(screen.getByRole("menu", { name: /status/i })).toBeTruthy();
    expect(screen.queryByRole("menu", { name: /assign/i })).toBeNull();
  });

  it("shows the chosen person as assignee (AC 2)", async () => {
    mocked.mockResolvedValue({ ok: true, defect: { ...full, assignee: "Sam Ortiz", version: 2 } });
    setup();
    assignOf("Sam Ortiz");
    expect(await screen.findByText("Assignee: Sam Ortiz")).toBeTruthy();
    expect(mocked).toHaveBeenCalledWith("DEF-101", { assignee: "Sam Ortiz" }, 1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("shows the chosen status (AC 4)", async () => {
    mocked.mockResolvedValue({ ok: true, defect: { ...full, status: "in_progress", version: 2 } });
    setup();
    click("Change status");
    click("In progress", "menuitem");
    expect(await screen.findByText("In progress")).toBeTruthy();
    expect(mocked).toHaveBeenCalledWith("DEF-101", { status: "in_progress" }, 1);
  });

  it("does not save when choosing the current value", () => {
    setup();
    click("Change status");
    click("Open", "menuitem");
    expect(mocked).not.toHaveBeenCalled();
  });

  it.each([
    ["developer viewer", { name: "Pat", roles: ["developer"] } as Viewer | null],
    ["no viewer", null],
  ])("disables both controls for a %s (AC 5)", (_n, viewer) => {
    setup(full, viewer);
    for (const name of ["Assign", "Change status"]) {
      const button = screen.getByRole("button", { name }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.getAttribute("aria-disabled")).toBe("true");
      fireEvent.click(button);
    }
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByText(/only testers, managers and leads/i)).toBeTruthy();
  });

  it("shows a persistent alert beside the failed assign and changes nothing (AC 6, 7)", async () => {
    mocked.mockResolvedValue({ ok: false, kind: "failed" });
    setup();
    assignOf("Sam Ortiz");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn't save the assignee.*try again/i);
    expect(within(screen.getByTestId("assign-group")).getByRole("alert")).toBe(alert);
    expect(screen.getByText("Assignee: Dana Lee")).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
  });

  it("shows a persistent alert beside the failed status change (AC 6, 7)", async () => {
    mocked.mockResolvedValue({ ok: false, kind: "failed" });
    setup();
    click("Change status");
    click("Closed", "menuitem");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn't save the status.*try again/i);
    expect(within(screen.getByTestId("status-group")).getByRole("alert")).toBe(alert);
    expect(screen.getByText("Open")).toBeTruthy();
  });

  it("offers exactly Open, In progress, Closed (AC 8)", () => {
    setup();
    click("Change status");
    const items = within(screen.getByRole("menu", { name: /status/i })).getAllByRole("menuitem");
    expect(items.map((i) => i.textContent?.trim())).toEqual(["Open", "In progress", "Closed"]);
  });

  it("reopens a closed defect (AC 9)", async () => {
    mocked.mockResolvedValue({ ok: true, defect: { ...full, status: "open", version: 2 } });
    setup({ ...full, status: "closed" });
    expect(screen.getByText("Closed")).toBeTruthy();
    click("Change status");
    click("Open", "menuitem");
    expect(await screen.findByText("Open")).toBeTruthy();
    expect(screen.queryByText("Closed")).toBeNull();
  });

  it("warns on a stale save and keeps the other person's change (AC 10, 11)", async () => {
    mocked.mockResolvedValue({ ok: false, kind: "conflict", defect: { ...full, assignee: "Lee Chen", version: 3 } });
    setup();
    assignOf("Sam Ortiz");
    expect((await screen.findByRole("alert")).textContent).toMatch(/someone else changed this defect.*choose again/i);
    expect(screen.getByText("Assignee: Lee Chen")).toBeTruthy();
    expect(screen.queryByText("Assignee: Sam Ortiz")).toBeNull();
  });

  it.each(["unauthenticated", "forbidden"] as const)("locks the controls on %s (AC 12, 13)", async (kind) => {
    mocked.mockResolvedValue({ ok: false, kind });
    setup();
    assignOf("Sam Ortiz");
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /can no longer assign this defect or change its status/i,
    );
    expect((screen.getByRole("button", { name: "Assign" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Change status" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("lists only tester, manager and lead people, Unassigned first (AC 14, 15)", () => {
    setup(full, viewerWith("lead"), [sam, { id: "p9", name: "Dev Dan", roles: ["developer"] }]);
    click("Assign");
    expect(screen.queryByRole("menuitem", { name: "Dev Dan" })).toBeNull();
    const items = within(screen.getByRole("menu", { name: /assign/i })).getAllByRole("menuitem");
    expect(items.map((i) => i.textContent?.trim())).toEqual(["Unassigned", "Sam Ortiz"]);
  });

  it("unassigns (AC 16)", async () => {
    mocked.mockResolvedValue({ ok: true, defect: { ...full, assignee: null, version: 2 } });
    setup();
    assignOf("Unassigned");
    expect(await screen.findByText("Assignee: Unassigned")).toBeTruthy();
    expect(mocked).toHaveBeenCalledWith("DEF-101", { assignee: null }, 1);
  });

  it("closes on Escape and returns focus to the trigger", () => {
    setup();
    click("Assign");
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Assign" }));
  });

  it("moves between items with the arrow keys", () => {
    setup();
    click("Assign");
    const items = screen.getAllByRole("menuitem");
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[0]);
  });

  it("closes on an outside click", () => {
    setup();
    click("Assign");
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
