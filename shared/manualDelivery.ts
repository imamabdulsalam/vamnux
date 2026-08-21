export const manualDeliveryStatuses = ["pending_payment", "pending_review", "in_progress", "completed", "failed", "cancelled"] as const;
export type ManualDeliveryStatus = typeof manualDeliveryStatuses[number];

export function isManualDeliveryTransitionAllowed(from: ManualDeliveryStatus, to: ManualDeliveryStatus) {
  const allowed: Record<ManualDeliveryStatus, ManualDeliveryStatus[]> = {
    pending_payment: ["pending_review", "cancelled"],
    pending_review: ["in_progress", "failed", "cancelled"],
    in_progress: ["completed", "failed", "cancelled"],
    completed: [],
    failed: ["pending_review", "cancelled"],
    cancelled: [],
  };
  return allowed[from].includes(to);
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hour${hours === 1 ? "" : "s"}`;
}

export function formatManualDeliveryWindow(minimumMinutes: number | null | undefined, maximumMinutes: number | null | undefined) {
  if (minimumMinutes && maximumMinutes) return `${formatDuration(minimumMinutes)}–${formatDuration(maximumMinutes)}`;
  if (maximumMinutes) return `Up to ${formatDuration(maximumMinutes)}`;
  if (minimumMinutes) return `From ${formatDuration(minimumMinutes)}`;
  return "Timing to be confirmed by VAMNUX";
}

export function manualDeliveryMinutesFromMetadata(metadata: unknown) {
  const source = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
  const minimum = Number(source.deliveryMinimumMinutes);
  const maximum = Number(source.deliveryMaximumMinutes);
  return {
    minimumMinutes: Number.isInteger(minimum) && minimum > 0 ? minimum : null,
    maximumMinutes: Number.isInteger(maximum) && maximum > 0 ? maximum : null,
  };
}
