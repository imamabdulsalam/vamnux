import type { CustomerInputRequirement } from "../shared/flashtopup";

export type SupplierCatalogRow = {
  slug: string;
  supplierSku: string;
  supplierCategory: string;
  name: string;
  category: "top_up" | "gift_card" | "subscription" | "software" | "ai_tool" | "game_key" | "steam" | "telegram_stars";
  description?: string;
  imageUrl?: string;
  regionLabel?: string;
  basePrice: string;
  baseCurrency: string;
  supplierPrice: string;
  supplierCurrency: string;
  supplierOfferId: string;
  supplierUpdatedAt?: Date;
  supplierEligible: boolean;
  deliveryType: "instant" | "digital_code" | "activation_link" | "manual_processing";
  requiresPlayerId: boolean;
  requiresServerId: boolean;
  inputRequirements: CustomerInputRequirement[];
  status: "active" | "paused";
  metadata: Record<string, unknown>;
};
