-- Subscription plans/tariffs table
CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `name` varchar(100) NOT NULL COMMENT 'Неделя, Месяц, 3 месяца, Полгода',
  `duration_days` int NOT NULL COMMENT '7, 30, 90, 180',
  `price_rub` decimal(10,2) NOT NULL COMMENT '1700, 4000, 10300, 20000',
  `discount_percent` int NOT NULL DEFAULT 0 COMMENT '0, 14, 17',
  `monthly_price_rub` decimal(10,2) NOT NULL COMMENT 'calculated',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Payment details table (for reference)
CREATE TABLE IF NOT EXISTS `payment_details` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `bank` varchar(100) NOT NULL COMMENT 'Т-Банк',
  `card_number` varchar(20) NOT NULL COMMENT '5536 9138 8189 0954',
  `card_expiry` varchar(10) NOT NULL COMMENT '09/28',
  `recipient_name` varchar(255) NOT NULL COMMENT 'Зерянский Роман Олегович',
  `is_active` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Subscription requests table (user applies for subscription)
CREATE TABLE IF NOT EXISTS `subscription_requests` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `user_id` varchar(36) NOT NULL,
  `plan_id` varchar(36) NOT NULL,
  `telegram_id` varchar(50),
  `first_name` varchar(100),
  `email` varchar(255) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `receipt_url` longtext,
  `approved_at` timestamp NULL,
  `approved_by_admin` varchar(255),
  `rejected_at` timestamp NULL,
  `rejection_reason` longtext,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`),
  FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`)
);

-- Active subscriptions table
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `user_id` varchar(36) NOT NULL,
  `request_id` varchar(36) NOT NULL,
  `plan_id` varchar(36) NOT NULL,
  `start_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_date` timestamp NOT NULL,
  `status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
  `notification_sent_at` timestamp NULL COMMENT 'When 3-day warning was sent',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`),
  FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`)
);

-- Create indexes for better query performance
CREATE INDEX `idx_subscription_requests_user_id` ON `subscription_requests`(`user_id`);
CREATE INDEX `idx_subscription_requests_status` ON `subscription_requests`(`status`);
CREATE INDEX `idx_subscriptions_user_id` ON `subscriptions`(`user_id`);
CREATE INDEX `idx_subscriptions_status` ON `subscriptions`(`status`);
CREATE INDEX `idx_subscriptions_end_date` ON `subscriptions`(`end_date`)
;
