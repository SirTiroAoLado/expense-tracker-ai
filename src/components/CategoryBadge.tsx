import { CATEGORY_META } from "@/lib/categories";
import type { Category } from "@/lib/types";

export function CategoryIcon({ category, size = "md" }: { category: Category; size?: "sm" | "md" }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-xl`}
      style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CATEGORY_META[category].badge}`}
    >
      {category}
    </span>
  );
}
