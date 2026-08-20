# FoxReload API Research

## Official source and authentication

The official [FoxReload Public API documentation](https://public-api.foxreload.com/docs) describes a REST API served from `https://public-api.foxreload.com`. Requests require an API key in the `X-API-Key` header. The key is created in the FoxReload account settings and shown only at creation. FoxReload also states that a configured key IP allowlist applies to public API calls.

## Catalog read path

The official [OpenAPI document](https://public-api.foxreload.com/openapi.json) exposes catalog category and product operations. Product listing is `GET /api/products/` with required `category_id_or_slug`, pagination through `limit` (1–200; default 50) and `offset`, and an optional `withStockOnly` flag. The catalog path accepts `X-Language` (`en` or `ru`) and `X-Currency` (`usd` or `rub`) headers. VAMNUX should request `en` and `usd` for its supplier normalisation path.

`GET /api/categories/` supports cursor pagination, `withStockOnly`, `tag`, and `parent_id_or_slug`. Its public category model supplies `id`, `name`, `slug`, `description`, `bestOfferPrice`, `attributes`, `attributeDefinitions`, `tags`, `parentId`, `hasProducts`, and `inStockCount`. Product search is also available at `GET /api/products/search` with `query`, optional `category_id_or_slug`, `withStockOnly`, and `limit`.

The public product model requires `id`, `name`, `slug`, `categoryId`, `description`, `attributes`, and `price`. It also provides `currency`, `quantity`, `orderMinQuantity`, `orderMaxQuantity`, `requiredNoteFields`, `noteFieldOptions`, and `noteFieldTypes`. These fields can preserve real supplier price and required customer inputs in VAMNUX; they must not be replaced with invented product metadata.

## Safety policy

FoxReload order and payment endpoints are outside the current scope. VAMNUX will use only authenticated category and product reads until the user later approves wallet funding, payment, and supplier-order work. Any import must be bounded, preserve original supplier metadata, and map categories only when the live supplier fields support the classification.

## Next evidence needed

Before implementation, inspect the official category and product response schemas to identify product type, region, image, delivery, price, and input-requirement fields. Request an API key only after the adapter’s credential name and health-check path are finalised.
