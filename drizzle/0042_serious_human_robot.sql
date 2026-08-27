CREATE TABLE `order_control_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`eventKey` varchar(180),
	`eventType` enum('order_created','payment_confirmed','processing_started','supplier_queued','supplier_attempted','supplier_response','supplier_failed','retry_queued','retry_started','fallback_eligible','fallback_selected','completed','failed','cancelled','manual_review','resolution_recorded','refund_requested','refund_recorded') NOT NULL,
	`previousOrderStatus` enum('PENDING PAYMENT','PAYMENT CONFIRMED','PROCESSING','SENT TO SUPPLIER','SUPPLIER PROCESSING','COMPLETED','FAILED','CANCELLED','REFUND PENDING','REFUNDED','MANUAL REVIEW'),
	`nextOrderStatus` enum('PENDING PAYMENT','PAYMENT CONFIRMED','PROCESSING','SENT TO SUPPLIER','SUPPLIER PROCESSING','COMPLETED','FAILED','CANCELLED','REFUND PENDING','REFUNDED','MANUAL REVIEW') NOT NULL,
	`paymentStatus` varchar(32) NOT NULL,
	`supplierStatus` varchar(32) NOT NULL,
	`note` varchar(1000),
	`safeReference` varchar(500),
	`performedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_control_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_control_events_event_key_unique` UNIQUE(`eventKey`)
);
--> statement-breakpoint
CREATE TABLE `order_refund_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`operationKey` varchar(180) NOT NULL,
	`action` enum('initiated','recorded','rejected') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`paymentReference` varchar(180),
	`reason` varchar(1000) NOT NULL,
	`recordedByAdminId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_refund_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_refund_records_operation_unique` UNIQUE(`operationKey`)
);
--> statement-breakpoint
CREATE TABLE `order_retry_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierKey` varchar(80),
	`maxAttempts` int NOT NULL DEFAULT 3,
	`retryDelayMinutes` int NOT NULL DEFAULT 15,
	`enabled` boolean NOT NULL DEFAULT true,
	`updatedByAdminId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_retry_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_retry_policies_supplier_unique` UNIQUE(`supplierKey`)
);
--> statement-breakpoint
CREATE TABLE `supplier_order_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`attemptNumber` int NOT NULL,
	`supplierIntegrationId` int,
	`supplierKey` varchar(80),
	`supplierOrderId` varchar(160),
	`supplierProductSku` varchar(180),
	`requestId` varchar(180),
	`requestReference` varchar(500),
	`responseReference` varchar(500),
	`status` enum('queued','sent','processing','completed','temporary_failed','permanent_failed','cancelled','not_dispatched') NOT NULL DEFAULT 'queued',
	`errorCode` varchar(120),
	`errorMessage` varchar(1000),
	`retryCount` int NOT NULL DEFAULT 0,
	`processingMilliseconds` int,
	`fallbackFromAttemptId` int,
	`retryAfter` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_order_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_order_attempts_order_number_unique` UNIQUE(`orderId`,`attemptNumber`),
	CONSTRAINT `supplier_order_attempts_request_id_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE INDEX `order_control_events_order_created_idx` ON `order_control_events` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `order_control_events_status_created_idx` ON `order_control_events` (`nextOrderStatus`,`createdAt`);--> statement-breakpoint
CREATE INDEX `order_refund_records_order_created_idx` ON `order_refund_records` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_order_attempts_order_created_idx` ON `supplier_order_attempts` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_order_attempts_retry_queue_idx` ON `supplier_order_attempts` (`status`,`retryAfter`);--> statement-breakpoint
CREATE INDEX `supplier_order_attempts_supplier_created_idx` ON `supplier_order_attempts` (`supplierKey`,`createdAt`);