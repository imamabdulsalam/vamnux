import { syncFlashTopUpCatalog } from "../server/flashtopupCatalog.ts";

const page = Number.parseInt(process.argv[2] ?? "1", 10);
const perPage = Number.parseInt(process.argv[3] ?? "1", 10);

if (!Number.isInteger(page) || page < 1 || !Number.isInteger(perPage) || perPage < 1 || perPage > 10) {
  throw new Error("Usage: pnpm tsx scripts/sync-flashtopup-page.mjs <page>=1 <perPage=1..10>");
}

const result = await syncFlashTopUpCatalog({ page, perPage });
console.log(JSON.stringify({
  status: "ok",
  page: result.page,
  nextPage: result.nextPage,
  productCount: result.productCount,
  serviceCount: result.serviceCount,
  currencies: result.currencies,
  failures: result.failures,
}));
