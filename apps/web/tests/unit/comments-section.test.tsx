import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postComment } from "@/app/defects/[id]/actions";
import { CommentsSection } from "@/components/defects/comments-section";

vi.mock("@/app/defects/[id]/actions", () => ({ postComment: vi.fn() }));

const first = { id: "c1", author: "Sam", body: "Reproduced on 17.1", createdAt: "2026-10-02T10:00:00Z" };
const second = { id: "c2", author: "You", body: "Me too on 17.2", createdAt: "2026-10-21T09:00:00Z" };

beforeEach(() => {
  vi.mocked(postComment).mockReset();
});

const input = () => screen.getByLabelText("Add a comment") as HTMLInputElement;
const button = () => screen.getByRole("button", { name: "Post comment" }) as HTMLButtonElement;
function submit(text: string) {
  fireEvent.change(input(), { target: { value: text } });
  fireEvent.click(button());
}

describe("CommentsSection", () => {
  it("appends a posted comment and clears the input (AC 1)", async () => {
    vi.mocked(postComment).mockResolvedValue({ ok: true, comment: second });
    render(<CommentsSection defectId="DEF-101" initialComments={[first]} />);
    submit("Me too on 17.2");
    expect(await screen.findByText("Me too on 17.2")).toBeTruthy();
    expect(screen.getByText("Reproduced on 17.1")).toBeTruthy();
    expect(postComment).toHaveBeenCalledWith("DEF-101", "Me too on 17.2");
    expect(input().value).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("drops the empty state after the first comment", async () => {
    vi.mocked(postComment).mockResolvedValue({ ok: true, comment: second });
    render(<CommentsSection defectId="DEF-101" initialComments={[]} />);
    expect(screen.getByText("No comments yet")).toBeTruthy();
    submit("Me too on 17.2");
    await screen.findByText("Me too on 17.2");
    expect(screen.queryByText("No comments yet")).toBeNull();
  });

  it("shows a persistent inline alert next to the button on failure (AC 2)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(postComment).mockResolvedValue({ ok: false });
    render(<CommentsSection defectId="DEF-101" initialComments={[first]} />);
    submit("Draft text");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn't post your comment/i);
    expect(alert.textContent).toMatch(/try again/i);
    expect(alert.className).toContain("alert-danger");
    expect(button().closest("form")).toBe(alert.closest("form"));
    vi.advanceTimersByTime(10_000);
    expect(screen.getByRole("alert")).toBeTruthy();
    vi.useRealTimers();
  });

  it("keeps the typed text and re-enables the button on failure (AC 3)", async () => {
    vi.mocked(postComment).mockResolvedValue({ ok: false });
    render(<CommentsSection defectId="DEF-101" initialComments={[first]} />);
    submit("Draft text");
    await screen.findByRole("alert");
    expect(input().value).toBe("Draft text");
    expect(button().disabled).toBe(false);
    expect(input().getAttribute("aria-describedby")).toBeTruthy();
  });

  it("does not list a failed comment (AC 4)", async () => {
    vi.mocked(postComment).mockResolvedValue({ ok: false });
    render(<CommentsSection defectId="DEF-101" initialComments={[first]} />);
    submit("Draft text");
    await screen.findByRole("alert");
    expect(screen.queryByText("Draft text", { selector: "p" })).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("treats a rejected action call as a failure and re-enables the button", async () => {
    vi.mocked(postComment).mockRejectedValue(new Error("network"));
    render(<CommentsSection defectId="DEF-101" initialComments={[first]} />);
    submit("Draft text");
    await screen.findByRole("alert");
    expect(input().value).toBe("Draft text");
    expect(button().disabled).toBe(false);
  });

  it("clears the alert when the person edits the text, and on a later success", async () => {
    vi.mocked(postComment).mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, comment: second });
    render(<CommentsSection defectId="DEF-101" initialComments={[first]} />);
    submit("Me too on 17.2");
    await screen.findByRole("alert");
    fireEvent.click(button());
    await screen.findByText("Me too on 17.2", { selector: "p" });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("sends nothing for blank text and shows a field error", () => {
    render(<CommentsSection defectId="DEF-101" initialComments={[first]} />);
    submit("   ");
    expect(postComment).not.toHaveBeenCalled();
    expect(screen.getByText("Write a comment before posting.")).toBeTruthy();
    expect(input().className).toContain("is-invalid");
  });

  it("disables the button and reads Posting… while pending", async () => {
    let resolve!: (v: { ok: false }) => void;
    vi.mocked(postComment).mockReturnValue(new Promise((r) => (resolve = r)));
    render(<CommentsSection defectId="DEF-101" initialComments={[first]} />);
    submit("hello");
    const busy = (await screen.findByRole("button", { name: "Posting…" })) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    expect(input().value).toBe("hello");
    resolve({ ok: false });
    await screen.findByRole("alert");
  });

  it("has no edit or delete controls (AC 6)", async () => {
    vi.mocked(postComment).mockResolvedValue({ ok: true, comment: second });
    render(<CommentsSection defectId="DEF-101" initialComments={[first]} />);
    const check = () => {
      expect(screen.queryByRole("button", { name: /edit|delete|remove/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /edit|delete|remove/i })).toBeNull();
      expect(within(screen.getAllByRole("listitem").at(-1)!).queryByRole("button")).toBeNull();
    };
    check();
    submit("Me too on 17.2");
    await screen.findByText("Me too on 17.2");
    check();
  });
});
