CREATE TABLE `supplier_health_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierProfileId` int NOT NULL,
	`integrationId` int,
	`checkType` enum('configuration','manual_probe') NOT NULL DEFAULT 'configuration',
	`status` enum('passed','attention','failed') NOT NULL,
	`responseMs` int,
	`detail` varchar(500) NOT NULL,
	`performedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_health_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_management_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`integrationId` int,
	`supplierId` varchar(80) NOT NULL,
	`supplierName` varchar(120) NOT NULL,
	`websiteUrl` text,
	`supportedCategories` json,
	`supportedCurrencies` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`priority` int NOT NULL DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_management_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_management_profiles_supplier_id_unique` UNIQUE(`supplierId`),
	CONSTRAINT `supplier_management_profiles_integration_unique` UNIQUE(`integrationId`)
);
--> statement-breakpoint
CREATE INDEX `supplier_health_checks_profile_created_idx` ON `supplier_health_checks` (`supplierProfileId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_health_checks_status_created_idx` ON `supplier_health_checks` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_management_profiles_active_priority_idx` ON `supplier_management_profiles` (`isActive`,`priority`);