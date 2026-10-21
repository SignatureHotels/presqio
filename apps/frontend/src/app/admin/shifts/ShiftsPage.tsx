import { useState } from "react";
import type { ShiftRecord } from "@presqio/lib";
import { ShiftTemplates } from "./components/shift-templates";
import { AttendancePolicies } from "./components/attendance-policies";
import { ShiftDialog } from "./components/shift-dialog";

export function ShiftsPage() {
  const [editing, setEditing] = useState<ShiftRecord | "new" | null>(null);
  return (
    <>
      <div className="page-grid">
        <ShiftTemplates onAdd={() => setEditing("new")} onEdit={setEditing} />
        <AttendancePolicies />
      </div>
      {editing && (
        <ShiftDialog
          key={editing === "new" ? "new" : editing.id}
          shift={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
