import { styled } from "@mui/material/styles";

/** Illustrated stand-in for an employee's selfie inside the check-in frame. */
export const Portrait = styled("svg")({
  width: "82%",
  height: "82%",
  display: "block",
  borderRadius: "50%",
  // Colours come from the brand tokens so the illustration matches both phone and page.
  "& .bg": { fill: "var(--nav-hover)" },
  "& .shirt": { fill: "var(--primary)" },
  "& .collar": { fill: "var(--primary-soft)" },
  "& .skin": { fill: "var(--warning-soft)" },
  "& .shade": { fill: "var(--warning)", opacity: 0.35 },
  "& .hair": { fill: "var(--ink)" },
  "& .feature": { fill: "var(--ink)" },
  "& .smile": { fill: "none", stroke: "var(--ink)", strokeWidth: 2.2, strokeLinecap: "round" },
});
