import { trpc } from "@/lib/trpc";
import { BadgePercent, Copy, Gift, PauseCircle, PlayCircle, Plus, Search, Tag } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import "./adminOffersWorkspace.css";

type CouponDraft = { name: string; code: string; discountAmount: string; usageLimit: string };
type DiscountDraft = { name: string; discountAmount: string; scope: "all" | "product"; productId: number | null; productSearch: string };

const emptyCoupon: CouponDraft = { name: "", code: "", discountAmount: "", usageLimit: "" };
const emptyDiscount: DiscountDraft = { name: "", discountAmount: "", scope: "all", productId: null, productSearch: "" };

function generatedCouponCode() {
  const bytes = crypto.getRandomValues(new Uint32Array(2));
  return `VAMNUX-${bytes[0].toString(36).toUpperCase().slice(0, 5)}-${bytes[1].toString(36).toUpperCase().slice(0, 5)}`;
}

function displayStatus(status: string) { return status.replaceAll("_", " "); }

export function AdminOffersWorkspace() {
  const utils = trpc.useUtils();
  const offers = trpc.admin.listPromotions.useQuery();
  const [coupon, setCoupon] = useState<CouponDraft>(emptyCoupon);
  const [discount, setDiscount] = useState<DiscountDraft>(emptyDiscount);
  const productMatches = trpc.admin.listAdminProductOperations.useQuery(
    { limit: 20, offset: 0, search: discount.productSearch.trim() || undefined },
    { enabled: discount.scope === "product" && discount.productSearch.trim().length >= 2 },
  );
  const refresh = async () => { await Promise.all([utils.admin.listPromotions.invalidate(), utils.marketplace.catalog.invalidate()]); };
  const createOffer = trpc.admin.createPromotion.useMutation({
    onSuccess: async (saved) => { toast.success(`${saved.code ? `Coupon ${saved.code}` : "Product discount"} is ready.`); setCoupon(emptyCoupon); setDiscount(emptyDiscount); await refresh(); },
    onError: (error) => toast.error(error.message || "Could not save the offer."),
  });
  const updateStatus = trpc.admin.updatePromotionStatus.useMutation({
    onSuccess: async () => { toast.success("Offer status updated."); await refresh(); },
    onError: (error) => toast.error(error.message || "Could not update the offer."),
  });

  const submitCoupon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const discountAmount = Number(coupon.discountAmount); const usageLimit = Number(coupon.usageLimit);
    if (!coupon.name.trim() || !coupon.code.trim() || !Number.isFinite(discountAmount) || discountAmount <= 0 || discountAmount > 100 || !Number.isInteger(usageLimit) || usageLimit < 1) {
      toast.error("Enter a name, code, percentage from 1–100, and a whole-number usage limit."); return;
    }
    if (!window.confirm(`Create active coupon ${coupon.code.trim().toUpperCase()} for ${discountAmount}% with a maximum of ${usageLimit} uses?`)) return;
    createOffer.mutate({ name: coupon.name, code: coupon.code, offerKind: "coupon", discountType: "percentage", discountAmount, usageLimit, status: "active" });
  };
  const submitDiscount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const discountAmount = Number(discount.discountAmount);
    if (!discount.name.trim() || !Number.isFinite(discountAmount) || discountAmount <= 0 || discountAmount > 100 || (discount.scope === "product" && !discount.productId)) {
      toast.error(discount.scope === "product" ? "Select a product and enter a percentage from 1–100." : "Enter a name and a percentage from 1–100."); return;
    }
    const scopeText = discount.scope === "all" ? "all active VAMNUX products" : "the selected product";
    if (!window.confirm(`Activate a ${discountAmount}% discount for ${scopeText}? Current product and supplier prices will not be changed.`)) return;
    createOffer.mutate({ name: discount.name, code: null, offerKind: "catalog_discount", discountType: "percentage", discountAmount, productId: discount.scope === "product" ? discount.productId : null, status: "active" });
  };

  const coupons = (offers.data ?? []).filter((offer) => offer.offerKind === "coupon");
  const discounts = (offers.data ?? []).filter((offer) => offer.offerKind === "catalog_discount");
  return <section className="admin-offers-workspace">
    <header className="admin-offers-heading"><div><span>OFFERS</span><h2>Coupons and product discounts</h2><p>Create coupon codes with fixed usage limits, or apply a percentage discount to one product or the active catalog. Customer prices are calculated on the server; stored product and supplier prices do not change.</p></div><BadgePercent size={24} /></header>
    <div className="admin-offers-create-grid">
      <form className="admin-offers-card" onSubmit={submitCoupon}>
        <div className="admin-offers-card-head"><div><span>COUPON CODES</span><h3>Create a new coupon</h3></div><Gift size={20} /></div>
        <label>Coupon name<input required value={coupon.name} onChange={(event) => setCoupon((current) => ({ ...current, name: event.target.value }))} placeholder="Example: Welcome offer" /></label>
        <label>Coupon code<div className="admin-offers-code-row"><input required value={coupon.code} onChange={(event) => setCoupon((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="VAMNUX-SAVE10" /><button type="button" onClick={() => setCoupon((current) => ({ ...current, code: generatedCouponCode() }))}>Generate</button></div></label>
        <div className="admin-offers-split"><label>Discount percentage<input required inputMode="decimal" value={coupon.discountAmount} onChange={(event) => setCoupon((current) => ({ ...current, discountAmount: event.target.value }))} placeholder="10" /></label><label>Total uses<input required inputMode="numeric" value={coupon.usageLimit} onChange={(event) => setCoupon((current) => ({ ...current, usageLimit: event.target.value }))} placeholder="10" /></label></div>
        <p className="admin-offers-note">The total-use setting is shared across customers. A coupon becomes unavailable immediately after its final permitted use.</p>
        <button type="submit" className="admin-primary-action" disabled={createOffer.isPending}><Plus size={15} />{createOffer.isPending ? "Creating…" : "Create coupon"}</button>
      </form>
      <form className="admin-offers-card" onSubmit={submitDiscount}>
        <div className="admin-offers-card-head"><div><span>DISCOUNT SETTINGS</span><h3>Set a product discount</h3></div><Tag size={20} /></div>
        <label>Discount name<input required value={discount.name} onChange={(event) => setDiscount((current) => ({ ...current, name: event.target.value }))} placeholder="Example: Weekend product offer" /></label>
        <div className="admin-offers-split"><label>Discount percentage<input required inputMode="decimal" value={discount.discountAmount} onChange={(event) => setDiscount((current) => ({ ...current, discountAmount: event.target.value }))} placeholder="15" /></label><label>Apply to<select value={discount.scope} onChange={(event) => setDiscount((current) => ({ ...current, scope: event.target.value as DiscountDraft["scope"], productId: null, productSearch: "" }))}><option value="all">All products</option><option value="product">One product</option></select></label></div>
        {discount.scope === "product" && <div className="admin-offers-product-select"><label><span><Search size={14} />Find product</span><input value={discount.productSearch} onChange={(event) => setDiscount((current) => ({ ...current, productSearch: event.target.value, productId: null }))} placeholder="Type at least 2 product-name characters" /></label>{discount.productId ? <p className="admin-offers-selected">Product #{discount.productId} selected <button type="button" onClick={() => setDiscount((current) => ({ ...current, productId: null }))}>Change</button></p> : productMatches.data?.length ? <div className="admin-offers-product-matches">{productMatches.data.map((product) => <button type="button" key={product.id} onClick={() => setDiscount((current) => ({ ...current, productId: product.id, productSearch: product.name }))}><strong>{product.name}</strong><small>{product.category.replaceAll("_", " ")} · #{product.id}</small></button>)}</div> : discount.productSearch.trim().length >= 2 && !productMatches.isFetching ? <p className="admin-offers-note">No matching product found.</p> : null}</div>}
        <p className="admin-offers-note">If more than one active product discount applies, VAMNUX uses the highest percentage. This never rewrites the product’s stored price.</p>
        <button type="submit" className="admin-primary-action" disabled={createOffer.isPending}><BadgePercent size={15} />{createOffer.isPending ? "Saving…" : "Activate discount"}</button>
      </form>
    </div>
    <div className="admin-offers-lists">
      <article className="admin-offers-list"><div className="admin-offers-list-title"><div><span>ACTIVE AND SAVED</span><h3>Coupon codes</h3></div><span>{coupons.length}</span></div><div className="admin-table-wrap"><table><thead><tr><th>Coupon</th><th>Discount</th><th>Usage</th><th>Status</th><th>Control</th></tr></thead><tbody>{coupons.length ? coupons.map((offer) => <tr key={offer.id}><td><strong>{offer.code}</strong><small>{offer.name}</small></td><td>{offer.discountType === "percentage" ? `${offer.discountAmount}%` : `${offer.discountAmount} fixed`}</td><td>{offer.usageCount}{offer.usageLimit === null ? " / unlimited" : ` / ${offer.usageLimit}`}</td><td><span className={`admin-offers-status ${offer.status}`}>{displayStatus(offer.status)}</span></td><td><button type="button" className="admin-offers-row-action" disabled={updateStatus.isPending || offer.status === "archived"} onClick={() => updateStatus.mutate({ promotionId: offer.id, status: offer.status === "active" ? "paused" : "active" })}>{offer.status === "active" ? <><PauseCircle size={14} />Pause</> : <><PlayCircle size={14} />Activate</>}</button></td></tr>) : <tr><td colSpan={5}>No coupon codes created yet.</td></tr>}</tbody></table></div></article>
      <article className="admin-offers-list"><div className="admin-offers-list-title"><div><span>LIVE PRICE RULES</span><h3>Product discounts</h3></div><span>{discounts.length}</span></div><div className="admin-table-wrap"><table><thead><tr><th>Discount</th><th>Applies to</th><th>Percentage</th><th>Status</th><th>Control</th></tr></thead><tbody>{discounts.length ? discounts.map((offer) => <tr key={offer.id}><td><strong>{offer.name}</strong><small>{offer.code || "No coupon code"}</small></td><td>{offer.productId ? offer.productName || `Product #${offer.productId}` : "All active products"}</td><td>{offer.discountAmount}%</td><td><span className={`admin-offers-status ${offer.status}`}>{displayStatus(offer.status)}</span></td><td><button type="button" className="admin-offers-row-action" disabled={updateStatus.isPending || offer.status === "archived"} onClick={() => updateStatus.mutate({ promotionId: offer.id, status: offer.status === "active" ? "paused" : "active" })}>{offer.status === "active" ? <><PauseCircle size={14} />Pause</> : <><PlayCircle size={14} />Activate</>}</button></td></tr>) : <tr><td colSpan={5}>No product discount settings created yet.</td></tr>}</tbody></table></div></article>
    </div>
  </section>;
}
