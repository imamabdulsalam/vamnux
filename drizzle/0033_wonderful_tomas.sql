CREATE TABLE `supplier_fulfillment_simulation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationOrderId` int NOT NULL,
	`previousOrderStatus` enum('PENDING PAYMENT','PAID','PROCESSING','SUPPLIER SUBMITTED','SUPPLIER PROCESSING','COMPLETED','FAILED','CANCELLED','REFUND PENDING','REFUNDED'),
	`nextOrderStatus` enum('PENDING PAYMENT','PAID','PROCESSING','SUPPLIER SUBMITTED','SUPPLIER PROCESSING','COMPLETED','FAILED','CANCELLED','REFUND PENDING','REFUNDED') NOT NULL,
	`eventType` enum('created','payment_simulated','processing_started','supplier_submission_simulated','supplier_processing_simulated','completed_simulated','failed_simulated','retry_simulated','cancelled_simulated','refund_pending_simulated','refunded_simulated') NOT NULL,
	`paymentStatus` enum('NOT CHARGED','SIMULATION ONLY','PAID','FAILED','REFUNDED') NOT NULL,
	`supplierStatus` enum('NOT SUBMITTED','SIMULATED SUBMITTED','SIMULATED PROCESSING','COMPLETED','FAILED') NOT NULL,
	`supplierReference` varchar(160),
	`reason` varchar(1000),
	`safeReference` varchar(500),
	`performedByAdminId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_fulfillment_simulation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_fulfillment_simulation_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationOrderCode` varchar(40) NOT NULL,
	`idempotencyKey` varchar(160) NOT NULL,
	`sourceOrderId` int,
	`customerUserId` int,
	`masterProductId` int NOT NULL,
	`selectedSupplierOfferId` int,
	`selectedSupplierKey` varchar(80),
	`selectedSupplierProductId` varchar(180),
	`customerSellingPrice` decimal(12,2) NOT NULL,
	`customerCurrency` varchar(3) NOT NULL,
	`supplierCost` decimal(12,2),
	`supplierCurrency` varchar(3),
	`exchangeRate` decimal(16,6),
	`markupPercent` decimal(7,2),
	`expectedProfit` decimal(12,2),
	`paymentStatus` enum('NOT CHARGED','SIMULATION ONLY','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'NOT CHARGED',
	`supplierStatus` enum('NOT SUBMITTED','SIMULATED SUBMITTED','SIMULATED PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'NOT SUBMITTED',
	`orderStatus` enum('PENDING PAYMENT','PAID','PROCESSING','SUPPLIER SUBMITTED','SUPPLIER PROCESSING','COMPLETED','FAILED','CANCELLED','REFUND PENDING','REFUNDED') NOT NULL DEFAULT 'PENDING PAYMENT',
	`supplierReference` varchar(160),
	`customerDeliveryInput` json,
	`safeSupplierResponseReference` varchar(500),
	`simulationMode` boolean NOT NULL DEFAULT true,
	`liveFulfillmentEnabled` boolean NOT NULL DEFAULT false,
	`createdByAdminId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_fulfillment_simulation_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_fulfillment_simulation_orders_code_unique` UNIQUE(`simulationOrderCode`),
	CONSTRAINT `supplier_fulfillment_simulation_orders_idempotency_unique` UNIQUE(`idempotencyKey`),
	CONSTRAINT `supplier_fulfillment_simulation_orders_source_order_unique` UNIQUE(`sourceOrderId`)
);
--> statement-breakpoint
CREATE INDEX `supplier_fulfillment_simulation_events_order_created_idx` ON `supplier_fulfillment_simulation_events` (`simulationOrderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_fulfillment_simulation_events_status_created_idx` ON `supplier_fulfillment_simulation_events` (`nextOrderStatus`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_fulfillment_simulation_orders_lifecycle_idx` ON `supplier_fulfillment_simulation_orders` (`orderStatus`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_fulfillment_simulation_orders_master_created_idx` ON `supplier_fulfillment_simulation_orders` (`masterProductId`,`createdAt`);