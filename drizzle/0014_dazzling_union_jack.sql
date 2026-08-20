CREATE TABLE `customer_identity_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('manus_oauth','supabase') NOT NULL,
	`providerSubject` varchar(255) NOT NULL,
	`providerEmail` varchar(320),
	`emailVerifiedAt` timestamp,
	`linkedAt` timestamp NOT NULL DEFAULT (now()),
	`lastAuthenticatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_identity_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_identity_links_provider_subject_unique` UNIQUE(`provider`,`providerSubject`),
	CONSTRAINT `customer_identity_links_user_provider_unique` UNIQUE(`userId`,`provider`)
);
--> statement-breakpoint
CREATE INDEX `customer_identity_links_user_idx` ON `customer_identity_links` (`userId`);