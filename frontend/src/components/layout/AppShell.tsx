import type { ReactNode } from "react";

import { AppHeader } from "./AppHeader";
import { AppNavigation } from "./AppNavigation";

type AppShellProps = {
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Root dashboard wrapper: header + nav once per layout; page content in children.
 */
export function AppShell({ children, footer }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-aqua-soft">
      <div className="sticky top-0 z-40 shadow-card">
        <AppHeader />
        <AppNavigation />
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
      {footer}
    </div>
  );
}
