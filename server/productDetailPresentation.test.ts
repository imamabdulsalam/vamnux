import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
const gameDetail = readFileSync(new URL("../client/src/pages/GameFamilyDetail.tsx", import.meta.url), "utf8");
const digitalDetail = readFileSync(new URL("../client/src/pages/DigitalProductDetail.tsx", import.meta.url), "utf8");
const browser = readFileSync(new URL("../client/src/components/SelectedProductBrowser.tsx", import.meta.url), "utf8");

describe("customer product detail presentation", () => {
  it("uses one shared moderate-scale View Details hierarchy across game and digital product flows", () => {
    expect(gameDetail).toContain('className="family-detail-hero"');
    expect(digitalDetail).toContain('className="family-detail-hero"');
    expect(styles).toContain('.family-detail-summary h1 { font-size:clamp(34px,4.5vw,56px)');
    expect(styles).toContain('.family-services-heading h2 { font-size:clamp(30px,3.6vw,48px)');
    expect(styles).toContain('.family-denomination-grid { grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:11px; }');
  });

  it("keeps the catalog preview linked to the detail page and product cart actions", () => {
    expect(browser).toContain('onOpenProduct(product)');
    expect(browser).toContain('onAddToCart(product)');
    expect(styles).toContain('.selected-preview-actions button { min-height:42px; font-size:11px; }');
  });

  it("does not force customer product names and denominations into all caps", () => {
    expect(styles).toContain('/* Customer product text casing: retain supplier/product wording instead of forcing ALL CAPS. */');
    expect(styles).toContain('.family-detail-summary h1,');
    expect(styles).toContain('.family-denomination-card>span,');
    expect(styles).toContain('.compact-product-offer,');
    expect(styles).toContain('text-transform:none;');
  });
});
