import { useAdmin } from "@/hooks/use-admin";
import { EmployeeTable, AttendanceSummary } from "@/components";
import type { Employee } from "@/types/admin-preview";
import { AttendanceChart } from "./components/attendance-chart";
import { AttendanceBreakdown } from "./components/attendance-breakdown";
import { BranchPerformance } from "./components/branch-performance";
import { RecentActivity } from "./components/recent-activity";
import { TodaysCheckins } from "./components/todays-checkins";
import { longDate, zoneLabel } from "@/utils/dates";
import { BottomPanels, CheckinsRow, DashGrid } from "./OverviewPage.style";
export function OverviewPage({
  onView,
}: {
  onView: (employee: Employee) => void;
}) {
  const { visibleEmployees, scopedEmployees, branches, today, timezone } = useAdmin();
  return (
    <>
      <AttendanceSummary employees={scopedEmployees} />
      <DashGrid>
        <AttendanceChart />
        <AttendanceBreakdown />
      </DashGrid>
      <CheckinsRow>
        <TodaysCheckins />
      </CheckinsRow>
      <EmployeeTable
        employees={visibleEmployees.slice(0, 5)}
        branches={branches}
        subtitle={today ? `${longDate(today)} · ${zoneLabel(timezone)}` : undefined}
        onView={onView}
        viewAll
      />
      <BottomPanels>
        <BranchPerformance />
        <RecentActivity />
      </BottomPanels>
    </>
  );
}
