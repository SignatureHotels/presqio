import { keyframes, styled } from "@mui/material/styles";
import { Link } from "react-router-dom";
import { displayFont } from "@/theme/media";
import { ease, motionOk } from "../../EmployeeApp.style";

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 103, 120, 0.45); }
  100% { box-shadow: 0 0 0 14px rgba(255, 103, 120, 0); }
`;

export const PunchCard = styled("section")({
  background: "var(--surface)",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 18px 40px rgba(23, 63, 53, 0.12)",
  display: "grid",
  gap: 14,
});

export const StateRow = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--muted)",
});

export const StateChip = styled("span", {
  shouldForwardProp: (prop) => prop !== "tone",
})<{ tone: "idle" | "in" | "done" | "leave" }>(({ tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  background:
    tone === "in"
      ? "var(--success-soft)"
      : tone === "done"
        ? "var(--forest-soft)"
        : tone === "leave"
          ? "var(--primary-tint)"
          : "var(--neutral-soft)",
  color:
    tone === "in"
      ? "var(--success-ink)"
      : tone === "done"
        ? "var(--forest)"
        : tone === "leave"
          ? "var(--primary-dark)"
          : "var(--muted)",
  "&::before": {
    content: '""',
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "currentColor",
  },
}));

export const Clock = styled("div")({
  fontFamily: displayFont,
  fontSize: 46,
  fontWeight: 800,
  letterSpacing: -1.5,
  color: "var(--heading)",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
});

export const ClockSub = styled("div")({
  fontSize: 12,
  color: "var(--muted)",
  marginTop: -6,
});

export const PunchButton = styled(Link, {
  shouldForwardProp: (prop) => prop !== "out",
})<{ out?: boolean }>(({ out }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  minHeight: 58,
  borderRadius: 18,
  fontSize: 17,
  fontWeight: 800,
  background: out ? "var(--forest)" : "var(--primary)",
  color: out ? "var(--nav-text)" : "var(--ink)",
  transition: `transform 0.2s ${ease}`,
  "&:active": { transform: "scale(0.98)" },
  ...(!out && { [motionOk]: { animation: `${pulse} 2.2s ease-out infinite` } }),
}));

export const DoneNote = styled("div")({
  textAlign: "center",
  padding: "12px 0 2px",
  fontSize: 14,
  color: "var(--muted)",
  "& strong": {
    display: "block",
    color: "var(--heading)",
    fontSize: 16,
    marginBottom: 4,
  },
  "& a": {
    display: "inline-block",
    marginTop: 10,
    color: "var(--primary-dark)",
    fontWeight: 800,
  },
});

export const TrustRow = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  borderTop: "1px solid var(--line-soft)",
  paddingTop: 12,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--muted)",
  "& span": { display: "inline-flex", alignItems: "center", gap: 5 },
});

export const Place = styled("div")({
  marginTop: 14,
  display: "flex",
  gap: 12,
  alignItems: "center",
  "& .pin": {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "var(--primary-tint)",
    color: "var(--primary-dark)",
    flexShrink: 0,
  },
  "& strong": { display: "block", fontSize: 15 },
  "& small": { color: "var(--muted)", fontSize: 12 },
});

export const Hours = styled("div")({
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 10,
  marginTop: 16,
  "& p": {
    margin: 0,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 0.8,
    color: "var(--muted)",
  },
  "& strong": { fontSize: 16, color: "var(--heading)" },
  "& .end": { textAlign: "right" },
  "& .line": {
    color: "var(--muted)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
});

export const Week = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
  marginTop: 14,
  textAlign: "center",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--muted)",
});

export const WeekDay = styled("div", {
  shouldForwardProp: (prop) => prop !== "kind",
})<{ kind: "present" | "leave" | "today" | "off" | "missed" | "future" }>(({ kind }) => ({
  display: "grid",
  gap: 6,
  "& span": {
    height: 34,
    borderRadius: 11,
    display: "grid",
    placeItems: "center",
    fontSize: 13,
    fontWeight: 800,
    background:
      kind === "present"
        ? "var(--success-soft)"
        : kind === "leave"
          ? "var(--primary-tint)"
          : kind === "today"
            ? "var(--primary)"
            : kind === "missed"
              ? "var(--warning-soft)"
              : "var(--neutral-soft)",
    color:
      kind === "present"
        ? "var(--success-ink)"
        : kind === "leave"
          ? "var(--primary-dark)"
          : kind === "today"
            ? "var(--ink)"
            : kind === "missed"
              ? "var(--warning-ink)"
              : "var(--muted)",
    opacity: kind === "off" ? 0.55 : 1,
  },
}));

export const WeekFoot = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 14,
  paddingTop: 12,
  borderTop: "1px solid var(--line-soft)",
  fontSize: 12,
  color: "var(--muted)",
  "& b": { display: "block", fontSize: 17, color: "var(--heading)" },
});

export const SwitchRow = styled("p")({
  margin: "-4px 0 0",
  textAlign: "center",
  fontSize: 13,
  color: "var(--muted)",
  "& button": {
    border: 0,
    padding: 0,
    background: "none",
    color: "var(--primary)",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
  },
});
