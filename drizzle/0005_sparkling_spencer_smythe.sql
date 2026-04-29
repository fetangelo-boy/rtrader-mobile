ALTER TABLE `chat_participants` MODIFY COLUMN `userId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` MODIFY COLUMN `userId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `push_tokens` MODIFY COLUMN `userId` varchar(36) NOT NULL;