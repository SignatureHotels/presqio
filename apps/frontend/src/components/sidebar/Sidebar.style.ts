import { styled } from "@mui/material/styles";
import { Link, NavLink } from "react-router-dom";
import { media } from "@/theme/media";
import { AvatarBadge } from "@/components/employee-avatar";

export const Aside = styled("aside")({
  width: 242,
  flexShrink: 0,
  background: "var(--nav)",
  color: "var(--nav-text)",
  display: "flex",
  flexDirection: "column",
  padding: "27px 14px 20px",
  position: "sticky",
  top: 76,
  height: "calc(100dvh - 76px)",
  minHeight: 0,
  overflowY: "auto",
  [media.laptop]: { width: 210 },
  [media.tablet]: {
    width: 64,
    padding: "22px 7px",
    "& nav": { marginBottom: 16 },
  },
  [media.phone]: {
    top: 64,
    height: "calc(100dvh - 64px)",
    width: 54,
    paddingLeft: 4,
    paddingRight: 4,
  },
});

/** Hidden when the sidebar collapses to icons. */
const hideWhenCollapsed = { [media.tablet]: { display: "none" } };

export const GroupName = styled("div", {
  shouldForwardProp: (prop) => prop !== "spaced",
})<{ spaced?: boolean }>(({ spaced }) => ({
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--nav-muted)",
  fontWeight: 800,
  padding: "12px 14px",
  ...(spaced && { marginTop: 15 }),
  ...hideWhenCollapsed,
}));

export const SideItem = styled(NavLink)({
  height: 43,
  display: "flex",
  alignItems: "center",
  gap: 12,
  color: "var(--nav-muted)",
  padding: "0 13px",
  borderRadius: 9,
  border: 0,
  background: "transparent",
  textAlign: "left",
  fontWeight: 600,
  fontSize: 12,
  width: "100%",
  margin: "2px 0",
  "& .icon": { width: 18, height: 18 },
  "&:hover": {
    background: "var(--nav-hover)",
    color: "var(--nav-text)",
  },
  // NavLink adds `active` on the current route.
  "&.active": {
    background: "var(--primary-soft)",
    color: "var(--primary-dark)",
    boxShadow: "none",
  },
  [media.tablet]: {
    justifyContent: "center",
    padding: 0,
  },
});

export const ItemLabel = styled("span")(hideWhenCollapsed);

export const Badge = styled("span")({
  marginLeft: "auto",
  color: "var(--ink)",
  background: "var(--primary)",
  padding: "1px 7px",
  borderRadius: 6,
  fontSize: 10,
  ...hideWhenCollapsed,
});

export const Spacer = styled("div")({
  flex: 1,
  minHeight: 26,
});

export const HelpCard = styled("div")({
  background: "var(--nav-panel)",
  border: "1px solid var(--nav-line)",
  borderRadius: 12,
  margin: "0 5px 14px",
  padding: 17,
  "& p": {
    fontSize: 12,
    lineHeight: 1.55,
    color: "var(--nav-muted)",
  },
  ...hideWhenCollapsed,
});

export const HelpTitle = styled("div")({
  fontWeight: 700,
  marginTop: 7,
});

export const HelpLink = styled(Link)({
  fontSize: 12,
  color: "var(--nav-text)",
  fontWeight: 700,
});

export const UserRow = styled("div")({
  borderTop: "1px solid var(--nav-line)",
  padding: "18px 7px 0",
  display: "flex",
  gap: 10,
  alignItems: "center",
  [media.tablet]: {
    justifyContent: "center",
    paddingLeft: 0,
    paddingRight: 0,
  },
});

export const UserAvatar = styled(AvatarBadge)({
  [media.phone]: { width: 28, height: 28 },
});

export const UserCopy = styled("div")({
  display: "grid",
  gap: 4,
  minWidth: 0,
  "& strong": { fontSize: 12 },
  "& span": {
    fontSize: 11,
    color: "var(--nav-muted)",
    maxWidth: 150,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ...hideWhenCollapsed,
});
