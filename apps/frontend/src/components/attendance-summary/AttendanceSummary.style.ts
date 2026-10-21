import { styled } from "@mui/material/styles";
import { headingFont, media } from "@/theme/media";

export type StatTone = "accent" | "success" | "warning" | "error";

export const StatGrid = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  [media.wide]: { gap: 12 },
  [media.tablet]: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
  [media.phone]: { gap: 9 },
});

/** Combine with className="card"; the tone tints the card background and border. */
export const StatCard = styled("section", {
  shouldForwardProp: (prop) => prop !== "tone",
})<{ tone: StatTone }>(({ tone }) => ({
  padding: "21px 21px 19px",
  minHeight: 149,
  // `&&` outranks the global `.card` surface and border.
  "&&": {
    background: `var(--${tone === "accent" ? "primary" : tone}-tint)`,
    borderColor: `var(--${tone === "accent" ? "primary" : tone}-soft)`,
  },
  [media.wide]: { padding: 17 },
  [media.phone]: { padding: 13, minHeight: 132 },
}));

export const StatTop = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 19,
  [media.phone]: {
    gap: 5,
    marginBottom: 15,
    "& > span:first-of-type": { fontSize: 10 },
  },
});

export const StatNumber = styled("div")({
  fontSize: 32,
  fontFamily: headingFont,
  fontWeight: 800,
  lineHeight: 1,
  letterSpacing: -1.2,
  [media.laptop]: { fontSize: 28 },
  [media.phone]: { fontSize: 27 },
});

export const StatFooter = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 11,
  fontSize: 11,
  color: "var(--muted)",
  [media.laptop]: { fontSize: 10 },
  [media.phone]: { fontSize: 9, lineHeight: 1.6 },
});
