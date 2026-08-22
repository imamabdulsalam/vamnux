import { syncGamesDropCatalog } from "../server/gamesdropCatalog.ts";

const result = await syncGamesDropCatalog({ fullCatalog: true, limit: 250, maxPages: 20, countryCode: "NG" });
console.log(JSON.stringify({ ...result, mode: "read_only_catalog_sync", ordersCreated: 0, paymentsCreated: 0, walletCreditsCreated: 0 }, null, 2));
