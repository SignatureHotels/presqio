import { useAdmin } from "@/hooks/use-admin";
import { useNavigate } from "react-router-dom";
import { dateTimeIn } from "@/utils/dates";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
export function WorkspaceNotifications({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const admin = useAdmin();
  const navigate = useNavigate();
  const pending = admin.scopedApprovals.filter(
    (approval) => approval.status === "Pending",
  );
  return (
    <Dialog open={open} onClose={() => onClose()} fullWidth maxWidth="sm">
      <DialogTitle>Workspace notifications</DialogTitle>
      <DialogContent>
        <p>
          {pending.length
            ? `${pending.length} correction ${pending.length === 1 ? "request needs" : "requests need"} review.`
            : "Nothing needs your attention right now."}
        </p>
        <div className="policy-list">
          {pending.map((approval) => (
            <div className="policy" key={approval.id}>
              <div>
                <b>
                  {
                    admin.employees.find(
                      (employee) => employee.id === approval.employeeId,
                    )?.name ?? "Employee"
                  }
                </b>
                <p>
                  {approval.type} · {dateTimeIn(approval.submitted, admin.timezone)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>Close</Button>
        {pending.length > 0 && (
          <Button
            variant="contained"
            onClick={() => {
              onClose();
              navigate("/admin/corrections");
            }}
          >
            Review requests
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
