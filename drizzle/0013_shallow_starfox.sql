CREATE TABLE `customer_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`consentType` enum('terms_privacy','marketing') NOT NULL,
	`policyVersion` varchar(40) NOT NULL,
	`granted` boolean NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderUpdates` boolean NOT NULL DEFAULT true,
	`paymentUpdates` boolean NOT NULL DEFAULT true,
	`walletUpdates` boolean NOT NULL DEFAULT true,
	`securityAlerts` boolean NOT NULL DEFAULT true,
	`marketingUpdates` boolean NOT NULL DEFAULT false,
	`productAnnouncements` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_notification_preferences_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `customer_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('order','payment','wallet','security','support','system') NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`actionUrl` varchar(255),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_privacy_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestCode` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`requestType` enum('data_access','data_correction','account_deletion') NOT NULL,
	`status` enum('submitted','under_review','completed','rejected','cancelled') NOT NULL DEFAULT 'submitted',
	`note` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_privacy_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_privacy_requests_code_unique` UNIQUE(`requestCode`)
);
--> statement-breakpoint
CREATE TABLE `customer_security_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`summary` varchar(255) NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_security_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_content_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`version` varchar(40) NOT NULL,
	`updatedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_content_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_content_pages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `support_ticket_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`authorRole` enum('customer','admin') NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_ticket_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketCode` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`category` enum('payment','order','game_top_up','gift_card','subscription','software','wallet','account','refund','other') NOT NULL,
	`subject` varchar(180) NOT NULL,
	`status` enum('open','processing','waiting_for_customer','resolved','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_tickets_code_unique` UNIQUE(`ticketCode`)
);
--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `firstName` varchar(80);--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `lastName` varchar(80);--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `username` varchar(30);--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `registrationSource` varchar(40);--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `referralCode` varchar(48);--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `accountStatus` enum('active','restricted','suspended','banned','deleted','pending_email_verification') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD CONSTRAINT `customer_profiles_username_unique` UNIQUE(`username`);--> statement-breakpoint
CREATE INDEX `customer_consents_user_type_created_idx` ON `customer_consents` (`userId`,`consentType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `customer_notifications_user_created_idx` ON `customer_notifications` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `customer_notifications_user_read_idx` ON `customer_notifications` (`userId`,`readAt`);--> statement-breakpoint
CREATE INDEX `customer_privacy_requests_user_created_idx` ON `customer_privacy_requests` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `customer_security_events_user_created_idx` ON `customer_security_events` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `site_content_pages_status_idx` ON `site_content_pages` (`status`);--> statement-breakpoint
CREATE INDEX `support_ticket_messages_ticket_created_idx` ON `support_ticket_messages` (`ticketId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `support_tickets_user_updated_idx` ON `support_tickets` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `support_tickets_order_idx` ON `support_tickets` (`orderId`);--> statement-breakpoint
CREATE INDEX `customer_profiles_status_idx` ON `customer_profiles` (`accountStatus`);