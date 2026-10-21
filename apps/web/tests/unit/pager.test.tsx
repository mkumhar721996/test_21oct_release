import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pager } from "@/components/defects/pager";

describe("Pager", () => {
  it("links Previous page to the previous page (AC 7)", () => {
    render(<Pager page={2} pageCount={3} total={45} from={21} to={40} sort="desc" />);
    expect(screen.getByRole("link", { name: /Previous page/ }).getAttribute("href")).toBe("/defects?page=1&sort=desc");
    expect(screen.getByRole("link", { name: /Next page/ }).getAttribute("href")).toBe("/defects?page=3&sort=desc");
  });

  it("shows Page 2 of 3 (AC 13)", () => {
    render(<Pager page={2} pageCount={3} total={45} from={21} to={40} sort="desc" />);
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    expect(screen.getByText("Showing 21–40 of 45")).toBeTruthy();
  });

  it("disables Previous page on page 1 (AC 14)", () => {
    render(<Pager page={1} pageCount={3} total={45} from={1} to={20} sort="desc" />);
    expect((screen.getByRole("button", { name: /Previous page/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("link", { name: /Next page/ })).toBeTruthy();
  });

  it("disables Next page on the last page (AC 15)", () => {
    render(<Pager page={3} pageCount={3} total={45} from={41} to={45} sort="desc" />);
    expect((screen.getByRole("button", { name: /Next page/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the sort in page links", () => {
    render(<Pager page={1} pageCount={2} total={21} from={1} to={20} sort="asc" />);
    expect(screen.getByRole("link", { name: /Next page/ }).getAttribute("href")).toBe("/defects?page=2&sort=asc");
  });
});
