CREATE TABLE `subscriptions` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`plan` enum('free','basic','premium','vip') NOT NULL DEFAULT 'free',
	`status` enum('active','canceled','trialing','expired') NOT NULL DEFAULT 'active',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_userId_unique` UNIQUE(`userId`)
);
