import { AdminProvider } from "@/providers/admin-provider";
import { AdminLayout } from "@/layouts/admin-layout";
export default function AdminWorkspace() {
  return (
    <AdminProvider>
      <AdminLayout />
    </AdminProvider>
  );
}
