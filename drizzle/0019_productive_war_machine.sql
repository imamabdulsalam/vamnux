ALTER TABLE `customer_profiles` ADD `suspensionReason` varchar(500);--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `suspendedUntil` timestamp;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `suspensionAppeal` text;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `appealSubmittedAt` timestamp;--> statement-breakpoint
CREATE INDEX `customer_profiles_suspended_until_idx` ON `customer_profiles` (`suspendedUntil`);