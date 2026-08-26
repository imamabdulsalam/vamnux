CREATE TABLE `product_tracking_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`supplierKey` varchar(80),
	`eventType` enum('observed_available','observed_out_of_stock','recovered_available','storefront_hidden','storefront_shown') NOT NULL,
	`trackingRunId` int,
	`adminUserId` int,
	`detail` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_tracking_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_tracking_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`supplierKey` varchar(80),
	`supplierEligible` boolean NOT NULL,
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`firstUnavailableAt` timestamp,
	`availableAgainAt` timestamp,
	`lastTrackingRunId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_tracking_observations_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_tracking_observations_product_unique` UNIQUE(`productId`)
);
--> statement-breakpoint
CREATE TABLE `product_tracking_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierKey` varchar(80) NOT NULL,
	`trigger` enum('manual','scheduled') NOT NULL,
	`status` enum('started','completed','failed','skipped') NOT NULL DEFAULT 'started',
	`initiatedByAdminId` int,
	`supplierSyncRunId` int,
	`productsObserved` int NOT NULL DEFAULT 0,
	`outOfStockProducts` int NOT NULL DEFAULT 0,
	`newlySyncedProducts` int NOT NULL DEFAULT 0,
	`newlySyncedByCategory` json,
	`summary` varchar(500),
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `product_tracking_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_tracking_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierKey` varchar(80) NOT NULL,
	`intervalHours` enum('2','10','24') NOT NULL,
	`status` enum('pending_deployment','active','paused','error') NOT NULL DEFAULT 'pending_deployment',
	`scheduleCronTaskUid` varchar(65),
	`configuredByAdminId` int NOT NULL,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_tracking_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_tracking_schedules_supplier_unique` UNIQUE(`supplierKey`),
	CONSTRAINT `product_tracking_schedules_task_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE INDEX `product_tracking_events_product_created_idx` ON `product_tracking_events` (`productId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `product_tracking_events_supplier_created_idx` ON `product_tracking_events` (`supplierKey`,`createdAt`);--> statement-breakpoint
CREATE INDEX `product_tracking_events_run_idx` ON `product_tracking_events` (`trackingRunId`);--> statement-breakpoint
CREATE INDEX `product_tracking_observations_supplier_availability_idx` ON `product_tracking_observations` (`supplierKey`,`supplierEligible`,`observedAt`);--> statement-breakpoint
CREATE INDEX `product_tracking_observations_recovery_idx` ON `product_tracking_observations` (`availableAgainAt`);--> statement-breakpoint
CREATE INDEX `product_tracking_runs_supplier_started_idx` ON `product_tracking_runs` (`supplierKey`,`startedAt`);--> statement-breakpoint
CREATE INDEX `product_tracking_runs_status_started_idx` ON `product_tracking_runs` (`status`,`startedAt`);--> statement-breakpoint
CREATE INDEX `product_tracking_schedules_status_idx` ON `product_tracking_schedules` (`status`,`intervalHours`);