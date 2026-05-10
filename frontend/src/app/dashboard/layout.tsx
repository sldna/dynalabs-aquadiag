import type { ReactNode } from "react";

import { DashboardFooter } from "@/components/DashboardFooter";
import { AppShell } from "@/components/layout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell footer={<DashboardFooter />}>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </AppShell>
  );
}
