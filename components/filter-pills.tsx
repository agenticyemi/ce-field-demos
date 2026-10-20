import Link from "next/link";
import { filterPillHref } from "@/lib/filter-pills";
import { cn } from "@/lib/utils";

export function FilterPills({
  pathname,
  value,
  extra,
  items,
}: {
  pathname: string;
  value: string;
  extra?: Record<string, string | undefined>;
  items: { id: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const href = filterPillHref(pathname, item.id, extra);
        const active = value === item.id;
        return (
          <Link
            key={item.id}
            href={href}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              active
                ? "border-indigo bg-indigo text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
