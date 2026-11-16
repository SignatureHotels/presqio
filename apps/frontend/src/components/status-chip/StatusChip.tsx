/** `label` shows the status in another language; the colour still follows `status`. */
export function StatusChip({ status, label }: { status: string; label?: string }) {
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
  return <span className={`chip ${color}`}>{label ?? status}</span>;
}
