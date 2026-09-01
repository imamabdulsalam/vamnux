CREATE TABLE `native_auth_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` text,
	`emailVerifiedAt` timestamp,
	`enrollmentRequired` boolean NOT NULL DEFAULT true,
	`passwordChangedAt` timestamp,
	`failedLoginCount` int NOT NULL DEFAULT 0,
	`lockedUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `native_auth_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `native_auth_credentials_user_unique` UNIQUE(`userId`),
	CONSTRAINT `native_auth_credentials_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `native_auth_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `native_auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `native_auth_sessions_session_unique` UNIQUE(`sessionHash`)
);
--> statement-breakpoint
CREATE TABLE `native_auth_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`purpose` enum('enrollment','email_verification','password_reset') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `native_auth_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `native_auth_tokens_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `customer_identity_links` MODIFY COLUMN `provider` enum('manus_oauth','supabase','native_email') NOT NULL;--> statement-breakpoint
CREATE INDEX `native_auth_credentials_lockout_idx` ON `native_auth_credentials` (`lockedUntil`);--> statement-breakpoint
CREATE INDEX `native_auth_sessions_user_expiry_idx` ON `native_auth_sessions` (`userId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `native_auth_tokens_user_purpose_expiry_idx` ON `native_auth_tokens` (`userId`,`purpose`,`expiresAt`);