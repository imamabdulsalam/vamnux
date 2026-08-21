CREATE TABLE `supplier_balance_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`integrationId` int NOT NULL,
	`balance` decimal(12,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`source` enum('manual','authenticated_receipt') NOT NULL DEFAULT 'manual',
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`recordedByAdminId` int NOT NULL,
	`note` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_balance_observations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `supplier_balance_observations_integration_observed_idx` ON `supplier_balance_observations` (`integrationId`,`observedAt`);--> statement-breakpoint
CREATE INDEX `supplier_balance_observations_balance_idx` ON `supplier_balance_observations` (`balance`,`currency`);