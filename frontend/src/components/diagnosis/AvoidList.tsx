export type AvoidListProps = {
  title?: string;
  items: string[];
};

export function AvoidList({ title = "Nicht tun", items }: AvoidListProps) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-card bg-status-critical/10 p-4 ring-1 ring-status-critical/25">
      <h3 className="text-sm font-semibold text-aqua-deep">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm text-aqua-deep/90">
        {items.map((a) => (
          <li key={a} className="flex gap-2">
            <span
              aria-hidden="true"
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-status-critical"
            />
            <span className="leading-snug">{a}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
