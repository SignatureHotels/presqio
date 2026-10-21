import { keyframes, styled } from "@mui/material/styles";
import { canHover, ease, gutter, media, motionOk, Section } from "../../HomePage.style";

/** Moves the dashes down the connector so it reads as data flowing to each business. */
const flow = keyframes`
  to { background-position: 0 12px; }
`;

/** Content edge that lines up with the 1240px sections above and below. */
const alignedGutter = `max(${gutter}, calc((100vw - 1240px) / 2 + 64px))`;

export const Band = styled(Section)({
  maxWidth: "none",
  background: "var(--forest)",
  color: "var(--nav-text)",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: 48,
  alignItems: "center",
  paddingLeft: alignedGutter,
  paddingRight: alignedGutter,
  [media.tablet]: { gridTemplateColumns: "1fr" },
});

export const Copy = styled("div")({
  "& h2": {
    fontSize: "clamp(28px, 3.6vw, 40px)",
    margin: "10px 0 16px",
  },
  // `&&` outranks the page-level heading colour.
  "&& h2": { color: "var(--nav-text)" },
  "& p": {
    color: "var(--nav-muted)",
    lineHeight: 1.7,
    margin: "0 0 26px",
  },
});

export const Tree = styled("div")({
  display: "grid",
  justifyItems: "center",
  gap: 26,
});

export const TreeNode = styled("div", {
  shouldForwardProp: (prop) => prop !== "root",
})<{ root?: boolean }>(({ root }) => ({
  background: "var(--nav-panel)",
  border: "1px solid var(--nav-line)",
  borderRadius: 14,
  padding: "14px 16px",
  display: "grid",
  gap: 4,
  fontSize: 14,
  "& span": {
    color: "var(--nav-muted)",
    fontSize: 12,
  },
  transition: `transform 0.4s ${ease}, border-color 0.4s ${ease}, background 0.4s ${ease}`,
  ...(!root && {
    [canHover]: {
      "&:hover": {
        transform: "translateY(-4px)",
        borderColor: "var(--primary)",
        background: "var(--nav-hover)",
      },
    },
  }),
  ...(root && {
    background: "var(--primary)",
    color: "var(--ink)",
    border: 0,
    fontWeight: 800,
    position: "relative",
    // Dashed connector down to the businesses.
    "&::after": {
      content: '""',
      position: "absolute",
      left: "50%",
      top: "100%",
      width: 2,
      height: 26,
      backgroundImage: "repeating-linear-gradient(to bottom, var(--nav-line) 0 6px, transparent 6px 12px)",
      [motionOk]: { animation: `${flow} 0.9s linear infinite` },
    },
  }),
}));

export const TreeChildren = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  width: "100%",
  [media.phone]: { gridTemplateColumns: "1fr" },
});
