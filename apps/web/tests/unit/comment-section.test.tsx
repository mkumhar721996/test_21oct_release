import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postCommentAction } from "@/app/defects/[id]/actions";
import { CommentSection } from "@/components/defects/comment-section";

vi.mock("@/app/defects/[id]/actions", () => ({ postCommentAction: vi.fn() }));

const c1 = { id: "c1", author: "Sam", body: "Reproduced on 17.1", createdAt: "2026-10-02T10:00:00Z" };
const c2 = { id: "c2", author: "Sam", body: "Fixed in 17.2", createdAt: "2026-10-03T09:00:00Z" };

beforeEach(() => {
  vi.mocked(postCommentAction).mockReset();
});

function submit(text: string) {
  fireEvent.change(screen.getByLabelText("Add a comment"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Post comment" }));
}
const input = () => screen.getByLabelText("Add a comment") as HTMLTextAreaElement;

describe("CommentSection", () => {
  it("appends a posted comment and clears the input", async () => {
    vi.mocked(postCommentAction).mockResolvedValue({ ok: true, comment: c2 });
    render(<CommentSection defectId="DEF-101" initialComments={[c1]} />);
    submit("Fixed in 17.2");
    expect(await screen.findByText("Fixed in 17.2")).toBeTruthy();
    expect(screen.getByText("Reproduced on 17.1")).toBeTruthy();
    expect(input().value).toBe("");
    expect(postCommentAction).toHaveBeenCalledWith("DEF-101", "Fixed in 17.2");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("drops the empty state after the first comment", async () => {
    vi.mocked(postCommentAction).mockResolvedValue({ ok: true, comment: c2 });
    render(<CommentSection defectId="DEF-101" initialComments={[]} />);
    expect(screen.getByText("No comments yet")).toBeTruthy();
    submit("Fixed in 17.2");
    await screen.findByText("Fixed in 17.2");
    expect(screen.queryByText("No comments yet")).toBeNull();
  });

  it("shows a persistent inline alert, keeps the text and the list on failure", async () => {
    vi.mocked(postCommentAction).mockResolvedValue({ ok: false });
    render(<CommentSection defectId="DEF-101" initialComments={[c1]} />);
    submit("Needs a retry");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn't post your comment/i);
    expect(alert.textContent).toMatch(/try again/i);
    expect(alert.className).toContain("alert-danger");
    const button = screen.getByRole("button", { name: "Post comment" });
    expect(alert.closest("form")).toBe(button.closest("form"));
    expect(input().value).toBe("Needs a retry");
    expect(within(screen.getByRole("list")).queryByText("Needs a retry")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("removes the alert after a later successful post", async () => {
    vi.mocked(postCommentAction).mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, comment: c2 });
    render(<CommentSection defectId="DEF-101" initialComments={[c1]} />);
    submit("Fixed in 17.2");
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Post comment" }));
    await screen.findByText("Fixed in 17.2", { selector: "p" });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("sends nothing for blank text and shows a field error", () => {
    render(<CommentSection defectId="DEF-101" initialComments={[c1]} />);
    submit("   ");
    expect(postCommentAction).not.toHaveBeenCalled();
    expect(screen.getByText("Write a comment before posting.")).toBeTruthy();
  });

  it("disables the button and marks it busy while posting", async () => {
    let resolve!: (v: { ok: false }) => void;
    vi.mocked(postCommentAction).mockReturnValue(new Promise((r) => (resolve = r)));
    render(<CommentSection defectId="DEF-101" initialComments={[c1]} />);
    submit("hello");
    const button = await screen.findByRole("button", { name: "Posting…" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    resolve({ ok: false });
    await waitFor(() => expect(screen.getByRole("button", { name: "Post comment" })).toBeTruthy());
  });

  it("has no edit or delete controls on comments", async () => {
    vi.mocked(postCommentAction).mockResolvedValue({ ok: true, comment: c2 });
    render(<CommentSection defectId="DEF-101" initialComments={[c1]} />);
    submit("Fixed in 17.2");
    await screen.findByText("Fixed in 17.2");
    expect(screen.queryByRole("button", { name: /edit|delete|remove/i })).toBeNull();
    expect(within(screen.getByRole("list")).queryAllByRole("button")).toHaveLength(0);
  });
});
