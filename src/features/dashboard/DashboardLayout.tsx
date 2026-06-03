import { useSearchParams } from "react-router";
import { PatientHeader, type TabId } from "../../components/PatientHeader";
import { ClinicalNotesTab } from "./ClinicalNotesTab";
import { HealthInventoryTab } from "./HealthInventoryTab";
import { HealthRecordsTab } from "./HealthRecordsTab";
import { PhpTab } from "./PhpTab";
import { SummaryTab } from "./SummaryTab";
import { WbsTab } from "./WbsTab";

const VALID_TABS: TabId[] = ["summary", "php", "records", "inventory", "wbs", "notes"];

function isValidTab(s: string | null): s is TabId {
  return VALID_TABS.includes(s as TabId);
}

export function DashboardLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabId = isValidTab(rawTab) ? rawTab : "notes";

  function handleTabChange(tab: TabId) {
    setSearchParams(tab === "notes" ? {} : { tab });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <PatientHeader activeTab={activeTab} onTabChange={handleTabChange} />
      <main role="tabpanel" aria-label={activeTab}>
        {activeTab === "summary" && <SummaryTab onTabChange={handleTabChange} />}
        {activeTab === "php" && <PhpTab />}
        {activeTab === "records" && <HealthRecordsTab />}
        {activeTab === "inventory" && <HealthInventoryTab />}
        {activeTab === "wbs" && <WbsTab />}
        {activeTab === "notes" && <ClinicalNotesTab />}
      </main>
    </div>
  );
}
