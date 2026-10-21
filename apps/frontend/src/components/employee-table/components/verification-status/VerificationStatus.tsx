import { Icon } from "@/components/icon";
export function VerificationStatus({
  verified,
  location = false,
  label,
}: {
  verified: boolean;
  location?: boolean;
  label?: string;
}) {
  return verified ? (
    <span className="mini-icon verification">
      <Icon name={location ? "map" : "check"} />
      {label ?? (location ? "In zone" : "Verified")}
    </span>
  ) : (
    <>—</>
  );
}
