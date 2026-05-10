import type { ReactNode } from "react";

export function ContentGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 ${className}`}>
      {children}
    </div>
  );
}
