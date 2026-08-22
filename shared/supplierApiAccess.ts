export type SafeCredentialReference = {
  label: string;
  reference: string;
  environmentKeys: string[];
};

export type SupplierApiAccessMetadata = {
  key: "gamesdrop" | "flashtopup" | "foxreload";
  name: string;
  websiteUrl: string;
  documentationUrl: string;
  partnerUrl?: string;
  contacts: Array<{ label: string; value: string; href?: string }>;
  credentials: SafeCredentialReference[];
};

export const SUPPLIER_API_ACCESS_METADATA: SupplierApiAccessMetadata[] = [
  {
    key: "gamesdrop",
    name: "GamesDrop",
    websiteUrl: "https://gamesdrop.io/en",
    documentationUrl: "https://gamesdrop.io/en/docs/partner-api",
    contacts: [
      { label: "Support email", value: "info@gamesdrop.io", href: "mailto:info@gamesdrop.io" },
      { label: "Telegram", value: "@igoryan34", href: "https://t.me/igoryan34" },
    ],
    credentials: [{ label: "Shop API token", reference: "GAMESDROP_API_TOKEN", environmentKeys: ["GAMESDROP_API_TOKEN"] }],
  },
  {
    key: "flashtopup",
    name: "FlashTopUp",
    websiteUrl: "https://flashtopup.com",
    documentationUrl: "https://flashtopup.com/reseller/api-docs",
    partnerUrl: "https://flashtopup.com/reseller",
    contacts: [
      { label: "Support email", value: "flashtopup.com@gmail.com", href: "mailto:flashtopup.com@gmail.com" },
      { label: "Live chat", value: "Official contact page", href: "https://flashtopup.com/contact" },
    ],
    credentials: [
      { label: "Reseller API ID", reference: "FLASHTOPUP_API_ID", environmentKeys: ["FLASHTOPUP_API_ID"] },
      { label: "Reseller API secret", reference: "FLASHTOPUP_API_SECRET", environmentKeys: ["FLASHTOPUP_API_SECRET"] },
      { label: "Webhook verification key", reference: "FLASHTOPUP_RESELLER_API_KEY", environmentKeys: ["FLASHTOPUP_RESELLER_API_KEY"] },
    ],
  },
  {
    key: "foxreload",
    name: "FoxReload",
    websiteUrl: "https://foxreload.com/en",
    documentationUrl: "https://public-api.foxreload.com/docs",
    partnerUrl: "https://foxreload.com/distributors",
    contacts: [],
    credentials: [{ label: "Public API key", reference: "FOXRELOAD_API_KEY", environmentKeys: ["FOXRELOAD_API_KEY"] }],
  },
];
