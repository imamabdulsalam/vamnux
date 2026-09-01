-- VAMNUX Namecheap MySQL native-auth schema, reviewed 2026-09-02.
--
-- IMPORTANT: This is for the copied Namecheap database only, after its final
-- source-data refresh. Do not run it against the live Manus database. Keep
-- VAMNUX_NATIVE_AUTH_ENABLED=false until this script has completed and the
-- independent cPanel launch checks have passed.
--
-- This replaces the drift-prone generated 0044/0045 sequence. It is additive:
-- it does not touch products, supplier records, orders, wallets, payments, or
-- historical customer IDs. The four native-auth tables are expected to be
-- empty at first application.

CREATE TABLE IF NOT EXISTS `native_auth_credentials` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `passwordHash` text,
  `emailVerifiedAt` timestamp NULL,
  `enrollmentRequired` boolean NOT NULL DEFAULT true,
  `passwordChangedAt` timestamp NULL,
  `failedLoginCount` int NOT NULL DEFAULT 0,
  `lockedUntil` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `native_auth_credentials_user_unique` (`userId`),
  UNIQUE KEY `native_auth_credentials_email_unique` (`email`),
  KEY `native_auth_credentials_lockout_idx` (`lockedUntil`)
);

CREATE TABLE IF NOT EXISTS `native_auth_sessions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `sessionHash` varchar(128) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `revokedAt` timestamp NULL,
  `lastSeenAt` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `native_auth_sessions_session_unique` (`sessionHash`),
  KEY `native_auth_sessions_user_expiry_idx` (`userId`, `expiresAt`)
);

CREATE TABLE IF NOT EXISTS `native_auth_tokens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `tokenHash` varchar(128) NOT NULL,
  `tokenType` enum('email_verification','password_reset') NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `native_auth_tokens_token_unique` (`tokenHash`),
  KEY `native_auth_tokens_expiry_idx` (`expiresAt`),
  KEY `native_auth_tokens_user_type_created_idx` (`userId`, `tokenType`, `createdAt`)
);

CREATE TABLE IF NOT EXISTS `native_auth_pending_registrations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `email` varchar(320) NOT NULL,
  `firstName` varchar(80) NULL,
  `lastName` varchar(80) NULL,
  `phone` varchar(32) NULL,
  `countryCode` varchar(2) NULL,
  `referralSource` varchar(48) NULL,
  `tokenHash` varchar(128) NOT NULL,
  `dispatchId` varchar(64) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `native_auth_pending_email_unique` (`email`),
  UNIQUE KEY `native_auth_pending_token_unique` (`tokenHash`),
  KEY `native_auth_pending_expiry_idx` (`expiresAt`)
);

-- Required only when the existing copied database does not yet include native_email.
-- Confirm the existing enum has exactly manus_oauth and supabase before running.
ALTER TABLE `customer_identity_links`
  MODIFY COLUMN `provider` enum('manus_oauth','supabase','native_email') NOT NULL;

-- Read-only verification statements; expected results are zero native rows
-- immediately after first application and no change to any business table.
SELECT 'native_auth_credentials' AS `table`, COUNT(*) AS `rows` FROM `native_auth_credentials`
UNION ALL SELECT 'native_auth_sessions', COUNT(*) FROM `native_auth_sessions`
UNION ALL SELECT 'native_auth_tokens', COUNT(*) FROM `native_auth_tokens`
UNION ALL SELECT 'native_auth_pending_registrations', COUNT(*) FROM `native_auth_pending_registrations`;
