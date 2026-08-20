CREATE TABLE `saved_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_products_customer_product_unique` UNIQUE(`userId`,`productId`)
);
--> statement-breakpoint
CREATE INDEX `saved_products_customer_created_idx` ON `saved_products` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `saved_products_product_idx` ON `saved_products` (`productId`);