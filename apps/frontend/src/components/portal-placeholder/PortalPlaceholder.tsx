import { Link } from "react-router-dom";
export function PortalPlaceholder({ owner = false }: { owner?: boolean }) {
  return (
    <main className="upcoming-portal">
      <span className="chip accent">Next development phase</span>
      <h1>{owner ? "Group owner portal" : "Employee mobile portal"}</h1>
      <p>
        {owner
          ? "Dedicated group-wide administration will follow the business admin screens."
          : "The employee experience will be built next from your mobile prototype."}
      </p>
      <Link className="btn primary" to="/admin/overview">
        Open admin workspace →
      </Link>
    </main>
  );
}
