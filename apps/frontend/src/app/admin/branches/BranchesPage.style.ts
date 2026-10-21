import { styled } from "@mui/material/styles";

/** Count on the left, primary action on the right. */
export const PageActions = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 18,
});
