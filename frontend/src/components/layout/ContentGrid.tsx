import type { HTMLAttributes, ReactNode } from "react";

type ContentGridProps = {
  children: ReactNode;
  /** Override columns; default: responsive card grid */
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

/**
 * Responsive grid for repeating tiles (dashboard cards, tank list).
 */
export function ContentGrid({ children, className = "", ...rest }: ContentGridProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}
