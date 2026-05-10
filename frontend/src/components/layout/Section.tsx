import type { HTMLAttributes, ReactNode } from "react";

type SectionProps = {
  title?: string;
  titleId?: string;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children">;

function headingDomId(title: string, explicit?: string) {
  if (explicit) return explicit;
  const s = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9äöüß-]/g, "");
  return `${s || "section"}-heading`;
}

/**
 * Semantic grouped region with optional heading (020 layout / CD spacing).
 */
export function Section({
  title,
  titleId,
  children,
  className = "",
  ...rest
}: SectionProps) {
  const hid = title ? headingDomId(title, titleId) : undefined;

  return (
    <section
      className={`space-y-3 ${className}`.trim()}
      {...rest}
      {...(title ? { "aria-labelledby": hid } : {})}
    >
      {title ? (
        <h2 id={hid} className="text-sm font-semibold text-aqua-deep">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
