ALTER TABLE `customer_profiles` ADD `suspensionReason` varchar(500);--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `suspendedAt` timestamp;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `suspendedUntil` timestamp;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `suspendedByAdminId` int;