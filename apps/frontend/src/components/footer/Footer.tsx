import { FooterBar } from "./Footer.style";

export function Footer() {
  return (
    <FooterBar>
      <span>Presqio · People. Presence. Peace of mind.</span>
      <span>© {new Date().getFullYear()} Presqio</span>
    </FooterBar>
  );
}
