ALTER TABLE `native_auth_tokens` RENAME COLUMN `purpose` TO `tokenType`;--> statement-breakpoint
DROP INDEX `native_auth_tokens_user_purpose_expiry_idx` ON `native_auth_tokens`;--> statement-breakpoint
ALTER TABLE `native_auth_tokens` MODIFY COLUMN `tokenType` enum('email_verification','password_reset') NOT NULL;--> statement-breakpoint
ALTER TABLE `native_auth_tokens` ADD `usedAt` timestamp;--> statement-breakpoint
CREATE INDEX `native_auth_tokens_expiry_idx` ON `native_auth_tokens` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `native_auth_tokens_user_type_created_idx` ON `native_auth_tokens` (`userId`,`tokenType`,`createdAt`);--> statement-breakpoint
ALTER TABLE `native_auth_tokens` DROP COLUMN `consumedAt`;