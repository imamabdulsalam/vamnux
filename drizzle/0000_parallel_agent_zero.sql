CREATE TABLE `customer_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`preferredCurrency` varchar(3) NOT NULL DEFAULT 'USD',
	`countryCode` varchar(2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`supplierSku` varchar(180),
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(12,2) NOT NULL,
	`regionLabel` varchar(120),
	`deliveryType` varchar(40) NOT NULL,
	`fulfillmentDetails` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderCode` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`status` enum('draft','pending_payment','paid','processing','delivered','failed','refunded','cancelled') NOT NULL DEFAULT 'draft',
	`paymentStatus` enum('unpaid','pending','paid','failed','refunded') NOT NULL DEFAULT 'unpaid',
	`supplierStatus` enum('not_sent','queued','processing','fulfilled','failed') NOT NULL DEFAULT 'not_sent',
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`subtotal` decimal(12,2) NOT NULL,
	`total` decimal(12,2) NOT NULL,
	`fulfillmentDetails` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_code_unique` UNIQUE(`orderCode`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(180) NOT NULL,
	`supplierKey` varchar(80),
	`supplierSku` varchar(180),
	`name` varchar(255) NOT NULL,
	`category` enum('top_up','gift_card','game_key','subscription','ai_tool','software') NOT NULL,
	`description` text,
	`imageUrl` text,
	`basePrice` decimal(12,2) NOT NULL,
	`baseCurrency` varchar(3) NOT NULL DEFAULT 'USD',
	`regionLabel` varchar(120),
	`deliveryType` enum('instant','digital_code','activation_link','manual_processing','account_access') NOT NULL,
	`requiresPlayerId` boolean NOT NULL DEFAULT false,
	`status` enum('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `wallet_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`walletId` int NOT NULL,
	`direction` enum('credit','debit') NOT NULL,
	`entryType` enum('funding','purchase','refund','adjustment','reward') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`reference` varchar(120) NOT NULL,
	`status` enum('pending','completed','reversed','failed') NOT NULL DEFAULT 'pending',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`availableBalance` decimal(12,2) NOT NULL DEFAULT '0.00',
	`status` enum('active','locked','closed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallets_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallets_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`orderId`);--> statement-breakpoint
CREATE INDEX `orders_customer_created_idx` ON `orders` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `products_catalog_status_idx` ON `products` (`status`,`category`);--> statement-breakpoint
CREATE INDEX `products_supplier_sku_idx` ON `products` (`supplierKey`,`supplierSku`);--> statement-breakpoint
CREATE INDEX `wallet_entries_wallet_created_idx` ON `wallet_entries` (`walletId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `wallet_entries_reference_idx` ON `wallet_entries` (`reference`);