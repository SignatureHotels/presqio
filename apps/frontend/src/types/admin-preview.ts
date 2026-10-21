import type { EmployeeRecord } from "@presqio/lib";
import type { AvatarTone } from "@/components/employee-avatar/EmployeeAvatar.style";

/** An employee as the admin screens use it: the API record plus a stable avatar colour. */
export interface Employee extends EmployeeRecord {
  color: AvatarTone;
}
