import { getFlashTopUpClient } from "../server/integrations/flashtopup.ts";

const terms = (process.argv[2] ?? "free fire,pubg mobile")
  .split(",")
  .map((term) => term.trim().toLowerCase())
  .filter(Boolean);

const client = getFlashTopUpClient();
const response = await client.products({ page: 1, perPage: 500 });
const products = response.data ?? [];
const matches = products.filter((product) => {
  const haystack = `${product.name} ${product.product_code} ${product.product_type}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
});

console.log(JSON.stringify({
  scannedProductCount: products.length,
  terms,
  matches: matches.map((product) => ({
    productCode: product.product_code,
    productType: product.product_type,
    name: product.name,
    imageUrl: product.image_url,
    fieldNames: (product.fields ?? []).map((field) => field.name),
  })),
}, null, 2));
