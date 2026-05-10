import { AppHeader } from "@/components/layout/AppHeader";
import { AppNavigation, type NavActiveKey } from "@/components/layout/AppNavigation";

export function DashboardNav({ active }: { active: NavActiveKey }) {
  return (
    <div className="sticky top-0 z-40 shadow-card">
      <AppHeader />
      <AppNavigation active={active} />
    </div>
  );
}
