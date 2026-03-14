-- CreateTable
CREATE TABLE `memories` (
    `id` VARCHAR(191) NOT NULL,
    `memory_id` VARCHAR(100) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 50,
    `confidence` INTEGER NOT NULL DEFAULT 50,
    `title` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `last_accessed_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `user_id` VARCHAR(191) NULL,
    `agent_id` VARCHAR(100) NULL,
    `task_id` VARCHAR(100) NULL,
    `parent_memory_id` VARCHAR(100) NULL,
    `tags` JSON NOT NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT 'general',
    `access_count` INTEGER NOT NULL DEFAULT 0,
    `success_count` INTEGER NOT NULL DEFAULT 0,
    `failure_count` INTEGER NOT NULL DEFAULT 0,
    `source` VARCHAR(100) NOT NULL DEFAULT 'manual',
    `related_memory_ids` JSON NOT NULL,
    `type_data` JSON NULL,

    UNIQUE INDEX `memories_memory_id_key`(`memory_id`),
    INDEX `memories_type_idx`(`type`),
    INDEX `memories_status_idx`(`status`),
    INDEX `memories_priority_idx`(`priority`),
    INDEX `memories_user_id_idx`(`user_id`),
    INDEX `memories_agent_id_idx`(`agent_id`),
    INDEX `memories_task_id_idx`(`task_id`),
    INDEX `memories_category_idx`(`category`),
    INDEX `memories_created_at_idx`(`created_at`),
    INDEX `memories_updated_at_idx`(`updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `memories` ADD CONSTRAINT `memories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
