import type { ReactNode } from "react";

export function AppShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-aqua-soft">
      {children}
      {footer ?? null}
    </div>
  );
}
