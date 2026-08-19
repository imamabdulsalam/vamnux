CREATE TABLE `wallet_funding_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fundingCode` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`walletId` int NOT NULL,
	`integrationId` int NOT NULL,
	`providerReference` varchar(160),
	`providerEventId` varchar(160),
	`idempotencyKey` varchar(120) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`status` enum('initialized','pending','settled','failed','expired','cancelled') NOT NULL DEFAULT 'initialized',
	`checkoutUrl` text,
	`metadata` json,
	`settledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallet_funding_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_funding_attempts_code_unique` UNIQUE(`fundingCode`),
	CONSTRAINT `wallet_funding_attempts_idempotency_unique` UNIQUE(`idempotencyKey`),
	CONSTRAINT `wallet_funding_attempts_event_unique` UNIQUE(`providerEventId`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `walletEntryId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `supplierIntegrationId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `supplierOrderId` varchar(120);--> statement-breakpoint
ALTER TABLE `orders` ADD `supplierIdempotencyKey` varchar(120);--> statement-breakpoint
ALTER TABLE `orders` ADD `supplierCurrency` varchar(3);--> statement-breakpoint
ALTER TABLE `orders` ADD `supplierTotal` decimal(12,2);--> statement-breakpoint
ALTER TABLE `orders` ADD `supplierErrorCode` varchar(120);--> statement-breakpoint
ALTER TABLE `products` ADD `supplierPrice` decimal(12,2);--> statement-breakpoint
ALTER TABLE `products` ADD `supplierCurrency` varchar(3);--> statement-breakpoint
ALTER TABLE `products` ADD `supplierOfferId` varchar(120);--> statement-breakpoint
ALTER TABLE `products` ADD `supplierUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `products` ADD `supplierEligible` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `wallet_funding_attempts_user_created_idx` ON `wallet_funding_attempts` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `wallet_funding_attempts_reference_idx` ON `wallet_funding_attempts` (`providerReference`);--> statement-breakpoint
CREATE INDEX `orders_supplier_order_idx` ON `orders` (`supplierIntegrationId`,`supplierOrderId`);--> statement-breakpoint
CREATE INDEX `products_supplier_offer_idx` ON `products` (`supplierKey`,`supplierOfferId`);