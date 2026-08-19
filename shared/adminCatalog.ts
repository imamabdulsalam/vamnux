import { z } from "zod";

/** Rows created by a VAMNUX administrator under a verified commercial agreement, not by a supplier API sync. */
export const ADMIN_MANAGED_SUPPLIER_KEY = "admin_managed";

export const authorizedCatalogSourceInputSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  sourceType: z.enum(["supplier", "direct_agreement"]),
  commerceIntegrationId: z.number().int().positive().optional(),
  agreementReference: z.string().trim().min(2).max(120),
}).superRefine((value, context) => {
  if (value.sourceType === "supplier" && !value.commerceIntegrationId) {
    context.addIssue({ code: "custom", path: ["commerceIntegrationId"], message: "Supplier sources require a configured supplier integration" });
  }
  if (value.sourceType === "direct_agreement" && value.commerceIntegrationId) {
    context.addIssue({ code: "custom", path: ["commerceIntegrationId"], message: "Direct agreements must not be linked to a supplier integration" });
  }
});

export type AuthorizedCatalogSourceInput = z.infer<typeof authorizedCatalogSourceInputSchema>;

export const adminManagedCatalogProductInputSchema = z.object({
  name: z.string().trim().min(3).max(255),
  category: z.enum(["gift_card", "subscription", "software", "ai_tool", "game_key"]),
  description: z.string().trim().min(12).max(2_000),
  catalogSourceId: z.number().int().positive(),
  basePrice: z.number().finite().positive().max(1_000_000),
  regionLabel: z.string().trim().max(120).optional(),
  deliveryType: z.enum(["digital_code", "activation_link", "manual_processing", "account_access"]),
  recipientEmailRequired: z.boolean().default(false),
  status: z.enum(["draft", "active", "paused"]).default("draft"),
});

export type AdminManagedCatalogProductInput = z.infer<typeof adminManagedCatalogProductInputSchema>;

/** Derive a stable, readable catalog key so repeated entries are rejected instead of silently duplicated. */
export function createAdminManagedCatalogSlug(category: AdminManagedCatalogProductInput["category"], name: string) {
  const normalizedName = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalizedName) throw new Error("Product name must include letters or numbers");
  return `admin-${category.replaceAll("_", "-")}-${normalizedName}`.slice(0, 180);
}

export function createRecipientEmailRequirement(required: boolean) {
  if (!required) return [];
  return [{
    key: "recipient_email",
    label: "Recipient email",
    type: "email" as const,
    required: true,
    helperText: "Enter the email address approved for delivery of this authorised digital product.",
  }];
}
