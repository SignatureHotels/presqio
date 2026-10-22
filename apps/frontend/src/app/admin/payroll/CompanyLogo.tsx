import { useEffect, useState } from "react";
import { payrollApi } from "@/api/payroll";
import { useAdmin } from "@/hooks/use-admin";

// Uploaded logos never change for a given id, so each is fetched once per session.
const loaded = new Map<string, Promise<string>>();

/** A browser URL for a company logo: an uploaded logo (private, fetched with the admin's session) or a legacy HTTPS link. */
export function loadLogo(organizationId: string, businessId: string, logo: string): Promise<string> {
  if (!logo || /^https:\/\//.test(logo)) return Promise.resolve(logo);
  const key = `${organizationId}:${businessId}:${logo}`;
  let pending = loaded.get(key);
  if (!pending) {
    pending = payrollApi.logoUrl(organizationId, businessId, logo);
    pending.catch(() => loaded.delete(key));
    loaded.set(key, pending);
  }
  return pending;
}

export function CompanyLogo({ logo, alt, src: given, style }: { logo: string; alt: string; src?: string; style?: React.CSSProperties }) {
  const { organization, businessId } = useAdmin();
  const [src, setSrc] = useState(given ?? "");
  useEffect(() => {
    if (given !== undefined) return setSrc(given);
    let current = true;
    setSrc("");
    if (organization && logo)
      loadLogo(organization.id, businessId, logo).then((url) => current && setSrc(url)).catch(() => undefined);
    return () => {
      current = false;
    };
  }, [given, logo, organization, businessId]);
  return src ? <img src={src} alt={alt} style={style} /> : null;
}
