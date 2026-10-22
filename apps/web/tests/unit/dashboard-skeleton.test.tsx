import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

it("shows the title and busy skeleton blocks without a table", () => {
  const { container } = render(<DashboardSkeleton />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Dashboard");
  expect(container.querySelector("[aria-busy=true]")).not.toBeNull();
  expect(container.querySelectorAll(".summary .card")).toHaveLength(3);
  expect(container.querySelectorAll(".lower .card")).toHaveLength(2);
  expect(container.querySelectorAll(".lower .card")[0].querySelectorAll(".sk-line")).toHaveLength(3);
  expect(container.querySelectorAll(".lower .card")[1].querySelectorAll(".sk-line")).toHaveLength(4);
  expect(screen.queryByRole("table")).toBeNull();
});
