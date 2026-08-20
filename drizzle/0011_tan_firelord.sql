CREATE TABLE `admin_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`action` varchar(120) NOT NULL,
	`targetType` varchar(80) NOT NULL,
	`targetId` varchar(160) NOT NULL,
	`summary` varchar(500) NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `admin_audit_events_admin_created_idx` ON `admin_audit_events` (`adminUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_audit_events_target_created_idx` ON `admin_audit_events` (`targetType`,`targetId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_audit_events_action_created_idx` ON `admin_audit_events` (`action`,`createdAt`);