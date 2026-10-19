import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import DisputesPage from "@/app/disputes/page";
import InvoicesPage from "@/app/invoices/page";
import { FilterPills } from "@/components/filter-pills";
import { InvoiceTable } from "@/components/invoice-table";
import { DisputeStatusBadge } from "@/components/status-badge";

function elements(node: ReactNode): ReactElement[] {
  if (node == null || typeof node === "boolean" || typeof node === "string" || typeof node === "number") {
    return [];
  }
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement(node)) return [];
  const children = (node.props as { children?: ReactNode }).children;
  return [node, ...elements(children)];
}

describe("status pills filter the queue", () => {
  it("keeps the pill query on state=", () => {
    const source = readFileSync(join(process.cwd(), "components/filter-pills.tsx"), "utf8");
    expect(source).toContain('params.set("state", item.id)');
  });

  it("filters invoices to Overdue and highlights that pill", async () => {
    const overdue = elements(
      await InvoicesPage({ searchParams: Promise.resolve({ state: "OVERDUE" }) }),
    );
    const overduePills = overdue.find((element) => element.type === FilterPills);
    const overdueTable = overdue.find((element) => element.type === InvoiceTable);
    const overdueRows = overdueTable?.props.invoices ?? [];

    expect(overduePills?.props.value).toBe("OVERDUE");
    expect(overdueRows.length).toBeGreaterThan(0);
    expect(overdueRows.every((invoice: { status: string }) => invoice.status === "OVERDUE")).toBe(
      true,
    );

    const all = elements(await InvoicesPage({ searchParams: Promise.resolve({}) }));
    const allPills = all.find((element) => element.type === FilterPills);
    const allRows = all.find((element) => element.type === InvoiceTable)?.props.invoices ?? [];
    const statuses = new Set(allRows.map((invoice: { status: string }) => invoice.status));

    expect(allPills?.props.value).toBe("ALL");
    expect(allRows.length).toBeGreaterThan(overdueRows.length);
    expect(statuses.has("OVERDUE")).toBe(true);
    expect(statuses.size).toBeGreaterThan(1);

    const paid = elements(
      await InvoicesPage({ searchParams: Promise.resolve({ status: "PAID" }) }),
    );
    const paidRows = paid.find((element) => element.type === InvoiceTable)?.props.invoices ?? [];
    expect(paid.find((element) => element.type === FilterPills)?.props.value).toBe("PAID");
    expect(paidRows.length).toBeGreaterThan(0);
    expect(paidRows.every((invoice: { status: string }) => invoice.status === "PAID")).toBe(true);
  });

  it("filters disputes to Needs review and highlights that pill", async () => {
    const review = elements(
      await DisputesPage({ searchParams: Promise.resolve({ state: "NEEDS_REVIEW" }) }),
    );
    const reviewPills = review.find((element) => element.type === FilterPills);
    const reviewBadges = review.filter((element) => element.type === DisputeStatusBadge);

    expect(reviewPills?.props.value).toBe("NEEDS_REVIEW");
    expect(reviewBadges.length).toBeGreaterThan(0);
    expect(reviewBadges.every((badge) => badge.props.status === "NEEDS_REVIEW")).toBe(true);

    const all = elements(await DisputesPage({ searchParams: Promise.resolve({}) }));
    const allBadges = all.filter((element) => element.type === DisputeStatusBadge);
    const statuses = new Set(allBadges.map((badge) => badge.props.status));

    expect(all.find((element) => element.type === FilterPills)?.props.value).toBe("ALL");
    expect(allBadges.length).toBeGreaterThan(reviewBadges.length);
    expect(statuses.has("NEEDS_REVIEW")).toBe(true);
    expect(statuses.size).toBeGreaterThan(1);
  });
});
