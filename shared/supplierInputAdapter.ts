export const SUPPLIER_INPUT_ADAPTER_MODE = "SIMULATION_ONLY" as const;

export const VAMNUX_ADAPTER_STATUS_VALUES = [
  "SUPPLIER_SUBMITTED",
  "SUPPLIER_PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type VamnuxAdapterStatus = (typeof VAMNUX_ADAPTER_STATUS_VALUES)[number];
export type SupplierAdapterKey = "flashtopup" | "gamesdrop";
export type MobileLegendsMarket = "GLOBAL" | "RUSSIA";

export type CanonicalGameTopUpInput = {
  gameUserId: string;
  serverId: string;
  region: MobileLegendsMarket;
  productId: string;
  denomination: string;
};

export type AdapterProfile = {
  pairId: string;
  displayName: string;
  market: MobileLegendsMarket;
  denomination: string;
  canonicalProductId: string;
  flashTopUp: {
    legacyProductId: number;
    serviceCode: string;
    validationCode: string;
    supplierOfferId: string;
    supplierFieldNames: ["user_id", "server_id", "validation_code"];
  };
  gamesDrop: {
    legacyProductId: number;
    offerId: number;
    supplierFieldNames: ["gameUserId", "gameServerId", "offerId", "price", "transactionId"];
  };
};

type PairSeed = [number, string, string, number, number];

const GLOBAL_PAIR_SEEDS: PairSeed[] = [
  [1, "5", "1", 480036, 86], [2, "12", "2", 480333, 1501], [3, "19", "3", 480334, 1502],
  [4, "28", "4", 480335, 1503], [5, "44", "5", 480336, 1504], [6, "59", "6", 480066, 300],
  [7, "85", "7", 480034, 72], [8, "170", "8", 480035, 73], [9, "240", "9", 480067, 301],
  [10, "296", "10", 480337, 1507], [11, "408", "11", 480338, 1508], [12, "568", "12", 480068, 302],
  [13, "875", "13", 480339, 1509], [14, "2010", "14", 480340, 1510], [15, "4830", "15", 480341, 1511],
];

const RUSSIA_PAIR_SEEDS: PairSeed[] = [
  [30001, "35", "393", 480069, 303], [30002, "55", "394", 480343, 1633], [30003, "165", "395", 480344, 1634],
  [30004, "275", "396", 480345, 1635], [30005, "565", "397", 480346, 1636],
];

function createProfile(seed: PairSeed, market: MobileLegendsMarket): AdapterProfile {
  const [legacyProductId, denomination, supplierOfferId, gamesDropProductId, gamesDropOfferId] = seed;
  const prefix = market === "GLOBAL" ? "TOPUP_MOBILE_LEGENDS_GLOBAL_1" : "TOPUP_MOBILE_LEGENDS_RUSSIA_6";
  const segment = `${denomination}_DIAMONDS`;
  const canonicalProductId = `mlbb-${market.toLowerCase()}-${denomination}`;
  return {
    pairId: `pilot-${canonicalProductId}`,
    displayName: `Mobile Legends ${market === "GLOBAL" ? "Global" : "Russia"} — ${denomination} Diamonds`,
    market,
    denomination,
    canonicalProductId,
    flashTopUp: {
      legacyProductId,
      serviceCode: `${prefix}_${segment}_${supplierOfferId}`,
      validationCode: market === "GLOBAL" ? "mlbb_global" : "mlbb_ru",
      supplierOfferId,
      supplierFieldNames: ["user_id", "server_id", "validation_code"],
    },
    gamesDrop: {
      legacyProductId: gamesDropProductId,
      offerId: gamesDropOfferId,
      supplierFieldNames: ["gameUserId", "gameServerId", "offerId", "price", "transactionId"],
    },
  };
}

export const MOBILE_LEGENDS_ADAPTER_PROFILES = [
  ...GLOBAL_PAIR_SEEDS.map((seed) => createProfile(seed, "GLOBAL")),
  ...RUSSIA_PAIR_SEEDS.map((seed) => createProfile(seed, "RUSSIA")),
] as const;

export function getMobileLegendsAdapterProfile(pairId: string) {
  return MOBILE_LEGENDS_ADAPTER_PROFILES.find((profile) => profile.pairId === pairId) ?? null;
}

export type AdapterValidationIssue = { field: keyof CanonicalGameTopUpInput; message: string; severity: "error" | "warning" };

export function validateCanonicalGameTopUpInput(profile: AdapterProfile, input: CanonicalGameTopUpInput): AdapterValidationIssue[] {
  const issues: AdapterValidationIssue[] = [];
  if (!/^[A-Za-z0-9_-]{3,80}$/.test(input.gameUserId.trim())) issues.push({ field: "gameUserId", severity: "error", message: "Use 3–80 letters, numbers, underscores, or hyphens for the player identifier." });
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(input.serverId.trim())) issues.push({ field: "serverId", severity: "error", message: "Use a non-empty supplier-valid server or zone identifier." });
  if (input.region !== profile.market) issues.push({ field: "region", severity: "error", message: `This pilot pair is restricted to the ${profile.market} market.` });
  if (input.productId !== profile.canonicalProductId) issues.push({ field: "productId", severity: "error", message: "The canonical product ID does not match the selected pilot pair." });
  if (input.denomination !== profile.denomination) issues.push({ field: "denomination", severity: "error", message: `The selected pilot pair requires ${profile.denomination} Diamonds.` });
  issues.push({ field: "region", severity: "warning", message: "GamesDrop country compatibility is stored as unverified. A future live flow must check current offer metadata and market eligibility before submission." });
  issues.push({ field: "serverId", severity: "warning", message: "A future GamesDrop flow must obtain supplier-native server values through server discovery before order submission." });
  return issues;
}

export function normalizeSupplierStatus(supplier: SupplierAdapterKey, status: string): VamnuxAdapterStatus {
  const normalized = status.trim().toUpperCase();
  if (supplier === "gamesdrop") {
    if (normalized === "SUBMITTED") return "SUPPLIER_SUBMITTED";
    if (normalized === "PROCESSING") return "SUPPLIER_PROCESSING";
    if (normalized === "COMPLETED") return "COMPLETED";
    if (normalized === "REFUND") return "REFUNDED";
    if (normalized === "CANCELED" || normalized === "CANCELLED") return "CANCELLED";
    return "FAILED";
  }
  if (["SUCCESS", "COMPLETED"].includes(normalized)) return "COMPLETED";
  if (["PROCESSING", "PENDING", "SUBMITTED"].includes(normalized)) return "SUPPLIER_PROCESSING";
  if (["CANCELLED", "CANCELED"].includes(normalized)) return "CANCELLED";
  if (["REFUND", "REFUNDED"].includes(normalized)) return "REFUNDED";
  return "FAILED";
}

export function simulateSupplierInputAdapter(input: { pairId: string; canonicalInput: CanonicalGameTopUpInput }) {
  const profile = getMobileLegendsAdapterProfile(input.pairId);
  if (!profile) throw new Error("Unknown controlled Mobile Legends adapter profile.");
  const canonicalInput = {
    ...input.canonicalInput,
    gameUserId: input.canonicalInput.gameUserId.trim(),
    serverId: input.canonicalInput.serverId.trim(),
  };
  const validationIssues = validateCanonicalGameTopUpInput(profile, canonicalInput);
  const blocking = validationIssues.some((issue) => issue.severity === "error");
  return {
    mode: SUPPLIER_INPUT_ADAPTER_MODE,
    profile,
    canonicalInput,
    validationIssues,
    canProceedToFuturePreflight: !blocking,
    liveRequestBlocked: true,
    supplierPreflight: {
      flashtopup: ["Validate the exact user_id/server_id/validation_code tuple via the supplier's check-id contract.", "Confirm the selected service_code remains active and its current supplier price is accepted before any future order."],
      gamesdrop: ["Retrieve the current offer metadata and server list for the numeric offerId.", "Validate gameUserId and supplier-native gameServerId using the supplier's player-validation contract.", "Confirm country compatibility and latest supplier price before any future order."],
    },
    requestPreviews: {
      flashtopup: {
        endpoint: "POST /order (preview only; no request is sent)",
        body: {
          service_code: profile.flashTopUp.serviceCode,
          reference_id: "SIMULATION_ONLY",
          user_id: canonicalInput.gameUserId,
          server_id: canonicalInput.serverId,
          validation_code: profile.flashTopUp.validationCode,
        },
      },
      gamesdrop: {
        endpoint: "POST /api/v1/offers/create-order (preview only; no request is sent)",
        body: {
          offerId: profile.gamesDrop.offerId,
          price: "FETCH_LATEST_SUPPLIER_PRICE_BEFORE_LIVE_ORDER",
          transactionId: "SIMULATION_ONLY",
          customer: { gameUserId: canonicalInput.gameUserId, gameServerId: canonicalInput.serverId },
        },
      },
    },
    responseMappings: {
      flashtopup: ["SUCCESS → COMPLETED", "PROCESSING/PENDING/SUBMITTED → SUPPLIER_PROCESSING", "FAILED/ERROR/INVALID → FAILED"],
      gamesdrop: ["SUBMITTED → SUPPLIER_SUBMITTED", "PROCESSING → SUPPLIER_PROCESSING", "COMPLETED → COMPLETED", "CANCELED → CANCELLED", "FAILED → FAILED", "REFUND → REFUNDED"],
    },
    adminErrorVisibility: "Preserve supplier-native status, response reference, and safe error detail in Admin-only order events. Never expose credentials or raw secrets.",
  } as const;
}
