import { styled } from "@mui/material/styles";
import { gutter } from "../../HomePage.style";

export const Footer = styled("footer")({
  "& .brand-logo": { width: 150 },
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 16,
  padding: `28px ${gutter}`,
  borderTop: "1px solid var(--line-soft)",
});

export const FooterLinks = styled("nav")({
  display: "flex",
  gap: 20,
  fontWeight: 600,
  color: "var(--muted)",
});
