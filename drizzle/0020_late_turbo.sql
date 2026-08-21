CREATE TABLE `manual_delivery_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`orderItemId` int NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`status` enum('pending_payment','pending_review','in_progress','completed','failed','cancelled') NOT NULL DEFAULT 'pending_payment',
	`deliveryMinimumMinutes` int,
	`deliveryMaximumMinutes` int,
	`customerStatusNote` varchar(500),
	`internalNote` varchar(1000),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`failedAt` timestamp,
	`updatedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manual_delivery_tasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `manual_delivery_tasks_order_item_unique` UNIQUE(`orderItemId`)
);
--> statement-breakpoint
CREATE INDEX `manual_delivery_tasks_order_status_idx` ON `manual_delivery_tasks` (`orderId`,`status`);--> statement-breakpoint
CREATE INDEX `manual_delivery_tasks_customer_status_idx` ON `manual_delivery_tasks` (`userId`,`status`);