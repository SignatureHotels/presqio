import type { AvatarTone } from "@/components/employee-avatar/EmployeeAvatar.style";

const TONES: AvatarTone[] = ["lav", "mint", "peach", "blue", "pink"];

/** Same colour for the same person every time, without storing it. */
export function avatarToneFor(id: string): AvatarTone {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}
