CREATE TABLE `marketplace_subcategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(120) NOT NULL,
	`parentCategory` enum('top_up','gift_card','game_key','subscription','ai_tool','software','steam','steam_top_up','telegram_stars') NOT NULL,
	`description` text,
	`evidenceType` enum('supplier_platform','owner_reference','safety_unclassified') NOT NULL,
	`assignmentPolicy` enum('automatic_evidence_only','admin_review_only') NOT NULL,
	`sourceSupplierKey` varchar(80),
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`visible` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_subcategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_subcategories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `product_subcategory_classifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`parentCategory` enum('top_up','gift_card','game_key','subscription','ai_tool','software','steam','steam_top_up','telegram_stars') NOT NULL,
	`marketplaceSubcategoryId` int NOT NULL,
	`classificationStatus` enum('SAFE','ADMIN_REVIEW','UNCLASSIFIED') NOT NULL,
	`evidenceType` enum('supplier_platform','owner_reference','missing_supplier_data') NOT NULL,
	`evidence` json,
	`classificationSource` varchar(120) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_subcategory_classifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_subcategory_classifications_product_unique` UNIQUE(`productId`)
);
--> statement-breakpoint
CREATE INDEX `marketplace_subcategories_parent_status_idx` ON `marketplace_subcategories` (`parentCategory`,`status`,`visible`);--> statement-breakpoint
CREATE INDEX `product_subcategory_classifications_subcategory_status_idx` ON `product_subcategory_classifications` (`marketplaceSubcategoryId`,`classificationStatus`);--> statement-breakpoint
CREATE INDEX `product_subcategory_classifications_parent_status_idx` ON `product_subcategory_classifications` (`parentCategory`,`classificationStatus`);