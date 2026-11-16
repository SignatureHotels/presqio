import { Link } from "react-router-dom";
import { INDUSTRIES } from "../../../industries";
import { Footer, FooterLinks } from "./HomeFooter.style";

export function HomeFooter() {
  return (
    <Footer>
      <span className="brand-wrap">
        <img className="brand-logo" src="/logo.png" alt="Presqio" width={150} height={50} />
      </span>
      <span className="sm muted">© {new Date().getFullYear()} Presqio</span>
      <FooterLinks aria-label="Footer">
        <Link to="/login">Admin login</Link>
        <Link to="/employee">Employee check-in</Link>
      </FooterLinks>
      <FooterLinks aria-label="Presqio for your business" style={{ flexBasis: "100%", flexWrap: "wrap", justifyContent: "center", gap: "6px 16px" }}>
        {INDUSTRIES.map((i) => <Link key={i.slug} to={`/for/${i.slug}`}>{i.name}</Link>)}
      </FooterLinks>
    </Footer>
  );
}
