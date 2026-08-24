export const FULFILLMENT_ORDER_STATUSES = ["PENDING PAYMENT", "PAID", "PROCESSING", "SUPPLIER SUBMITTED", "SUPPLIER PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUND PENDING", "REFUNDED"] as const;
export type FulfillmentOrderStatus = (typeof FULFILLMENT_ORDER_STATUSES)[number];

export const FULFILLMENT_PAYMENT_STATUSES = ["NOT CHARGED", "SIMULATION ONLY", "PAID", "FAILED", "REFUNDED"] as const;
export const FULFILLMENT_SUPPLIER_STATUSES = ["NOT SUBMITTED", "SIMULATED SUBMITTED", "SIMULATED PROCESSING", "COMPLETED", "FAILED"] as const;

export const FULFILLMENT_TRANSITIONS: Record<FulfillmentOrderStatus, readonly FulfillmentOrderStatus[]> = {
  "PENDING PAYMENT": ["PAID", "CANCELLED"],
  "PAID": ["PROCESSING", "CANCELLED", "REFUND PENDING"],
  "PROCESSING": ["SUPPLIER SUBMITTED", "FAILED", "CANCELLED", "REFUND PENDING"],
  "SUPPLIER SUBMITTED": ["SUPPLIER PROCESSING", "FAILED", "REFUND PENDING"],
  "SUPPLIER PROCESSING": ["COMPLETED", "FAILED", "REFUND PENDING"],
  "COMPLETED": ["REFUND PENDING"],
  "FAILED": ["PROCESSING", "CANCELLED", "REFUND PENDING"],
  "CANCELLED": [],
  "REFUND PENDING": ["REFUNDED", "COMPLETED"],
  "REFUNDED": [],
};

export const LIVE_FULFILLMENT_DISABLED_MESSAGE = "Live supplier fulfillment is disabled. This record is a test simulation only; no customer was charged, no wallet was deducted, and no supplier order was submitted.";

export function canTransitionFulfillmentOrder(current: FulfillmentOrderStatus, next: FulfillmentOrderStatus) {
  return FULFILLMENT_TRANSITIONS[current].includes(next);
}
