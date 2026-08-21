export type SuspensionDuration = "7d" | "30d" | "90d" | "1y" | "permanent";

export function suspensionEndFromPreset(duration: SuspensionDuration, from = new Date()) {
  if (duration === "permanent") return null;
  const end = new Date(from);
  if (duration === "7d") end.setDate(end.getDate() + 7);
  if (duration === "30d") end.setDate(end.getDate() + 30);
  if (duration === "90d") end.setDate(end.getDate() + 90);
  if (duration === "1y") end.setFullYear(end.getFullYear() + 1);
  return end;
}
