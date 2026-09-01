CREATE TABLE `native_auth_pending_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`firstName` varchar(80),
	`lastName` varchar(80),
	`phone` varchar(32),
	`countryCode` varchar(2),
	`referralSource` varchar(48),
	`tokenHash` varchar(128) NOT NULL,
	`dispatchId` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `native_auth_pending_registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `native_auth_pending_email_unique` UNIQUE(`email`),
	CONSTRAINT `native_auth_pending_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `native_auth_pending_expiry_idx` ON `native_auth_pending_registrations` (`expiresAt`);