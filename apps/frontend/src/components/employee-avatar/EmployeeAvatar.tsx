import { initials } from "@/utils/format";
import type { EmployeeTableRow } from "@presqio/lib";
import { AvatarBadge, isAvatarTone, Person } from "./EmployeeAvatar.style";

export function EmployeeAvatar({
  employee,
}: {
  employee: Pick<EmployeeTableRow, "name" | "code"> & { color?: string };
}) {
  return (
    <Person>
      <AvatarBadge tone={isAvatarTone(employee.color) ? employee.color : "lav"}>
        {initials(employee.name)}
      </AvatarBadge>
      <div>
        <b>{employee.name}</b>
        <small>{employee.code}</small>
      </div>
    </Person>
  );
}
