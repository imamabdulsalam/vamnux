CREATE TABLE `customer_product_activity_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`activityType` enum('favorite_added','cart_added') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_product_activity_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `customer_product_activity_events_customer_created_idx` ON `customer_product_activity_events` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `customer_product_activity_events_product_created_idx` ON `customer_product_activity_events` (`productId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `customer_product_activity_events_activity_created_idx` ON `customer_product_activity_events` (`activityType`,`createdAt`);