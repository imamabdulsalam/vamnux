export type SupplierDiscoveryItem = {
  name: string;
  image: string;
  href: string;
  availability: "awaiting_sync";
};

/**
 * Public supplier catalogue references. These records are discovery-only: they
 * must never be treated as VAMNUX product, price, cart, or order records.
 */
export const PUBLIC_FLASHTOPUP_DISCOVERY: readonly SupplierDiscoveryItem[] = [
  { name: "Free Fire LATAM", image: "/manus-storage/free-fire-latam_73a62a50.webp", href: "https://flashtopup.com/topup/free-fire-latam", availability: "awaiting_sync" },
  { name: "Mobile Legends", image: "/manus-storage/mobile-legends_da301a0e.webp", href: "https://flashtopup.com/topup/mobile-legends", availability: "awaiting_sync" },
  { name: "Mobile Legends Global", image: "/manus-storage/mobile-legends-global_526e9a9d.webp", href: "https://flashtopup.com/topup/mobile-legends-global", availability: "awaiting_sync" },
  { name: "PUBG Mobile", image: "/manus-storage/pubg-mobile_66e3513a.webp", href: "https://flashtopup.com/topup/pubg-mobile", availability: "awaiting_sync" },
  { name: "Free Fire Global", image: "/manus-storage/free-fire-global_6fd7b283.webp", href: "https://flashtopup.com/topup/free-fire-global", availability: "awaiting_sync" },
  { name: "Blood Strike", image: "/manus-storage/blood-strike_92f09d09.webp", href: "https://flashtopup.com/topup/blood-strike", availability: "awaiting_sync" },
  { name: "8 Ball Pool", image: "/manus-storage/8-ball-pool_0a4fb2eb.webp", href: "https://flashtopup.com/topup/8-ball-pool", availability: "awaiting_sync" },
];

export function findPublicSupplierDiscoveryMatches(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return PUBLIC_FLASHTOPUP_DISCOVERY.filter((item) => item.name.toLowerCase().includes(normalized));
}
