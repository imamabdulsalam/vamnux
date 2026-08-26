CREATE TABLE `steam_top_up_checkout_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`supplierProductId` varchar(180) NOT NULL,
	`steamLogin` varchar(160) NOT NULL,
	`amountUsd` int NOT NULL,
	`sourceUnitPrice` decimal(12,4) NOT NULL,
	`sourceTotal` decimal(12,2) NOT NULL,
	`customerUnitPrice` decimal(12,4) NOT NULL,
	`customerTotal` decimal(12,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`walletEntryId` int,
	`supplierOrderId` varchar(120),
	`idempotencyKey` varchar(120) NOT NULL,
	`status` enum('prepared','wallet_paid','supplier_submission_disabled','queued','processing','completed','failed','cancelled','refunded') NOT NULL DEFAULT 'prepared',
	`supplierErrorCode` varchar(120),
	`sourceQuotedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `steam_top_up_checkout_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `steam_top_up_checkout_sessions_order_unique` UNIQUE(`orderId`),
	CONSTRAINT `steam_top_up_checkout_sessions_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `steam_top_up_checkout_sessions_user_created_idx` ON `steam_top_up_checkout_sessions` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `steam_top_up_checkout_sessions_status_created_idx` ON `steam_top_up_checkout_sessions` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `steam_top_up_checkout_sessions_supplier_order_idx` ON `steam_top_up_checkout_sessions` (`supplierOrderId`);