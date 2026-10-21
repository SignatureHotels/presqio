import { useRef, type PointerEvent } from "react";
import { Icon } from "@/components";
import { useCountUp } from "../../hooks/use-count-up";
import { useReducedMotion } from "../../hooks/use-reduced-motion";
import { useReveal } from "../../hooks/use-reveal";
import { ProfilePlaceholder } from "../profile-placeholder";
import {
  CheckRow,
  Checks,
  FloatBar,
  FloatBarFill,
  FloatCard,
  FloatLabel,
  Phone,
  PhoneButton,
  PhoneTime,
  PhoneTop,
  ScanLine,
  Selfie,
  SelfieRing,
  Tilt,
  Visual,
} from "./HeroPreview.style";

const checks = [
  { icon: "pin", text: "Inside branch perimeter · 38 m" },
  { icon: "camera", text: "Check-in selfie saved" },
  { icon: "clock", text: "On time · General shift" },
];

const PRESENT = 142;
const SCHEDULED = 156;
const MAX_TILT_DEG = 8;

/** Illustrative employee check-in screen and group summary; decorative only. */
export function HeroPreview() {
  const [visualRef, shown] = useReveal<HTMLDivElement>({ rootMargin: "0px" });
  const present = useCountUp(PRESENT, shown);
  const reducedMotion = useReducedMotion();
  const tiltRef = useRef<HTMLDivElement>(null);

  // Tilt toward the pointer; touch and reduced-motion visitors keep the phone flat.
  function tilt(event: PointerEvent<HTMLDivElement>) {
    const target = tiltRef.current;
    if (!target || reducedMotion || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    target.style.setProperty("--tilt-x", `${(-y * MAX_TILT_DEG).toFixed(2)}deg`);
    target.style.setProperty("--tilt-y", `${(x * MAX_TILT_DEG).toFixed(2)}deg`);
  }
  function resetTilt() {
    tiltRef.current?.style.removeProperty("--tilt-x");
    tiltRef.current?.style.removeProperty("--tilt-y");
  }

  return (
    <Visual ref={visualRef} aria-hidden="true" onPointerMove={tilt} onPointerLeave={resetTilt}>
      <Tilt ref={tiltRef}>
        <Phone>
          <PhoneTop>
            <span>Hiwa Boutique · Medipalli</span>
            <PhoneTime>09:02</PhoneTime>
          </PhoneTop>
          <Selfie>
            <SelfieRing>
              <ProfilePlaceholder />
            </SelfieRing>
            <ScanLine />
          </Selfie>
          <Checks>
            {checks.map((check, index) => (
              <CheckRow key={check.text} order={index}>
                <Icon name={check.icon} className="tiny" /> {check.text}
              </CheckRow>
            ))}
          </Checks>
          <PhoneButton>Checked in</PhoneButton>
        </Phone>
      </Tilt>
      <FloatCard className="card">
        <FloatLabel>Today across 3 branches</FloatLabel>
        <strong>
          {present} / {SCHEDULED} present
        </strong>
        <FloatBar>
          <FloatBarFill percent={shown ? Math.round((PRESENT / SCHEDULED) * 100) : 0} />
        </FloatBar>
      </FloatCard>
    </Visual>
  );
}
