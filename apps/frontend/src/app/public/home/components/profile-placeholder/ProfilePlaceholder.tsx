import { Portrait } from "./ProfilePlaceholder.style";

/** Placeholder portrait shown where an employee's selfie would appear. Decorative only. */
export function ProfilePlaceholder() {
  return (
    <Portrait viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <circle className="bg" cx="60" cy="60" r="60" />
      {/* Shoulders */}
      <path className="shirt" d="M18 120c2-22 18-34 42-34s40 12 42 34z" />
      <path className="collar" d="M48 88l12 12 12-12c-4-2-8-3-12-3s-8 1-12 3z" />
      {/* Neck and face */}
      <rect className="skin" x="52" y="70" width="16" height="18" rx="6" />
      <ellipse className="skin" cx="60" cy="54" rx="21" ry="24" />
      <ellipse className="shade" cx="60" cy="76" rx="9" ry="3" />
      {/* Hair */}
      <path
        className="hair"
        d="M38 52c-2-17 9-29 23-29 14 0 24 10 22 27-4-7-11-11-19-12-7 6-16 9-26 14z"
      />
      {/* Eyes and smile */}
      <circle className="feature" cx="52" cy="56" r="2.4" />
      <circle className="feature" cx="68" cy="56" r="2.4" />
      <path className="smile" d="M53 65c4 4 10 4 14 0" />
    </Portrait>
  );
}
