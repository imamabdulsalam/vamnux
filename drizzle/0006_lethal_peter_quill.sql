CREATE TABLE `authorized_catalog_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`sourceType` enum('supplier','direct_agreement') NOT NULL,
	`agreementReference` varchar(120) NOT NULL,
	`status` enum('active','paused') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `authorized_catalog_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `authorized_catalog_sources_name_unique` UNIQUE(`displayName`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `catalogSourceId` int;--> statement-breakpoint
CREATE INDEX `authorized_catalog_sources_status_idx` ON `authorized_catalog_sources` (`status`);--> statement-breakpoint
CREATE INDEX `products_catalog_source_idx` ON `products` (`catalogSourceId`);