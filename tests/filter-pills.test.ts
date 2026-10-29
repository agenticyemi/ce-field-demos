import { afterAll, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DisputesPage from "@/app/disputes/page";
import InvoicesPage from "@/app/invoices/page";
import { getDisputes, getInvoices } from "@/lib/data";
import { prisma } from "@/lib/prisma";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => "/invoices",
  useSearchParams: () => new URLSearchParams(),
}));

afterAll(async () => {
  await prisma.$disconnect();
});

function pillMarkup(html: string, label: string) {
  const match = html.match(new RegExp(`<a\\b[^>]*>${label}</a>`));
  expect(match, `missing ${label} pill`).not.toBeNull();
  return match![0];
}

function expectPill(html: string, label: string, active: boolean) {
  const markup = pillMarkup(html, label);
  if (active) expect(markup).toContain("bg-indigo");
  else expect(markup).not.toContain("bg-indigo");
}

describe("invoice and dispute status pills", () => {
  it("filters invoices and highlights Overdue when the pill sets state", async () => {
    const html = renderToStaticMarkup(
      await InvoicesPage({ searchParams: Promise.resolve({ state: "OVERDUE" }) }),
    );
    const invoices = await getInvoices();
    const overdue = invoices.filter((invoice) => invoice.status === "OVERDUE");
    const others = invoices.filter((invoice) => invoice.status !== "OVERDUE");

    expect(overdue.length).toBeGreaterThan(0);
    expect(others.length).toBeGreaterThan(0);
    expectPill(html, "Overdue", true);
    expectPill(html, "All", false);
    expect(pillMarkup(html, "Overdue")).toContain('href="/invoices?state=OVERDUE"');

    for (const invoice of overdue) {
      expect(html).toContain(`href="/invoices/${invoice.id}"`);
    }
    for (const invoice of others) {
      expect(html).not.toContain(`href="/invoices/${invoice.id}"`);
    }

    const allHtml = renderToStaticMarkup(
      await InvoicesPage({ searchParams: Promise.resolve({}) }),
    );
    expectPill(allHtml, "All", true);
    expectPill(allHtml, "Overdue", false);
    expect(allHtml).toContain(`href="/invoices/${others[0].id}"`);

    const paidHtml = renderToStaticMarkup(
      await InvoicesPage({ searchParams: Promise.resolve({ status: "PAID" }) }),
    );
    const paid = invoices.filter((invoice) => invoice.status === "PAID");
    expect(paid.length).toBeGreaterThan(0);
    expectPill(paidHtml, "Paid", true);
    expectPill(paidHtml, "All", false);
    expect(paidHtml).toContain(`href="/invoices/${paid[0].id}"`);
    expect(paidHtml).not.toContain(`href="/invoices/${overdue[0].id}"`);
  });

  it("filters disputes and highlights Needs review when the pill sets state", async () => {
    const html = renderToStaticMarkup(
      await DisputesPage({ searchParams: Promise.resolve({ state: "NEEDS_REVIEW" }) }),
    );
    const disputes = await getDisputes();
    const needsReview = disputes.filter((dispute) => dispute.status === "NEEDS_REVIEW");
    const others = disputes.filter((dispute) => dispute.status !== "NEEDS_REVIEW");

    expect(needsReview.length).toBeGreaterThan(0);
    expect(others.length).toBeGreaterThan(0);
    expectPill(html, "Needs review", true);
    expectPill(html, "All", false);
    expect(pillMarkup(html, "Needs review")).toContain('href="/disputes?state=NEEDS_REVIEW"');

    for (const dispute of needsReview) {
      expect(html).toContain(`href="/disputes/${dispute.id}"`);
    }
    for (const dispute of others) {
      expect(html).not.toContain(`href="/disputes/${dispute.id}"`);
    }

    const allHtml = renderToStaticMarkup(
      await DisputesPage({ searchParams: Promise.resolve({}) }),
    );
    expectPill(allHtml, "All", true);
    expectPill(allHtml, "Needs review", false);
    expect(allHtml).toContain(`href="/disputes/${others[0].id}"`);
  });
});
