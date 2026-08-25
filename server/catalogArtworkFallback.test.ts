import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dbSource = fs.readFileSync(path.join(root, "server/db.ts"), "utf8");
const catalogSource = fs.readFileSync(path.join(root, "client/src/pages/CatalogPage.tsx"), "utf8");

describe("customer catalog artwork fallbacks", () => {
  it("retains only exact stored supplier artwork on the server and never repeats a generic supplier logo", () => {
    expect(dbSource).not.toContain('gamesdrop: "https://gamesdrop.io/gamesdrop.svg"');
    expect(dbSource).not.toContain('foxreload: "https://foxreload.com/images/wholesale/logo/logo_foxreload.png"');
    expect(dbSource).toContain("customerCatalogArtworkUrl(imageUrl, supplierKey)");
    expect(dbSource).not.toContain("supplierKey, ...customerPriceForProduct");
  });

  it("uses a non-letter icon only when artwork is genuinely unavailable or fails", () => {
    expect(catalogSource).toContain('onError={() => setImageFailed(true)}');
    expect(catalogSource).toContain("<ImageIcon size={31}");
    expect(catalogSource).not.toContain("{product.name.slice(0, 1)}");
  });
});
