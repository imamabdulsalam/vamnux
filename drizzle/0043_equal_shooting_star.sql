ALTER TABLE `wallet_funding_attempts` MODIFY COLUMN `status` enum('initialized','pending','settled','failed','expired','cancelled','reversed','refunded','reconciliation') NOT NULL DEFAULT 'initialized';--> statement-breakpoint
ALTER TABLE `wallet_funding_attempts` ADD `providerTransactionId` varchar(160);--> statement-breakpoint
ALTER TABLE `wallet_funding_attempts` ADD `providerAmountSubunit` decimal(20,0);--> statement-breakpoint
ALTER TABLE `wallet_funding_attempts` ADD `providerCurrency` varchar(3);--> statement-breakpoint
ALTER TABLE `wallet_funding_attempts` ADD `providerEnvironment` enum('test','live');--> statement-breakpoint
ALTER TABLE `wallet_funding_attempts` ADD `providerVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `wallet_funding_attempts` ADD CONSTRAINT `wallet_funding_attempts_provider_transaction_unique` UNIQUE(`providerTransactionId`);--> statement-breakpoint
CREATE INDEX `wallet_funding_attempts_provider_status_idx` ON `wallet_funding_attempts` (`providerEnvironment`,`status`,`updatedAt`);