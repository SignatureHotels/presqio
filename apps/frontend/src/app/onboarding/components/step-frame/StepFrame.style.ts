import { styled } from "@mui/material/styles";
import { displayFont } from "@/theme/media";
import { narrow } from "../../OnboardingPage.style";

/** Combine with className="card". */
export const Frame = styled("form")({
  padding: 28,
  display: "flex",
  flexDirection: "column",
  gap: 20,
  [narrow]: { padding: "20px 16px" },
});

export const Head = styled("header")({
  "& h2": {
    margin: "6px 0 0",
    fontFamily: displayFont,
    fontSize: 24,
    letterSpacing: -0.5,
    color: "var(--heading)",
  },
  "& p": {
    margin: "8px 0 0",
    color: "var(--muted)",
    lineHeight: 1.55,
  },
});

export const Eyebrow = styled("span")({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.1,
  textTransform: "uppercase",
  color: "var(--primary-dark)",
});

export const Body = styled("div")({
  display: "flex",
  flexDirection: "column",
  gap: 18,
});

export const Actions = styled("footer")({
  display: "flex",
  justifyContent: "space-between",
  paddingTop: 18,
  borderTop: "1px solid var(--line-soft)",
  "& .MuiButton-contained": {
    minWidth: 150,
    minHeight: 44,
    fontWeight: 700,
    textTransform: "none",
  },
});

/** List of saved items (branches, shifts, team actions) shown inside a step. */
export const StepList = styled("ul")({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 10,
  "& li": {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    border: "1px solid var(--line-soft)",
    background: "var(--surface)",
  },
  "& li > div": { display: "grid", gap: 3 },
});

export const StepListIcon = styled("span")({
  width: 32,
  height: 32,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "var(--primary-tint)",
  color: "var(--primary-dark)",
  flexShrink: 0,
});
