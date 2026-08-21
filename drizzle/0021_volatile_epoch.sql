CREATE TABLE `admin_mfa_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeHash` varchar(128) NOT NULL,
	`userId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_mfa_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_mfa_challenge_hash_unique` UNIQUE(`challengeHash`)
);
--> statement-breakpoint
CREATE TABLE `admin_mfa_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`secretEncrypted` varchar(1024) NOT NULL,
	`enrolledAt` timestamp,
	`lastVerifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_mfa_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_mfa_credentials_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `admin_mfa_recovery_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_mfa_recovery_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_mfa_recovery_user_code_unique` UNIQUE(`userId`,`codeHash`)
);
--> statement-breakpoint
CREATE INDEX `admin_mfa_challenge_user_expiry_idx` ON `admin_mfa_challenges` (`userId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `admin_mfa_recovery_user_unused_idx` ON `admin_mfa_recovery_codes` (`userId`,`usedAt`);