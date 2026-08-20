# GamesDrop Partner API Research

> **Source:** [GamesDrop Partner API Guide](https://gamesdrop.io/en/docs/partner-api), reviewed 20 August 2026. This note records integration facts only; it does not authorise supplier orders, balance actions, or customer fulfilment.

## Authentication and scope

GamesDrop uses a confidential **Shop API Token** for catalog, product, balance, and order operations. The server must pass it in `Authorization: <token>` to `https://partner.gamesdrop.io`; the token must never be sent to a browser. Dashboard management uses a separate short-lived JWT and is not required for VAMNUX catalog sync.

## Catalog reads

The main catalog endpoint is `POST /api/v1/offers/sync`. It accepts pagination (`page`, `limit` up to 5,000) and optional `search`, `category`, and `countryCode` fields. It returns compatible offers for the partner account, including `offerGroupId`, `productName`, `offerGroupName`, price/currency, stock status, platform/region metadata, and game-user/server requirements. `offerGroupId` is the numeric identifier to retain for later `find-one`, server lookup, player validation, or order calls.

`POST /api/v1/offers/find-one` refreshes an offer and price. `POST /api/v1/partner/product-offer/servers` exposes required game-server options. `POST /api/v1/offers/check-game-data` validates required player identifiers. These read endpoints may be added only after a Shop API Token is supplied.

## Telegram Stars and Steam

Telegram Stars use the same catalog-sync and product-info endpoints. Verified records have `productName: Telegram Stars` with a denomination such as `100 Stars`; they require a numeric Telegram User ID in `customer.gameUserId` for eventual fulfilment. Steam catalog records are identified from GamesDrop-provided product/platform metadata, rather than guessed from names. Catalog availability and prices must be read from the authenticated account; no Steam or Telegram Stars offer may be added until returned by the API.

## Safety policy for VAMNUX

Catalog sync must be read-only and bounded. VAMNUX will not call `create-order`, `order-status`, `check-game-data`, partner balance, or settlement endpoints in this integration stage. Customer display prices remain VAMNUX-controlled and supplier base prices remain server-side. `find-one` is required to refresh the supplier purchase price before any future order implementation, which is deferred pending explicit approval and payment/wallet setup.
