CREATE TABLE `customer_product_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestCode` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`category` enum('product','game_top_up','gift_card','subscription','software','ai_tool','other') NOT NULL DEFAULT 'product',
	`requestedName` varchar(180) NOT NULL,
	`details` text,
	`status` enum('submitted','under_review','planned','added','not_available') NOT NULL DEFAULT 'submitted',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_product_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_product_requests_code_unique` UNIQUE(`requestCode`)
);
--> statement-breakpoint
CREATE INDEX `customer_product_requests_user_updated_idx` ON `customer_product_requests` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `customer_product_requests_status_updated_idx` ON `customer_product_requests` (`status`,`updatedAt`);