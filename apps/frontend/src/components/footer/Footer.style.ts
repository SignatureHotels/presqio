import { styled } from "@mui/material/styles";
import { media } from "@/theme/media";

export const FooterBar = styled("footer")({
  display: "flex",
  gap: 16,
  justifyContent: "space-between",
  fontSize: 10,
  color: "var(--muted)",
  marginTop: 32,
  [media.tablet]: { flexWrap: "wrap" },
  [media.phone]: { lineHeight: 1.6 },
});
