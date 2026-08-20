ALTER TABLE `wallet_funding_attempts` MODIFY COLUMN `integrationId` int;--> statement-breakpoint
ALTER TABLE `wallet_entries` ADD CONSTRAINT `wallet_entries_reference_unique` UNIQUE(`reference`);