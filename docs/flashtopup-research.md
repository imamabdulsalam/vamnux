# FlashTopUp Supplier Research

## Access and Reseller API

The supplied FlashTopUp reseller API documentation URL redirects to the reseller sign-in page. This indicates that endpoint-level documentation and credentials are gated behind an authorised reseller account. VAMNUX must therefore use only server-side credentials from a FlashTopUp reseller account and should not implement endpoint-specific requests until the authenticated documentation or reseller API key is available. [1]

FlashTopUp’s public reseller help confirms a REST flow that authenticates using reseller credentials, fetches a product/price list, creates an order with buyer details, and polls order status. It also states that reseller orders are charged to the FlashTopUp reseller wallet and that the reseller may set a callback URL for status changes. A public reseller article describes HMAC signing. The authenticated documentation is still needed for the exact headers, canonical payload, signature algorithm, endpoint paths, and callback-verification details. [3] [4]

The confirmed reseller API base, `https://api.flashtopup.com/api/reseller/v2`, responds with an API endpoint-not-found payload when opened directly and does not expose an OpenAPI specification at `/openapi.json`. The base host is therefore confirmed, but the documented endpoint paths and signature contract must still come from the authenticated reseller portal. [5] [6]

## Public Catalog Signals

FlashTopUp’s public catalog labels all 191 visible items as **Top-Up** and includes region-specific variants. The visible catalog includes Mobile Legends variants, PUBG Mobile, Free Fire variants, Valorant variants, Call of Duty Mobile Garena, Bigo Live Diamonds, Honkai Star Rail, League of Legends, Wild Rift, and other game-related top-ups. This supports a VAMNUX **Gaming Top-Ups** category with a required player/account identifier and optional server/region selection only where the supplier product requires it. [2]

The unauthenticated catalog did not expose an inspectable product-detail form in this session, so exact player-ID, server, zone, and validation field names remain a reseller-API contract concern. VAMNUX must generate input forms from authenticated product metadata and must not hardcode fields or formats based solely on the public catalog.

## VAMNUX Category Mapping

| VAMNUX category | Product intent | Required customer information |
|---|---|---|
| Gift Cards | Redeemable digital codes such as Steam, Razer Gold, Google Play, PlayStation, Apple, Xbox, Amazon, Netflix, Spotify, and Discord Nitro | Region confirmation and, where applicable, recipient email or a standard code-delivery acknowledgement. |
| Subscriptions | Renewable or access-based digital services such as Netflix, Spotify Premium, YouTube Premium, and Discord Nitro | Region confirmation and provider-specific account or activation instructions; no player ID. |
| Gaming Top-Ups | Direct in-game currencies such as Mobile Legends diamonds, PUBG Mobile UC, Free Fire diamonds, Genshin Impact crystals, and Honor of Kings tokens | Player ID and any supplier-required server, zone, or region. |

The public FlashTopUp catalog review does not establish that every requested gift-card or subscription brand is offered through the reseller API. VAMNUX must classify products from the authenticated reseller catalog by the product metadata and required input fields received from FlashTopUp, rather than assume availability from general market categories.

## References

[1]: https://flashtopup.com/reseller/api-docs
[2]: https://flashtopup.com/catalog/all
[3]: https://flashtopup.com/help/reseller
[4]: https://flashtopup.com/blog/become-a-game-topup-reseller-8
[5]: https://api.flashtopup.com/api/reseller/v2
[6]: https://api.flashtopup.com/api/reseller/v2/openapi.json

## Integration Verification Note

On 19 August 2026, the VAMNUX server validated its FlashTopUp profile credentials after the supplier-reported egress IP was allowlisted. A bounded page-one synchronization imported one live FlashTopUp product and 20 active service records, all categorized as Gaming Top-Ups. The public VAMNUX catalog rendered those supplier-backed services successfully, while wallet funding, payment, and customer order submission remained inactive.

The authenticated FlashTopUp product list currently returns 191 products, all with the supplier product type `topup`. No Gift Card or Subscription product type was available to this reseller account during the integration validation. VAMNUX therefore keeps those categories as catalog filters but does not invent products for them; supplier access or inventory must be enabled before they can display live listings.
