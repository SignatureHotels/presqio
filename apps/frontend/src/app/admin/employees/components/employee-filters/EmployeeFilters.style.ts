import { styled } from "@mui/material/styles";
import { media } from "@/theme/media";

/** Combine with className="input-shell". */
export const DirectorySearch = styled("label")({
  width: 310,
  "& input": { width: "100%", fontSize: 12 },
  [media.phone]: { width: "100%" },
});

/** Combine with className="btn"; pushed to the end of the controls row. */
export const ExportButton = styled("button")({
  marginLeft: "auto",
  [media.phone]: { marginLeft: 0 },
});
