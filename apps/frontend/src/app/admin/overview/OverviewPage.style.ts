import { styled } from "@mui/material/styles";
import { media } from "@/theme/media";

export const DashGrid = styled("div")({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.65fr) minmax(270px, 1fr)",
  gap: 17,
  marginTop: 18,
  [media.laptop]: { gridTemplateColumns: "minmax(0, 1.4fr) minmax(250px, 1fr)" },
  [media.tablet]: { gridTemplateColumns: "1fr" },
});

export const BottomPanels = styled("div")({
  display: "grid",
  gridTemplateColumns: "1.08fr 1fr",
  gap: 17,
  marginTop: 18,
  [media.tablet]: { gridTemplateColumns: "1fr" },
});

export const CheckinsRow = styled("div")({ marginTop: 18 });
