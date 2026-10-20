export function filterPillHref(
  pathname: string,
  itemId: string,
  extra?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (itemId !== "ALL") params.set("status", itemId);
  if (extra?.q) params.set("q", extra.q);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
