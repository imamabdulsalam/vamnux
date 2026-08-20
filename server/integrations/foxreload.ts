const DEFAULT_BASE_URL = "https://public-api.foxreload.com";

export type FoxReloadCredentials = { apiKey: string; baseUrl?: string };

export type FoxReloadCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  tags?: string[];
  parentId?: string | null;
  hasProducts: boolean;
  inStockCount?: number | null;
};

export type FoxReloadProduct = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  description?: string | null;
  attributes?: Record<string, unknown>;
  price: string | number;
  currency?: string | null;
  quantity?: number | null;
  orderMinQuantity?: number | null;
  orderMaxQuantity?: number | null;
  requiredNoteFields?: string[] | null;
  noteFieldOptions?: Record<string, unknown> | null;
  noteFieldTypes?: Record<string, unknown> | null;
};

type FoxReloadCategoryPage = { items: FoxReloadCategory[]; limit: number; nextCursor?: string | null };
type FoxReloadProductPage = { items: FoxReloadProduct[]; limit: number; offset: number; total: number };

function cleanBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export class FoxReloadClient {
  private readonly baseUrl: string;

  constructor(private readonly credentials: FoxReloadCredentials) {
    this.baseUrl = cleanBaseUrl(credentials.baseUrl ?? DEFAULT_BASE_URL);
  }

  private async request<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, String(value));
    const response = await fetch(`${this.baseUrl}${path}${query.size ? `?${query}` : ""}`, {
      signal: AbortSignal.timeout(15_000),
      headers: { "X-API-Key": this.credentials.apiKey, "X-Language": "en", "X-Currency": "usd" },
    });
    const text = await response.text();
    let payload: T | { detail?: string; message?: string };
    try { payload = JSON.parse(text) as T | { detail?: string; message?: string }; }
    catch { throw new Error(`FoxReload returned a non-JSON response with HTTP ${response.status}`); }
    if (!response.ok) {
      const detail = (payload as { detail?: string; message?: string }).detail ?? (payload as { message?: string }).message;
      throw new Error(detail || `FoxReload request failed with HTTP ${response.status}`);
    }
    return payload as T;
  }

  profile() { return this.request<unknown>("/api/access/me"); }

  categories(input: { cursor?: string; limit?: number; withStockOnly?: boolean } = {}) {
    return this.request<FoxReloadCategoryPage>("/api/categories/", {
      cursor: input.cursor,
      limit: Math.min(200, Math.max(1, input.limit ?? 25)),
      withStockOnly: input.withStockOnly ?? true,
    });
  }

  products(input: { categoryIdOrSlug: string; limit?: number; offset?: number; withStockOnly?: boolean }) {
    return this.request<FoxReloadProductPage>("/api/products/", {
      category_id_or_slug: input.categoryIdOrSlug,
      limit: Math.min(200, Math.max(1, input.limit ?? 50)),
      offset: Math.max(0, input.offset ?? 0),
      withStockOnly: input.withStockOnly ?? true,
    });
  }

  searchProducts(input: { query: string; limit?: number; offset?: number; withStockOnly?: boolean }) {
    const limit = Math.min(200, Math.max(1, input.limit ?? 50));
    const offset = Math.max(0, input.offset ?? 0);
    return this.request<FoxReloadProductPage | FoxReloadProduct[]>("/api/products/search", {
      query: input.query,
      limit,
      offset,
      withStockOnly: input.withStockOnly ?? true,
    }).then((result) => Array.isArray(result) ? { items: result, limit, offset, total: result.length } : result);
  }
}

export function getFoxReloadClient() {
  const apiKey = process.env.FOXRELOAD_API_KEY;
  if (!apiKey) throw new Error("FoxReload credentials are not configured");
  return new FoxReloadClient({ apiKey, baseUrl: DEFAULT_BASE_URL });
}
