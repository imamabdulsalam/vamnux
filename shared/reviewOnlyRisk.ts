export type RiskLevel = "low" | "medium" | "high";
export type RiskSignalStatus = "flagged" | "clear" | "unavailable";

type DateLike = Date | string | number | null | undefined;

export type RiskCustomer = { id: number; name?: string | null; username?: string | null; email?: string | null; role?: string | null };
export type RiskOrder = { id: number; customerId?: number | null; paymentStatus: string; supplierStatus: string; total: number | string; createdAt: DateLike };
export type RiskFundingAttempt = { userId: number; status: string; amount?: number | string; createdAt: DateLike };
export type RiskApiLog = { orderId?: number | null; success: boolean; createdAt: DateLike };
export type RiskWebhook = { processingStatus: string; receivedAt: DateLike };

export type ReviewOnlyRiskSignal = { id: string; label: string; status: RiskSignalStatus; points: number; detail: string };
export type ReviewOnlyRiskReview = { userId: number; customerName: string; customerEmail: string | null; score: number; level: RiskLevel; signals: ReviewOnlyRiskSignal[] };

const asTime = (value: DateLike) => value ? new Date(value).getTime() : Number.NaN;
const asAmount = (value: number | string | undefined) => Number(value ?? 0);
const activeWindow = (value: DateLike, windowMs: number) => {
  const time = asTime(value);
  return Number.isFinite(time) && time >= Date.now() - windowMs;
};

function levelFor(score: number): RiskLevel {
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export function buildReviewOnlyRiskAnalysis(input: { customers: RiskCustomer[]; orders: RiskOrder[]; fundingAttempts: RiskFundingAttempt[]; apiLogs: RiskApiLog[]; webhooks: RiskWebhook[] }) {
  const ordersByCustomer = new Map<number, RiskOrder[]>();
  input.orders.forEach((order) => {
    if (typeof order.customerId !== "number") return;
    ordersByCustomer.set(order.customerId, [...(ordersByCustomer.get(order.customerId) ?? []), order]);
  });
  const fundingByCustomer = new Map<number, RiskFundingAttempt[]>();
  input.fundingAttempts.forEach((attempt) => fundingByCustomer.set(attempt.userId, [...(fundingByCustomer.get(attempt.userId) ?? []), attempt]));
  const orderCustomers = new Map(input.orders.map((order) => [order.id, order.customerId]));
  const apiFailuresByCustomer = new Map<number, number>();
  let unlinkedApiFailures = 0;
  input.apiLogs.filter((log) => !log.success).forEach((log) => {
    const customerId = log.orderId ? orderCustomers.get(log.orderId) : undefined;
    if (typeof customerId === "number") apiFailuresByCustomer.set(customerId, (apiFailuresByCustomer.get(customerId) ?? 0) + 1);
    else unlinkedApiFailures += 1;
  });

  const reviews = input.customers.filter((customer) => customer.role !== "admin").map((customer) => {
    const customerOrders = (ordersByCustomer.get(customer.id) ?? []).slice().sort((a, b) => asTime(a.createdAt) - asTime(b.createdAt));
    const funding = fundingByCustomer.get(customer.id) ?? [];
    const signals: ReviewOnlyRiskSignal[] = [];
    const recentFunding = funding.filter((attempt) => activeWindow(attempt.createdAt, 24 * 60 * 60 * 1000));
    const failedFunding = funding.filter((attempt) => attempt.status === "failed" && activeWindow(attempt.createdAt, 30 * 24 * 60 * 60 * 1000));
    const repeatedFunding = recentFunding.length >= 3 || failedFunding.length >= 2;
    signals.push({ id: "unusual_wallet_funding", label: "Unusual wallet funding", status: repeatedFunding ? "flagged" : "clear", points: repeatedFunding ? 20 : 0, detail: repeatedFunding ? `${recentFunding.length} funding attempts in 24 hours; ${failedFunding.length} failed attempts in 30 days.` : "No repeated funding pattern in the stored review window." });

    const failedPayments = customerOrders.filter((order) => order.paymentStatus === "failed");
    const repeatedFailedPayments = failedPayments.length >= 2 || failedFunding.length >= 2;
    signals.push({ id: "failed_payments", label: "Repeated failed payments", status: repeatedFailedPayments ? "flagged" : "clear", points: repeatedFailedPayments ? 20 : 0, detail: repeatedFailedPayments ? `${failedPayments.length} failed order payments and ${failedFunding.length} failed funding attempts are stored.` : "No repeated failed payment record is stored." });

    let rapidOrders = 0;
    for (let index = 2; index < customerOrders.length; index += 1) {
      if (asTime(customerOrders[index].createdAt) - asTime(customerOrders[index - 2].createdAt) <= 60_000) rapidOrders += 1;
    }
    signals.push({ id: "rapid_orders", label: "Multiple orders within seconds", status: rapidOrders > 0 ? "flagged" : "clear", points: rapidOrders > 0 ? 20 : 0, detail: rapidOrders > 0 ? `${rapidOrders + 2} customer orders fall within a 60-second review window.` : "No three-order sequence within 60 seconds is stored." });

    const paidAmounts = customerOrders.filter((order) => order.paymentStatus === "paid").map((order) => asAmount(order.total)).filter((amount) => Number.isFinite(amount) && amount > 0).sort((a, b) => a - b);
    const baseline = paidAmounts.length >= 3 ? paidAmounts.slice(0, -1).reduce((sum, amount) => sum + amount, 0) / (paidAmounts.length - 1) : null;
    const latestSpend = paidAmounts.at(-1) ?? 0;
    const abnormalSpending = baseline !== null && latestSpend >= Math.max(250, baseline * 3);
    signals.push({ id: "abnormal_spending", label: "Abnormal spending", status: baseline === null ? "unavailable" : abnormalSpending ? "flagged" : "clear", points: abnormalSpending ? 15 : 0, detail: baseline === null ? "At least three recorded paid orders are needed for a customer-specific spending comparison." : abnormalSpending ? `Latest paid order is ${latestSpend.toFixed(2)} versus a ${baseline.toFixed(2)} prior-order average.` : "Latest paid order is within the transparent customer-specific comparison threshold." });

    const refunds = customerOrders.filter((order) => order.paymentStatus === "refunded").length;
    signals.push({ id: "refund_requests", label: "Repeated refunds", status: refunds >= 2 ? "flagged" : "clear", points: refunds >= 2 ? 15 : 0, detail: refunds >= 2 ? `${refunds} refunded orders are stored for review.` : "Fewer than two refunded orders are stored." });

    const supplierFailures = customerOrders.filter((order) => order.supplierStatus === "failed").length + (apiFailuresByCustomer.get(customer.id) ?? 0);
    signals.push({ id: "failed_supplier_orders", label: "Failed API orders", status: supplierFailures > 0 ? "flagged" : "clear", points: supplierFailures > 0 ? 15 : 0, detail: supplierFailures > 0 ? `${supplierFailures} supplier-order/API failures are linked to this customer’s stored orders.` : "No linked supplier-order/API failure is stored." });

    signals.push({ id: "multiple_accounts_same_device", label: "Multiple accounts from same device", status: "unavailable", points: 0, detail: "Device identifiers are not collected by VAMNUX, so this signal is intentionally unavailable." });
    signals.push({ id: "suspicious_ip_activity", label: "Suspicious IP activity", status: "unavailable", points: 0, detail: "IP-address activity is not stored by VAMNUX, so this signal is intentionally unavailable." });
    signals.push({ id: "chargeback_history", label: "Chargeback history", status: "unavailable", points: 0, detail: "No payment provider or chargeback ledger is active, so this signal is intentionally unavailable." });
    const score = signals.reduce((total, signal) => total + signal.points, 0);
    return { userId: customer.id, customerName: customer.username || customer.name || `Customer #${customer.id}`, customerEmail: customer.email ?? null, score, level: levelFor(score), signals };
  }).sort((a, b) => b.score - a.score || a.customerName.localeCompare(b.customerName));

  const failedWebhooks = input.webhooks.filter((webhook) => webhook.processingStatus === "failed").length;
  return {
    reviews,
    overview: {
      high: reviews.filter((review) => review.level === "high").length,
      medium: reviews.filter((review) => review.level === "medium").length,
      low: reviews.filter((review) => review.level === "low").length,
      unlinkedApiFailures,
      failedWebhooks,
    },
  };
}
