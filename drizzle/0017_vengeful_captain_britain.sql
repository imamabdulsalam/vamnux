CREATE TABLE `api_request_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierKey` varchar(80) NOT NULL,
	`endpoint` varchar(255) NOT NULL,
	`requestId` varchar(160),
	`httpStatus` int,
	`responseMs` int,
	`success` boolean NOT NULL,
	`errorCode` varchar(120),
	`orderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_request_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_settings` (
	`id` int NOT NULL,
	`pointsPerCurrencyUnit` decimal(12,4) NOT NULL DEFAULT '0.0000',
	`redemptionValuePerPoint` decimal(12,4) NOT NULL DEFAULT '0.0000',
	`expiryDays` int,
	`status` enum('disabled','configured') NOT NULL DEFAULT 'disabled',
	`updatedByAdminId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyalty_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateKey` varchar(120) NOT NULL,
	`channel` enum('in_app','email','sms','whatsapp') NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`subject` varchar(180),
	`body` text NOT NULL,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`updatedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_templates_key_unique` UNIQUE(`templateKey`)
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`code` varchar(64),
	`discountType` enum('percentage','fixed_amount') NOT NULL,
	`discountAmount` decimal(12,2) NOT NULL,
	`minimumOrder` decimal(12,2),
	`maximumDiscount` decimal(12,2),
	`productId` int,
	`categorySlug` varchar(80),
	`startsAt` timestamp,
	`endsAt` timestamp,
	`usageLimit` int,
	`perUserLimit` int,
	`status` enum('draft','scheduled','active','paused','archived') NOT NULL DEFAULT 'draft',
	`createdByAdminId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`),
	CONSTRAINT `promotions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `referral_settings` (
	`id` int NOT NULL,
	`percentageReward` decimal(7,2) NOT NULL DEFAULT '0.00',
	`fixedReward` decimal(12,2) NOT NULL DEFAULT '0.00',
	`minimumQualifyingOrder` decimal(12,2) NOT NULL DEFAULT '0.00',
	`maximumReward` decimal(12,2),
	`releaseDays` int NOT NULL DEFAULT 0,
	`status` enum('disabled','configured') NOT NULL DEFAULT 'disabled',
	`updatedByAdminId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resellers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tier` enum('retail','reseller','vip_reseller','enterprise') NOT NULL DEFAULT 'retail',
	`discountPercent` decimal(7,2) NOT NULL DEFAULT '0.00',
	`status` enum('pending','approved','suspended','rejected') NOT NULL DEFAULT 'pending',
	`approvedAt` timestamp,
	`updatedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resellers_id` PRIMARY KEY(`id`),
	CONSTRAINT `resellers_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(120) NOT NULL,
	`category` enum('general','currency','payments','email','notifications','orders','security') NOT NULL,
	`value` json NOT NULL,
	`updatedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_key_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE INDEX `api_request_logs_supplier_created_idx` ON `api_request_logs` (`supplierKey`,`createdAt`);--> statement-breakpoint
CREATE INDEX `api_request_logs_request_id_idx` ON `api_request_logs` (`requestId`);--> statement-breakpoint
CREATE INDEX `api_request_logs_success_created_idx` ON `api_request_logs` (`success`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notification_templates_status_channel_idx` ON `notification_templates` (`status`,`channel`);--> statement-breakpoint
CREATE INDEX `promotions_status_period_idx` ON `promotions` (`status`,`startsAt`,`endsAt`);--> statement-breakpoint
CREATE INDEX `promotions_product_idx` ON `promotions` (`productId`);--> statement-breakpoint
CREATE INDEX `resellers_status_tier_idx` ON `resellers` (`status`,`tier`);--> statement-breakpoint
CREATE INDEX `site_settings_category_idx` ON `site_settings` (`category`);