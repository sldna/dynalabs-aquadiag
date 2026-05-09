import type { ReactNode } from "react";

import { DashboardFooter } from "@/components/DashboardFooter";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-aqua-soft">
      <div className="flex-1">{children}</div>
      <DashboardFooter />
    </div>
  );
}
