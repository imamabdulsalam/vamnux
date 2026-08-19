ALTER TABLE `products` ADD `supplierCategory` varchar(120);--> statement-breakpoint
ALTER TABLE `products` ADD `requiresServerId` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `inputRequirements` json;