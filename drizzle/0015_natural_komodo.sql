CREATE TABLE `exchange_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`baseCurrency` varchar(3) NOT NULL,
	`quoteCurrency` varchar(3) NOT NULL,
	`rate` decimal(16,6) NOT NULL,
	`bufferPercent` decimal(7,2) NOT NULL DEFAULT '0.00',
	`source` enum('manual','automatic') NOT NULL DEFAULT 'manual',
	`active` boolean NOT NULL DEFAULT true,
	`updatedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exchange_rates_id` PRIMARY KEY(`id`),
	CONSTRAINT `exchange_rates_pair_unique` UNIQUE(`baseCurrency`,`quoteCurrency`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`imageUrl` text,
	`seoTitle` varchar(180),
	`seoDescription` varchar(300),
	`sortOrder` int NOT NULL DEFAULT 0,
	`visible` boolean NOT NULL DEFAULT true,
	`featured` boolean NOT NULL DEFAULT false,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `price_change_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`adminUserId` int NOT NULL,
	`changeType` enum('global_markup','product_markup','product_fixed_price','product_status') NOT NULL,
	`oldValue` varchar(120),
	`newValue` varchar(120),
	`reason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_change_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_admin_attributes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`storefrontStatus` enum('visible','hidden','coming_soon') NOT NULL DEFAULT 'visible',
	`featured` boolean NOT NULL DEFAULT false,
	`trending` boolean NOT NULL DEFAULT false,
	`bestSeller` boolean NOT NULL DEFAULT false,
	`newProduct` boolean NOT NULL DEFAULT false,
	`deal` boolean NOT NULL DEFAULT false,
	`seoTitle` varchar(180),
	`seoDescription` varchar(300),
	`internalNote` text,
	`updatedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_admin_attributes_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_admin_attributes_product_unique` UNIQUE(`productId`)
);
--> statement-breakpoint
CREATE TABLE `site_content_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockKey` varchar(120) NOT NULL,
	`blockType` enum('hero_slide','banner','announcement','faq','featured_list','category_spotlight') NOT NULL,
	`title` varchar(255),
	`content` json,
	`imageUrl` text,
	`ctaLabel` varchar(100),
	`ctaUrl` varchar(500),
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`sortOrder` int NOT NULL DEFAULT 0,
	`updatedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_content_blocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_content_blocks_key_unique` UNIQUE(`blockKey`)
);
--> statement-breakpoint
CREATE TABLE `supplier_sync_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`integrationId` int,
	`supplierKey` varchar(80) NOT NULL,
	`initiatedByAdminId` int NOT NULL,
	`operation` enum('catalog','price','stock','region') NOT NULL DEFAULT 'catalog',
	`status` enum('started','completed','failed','paused') NOT NULL DEFAULT 'started',
	`productsAdded` int NOT NULL DEFAULT 0,
	`productsUpdated` int NOT NULL DEFAULT 0,
	`productsFailed` int NOT NULL DEFAULT 0,
	`summary` varchar(500),
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `supplier_sync_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `exchange_rates_active_idx` ON `exchange_rates` (`active`,`baseCurrency`,`quoteCurrency`);--> statement-breakpoint
CREATE INDEX `marketplace_categories_public_order_idx` ON `marketplace_categories` (`status`,`visible`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `price_change_history_product_created_idx` ON `price_change_history` (`productId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `price_change_history_admin_created_idx` ON `price_change_history` (`adminUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `product_admin_attributes_storefront_idx` ON `product_admin_attributes` (`storefrontStatus`,`featured`,`trending`);--> statement-breakpoint
CREATE INDEX `site_content_blocks_public_order_idx` ON `site_content_blocks` (`status`,`blockType`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `supplier_sync_runs_supplier_started_idx` ON `supplier_sync_runs` (`supplierKey`,`startedAt`);--> statement-breakpoint
CREATE INDEX `supplier_sync_runs_status_started_idx` ON `supplier_sync_runs` (`status`,`startedAt`);