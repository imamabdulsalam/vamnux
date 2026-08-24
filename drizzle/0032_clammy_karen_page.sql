CREATE TABLE `supplier_routing_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`masterProductId` int NOT NULL,
	`selectedSupplierOfferId` int,
	`selectedSupplierKey` varchar(80),
	`selectedSupplierProductId` varchar(180),
	`strategy` enum('lowest_cost','highest_priority','manual_selection','availability_first','lowest_cost_available') NOT NULL,
	`outcome` enum('selected','no_eligible_offer','manual_offer_ineligible','validation_failed') NOT NULL,
	`simulationMode` boolean NOT NULL DEFAULT true,
	`liveRoutingEnabled` boolean NOT NULL DEFAULT false,
	`supplierCost` decimal(12,2),
	`supplierCurrency` varchar(3),
	`outputCurrency` varchar(3),
	`exchangeRate` decimal(16,6),
	`convertedCost` decimal(12,2),
	`customerPrice` decimal(12,2),
	`expectedMargin` decimal(12,2),
	`expectedMarginPercent` decimal(7,2),
	`fallbackSupplierOfferIds` json,
	`eligibilitySnapshot` json,
	`detail` varchar(1000) NOT NULL,
	`simulatedByAdminId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_routing_decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_routing_policies` (
	`id` int NOT NULL,
	`strategy` enum('lowest_cost','highest_priority','manual_selection','availability_first','lowest_cost_available') NOT NULL DEFAULT 'lowest_cost_available',
	`liveRoutingEnabled` boolean NOT NULL DEFAULT false,
	`updatedByAdminId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_routing_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `supplier_routing_decisions_master_created_idx` ON `supplier_routing_decisions` (`masterProductId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_routing_decisions_outcome_created_idx` ON `supplier_routing_decisions` (`outcome`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_routing_decisions_admin_created_idx` ON `supplier_routing_decisions` (`simulatedByAdminId`,`createdAt`);