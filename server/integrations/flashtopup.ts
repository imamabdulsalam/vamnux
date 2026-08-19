import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const DEFAULT_BASE_URL = "https://api.flashtopup.com/api/reseller/v2";

export type FlashTopUpCredentials = {
  apiId: string;
  apiSecret: string;
  baseUrl?: string;
};

export type FlashTopUpResponse<T> = {
  status: boolean;
  success?: boolean;
  message?: string;
  data?: T;
  meta?: {
    next_cursor?: string | null;
    [key: string]: unknown;
  };
};

export type FlashTopUpOrderInput = {
  service_code: string;
  reference_id: string;
  quantity?: number;
  [field: string]: string | number | undefined;
};

export type FlashTopUpCheckIdInput = {
  user_id: string;
  server_id?: string;
  validation_code: string;
};

export type FlashTopUpInputField = {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean | number | string;
  type?: string;
  validation?: unknown;
  validation_regex?: string;
};

export type FlashTopUpProduct = {
  product_id: string | number;
  product_code: string;
  product_type: string;
  name: string;
  image_url?: string;
  fields?: FlashTopUpInputField[];
  server?: unknown;
  status?: string;
  check_id_status?: unknown;
  validation_code?: string;
  updated_at?: string;
};

export type FlashTopUpService = {
  service_id: string | number;
  service_code: string;
  service_name: string;
  product_id: string | number;
  product_code: string;
  product_name: string;
  product_type: string;
  price: string | number;
  currency: string;
  in_stock?: boolean | number | string;
  max_quantity?: number;
  status?: string;
  price_updated_at?: string;
  updated_at?: string;
};

export type FlashTopUpServicePage = {
  product_id: string | number;
  product_code: string;
  product_type: string;
  service: FlashTopUpService[];
  pagination?: { next_cursor?: string | null };
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function cleanBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

/**
 * FlashTopUp v2 signs method, canonical API path, Unix timestamp, nonce, and a SHA-256 body hash.
 * Fields are joined with newline delimiters so the canonical value remains unambiguous.
 */
export function createFlashTopUpSignature(input: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  body: string;
  apiSecret: string;
}) {
  const bodyHash = sha256(input.body);
  const canonicalPayload = [
    input.method.toUpperCase(),
    input.path,
    input.timestamp,
    input.nonce,
    bodyHash,
  ].join("\n");

  return {
    bodyHash,
    signature: createHmac("sha256", input.apiSecret).update(canonicalPayload).digest("hex"),
  };
}

export function verifyFlashTopUpWebhook(input: {
  rawBody: Buffer;
  timestamp: string | undefined;
  signature: string | undefined;
  apiSecret: string;
  now?: number;
}) {
  if (!input.timestamp || !input.signature) return false;
  const timestampSeconds = Number(input.timestamp);
  if (!Number.isInteger(timestampSeconds)) return false;
  if (Math.abs(Math.floor((input.now ?? Date.now()) / 1000) - timestampSeconds) > 300) return false;

  const expected = `sha256=${createHmac("sha256", input.apiSecret)
    .update(Buffer.concat([Buffer.from(`${input.timestamp}.`, "utf8"), input.rawBody]))
    .digest("hex")}`;
  const received = Buffer.from(input.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

export class FlashTopUpClient {
  private readonly baseUrl: string;

  constructor(private readonly credentials: FlashTopUpCredentials) {
    this.baseUrl = cleanBaseUrl(credentials.baseUrl ?? DEFAULT_BASE_URL);
  }

  private async request<T>(method: "GET" | "POST", relativePath: string, body?: unknown, sandbox = false): Promise<FlashTopUpResponse<T>> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomUUID();
    const requestBody = method === "POST" ? JSON.stringify(body ?? {}) : "";
    const url = `${this.baseUrl}${relativePath}`;
    const canonicalPath = new URL(url).pathname;
    const { signature } = createFlashTopUpSignature({
      method,
      path: canonicalPath,
      timestamp,
      nonce,
      body: requestBody,
      apiSecret: this.credentials.apiSecret,
    });
    const response = await fetch(url, {
      method,
      signal: AbortSignal.timeout(15_000),
      headers: {
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        "X-FT-API-ID": this.credentials.apiId,
        "X-FT-Timestamp": timestamp,
        "X-FT-Nonce": nonce,
        "X-FT-Signature": signature,
        ...(sandbox ? { "X-FT-Sandbox": "true" } : {}),
      },
      body: method === "POST" ? requestBody : undefined,
    });
    const responseText = await response.text();
    let payload: FlashTopUpResponse<T>;
    try {
      payload = JSON.parse(responseText) as FlashTopUpResponse<T>;
    } catch {
      throw new Error(`FlashTopUp returned a non-JSON response with HTTP ${response.status}`);
    }
    const succeeded = payload.status === true || payload.success === true || (payload.status as unknown) === "success";
    if (!response.ok || !succeeded) {
      const errorDetail = payload.message ?? (payload as { error?: { message?: string } }).error?.message;
      const responseShape = Object.keys(payload).join(",");
      throw new Error(errorDetail || `FlashTopUp request failed with HTTP ${response.status}; response fields: ${responseShape}`);
    }
    return payload;
  }

  profile() {
    return this.request<unknown>("GET", "/profile");
  }

  balance() {
    return this.request<unknown>("GET", "/balance");
  }

  products(input: { page?: number; perPage?: number; cursor?: string } = {}) {
    const params = new URLSearchParams({
      page: String(input.page ?? 1),
      per_page: String(input.perPage ?? 500),
      ...(input.cursor ? { cursor: input.cursor } : {}),
    });
    return this.request<FlashTopUpProduct[]>("GET", `/products?${params.toString()}`);
  }

  services(input: { productCode: string; productType: string; page?: number; perPage?: number; cursor?: string }) {
    const params = new URLSearchParams({
      product_code: input.productCode,
      product_type: input.productType,
      page: String(input.page ?? 1),
      per_page: String(input.perPage ?? 500),
      ...(input.cursor ? { cursor: input.cursor } : {}),
    });
    return this.request<FlashTopUpServicePage>("GET", `/services?${params.toString()}`);
  }

  createOrder(input: FlashTopUpOrderInput, sandbox = false) {
    return this.request<unknown>("POST", "/order", input, sandbox);
  }

  /** Explicitly isolated supplier test operation; it always sends X-FT-Sandbox: true. */
  createSandboxOrder(input: FlashTopUpOrderInput) {
    return this.request<unknown>("POST", "/order", input, true);
  }

  checkId(input: FlashTopUpCheckIdInput, sandbox = false) {
    return this.request<unknown>("POST", "/check-id", input, sandbox);
  }

  orderStatus(input: { orderId?: string; referenceId?: string }, sandbox = false) {
    if (!input.orderId && !input.referenceId) throw new Error("FlashTopUp orderId or referenceId is required");
    const params = new URLSearchParams({
      ...(input.orderId ? { order_id: input.orderId } : {}),
      ...(input.referenceId ? { reference_id: input.referenceId } : {}),
    });
    return this.request<unknown>("GET", `/order/status?${params.toString()}`, undefined, sandbox);
  }
}

export function getFlashTopUpClient() {
  const apiId = process.env.FLASHTOPUP_API_ID;
  const apiSecret = process.env.FLASHTOPUP_API_SECRET;
  if (!apiId || !apiSecret) throw new Error("FlashTopUp credentials are not configured");
  return new FlashTopUpClient({ apiId, apiSecret, baseUrl: DEFAULT_BASE_URL });
}
