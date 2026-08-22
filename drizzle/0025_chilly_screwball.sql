CREATE TABLE `admin_notification_reads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`notificationKey` varchar(220) NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_notification_reads_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_notification_reads_admin_key_unique` UNIQUE(`adminUserId`,`notificationKey`)
);
--> statement-breakpoint
CREATE INDEX `admin_notification_reads_admin_read_at_idx` ON `admin_notification_reads` (`adminUserId`,`readAt`);