CREATE TABLE `currency_configurations` (
	`currencyCode` varchar(3) NOT NULL,
	`displayName` varchar(80) NOT NULL,
	`symbol` varchar(12) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`rateUpdateFrequency` enum('manual','hourly','daily','weekly') NOT NULL DEFAULT 'manual',
	`preferredRateSource` enum('manual','approved_external') NOT NULL DEFAULT 'manual',
	`approvedSourceLabel` varchar(160),
	`updatedByAdminId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `currency_configurations_currencyCode` PRIMARY KEY(`currencyCode`)
);
--> statement-breakpoint
CREATE TABLE `currency_rate_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`baseCurrency` varchar(3) NOT NULL,
	`quoteCurrency` varchar(3) NOT NULL,
	`rate` decimal(16,6) NOT NULL,
	`bufferPercent` decimal(7,2) NOT NULL DEFAULT '0.00',
	`source` enum('manual','approved_external') NOT NULL DEFAULT 'manual',
	`sourceLabel` varchar(160),
	`rateUpdateFrequency` enum('manual','hourly','daily','weekly') NOT NULL DEFAULT 'manual',
	`effectiveAt` timestamp NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`supersedesRateVersionId` int,
	`createdByAdminId` int NOT NULL,
	`reason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `currency_rate_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricing_rate_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pricingRuleId` int,
	`productId` int,
	`orderId` int,
	`rateVersionId` int,
	`context` enum('price_application','order') NOT NULL,
	`supplierCost` decimal(12,2) NOT NULL,
	`supplierCurrency` varchar(3) NOT NULL,
	`outputCurrency` varchar(3) NOT NULL,
	`exchangeRate` decimal(16,6) NOT NULL,
	`convertedCost` decimal(12,2) NOT NULL,
	`rateSource` varchar(32) NOT NULL,
	`sourceLabel` varchar(160),
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pricing_rate_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `currency_rate_versions_pair_effective_idx` ON `currency_rate_versions` (`baseCurrency`,`quoteCurrency`,`active`,`effectiveAt`);--> statement-breakpoint
CREATE INDEX `currency_rate_versions_admin_created_idx` ON `currency_rate_versions` (`createdByAdminId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pricing_rate_snapshots_product_recorded_idx` ON `pricing_rate_snapshots` (`productId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `pricing_rate_snapshots_order_recorded_idx` ON `pricing_rate_snapshots` (`orderId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `pricing_rate_snapshots_version_recorded_idx` ON `pricing_rate_snapshots` (`rateVersionId`,`recordedAt`);