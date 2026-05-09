export type ActionListProps = {
  title: string;
  items: string[];
  tone?: "primary" | "neutral";
};

export function ActionList({ title, items, tone = "neutral" }: ActionListProps) {
  if (items.length === 0) return null;

  const boxCls =
    tone === "primary"
      ? "bg-aqua-soft ring-aqua-blue/30"
      : "bg-white ring-aqua-deep/12";

  return (
    <section className={`rounded-card p-4 ring-1 ${boxCls}`}>
      <h3 className="text-sm font-semibold text-aqua-deep">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm text-aqua-deep/85">
        {items.map((a) => (
          <li key={a} className="flex gap-2">
            <span
              aria-hidden="true"
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                tone === "primary" ? "bg-aqua-blue" : "bg-aqua-deep/35"
              }`}
            />
            <span className="leading-snug">{a}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
