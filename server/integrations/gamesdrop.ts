const DEFAULT_BASE_URL = "https://partner.gamesdrop.io";

export type GamesDropCredentials = { token: string; baseUrl?: string };

export type GamesDropOffer = {
  offerGroupId: number;
  productName: string;
  offerGroupName: string;
  platformCode?: string | null;
  platformName?: string | null;
  regionCode?: string | null;
  regionName?: string | null;
  regionalLimitations?: string | null;
  excludedCountryCodes?: string[] | null;
  countryCompatibility?: "allowed" | "blocked" | "unverified" | "not_checked" | string | null;
  price: number | string;
  currency?: string | null;
  inStock: boolean;
  isRequiredGameUserId?: boolean | null;
  isRequiredGameServerId?: boolean | null;
  isReturnDataForCustomer?: boolean | null;
};

export type GamesDropSyncPage = { count: number; rows: GamesDropOffer[] };

function cleanBaseUrl(baseUrl: string) { return baseUrl.replace(/\/+$/, ""); }

export class GamesDropClient {
  private readonly baseUrl: string;

  constructor(private readonly credentials: GamesDropCredentials) { this.baseUrl = cleanBaseUrl(credentials.baseUrl ?? DEFAULT_BASE_URL); }

  private async request<T>(path: string, body?: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: this.credentials.token, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    let payload: T | { message?: string; error?: string };
    try { payload = JSON.parse(text) as T | { message?: string; error?: string }; }
    catch { throw new Error(`GamesDrop returned a non-JSON response with HTTP ${response.status}`); }
    if (!response.ok) {
      const error = payload as { message?: string; error?: string };
      throw new Error(error.message || error.error || `GamesDrop request failed with HTTP ${response.status}`);
    }
    return payload as T;
  }

  syncOffers(input: { page?: number; limit?: number; search?: string; category?: string; countryCode?: string } = {}) {
    return this.request<GamesDropSyncPage>("/api/v1/offers/sync", {
      page: Math.max(1, input.page ?? 1),
      limit: Math.min(250, Math.max(1, input.limit ?? 50)),
      search: input.search,
      category: input.category,
      countryCode: input.countryCode ?? "NG",
    });
  }

  balance() { return this.request<unknown>("/api/v1/partner/balance"); }
}

export function getGamesDropClient() {
  const token = process.env.GAMESDROP_API_TOKEN;
  if (!token) throw new Error("GamesDrop credentials are not configured");
  return new GamesDropClient({ token });
}
