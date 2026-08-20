CREATE TABLE `native_auth_rate_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bucketHash` varchar(128) NOT NULL,
	`action` enum('register','sign_in') NOT NULL,
	`attemptCount` int NOT NULL DEFAULT 0,
	`windowExpiresAt` timestamp NOT NULL,
	`lastAttemptAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `native_auth_rate_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `native_auth_rate_limit_bucket_action_unique` UNIQUE(`bucketHash`,`action`)
);
--> statement-breakpoint
CREATE TABLE `native_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(1024) NOT NULL,
	`emailVerifiedAt` timestamp,
	`credentialStatus` enum('active','locked','disabled') NOT NULL DEFAULT 'active',
	`passwordChangedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `native_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `native_credentials_user_unique` UNIQUE(`userId`),
	CONSTRAINT `native_credentials_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `native_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `native_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `native_sessions_hash_unique` UNIQUE(`sessionHash`)
);
--> statement-breakpoint
ALTER TABLE `customer_identity_links` MODIFY COLUMN `provider` enum('manus_oauth','supabase','native_email') NOT NULL;--> statement-breakpoint
CREATE INDEX `native_auth_rate_limit_expiry_idx` ON `native_auth_rate_limits` (`windowExpiresAt`);--> statement-breakpoint
CREATE INDEX `native_credentials_status_idx` ON `native_credentials` (`credentialStatus`);--> statement-breakpoint
CREATE INDEX `native_sessions_user_expiry_idx` ON `native_sessions` (`userId`,`expiresAt`);