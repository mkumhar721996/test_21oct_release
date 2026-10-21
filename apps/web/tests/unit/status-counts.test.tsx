import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusCounts } from "@/components/defects/status-counts";

describe("StatusCounts", () => {
  it("shows open, in progress and closed counts (AC 3)", () => {
    render(<StatusCounts counts={{ open: 18, inProgress: 12, closed: 15 }} />);
    const section = screen.getByLabelText("Defect counts");
    expect(within(section).getByText("Open").parentElement?.previousElementSibling?.textContent).toBe("18");
    expect(within(section).getByText("In progress").parentElement?.previousElementSibling?.textContent).toBe("12");
    expect(within(section).getByText("Closed").parentElement?.previousElementSibling?.textContent).toBe("15");
  });
});
