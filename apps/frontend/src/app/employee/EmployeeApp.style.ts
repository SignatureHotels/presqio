import { keyframes, styled } from "@mui/material/styles";

export const enter = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
`;
export const motionOk = "@media (prefers-reduced-motion: no-preference)";
export const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Full-height phone canvas; on a desktop it shows as a centred phone-width column. */
export const AppFrame = styled("div")({
  minHeight: "100dvh",
  background: "var(--neutral-soft)",
  display: "flex",
  justifyContent: "center",
});

export const Phone = styled("div")({
  width: "100%",
  maxWidth: 460,
  minHeight: "100dvh",
  background: "var(--bg)",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  "@media (min-width: 520px)": {
    boxShadow: "0 0 0 1px var(--line-soft), 0 30px 80px rgba(23, 63, 53, 0.12)",
  },
});

export const Splash = styled("div")({
  flex: 1,
  display: "grid",
  placeItems: "center",
  color: "var(--muted)",
  fontWeight: 700,
});

/** White rounded card used across the employee screens. */
export const Panel = styled("section")({
  background: "var(--surface)",
  border: "1px solid var(--line-soft)",
  borderRadius: 20,
  padding: 18,
  boxShadow: "0 6px 24px rgba(23, 63, 53, 0.05)",
});

export const SectionRow = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  "& h2": { margin: 0, fontSize: 15, color: "var(--heading)" },
  "& a, & button.link": { fontSize: 12, fontWeight: 700, color: "var(--primary-dark)" },
});
