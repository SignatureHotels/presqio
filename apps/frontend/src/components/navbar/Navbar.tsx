import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Divider, ListItemText, Menu, MenuItem } from "@mui/material";
import { useAuth } from "@/hooks/use-auth";
import { initials } from "@/utils/format";
import { AvatarButton, Bar, BrandSub, HeaderRight, OrgDot, OrgLabel } from "./Navbar.style";

export function Navbar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const user = auth.me?.user;
  const organization = auth.activeOrganization;
  const close = () => setAnchor(null);
  return (
    <Bar>
      <Link
        to="/admin/overview"
        className="brand-wrap"
        aria-label="Presqio overview"
      >
        <div>
          <img className="brand-logo" src="/logo.png" alt="Presqio" width={180} height={60} />
          <BrandSub>Attendance workspace</BrandSub>
        </div>
      </Link>
      <HeaderRight>
        {organization && (
          <OrgLabel>
            <OrgDot />
            {organization.name}
          </OrgLabel>
        )}
        <AvatarButton
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          {initials(user?.displayName ?? "")}
        </AvatarButton>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={close}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem disabled sx={{ opacity: "1 !important" }}>
            <ListItemText primary={user?.displayName} secondary={user?.email} />
          </MenuItem>
          <Divider />
          {(auth.me?.organizations.length ?? 0) > 1 && (
            <MenuItem
              onClick={() => {
                close();
                navigate("/select-organization");
              }}
            >
              Switch organization
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              close();
              navigate("/onboarding");
            }}
          >
            Setup checklist
          </MenuItem>
          <MenuItem
            onClick={() => {
              close();
              void auth.logout().then(() => navigate("/"));
            }}
          >
            Sign out
          </MenuItem>
        </Menu>
      </HeaderRight>
    </Bar>
  );
}
