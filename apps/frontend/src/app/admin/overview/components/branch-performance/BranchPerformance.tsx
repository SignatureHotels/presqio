import { Link } from "react-router-dom";
import { useAdmin } from "@/hooks/use-admin";
import { Icon, SectionHeader } from "@/components";
import {
  BranchList,
  BranchRow,
  Progress,
  RowLeft,
  RowName,
  RowSub,
  RowValue,
} from "./BranchPerformance.style";

/** Today's presence per branch. */
export function BranchPerformance() {
  const { overview, branchFilter } = useAdmin();
  const rows = (overview?.branches ?? []).filter(
    (branch) => branchFilter === "all" || branch.branchId === branchFilter,
  );
  return (
    <section className="card card-pad">
      <SectionHeader
        title="Branch performance"
        subtitle="Who is on site at each branch today"
        action={
          <Link className="link" to="/admin/branches">
            Manage branches →
          </Link>
        }
      />
      <BranchList>
        {rows.length === 0 && <p className="muted sm">Add a branch to see it here.</p>}
        {rows.map((branch) => (
          <BranchRow key={branch.branchId}>
            <RowLeft>
              <span className="branch-avatar">
                <Icon name="map" />
              </span>
              <div>
                <RowName>{branch.name}</RowName>
                <RowSub>
                  {branch.present} / {branch.total}{" "}
                  {branch.total === 1 ? "employee" : "employees"} present
                </RowSub>
              </div>
            </RowLeft>
            <div>
              <RowValue>{branch.rate}%</RowValue>
              <Progress>
                <span style={{ width: `${branch.rate}%` }} />
              </Progress>
            </div>
          </BranchRow>
        ))}
      </BranchList>
    </section>
  );
}
