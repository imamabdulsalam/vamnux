CREATE TABLE `wallet_entry_balance_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`walletEntryId` int NOT NULL,
	`walletId` int NOT NULL,
	`previousBalance` decimal(12,2) NOT NULL,
	`resultingBalance` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_entry_balance_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_entry_balance_snapshots_entry_unique` UNIQUE(`walletEntryId`)
);
--> statement-breakpoint
CREATE INDEX `wallet_entry_balance_snapshots_wallet_created_idx` ON `wallet_entry_balance_snapshots` (`walletId`,`createdAt`);