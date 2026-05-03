-- Custom SQL migration file, put your code below! --
CREATE TABLE IF NOT EXISTS `one_time_login_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token` varchar(128) NOT NULL,
  `supabase_user_id` varchar(255) NOT NULL,
  `telegram_id` varchar(64) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `used_at` datetime,
  PRIMARY KEY (`id`),
  UNIQUE KEY `one_time_login_tokens_token_unique` (`token`),
  INDEX `idx_token` (`token`),
  INDEX `idx_telegram_id` (`telegram_id`)
);