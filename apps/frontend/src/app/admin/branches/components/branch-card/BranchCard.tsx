import { useAdmin } from "@/hooks/use-admin";
import { Icon } from "@/components";
import type { BranchRecord } from "@presqio/lib";
import { GeofencePreview } from "./components/geofence-preview";
import { BranchTitle, CardFooter, Coordinates, LargeBranchAvatar } from "./BranchCard.style";
export function BranchCard({
  branch,
  onManage,
}: {
  branch: BranchRecord;
  onManage: (branch: BranchRecord) => void;
}) {
  const { employees } = useAdmin();
  return (
    <section className="card card-pad" key={branch.id}>
      <div className="between">
        <LargeBranchAvatar className="branch-avatar">
          <Icon name="map" />
        </LargeBranchAvatar>
        <span className="chip accent">{branch.radius} m perimeter</span>
      </div>
      <BranchTitle>{branch.name}</BranchTitle>
      <p className="muted sm">
        {branch.address || "No address added"} · Code {branch.code}
      </p>
      <GeofencePreview branch={branch} />
      <Coordinates>
        <span>{Math.abs(branch.latitude).toFixed(5)}° {branch.latitude >= 0 ? "N" : "S"}</span>
        <span>{Math.abs(branch.longitude).toFixed(5)}° {branch.longitude >= 0 ? "E" : "W"}</span>
      </Coordinates>
      <CardFooter>
        <div>
          <span className="muted sm">Assigned employees</span>
          <strong>
            {
              employees.filter(
                (employee) =>
                  employee.branchId === branch.id && employee.accountStatus !== "TERMINATED",
              ).length
            }
          </strong>
        </div>
        <div>
          <span className="muted sm">GPS accuracy</span>
          <strong>≤ {branch.maxAccuracy} m</strong>
        </div>
        <button
          className="btn"
          aria-label={`Manage ${branch.name}`}
          onClick={() => onManage(branch)}
        >
          Manage <Icon name="arrow" className="tiny" />
        </button>
      </CardFooter>
    </section>
  );
}
