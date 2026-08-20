CREATE TABLE `marketplace_pricing_settings` (
	`id` int NOT NULL,
	`defaultMarkupPercent` decimal(7,2) NOT NULL DEFAULT '25.00',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_pricing_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `markupPercentOverride` decimal(7,2);--> statement-breakpoint
ALTER TABLE `products` ADD `displayPriceOverride` decimal(12,2);