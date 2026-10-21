import { styled } from "@mui/material/styles";
import { displayFont } from "@/theme/media";

/** Onboarding stacks to one column below this width. */
export const stacked = "@media (max-width: 900px)";
export const narrow = "@media (max-width: 560px)";

export type StepState = "done" | "current" | "upcoming";

export const Shell = styled("div")({
  minHeight: "100vh",
  background: "var(--bg)",
});

export const Bar = styled("header")({
  height: 68,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 32px",
  borderBottom: "1px solid var(--line-soft)",
  background: "var(--bg)",
  [stacked]: { padding: "0 16px" },
});

/** Combine with className="sm muted". */
export const UserEmail = styled("span")({
  [stacked]: { display: "none" },
});

export const Layout = styled("div")({
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 720px)",
  gap: 40,
  justifyContent: "center",
  padding: "40px 32px 64px",
  [stacked]: {
    gridTemplateColumns: "1fr",
    gap: 20,
    padding: "20px 16px 48px",
  },
});

export const StepsTitle = styled("p")({
  fontFamily: displayFont,
  fontWeight: 800,
  fontSize: 17,
  color: "var(--heading)",
  margin: "4px 0 20px",
});

export const StepList = styled("ol")({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 6,
  // On narrow screens the steps become a row of numbered dots.
  [stacked]: {
    gridAutoFlow: "column",
    gridAutoColumns: "minmax(0, 1fr)",
    gap: 4,
  },
});

export const StepItem = styled("li", {
  shouldForwardProp: (prop) => prop !== "state",
})<{ state: StepState }>(({ state }) => ({
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: "10px 12px",
  borderRadius: 12,
  color: "var(--muted)",
  "& > span:last-of-type": { display: "grid", gap: 2 },
  "& strong": { color: "var(--ink)", fontSize: 14 },
  ...(state === "current" && {
    background: "var(--surface)",
    border: "1px solid var(--line-soft)",
    boxShadow: "var(--shadow-card)",
  }),
  [stacked]: {
    padding: 0,
    justifyContent: "center",
    background: "none",
    border: 0,
    boxShadow: "none",
    "& > span:last-of-type": { display: "none" },
  },
}));

const dotColors: Record<StepState, [string, string]> = {
  upcoming: ["var(--neutral-soft)", "var(--muted)"],
  current: ["var(--primary)", "var(--ink)"],
  done: ["var(--success-soft)", "var(--success-ink)"],
};

export const StepDot = styled("span", {
  shouldForwardProp: (prop) => prop !== "state",
})<{ state: StepState }>(({ state }) => ({
  width: 26,
  height: 26,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  fontSize: 12,
  fontWeight: 700,
  background: dotColors[state][0],
  color: dotColors[state][1],
  flexShrink: 0,
}));

export const VerifyNote = styled("p")({
  marginTop: 20,
  padding: 12,
  borderRadius: 12,
  fontSize: 12,
  background: "var(--warning-tint)",
  color: "var(--warning-ink)",
});
