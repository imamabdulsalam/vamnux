CREATE TABLE `supplier_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierKey` varchar(80) NOT NULL,
	`eventId` varchar(160) NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`payloadHash` varchar(64) NOT NULL,
	`processingStatus` enum('received','processed','failed') NOT NULL DEFAULT 'received',
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `supplier_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_webhook_events_supplier_event_unique` UNIQUE(`supplierKey`,`eventId`)
);
--> statement-breakpoint
CREATE INDEX `supplier_webhook_events_supplier_received_idx` ON `supplier_webhook_events` (`supplierKey`,`receivedAt`);