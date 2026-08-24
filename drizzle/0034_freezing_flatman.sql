CREATE TABLE `financial_order_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`financialSnapshotId` int NOT NULL,
	`eventType` enum('snapshot_created','payment_fee_recorded','other_fee_recorded','refund_recorded','status_recorded') NOT NULL,
	`amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(3) NOT NULL,
	`orderStatus` enum('PENDING PAYMENT','PAID','PROCESSING','SUPPLIER SUBMITTED','SUPPLIER PROCESSING','COMPLETED','FAILED','CANCELLED','REFUND PENDING','REFUNDED') NOT NULL,
	`simulationMode` boolean NOT NULL DEFAULT true,
	`note` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_order_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_order_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceType` enum('simulation','order') NOT NULL DEFAULT 'simulation',
	`simulationOrderId` int,
	`orderId` int,
	`masterProductId` int,
	`productId` int,
	`category` enum('top_up','gift_card','game_key','subscription','ai_tool','software','steam','steam_top_up','telegram_stars'),
	`supplierKey` varchar(80),
	`supplierOfferId` int,
	`customerSellingPrice` decimal(12,2) NOT NULL,
	`customerCurrency` varchar(3) NOT NULL,
	`supplierCost` decimal(12,2),
	`supplierCurrency` varchar(3),
	`exchangeRate` decimal(16,6),
	`supplierCostInCustomerCurrency` decimal(12,2),
	`markupPercent` decimal(7,2),
	`paymentProcessingFee` decimal(12,2) NOT NULL DEFAULT '0.00',
	`otherApplicableFees` decimal(12,2) NOT NULL DEFAULT '0.00',
	`paymentFeeConfigured` boolean NOT NULL DEFAULT false,
	`grossRevenue` decimal(12,2) NOT NULL,
	`grossProfit` decimal(12,2) NOT NULL,
	`netRevenue` decimal(12,2) NOT NULL,
	`netProfit` decimal(12,2) NOT NULL,
	`profitMarginPercent` decimal(7,2) NOT NULL,
	`orderStatus` enum('PENDING PAYMENT','PAID','PROCESSING','SUPPLIER SUBMITTED','SUPPLIER PROCESSING','COMPLETED','FAILED','CANCELLED','REFUND PENDING','REFUNDED') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_order_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_order_snapshots_simulation_order_unique` UNIQUE(`simulationOrderId`),
	CONSTRAINT `financial_order_snapshots_order_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE INDEX `financial_order_events_snapshot_created_idx` ON `financial_order_events` (`financialSnapshotId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `financial_order_events_type_created_idx` ON `financial_order_events` (`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `financial_order_snapshots_created_idx` ON `financial_order_snapshots` (`createdAt`);--> statement-breakpoint
CREATE INDEX `financial_order_snapshots_category_created_idx` ON `financial_order_snapshots` (`category`,`createdAt`);--> statement-breakpoint
CREATE INDEX `financial_order_snapshots_supplier_created_idx` ON `financial_order_snapshots` (`supplierKey`,`createdAt`);--> statement-breakpoint
CREATE INDEX `financial_order_snapshots_status_created_idx` ON `financial_order_snapshots` (`orderStatus`,`createdAt`);