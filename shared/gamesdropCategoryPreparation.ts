export type PreparedCatalogCategory = "steam" | "top_up";
export type PreparedClassificationStatus = "SAFE" | "ADMIN_REVIEW" | "UNCLASSIFIED";
export type PreparedEvidenceType = "supplier_platform" | "owner_reference" | "missing_supplier_data";

export type PreparedMarketplaceSubcategory = {
  slug: string;
  name: string;
  parentCategory: PreparedCatalogCategory;
  evidenceType: "supplier_platform" | "owner_reference" | "safety_unclassified";
  assignmentPolicy: "automatic_evidence_only" | "admin_review_only";
  sourceSupplierKey: "gamesdrop" | null;
  description: string;
};

function platformSubcategory(slug: string, name: string, platformLabel: string): PreparedMarketplaceSubcategory {
  return {
    slug,
    name,
    parentCategory: "steam",
    evidenceType: "supplier_platform",
    assignmentPolicy: "automatic_evidence_only",
    sourceSupplierKey: "gamesdrop",
    description: `Assigned only when the stored supplier platform code is ${platformLabel}.`,
  };
}

/**
 * Definitions are restricted to platform codes observed in the full GamesDrop
 * Games feed, owner-specified Top-up group labels, and explicit safe review
 * paths. They do not publish new navigation or modify a legacy product row.
 */
export const GAMESDROP_PREPARED_SUBCATEGORIES: readonly PreparedMarketplaceSubcategory[] = [
  platformSubcategory("games-steam", "Steam", "Steam"),
  platformSubcategory("games-xbox", "Xbox", "Xbox"),
  platformSubcategory("games-playstation", "PlayStation", "PlayStation"),
  platformSubcategory("games-nintendo", "Nintendo", "Nintendo"),
  platformSubcategory("games-other-platform", "Other", "Other"),
  platformSubcategory("games-ea", "EA", "EA"),
  platformSubcategory("games-ubisoft", "Ubisoft", "Ubisoft"),
  platformSubcategory("games-quest", "Quest", "Quest"),
  platformSubcategory("games-battlenet", "Battle.net", "Battle.net"),
  platformSubcategory("games-mobile", "Mobile", "Mobile"),
  platformSubcategory("games-pc-other", "PC / Other", "PC Other"),
  {
    slug: "games-unclassified",
    name: "Unclassified / Admin Review",
    parentCategory: "steam",
    evidenceType: "safety_unclassified",
    assignmentPolicy: "admin_review_only",
    sourceSupplierKey: null,
    description: "Used when an existing Games record lacks an authoritative platform subcategory.",
  },
  {
    slug: "top-up-direct-top-up",
    name: "Direct Top-up",
    parentCategory: "top_up",
    evidenceType: "owner_reference",
    assignmentPolicy: "automatic_evidence_only",
    sourceSupplierKey: "gamesdrop",
    description: "Prepared from the owner-provided GamesDrop reference; assignment requires a stored supplier delivery-type field.",
  },
  {
    slug: "top-up-activation-codes",
    name: "Activation Codes",
    parentCategory: "top_up",
    evidenceType: "owner_reference",
    assignmentPolicy: "automatic_evidence_only",
    sourceSupplierKey: "gamesdrop",
    description: "Prepared from the owner-provided GamesDrop reference; assignment requires a stored supplier delivery-type field.",
  },
  {
    slug: "top-up-unclassified",
    name: "Unclassified / Admin Review",
    parentCategory: "top_up",
    evidenceType: "safety_unclassified",
    assignmentPolicy: "admin_review_only",
    sourceSupplierKey: null,
    description: "Used when an existing Top-up record lacks an authoritative direct-top-up or activation-code field.",
  },
] as const;

export type PreparationProduct = {
  id: number;
  category: string;
  supplierKey: string | null;
  metadata: unknown;
};

export type PreparedClassification = {
  productId: number;
  subcategorySlug: string;
  status: PreparedClassificationStatus;
  evidenceType: PreparedEvidenceType;
  evidence: Record<string, string | null>;
};

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

const gamesPlatformSubcategorySlug: Record<string, string> = {
  steam: "games-steam",
  xbox: "games-xbox",
  playstation: "games-playstation",
  nintendo: "games-nintendo",
  other: "games-other-platform",
  ea: "games-ea",
  ubisoft: "games-ubisoft",
  quest: "games-quest",
  battlenet: "games-battlenet",
  mobile: "games-mobile",
  "pc-other": "games-pc-other",
};

/**
 * Does not parse titles. A product is classified only from a stored supplier
 * platform value; all missing or unsupported evidence remains for review.
 */
export function classifyExistingProductForGamesDropPreparation(product: PreparationProduct): PreparedClassification | null {
  if (product.category === "steam") {
    const metadata = metadataRecord(product.metadata);
    const platformCode = typeof metadata.platformCode === "string" ? metadata.platformCode.trim().toLowerCase() : "";
    const subcategorySlug = product.supplierKey === "gamesdrop" ? gamesPlatformSubcategorySlug[platformCode] : undefined;
    if (subcategorySlug) {
      return {
        productId: product.id,
        subcategorySlug,
        status: "SAFE",
        evidenceType: "supplier_platform",
        evidence: { supplierKey: product.supplierKey, platformCode },
      };
    }
    return {
      productId: product.id,
      subcategorySlug: "games-unclassified",
      status: "ADMIN_REVIEW",
      evidenceType: "missing_supplier_data",
      evidence: { supplierKey: product.supplierKey, platformCode: platformCode || null },
    };
  }

  if (product.category === "top_up") {
    return {
      productId: product.id,
      subcategorySlug: "top-up-unclassified",
      status: "UNCLASSIFIED",
      evidenceType: "missing_supplier_data",
      evidence: { supplierKey: product.supplierKey, reason: "No authoritative stored direct-top-up or activation-code field" },
    };
  }

  return null;
}
