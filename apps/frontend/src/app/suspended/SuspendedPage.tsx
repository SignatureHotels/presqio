import { useAuth } from "@/hooks/use-auth";

/** Shown when every workspace the admin belongs to has been suspended by Presqio. */
export function SuspendedPage() {
  const { me, logout } = useAuth();
  const names = me?.suspendedOrganizations ?? [];
  return (
    <main className="upcoming-portal">
      <span className="chip error">Workspace suspended</span>
      <h1>{names.length === 1 ? `${names[0]} is suspended` : "Your workspace is suspended"}</h1>
      <p>
        Presqio has paused access to this workspace, including staff check-ins. Your data is safe and nothing has been
        deleted. To restore access, contact Presqio on <a href="tel:+916309387321">+91 63093 87321</a> or reply to any
        email from us.
      </p>
      <button className="btn" onClick={() => void logout()}>Sign out</button>
    </main>
  );
}
