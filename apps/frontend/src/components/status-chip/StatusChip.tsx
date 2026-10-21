export function StatusChip({ status }: { status: string }) {
  const color =
    (
      {
        Present: "success",
        Late: "warning",
        "Not checked in": "neutral",
        "On leave": "accent",
        Pending: "warning",
        Approved: "success",
        Rejected: "error",
      } as Record<string, string>
    )[status] ?? "neutral";
  return <span className={`chip ${color}`}>{status}</span>;
}
