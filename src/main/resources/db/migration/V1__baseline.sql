CREATE TABLE `ops_task`
(
    `id`            BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'primary key',
    `region_id`     VARCHAR(30)         NOT NULL COMMENT 'region id',
    `task_name`     VARCHAR(30)         NOT NULL COMMENT 'opsTask name',
    `command_text`  MEDIUMTEXT          NOT NULL DEFAULT '' COMMENT 'command content',
    `parameters`    TINYTEXT            NOT NULL DEFAULT '' COMMENT 'command parameters',
    `timeout`       INT(11)             NOT NULL DEFAULT 60 COMMENT 'command timeout in seconds',
    `command_type`  INT(11)             NOT NULL DEFAULT 0 COMMENT '0:RunShellScript',
    `repeat_mode`   INT(11)             NOT NULL DEFAULT 0 COMMENT '0:Once',
    `invoke_id`     VARCHAR(24)         NOT NULL COMMENT 'invoke id',
    `instances`     INT(11)             NOT NULL COMMENT 'instances count',
    `status`        INT(11)             NOT NULL DEFAULT 0 COMMENT '0:Pending',
    `creation_time` DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'creation time',
    `finish_time`   DATETIME            NULL COMMENT 'finished time',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_invoke_id` (`invoke_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4; -- COMMENT '服务器运维记录';

CREATE TABLE `ops_task_item`
(
    `id`            BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'primary key',
    `region_id`     VARCHAR(30)         NOT NULL COMMENT 'id',
    `invoke_id`     VARCHAR(24)         NOT NULL COMMENT 'invoke id',
    `instance_id`   VARCHAR(30)         NOT NULL COMMENT 'instance id',
    `status`        INT(11)             NOT NULL DEFAULT 0 COMMENT '0:Pending',
    `exit_code`     INT(11)             NULL     DEFAULT NULL,
    `output`        MEDIUMTEXT          NOT NULL DEFAULT '' COMMENT 'command output',
    `dropped`       INT(11)             NOT NULL DEFAULT '0' COMMENT 'dropped output',
    `err_code`      VARCHAR(24)         NOT NULL DEFAULT '' COMMENT 'error code',
    `err_info`      VARCHAR(96)         NOT NULL DEFAULT '' COMMENT 'error info',
    `creation_time` DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'creation time',
    `update_time`   DATETIME            NULL COMMENT 'creation time',
    `finish_time`   DATETIME            NULL COMMENT 'finished time',
    PRIMARY KEY (`id`),
    INDEX `idx_invoke_id` (`invoke_id`),
    INDEX `idx_instance_id` (`instance_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4; -- COMMENT '服务器运维记录详情';