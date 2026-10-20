import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { filterPillHref } from "@/lib/filter-pills";

describe("filter pills", () => {
  it("writes status so Overdue and Needs review match the invoice and dispute pages", () => {
    expect(filterPillHref("/invoices", "OVERDUE")).toBe("/invoices?status=OVERDUE");
    expect(filterPillHref("/disputes", "NEEDS_REVIEW")).toBe("/disputes?status=NEEDS_REVIEW");
    expect(filterPillHref("/invoices", "ALL")).toBe("/invoices");
    expect(filterPillHref("/invoices", "OPEN", { q: "Acme" })).toBe("/invoices?status=OPEN&q=Acme");
    expect(filterPillHref("/invoices", "OVERDUE")).not.toContain("state=");

    const root = process.cwd();
    const pills = readFileSync(join(root, "components/filter-pills.tsx"), "utf8");
    expect(pills).toContain("filterPillHref");
    expect(pills).not.toMatch(/params\.set\(\s*["']state["']/);

    for (const page of ["app/invoices/page.tsx", "app/disputes/page.tsx"]) {
      const source = readFileSync(join(root, page), "utf8");
      expect(source, page).toContain("params.status");
      expect(source, page).not.toContain("params.state");
    }
  });
});
