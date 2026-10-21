import { Link } from "react-router-dom";
export function NotFoundPage() {
  return (
    <main className="upcoming-portal">
      <h1>Page not found</h1>
      <Link className="btn primary" to="/">
        Go to home page →
      </Link>
    </main>
  );
}
