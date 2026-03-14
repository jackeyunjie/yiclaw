-- CreateTable
CREATE TABLE `db_skills` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'general',
    `skill_doc` LONGTEXT NOT NULL,
    `workflows` JSON NULL,
    `sql_template` LONGTEXT NOT NULL,
    `parameters` JSON NULL,
    `tags` JSON NULL,
    `use_count` INTEGER NOT NULL DEFAULT 0,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `db_skills_category_idx`(`category`),
    INDEX `db_skills_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `query_histories` (
    `id` VARCHAR(191) NOT NULL,
    `sql` LONGTEXT NOT NULL,
    `executed_by` VARCHAR(191) NULL,
    `result_summary` TEXT NULL,
    `row_count` INTEGER NOT NULL DEFAULT 0,
    `execution_time` INTEGER NOT NULL DEFAULT 0,
    `skill_id` VARCHAR(191) NULL,
    `is_favorite` BOOLEAN NOT NULL DEFAULT false,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `query_histories_executed_by_idx`(`executed_by`),
    INDEX `query_histories_is_favorite_idx`(`is_favorite`),
    INDEX `query_histories_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
