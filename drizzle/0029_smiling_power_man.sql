CREATE TABLE `supplier_offer_mapping_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierOfferId` int NOT NULL,
	`legacyProductId` int NOT NULL,
	`masterProductId` int,
	`action` enum('PENDING REVIEW','APPROVED','REJECTED','REMOVED') NOT NULL,
	`previousStatus` enum('UNMAPPED','PENDING REVIEW','APPROVED','REJECTED') NOT NULL,
	`nextStatus` enum('UNMAPPED','PENDING REVIEW','APPROVED','REJECTED') NOT NULL,
	`reviewedByAdminId` int NOT NULL,
	`note` varchar(1000),
	`mappingAttributes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_offer_mapping_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `supplier_offers` ADD `mappingStatus` enum('UNMAPPED','PENDING REVIEW','APPROVED','REJECTED') DEFAULT 'UNMAPPED' NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_offers` ADD `mappingAttributes` json;--> statement-breakpoint
CREATE INDEX `supplier_offer_mapping_reviews_offer_created_idx` ON `supplier_offer_mapping_reviews` (`supplierOfferId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_offer_mapping_reviews_master_created_idx` ON `supplier_offer_mapping_reviews` (`masterProductId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_offer_mapping_reviews_admin_created_idx` ON `supplier_offer_mapping_reviews` (`reviewedByAdminId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_offers_mapping_status_idx` ON `supplier_offers` (`mappingStatus`,`masterProductId`);