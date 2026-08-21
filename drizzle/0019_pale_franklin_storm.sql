CREATE TABLE `native_auth_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`tokenType` enum('email_verification','password_reset') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `native_auth_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `native_auth_tokens_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `native_auth_rate_limits` MODIFY COLUMN `action` enum('register','sign_in','forgot_password','resend_verification','verify_email') NOT NULL;--> statement-breakpoint
CREATE INDEX `native_auth_tokens_user_type_created_idx` ON `native_auth_tokens` (`userId`,`tokenType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `native_auth_tokens_expiry_idx` ON `native_auth_tokens` (`expiresAt`);