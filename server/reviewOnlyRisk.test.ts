import { describe, expect, it } from "vitest";
import { buildReviewOnlyRiskAnalysis } from "../shared/reviewOnlyRisk";

describe("review-only risk analysis", () => {
  it("flags real stored risk patterns, labels unavailable signals honestly, and never returns an enforcement action", () => {
    const now = new Date();
    const result = buildReviewOnlyRiskAnalysis({
      customers: [{ id: 4, name: "Customer", email: "customer@example.com", role: "user" }],
      fundingAttempts: [{ userId: 4, status: "failed", createdAt: now }, { userId: 4, status: "failed", createdAt: now }, { userId: 4, status: "pending", createdAt: now }],
      orders: [
        { id: 1, customerId: 4, paymentStatus: "paid", supplierStatus: "fulfilled", total: 10, createdAt: new Date(now.getTime() - 50_000) },
        { id: 2, customerId: 4, paymentStatus: "paid", supplierStatus: "fulfilled", total: 12, createdAt: new Date(now.getTime() - 20_000) },
        { id: 3, customerId: 4, paymentStatus: "refunded", supplierStatus: "failed", total: 400, createdAt: now },
        { id: 4, customerId: 4, paymentStatus: "refunded", supplierStatus: "failed", total: 400, createdAt: now },
      ],
      apiLogs: [{ orderId: 3, success: false, createdAt: now }],
      webhooks: [{ processingStatus: "failed", receivedAt: now }],
    });
    const review = result.reviews[0];
    expect(review?.level).toBe("high");
    expect(review?.signals.find((signal) => signal.id === "rapid_orders")?.status).toBe("flagged");
    expect(review?.signals.find((signal) => signal.id === "multiple_accounts_same_device")).toMatchObject({ status: "unavailable", points: 0 });
    expect(JSON.stringify(result)).not.toContain("suspend");
    expect(result.overview.failedWebhooks).toBe(1);
  });
});
