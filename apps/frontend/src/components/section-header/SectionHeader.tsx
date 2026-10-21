import type { ReactNode } from "react";
import { Subtitle, Title, TitleRow } from "./SectionHeader.style";

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <TitleRow>
      <div>
        <Title>{title}</Title>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </div>
      {action}
    </TitleRow>
  );
}
