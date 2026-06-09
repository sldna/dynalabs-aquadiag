import { DashboardNav } from "@/components/DashboardNav";
import { PageContainer } from "@/components/layout";
import { WaterTestSettingsClient } from "@/components/settings/WaterTestSettingsClient";

export const dynamic = "force-dynamic";

export default function WaterTestSettingsPage() {
  return (
    <>
      <DashboardNav active="settings" />
      <main id="main-content" className="py-6 sm:py-8">
        <PageContainer>
          <WaterTestSettingsClient />
        </PageContainer>
      </main>
    </>
  );
}
