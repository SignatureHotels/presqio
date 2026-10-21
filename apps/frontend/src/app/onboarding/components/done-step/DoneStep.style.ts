import { styled } from "@mui/material/styles";
import { narrow } from "../../OnboardingPage.style";

export const Review = styled("dl")({
  margin: 0,
  display: "grid",
  border: "1px solid var(--line-soft)",
  borderRadius: 14,
  overflow: "hidden",
  "& > div": {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: 12,
    padding: "14px 18px",
  },
  "& > div + div": { borderTop: "1px solid var(--line-soft)" },
  "& dt": { color: "var(--muted)", fontWeight: 700 },
  "& dd": { margin: 0 },
  [narrow]: {
    "& > div": { gridTemplateColumns: "1fr", gap: 2 },
  },
});
