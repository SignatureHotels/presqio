import { useEffect, type ReactNode } from "react";
import { Icon } from "@/components";
import {
  Aside,
  AsideInner,
  BrandLink,
  Card,
  Eyebrow,
  Footer,
  Main,
  PointIcon,
  Points,
  Quote,
  Shell,
  Subtitle,
  Title,
} from "./AuthLayout.style";

const highlights = [
  { icon: "map", text: "GPS perimeter per branch, so check-ins happen on site" },
  { icon: "camera", text: "Selfies saved with each check-in and check-out for admin review" },
  { icon: "grid", text: "Every branch in one admin workspace" },
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} · Presqio`;
  }, [title]);
  return (
    <Shell>
      <Main>
        <BrandLink to="/" className="brand-wrap" aria-label="Presqio home">
          <img className="brand-logo" src="/logo.png" alt="Presqio" width={180} height={60} />
        </BrandLink>
        <Card>
          <Title>{title}</Title>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
          {children}
        </Card>
        {footer && <Footer>{footer}</Footer>}
      </Main>
      <Aside aria-hidden="true">
        <AsideInner>
          <Eyebrow>Attendance for multi-branch teams</Eyebrow>
          <Quote>
            Know who is on site, at every branch, without chasing registers.
          </Quote>
          <Points>
            {highlights.map((item) => (
              <li key={item.text}>
                <PointIcon>
                  <Icon name={item.icon} className="tiny" />
                </PointIcon>
                {item.text}
              </li>
            ))}
          </Points>
        </AsideInner>
      </Aside>
    </Shell>
  );
}
