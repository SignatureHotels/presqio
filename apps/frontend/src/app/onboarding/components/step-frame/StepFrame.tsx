import type { ReactNode } from "react";
import { Alert, Button } from "@mui/material";
import { Actions, Body, Eyebrow, Frame, Head } from "./StepFrame.style";

/** Shared heading, error slot and Back/Continue actions for each onboarding step. */
export function StepFrame({
  eyebrow,
  title,
  description,
  error,
  children,
  onBack,
  submitLabel = "Continue",
  busy = false,
  submitDisabled = false,
  onSubmit,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  error?: string;
  children: ReactNode;
  onBack?: () => void;
  submitLabel?: string;
  busy?: boolean;
  submitDisabled?: boolean;
  onSubmit: () => void;
}) {
  return (
    <Frame
      className="card"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy) onSubmit();
      }}
    >
      <Head>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </Head>
      {error && <Alert severity="error">{error}</Alert>}
      <Body>{children}</Body>
      <Actions>
        {onBack ? (
          <Button onClick={onBack} disabled={busy}>
            ← Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="contained" disabled={busy || submitDisabled}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </Actions>
    </Frame>
  );
}
