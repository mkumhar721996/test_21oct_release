import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "@/app/page";
import { greeting } from "@/lib/greeting";

test("greeting defaults to World", () => {
  expect(greeting()).toBe("Hello, World!");
});

test("home page renders the greeting", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hello, World!");
});
