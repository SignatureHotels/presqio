import { useState } from "react";
import { Alert, Button, Slider, TextField } from "@mui/material";
import type { BranchRecord, CreateBranchRequest } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { Icon } from "@/components";
import { StepFrame, StepList, StepListIcon } from "../step-frame";
import { CoordinateRow, MapLink, SliderField } from "./BranchStep.style";

type Draft = Omit<CreateBranchRequest, "latitude" | "longitude"> & {
  latitude: string;
  longitude: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  radius: 100,
  maxAccuracy: 50,
});

export function BranchStep({
  branches,
  onCreate,
  onContinue,
  onBack,
}: {
  branches: BranchRecord[];
  onCreate: (request: CreateBranchRequest) => Promise<void>;
  onContinue: () => Promise<void>;
  onBack: () => void;
}) {
  const [adding, setAdding] = useState(branches.length === 0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);

  const latitude = Number(draft.latitude);
  const longitude = Number(draft.longitude);
  const coordinatesValid =
    draft.latitude !== "" &&
    draft.longitude !== "" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  const draftValid = draft.name.trim().length >= 2 && coordinatesValid;

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setError("This browser cannot share its location. Enter the coordinates instead.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        setError("Location permission was denied or unavailable. Enter the coordinates instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (adding) {
        await onCreate({
          name: draft.name.trim(),
          address: draft.address?.trim() || undefined,
          latitude,
          longitude,
          radius: draft.radius,
          maxAccuracy: draft.maxAccuracy,
        });
        setDraft(emptyDraft());
        setAdding(false);
        setBusy(false);
      } else {
        await onContinue();
      }
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <StepFrame
      eyebrow="Step 2"
      title="Add a branch and its check-in perimeter"
      description="Employees can check in only inside this circle. Stand at the branch entrance and use your current location for the most accurate centre."
      error={error}
      busy={busy}
      submitLabel={adding ? "Save branch" : "Continue"}
      submitDisabled={adding ? !draftValid : branches.length === 0}
      onSubmit={submit}
      onBack={onBack}
    >
      {branches.length > 0 && (
        <StepList>
          {branches.map((branch) => (
            <li key={branch.id}>
              <StepListIcon>
                <Icon name="pin" className="tiny" />
              </StepListIcon>
              <div>
                <strong>{branch.name}</strong>
                <span className="sm muted">
                  {branch.latitude.toFixed(5)}, {branch.longitude.toFixed(5)} · {branch.radius} m
                  radius · GPS accuracy ≤ {branch.maxAccuracy} m
                </span>
              </div>
            </li>
          ))}
        </StepList>
      )}
      {adding ? (
        <>
          <div className="form-columns">
            <TextField
              label="Branch name"
              required
              autoFocus
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="e.g. Medipalli"
            />
            <TextField
              label="Address (optional)"
              value={draft.address}
              onChange={(event) => setDraft({ ...draft, address: event.target.value })}
            />
          </div>
          <CoordinateRow>
            <TextField
              label="Latitude"
              required
              value={draft.latitude}
              slotProps={{ htmlInput: { inputMode: "decimal" }, inputLabel: { shrink: draft.latitude !== "" || undefined } }}
              onChange={(event) => setDraft({ ...draft, latitude: event.target.value })}
            />
            <TextField
              label="Longitude"
              required
              value={draft.longitude}
              slotProps={{ htmlInput: { inputMode: "decimal" }, inputLabel: { shrink: draft.longitude !== "" || undefined } }}
              onChange={(event) => setDraft({ ...draft, longitude: event.target.value })}
            />
            <Button variant="outlined" onClick={locateMe} disabled={locating}>
              {locating ? "Locating…" : "Use my location"}
            </Button>
          </CoordinateRow>
          {coordinatesValid && (
            <MapLink
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Check this point on Google Maps ↗
            </MapLink>
          )}
          <SliderField>
            <div className="between">
              <span className="fw7">Perimeter radius</span>
              <span className="mono">{draft.radius} m</span>
            </div>
            <Slider
              value={draft.radius}
              min={20}
              max={1000}
              step={10}
              onChange={(_, value) => setDraft({ ...draft, radius: value as number })}
              aria-label="Perimeter radius in metres"
            />
            <span className="sm muted">100 m suits most shops and offices; use more for large sites.</span>
          </SliderField>
          <SliderField>
            <div className="between">
              <span className="fw7">Reject GPS readings worse than</span>
              <span className="mono">{draft.maxAccuracy} m</span>
            </div>
            <Slider
              value={draft.maxAccuracy}
              min={10}
              max={200}
              step={5}
              onChange={(_, value) => setDraft({ ...draft, maxAccuracy: value as number })}
              aria-label="Maximum GPS accuracy in metres"
            />
          </SliderField>
          {branches.length > 0 && (
            <Button onClick={() => setAdding(false)}>Cancel adding branch</Button>
          )}
        </>
      ) : (
        <>
          <Button variant="outlined" onClick={() => setAdding(true)} startIcon={<Icon name="plus" className="tiny" />}>
            Add another branch
          </Button>
          <Alert severity="info">You can add and edit branches any time from Branches.</Alert>
        </>
      )}
    </StepFrame>
  );
}
