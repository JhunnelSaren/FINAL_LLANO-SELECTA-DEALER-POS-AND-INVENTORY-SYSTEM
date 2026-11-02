-- Additive storage for per-user notification read and delete state.
-- This table contains no source transaction data and may be created idempotently.
CREATE TABLE IF NOT EXISTS `usernotificationstate` (
  `id` VARCHAR(64) NOT NULL,
  `userId` VARCHAR(64) NOT NULL,
  `notificationId` VARCHAR(120) NOT NULL,
  `isRead` TINYINT(1) NOT NULL DEFAULT 0,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `usernotificationstate_userId_notificationId_key` (`userId`, `notificationId`),
  INDEX `usernotificationstate_userId_isDeleted_idx` (`userId`, `isDeleted`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
