CREATE TABLE `payment_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`integrationId` int,
	`providerName` varchar(120) NOT NULL,
	`providerEventId` varchar(160) NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`providerTransactionId` varchar(160),
	`providerReference` varchar(160),
	`fundingAttemptId` int,
	`userId` int,
	`amount` decimal(12,2),
	`currency` varchar(3),
	`signatureStatus` enum('verified','invalid','unavailable') NOT NULL DEFAULT 'unavailable',
	`providerStatus` enum('pending','successful','failed','refunded','reversed','unknown') NOT NULL DEFAULT 'unknown',
	`processingStatus` enum('received','verified','credited','duplicate','rejected','error','reconciled') NOT NULL DEFAULT 'received',
	`errorMessage` varchar(1000),
	`payloadHash` varchar(64),
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `payment_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_webhook_events_provider_event_unique` UNIQUE(`providerName`,`providerEventId`)
);
--> statement-breakpoint
CREATE TABLE `top_up_reconciliation_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseKey` varchar(180) NOT NULL,
	`webhookEventId` int,
	`fundingAttemptId` int,
	`userId` int,
	`providerName` varchar(120),
	`category` enum('missing_wallet_credit','duplicate_event','duplicate_reference','invalid_signature','amount_currency_mismatch','provider_failed','provider_pending','refunded_or_reversed') NOT NULL,
	`status` enum('open','resolved') NOT NULL DEFAULT 'open',
	`detail` varchar(1000) NOT NULL,
	`resolutionNote` varchar(1000),
	`resolvedByAdminId` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `top_up_reconciliation_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `top_up_reconciliation_cases_case_key_unique` UNIQUE(`caseKey`)
);
--> statement-breakpoint
CREATE TABLE `wallet_entry_reversals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`originalEntryId` int NOT NULL,
	`reversalEntryId` int NOT NULL,
	`fundingAttemptId` int,
	`adminUserId` int NOT NULL,
	`reason` varchar(1000) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_entry_reversals_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_entry_reversals_original_entry_unique` UNIQUE(`originalEntryId`),
	CONSTRAINT `wallet_entry_reversals_reversal_entry_unique` UNIQUE(`reversalEntryId`)
);
--> statement-breakpoint
DROP INDEX `wallet_funding_attempts_reference_idx` ON `wallet_funding_attempts`;--> statement-breakpoint
ALTER TABLE `wallet_funding_attempts` MODIFY COLUMN `status` enum('initialized','pending','settled','failed','expired','cancelled','reversed') NOT NULL DEFAULT 'initialized';--> statement-breakpoint
ALTER TABLE `wallet_funding_attempts` ADD CONSTRAINT `wallet_funding_attempts_provider_reference_unique` UNIQUE(`providerReference`);--> statement-breakpoint
CREATE INDEX `payment_webhook_events_provider_received_idx` ON `payment_webhook_events` (`providerName`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `payment_webhook_events_funding_received_idx` ON `payment_webhook_events` (`fundingAttemptId`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `payment_webhook_events_reference_idx` ON `payment_webhook_events` (`providerReference`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `payment_webhook_events_transaction_idx` ON `payment_webhook_events` (`providerTransactionId`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `payment_webhook_events_processing_idx` ON `payment_webhook_events` (`processingStatus`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `top_up_reconciliation_cases_status_created_idx` ON `top_up_reconciliation_cases` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `top_up_reconciliation_cases_funding_created_idx` ON `top_up_reconciliation_cases` (`fundingAttemptId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `top_up_reconciliation_cases_webhook_created_idx` ON `top_up_reconciliation_cases` (`webhookEventId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `wallet_entry_reversals_funding_created_idx` ON `wallet_entry_reversals` (`fundingAttemptId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `wallet_entry_reversals_admin_created_idx` ON `wallet_entry_reversals` (`adminUserId`,`createdAt`);