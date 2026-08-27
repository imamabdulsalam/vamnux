CREATE TABLE `promotion_redemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promotionId` int NOT NULL,
	`userId` int NOT NULL,
	`orderId` int NOT NULL,
	`couponCode` varchar(64) NOT NULL,
	`discountAmount` decimal(12,2) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promotion_redemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `promotion_redemptions_promotion_order_unique` UNIQUE(`promotionId`,`orderId`),
	CONSTRAINT `promotion_redemptions_order_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
ALTER TABLE `promotions` ADD `offerKind` enum('coupon','catalog_discount') DEFAULT 'coupon' NOT NULL;--> statement-breakpoint
ALTER TABLE `promotions` ADD `usageCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `promotion_redemptions_promotion_user_idx` ON `promotion_redemptions` (`promotionId`,`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `promotions_offer_status_idx` ON `promotions` (`offerKind`,`status`,`startsAt`,`endsAt`);