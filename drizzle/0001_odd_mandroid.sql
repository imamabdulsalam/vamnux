CREATE TABLE `commerce_integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`integrationType` enum('supplier','payment') NOT NULL,
	`providerName` varchar(120) NOT NULL,
	`apiBaseUrl` text,
	`credentialReference` varchar(120),
	`publicKeyReference` varchar(120),
	`webhookSecretReference` varchar(120),
	`supportedCurrencies` json,
	`syncStatus` enum('not_configured','ready','paused','error') NOT NULL DEFAULT 'not_configured',
	`lastSyncAt` timestamp,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commerce_integrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `commerce_integrations_type_provider_unique` UNIQUE(`integrationType`,`providerName`)
);
--> statement-breakpoint
CREATE INDEX `commerce_integrations_type_status_idx` ON `commerce_integrations` (`integrationType`,`syncStatus`);