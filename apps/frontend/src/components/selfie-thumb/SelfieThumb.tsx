import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { businessApi } from "@/api/endpoints";
import { useAdmin } from "@/hooks/use-admin";
import { Large, Thumb } from "./SelfieThumb.style";

/**
 * A check-in/out selfie, fetched with the admin's session (the bucket is private) and held only in
 * memory. Click to enlarge.
 */
export function SelfieThumb({
  attemptId,
  label,
  size = 40,
  lazy = false,
}: {
  attemptId: string | null;
  label: string;
  size?: number;
  /** Wait until the thumbnail is near the visible scroll area before fetching. */
  lazy?: boolean;
}) {
  const { organization, businessId } = useAdmin();
  const organizationId = organization?.id ?? "";
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState(false);
  const thumb = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(!lazy);

  useEffect(() => {
    if (!lazy || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    if (!thumb.current || visible) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "150px" });
    observer.observe(thumb.current);
    return () => observer.disconnect();
  }, [lazy, visible, attemptId]);

  useEffect(() => {
    setUrl(null);
    setMissing(false);
    if (!attemptId || !businessId || !visible) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    businessApi
      .photoUrl(organizationId, businessId, attemptId)
      .then((created) => {
        objectUrl = created;
        if (cancelled) URL.revokeObjectURL(created);
        else setUrl(created);
      })
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attemptId, organizationId, businessId, visible]);

  if (!attemptId) return null;
  return (
    <>
      <Thumb
        ref={thumb}
        type="button"
        size={size}
        disabled={!url}
        onClick={() => setOpen(true)}
        aria-label={`View ${label}`}
        title={missing ? "Selfie no longer kept" : label}
      >
        {url ? <img src={url} alt={label} /> : missing ? "Unavailable" : visible ? "…" : null}
      </Thumb>
      <Dialog open={open && Boolean(url)} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{label}</DialogTitle>
        <DialogContent>{url && <Large src={url} alt={label} />}</DialogContent>
      </Dialog>
    </>
  );
}
