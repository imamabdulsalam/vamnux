CREATE TABLE `master_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`masterKey` varchar(180) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('top_up','gift_card','game_key','subscription','ai_tool','software','steam','steam_top_up','telegram_stars') NOT NULL,
	`subcategory` varchar(120),
	`productType` varchar(120),
	`regionLabel` varchar(120),
	`currency` varchar(3),
	`denomination` varchar(120),
	`imageUrl` text,
	`customerFacingStatus` enum('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `master_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `master_products_key_unique` UNIQUE(`masterKey`)
);
--> statement-breakpoint
CREATE TABLE `supplier_offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`masterProductId` int,
	`legacyProductId` int NOT NULL,
	`commerceIntegrationId` int,
	`supplierKey` varchar(80) NOT NULL,
	`supplierSku` varchar(180),
	`supplierOfferId` varchar(120),
	`supplierCategory` varchar(120),
	`supplierProductName` varchar(255) NOT NULL,
	`supplierCost` decimal(12,2),
	`supplierCurrency` varchar(3),
	`regionLabel` varchar(120),
	`supplierAvailability` boolean NOT NULL DEFAULT true,
	`sourceStatus` enum('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
	`deliveryType` enum('instant','digital_code','activation_link','manual_processing','account_access') NOT NULL,
	`inputRequirements` json,
	`metadata` json,
	`supplierUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_offers_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_offers_legacy_product_unique` UNIQUE(`legacyProductId`)
);
--> statement-breakpoint
CREATE INDEX `master_products_customer_facing_idx` ON `master_products` (`customerFacingStatus`,`category`);--> statement-breakpoint
CREATE INDEX `master_products_category_identity_idx` ON `master_products` (`category`,`productType`,`regionLabel`,`currency`);--> statement-breakpoint
CREATE INDEX `supplier_offers_supplier_sku_idx` ON `supplier_offers` (`supplierKey`,`supplierSku`);--> statement-breakpoint
CREATE INDEX `supplier_offers_supplier_offer_idx` ON `supplier_offers` (`supplierKey`,`supplierOfferId`);--> statement-breakpoint
CREATE INDEX `supplier_offers_master_product_idx` ON `supplier_offers` (`masterProductId`);--> statement-breakpoint
CREATE INDEX `supplier_offers_availability_idx` ON `supplier_offers` (`supplierAvailability`,`sourceStatus`);