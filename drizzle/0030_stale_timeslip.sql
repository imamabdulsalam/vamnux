CREATE TABLE `pricing_rule_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pricingRuleId` int,
	`productId` int,
	`adminUserId` int NOT NULL,
	`action` enum('rule_created','rule_updated','price_applied') NOT NULL,
	`previousPrice` decimal(12,2),
	`newPrice` decimal(12,2),
	`previousMarkup` decimal(7,2),
	`newMarkup` decimal(7,2),
	`reason` varchar(500),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pricing_rule_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricing_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleName` varchar(160) NOT NULL,
	`scope` enum('global','category','product','supplier') NOT NULL,
	`category` enum('top_up','gift_card','game_key','subscription','ai_tool','software','steam','steam_top_up','telegram_stars'),
	`productId` int,
	`supplierKey` varchar(80),
	`outputCurrency` varchar(3) NOT NULL DEFAULT 'USD',
	`percentageMarkup` decimal(7,2) NOT NULL DEFAULT '0.00',
	`fixedMarkup` decimal(12,2) NOT NULL DEFAULT '0.00',
	`fixedFee` decimal(12,2) NOT NULL DEFAULT '0.00',
	`minimumSellingPrice` decimal(12,2),
	`maximumDiscountPercent` decimal(7,2),
	`roundingRule` enum('none','nearest_0_01','nearest_1','nearest_5','nearest_10','nearest_50','nearest_100') NOT NULL DEFAULT 'nearest_0_01',
	`manualPriceOverride` decimal(12,2),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdByAdminId` int NOT NULL,
	`updatedByAdminId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricing_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `pricing_rule_audit_events_rule_created_idx` ON `pricing_rule_audit_events` (`pricingRuleId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pricing_rule_audit_events_product_created_idx` ON `pricing_rule_audit_events` (`productId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pricing_rule_audit_events_admin_created_idx` ON `pricing_rule_audit_events` (`adminUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pricing_rules_scope_active_idx` ON `pricing_rules` (`scope`,`isActive`);--> statement-breakpoint
CREATE INDEX `pricing_rules_category_active_idx` ON `pricing_rules` (`category`,`isActive`);--> statement-breakpoint
CREATE INDEX `pricing_rules_product_active_idx` ON `pricing_rules` (`productId`,`isActive`);--> statement-breakpoint
CREATE INDEX `pricing_rules_supplier_active_idx` ON `pricing_rules` (`supplierKey`,`isActive`);