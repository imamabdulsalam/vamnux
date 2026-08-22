CREATE TABLE `newsletter_interest_subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`source` varchar(80) NOT NULL DEFAULT 'storefront_lower_cta',
	`status` enum('subscribed','unsubscribed') NOT NULL DEFAULT 'subscribed',
	`consentedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `newsletter_interest_subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_interest_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `newsletter_interest_status_updated_idx` ON `newsletter_interest_subscribers` (`status`,`updatedAt`);