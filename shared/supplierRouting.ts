export const SUPPLIER_ROUTING_STRATEGIES = ["lowest_cost", "highest_priority", "manual_selection", "availability_first", "lowest_cost_available"] as const;
export type SupplierRoutingStrategy = (typeof SUPPLIER_ROUTING_STRATEGIES)[number];

export type RoutingEligibleOffer = {
  supplierOfferId: number;
  supplierKey: string;
  supplierName: string;
  priority: number;
  convertedCost: number;
  supplierCost: number;
  supplierCurrency: string;
};

export function selectSimulatedSupplierOffer(strategy: SupplierRoutingStrategy, offers: RoutingEligibleOffer[], manualSupplierOfferId?: number | null) {
  if (!offers.length) return null;
  const byCost = [...offers].sort((a, b) => a.convertedCost - b.convertedCost || a.priority - b.priority || a.supplierOfferId - b.supplierOfferId);
  const byPriority = [...offers].sort((a, b) => a.priority - b.priority || a.convertedCost - b.convertedCost || a.supplierOfferId - b.supplierOfferId);
  if (strategy === "manual_selection") return offers.find((offer) => offer.supplierOfferId === manualSupplierOfferId) ?? null;
  if (strategy === "highest_priority" || strategy === "availability_first") return byPriority[0] ?? null;
  return byCost[0] ?? null;
}

export const LIVE_ROUTING_DISABLED_MESSAGE = "Live automatic supplier routing is disabled. This decision is a test simulation only; no supplier order was submitted or rerouted.";
