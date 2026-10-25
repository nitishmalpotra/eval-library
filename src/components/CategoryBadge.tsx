import type { Category } from "@/lib/taxonomy";

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="category-chip" data-category={category}>
      {category}
    </span>
  );
}
