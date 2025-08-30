-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: localhost    Database: schedule_system
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `availability`
--

DROP TABLE IF EXISTS `availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL COMMENT 'å‘˜å·¥ID',
  `time_slot_id` int NOT NULL COMMENT 'æ—¶é—´æ®µID',
  `week_start_date` date NOT NULL COMMENT '周开始日期(周一)',
  `is_available` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否有空',
  `priority` int NOT NULL DEFAULT '0' COMMENT '优先级',
  `notes` text COMMENT '备注',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  `start_week_date` date DEFAULT NULL COMMENT '适用周期开始日期',
  `end_week_date` date DEFAULT NULL COMMENT '适用周期结束日期',
  `applies_to_weeks` json DEFAULT NULL COMMENT '适用的周次列表 [1,2,3,4,5,6,7,8]',
  `template_id` int DEFAULT NULL COMMENT '关联的模板ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_availability` (`employee_id`,`time_slot_id`,`week_start_date`),
  KEY `idx_employee_week` (`employee_id`,`week_start_date`),
  KEY `idx_timeslot` (`time_slot_id`),
  KEY `fk_availability_template` (`template_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1415 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='å‘˜å·¥ç©ºé—²æ—¶é—´è¡¨';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `availability`
--

LOCK TABLES `availability` WRITE;
/*!40000 ALTER TABLE `availability` DISABLE KEYS */;
/*!40000 ALTER TABLE `availability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `availability_templates`
--

DROP TABLE IF EXISTS `availability_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `availability_templates` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `employee_id` int NOT NULL COMMENT '员工ID',
  `template_name` varchar(100) NOT NULL COMMENT '模板名称',
  `time_slot_configs` json NOT NULL COMMENT '时间段配置 [{timeSlotId, dayOfWeek, priority}]',
  `week_pattern` json NOT NULL COMMENT '周模式 {"1-8": true, "9-16": false, "specific": [1,2,3]}',
  `priority` int NOT NULL DEFAULT '1' COMMENT '模板优先级',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `description` text COMMENT '模板描述',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='空闲时间模板表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `availability_templates`
--

LOCK TABLES `availability_templates` WRITE;
/*!40000 ALTER TABLE `availability_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `availability_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch_operations`
--

DROP TABLE IF EXISTS `batch_operations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_operations` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '操作ID',
  `operation_type` enum('schedule','availability','adjustment') NOT NULL COMMENT '操作类型',
  `operation_name` varchar(100) NOT NULL COMMENT '操作名称',
  `target_weeks` json NOT NULL COMMENT '目标周次 [1,2,3,4,5,6,7,8]',
  `operation_data` json NOT NULL COMMENT '操作数据',
  `status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending' COMMENT '操作状态',
  `progress` int NOT NULL DEFAULT '0' COMMENT '操作进度百分比',
  `result_summary` json DEFAULT NULL COMMENT '操作结果摘要',
  `error_message` text COMMENT '错误信息',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `started_at` datetime DEFAULT NULL COMMENT '开始时间',
  `completed_at` datetime DEFAULT NULL COMMENT '完成时间',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='批量操作记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_operations`
--

LOCK TABLES `batch_operations` WRITE;
/*!40000 ALTER TABLE `batch_operations` DISABLE KEYS */;
/*!40000 ALTER TABLE `batch_operations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_logs`
--

DROP TABLE IF EXISTS `email_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipient_email` varchar(255) NOT NULL COMMENT '收件人邮箱',
  `recipient_name` varchar(100) DEFAULT NULL COMMENT '收件人姓名',
  `subject` varchar(255) NOT NULL COMMENT '邮件主题',
  `template_name` varchar(100) DEFAULT NULL COMMENT '邮件模板名称',
  `template_data` json DEFAULT NULL COMMENT '模板数据',
  `status` enum('pending','sent','failed','retry') NOT NULL DEFAULT 'pending' COMMENT '发送状态',
  `sent_at` datetime DEFAULT NULL COMMENT '发送时间',
  `error_message` text COMMENT '错误信息',
  `retry_count` int NOT NULL DEFAULT '0' COMMENT '重试次数',
  `created_at` datetime NOT NULL COMMENT '创庺时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_recipient` (`recipient_email`),
  KEY `idx_status` (`status`),
  KEY `idx_sent_at` (`sent_at`),
  KEY `idx_template` (`template_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='é‚®ä»¶å‘é€æ—¥å¿—è¡¨';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_logs`
--

LOCK TABLES `email_logs` WRITE;
/*!40000 ALTER TABLE `email_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_templates` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ä¸»é”®ID',
  `name` varchar(100) NOT NULL COMMENT 'æ¨¡æ¿åç§°',
  `subject` varchar(200) NOT NULL COMMENT 'é‚®ä»¶ä¸»é¢˜æ¨¡æ¿',
  `content` text NOT NULL COMMENT 'é‚®ä»¶å†…å®¹æ¨¡æ¿',
  `variables` json DEFAULT NULL COMMENT 'å¯ç”¨å˜é‡è¯´æ˜Ž',
  `event_type` varchar(50) NOT NULL COMMENT '邮件事件类型',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'æ˜¯å¦å¯ç”¨',
  `is_default` tinyint(1) DEFAULT '0' COMMENT 'æ˜¯å¦ä¸ºé»˜è®¤æ¨¡æ¿',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åˆ›å»ºæ—¶é—´',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'æ›´æ–°æ—¶é—´',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_name` (`name`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_default` (`is_default`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='é‚®ä»¶æ¨¡æ¿è¡¨';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_templates`
--

LOCK TABLES `email_templates` WRITE;
/*!40000 ALTER TABLE `email_templates` DISABLE KEYS */;
INSERT INTO `email_templates` VALUES (5,'AI排班通知','您的AI排班安排汇总 - 共{{scheduleCount}}个班次','<h3>亲爱的 {{employeeName}}：</h3>\r\n<p>您好！系统已为您安排了<strong>{{scheduleCount}}</strong>个工作班次：</p>\r\n<table border=\"1\" cellpadding=\"8\" cellspacing=\"0\" style=\"border-collapse: collapse; width: 100%; margin: 16px 0;\">\r\n  <thead>\r\n    <tr style=\"background-color: #f5f5f5;\">\r\n      <th style=\"text-align: left; padding: 12px;\">排班日期</th>\r\n      <th style=\"text-align: left; padding: 12px;\">班次名称</th>\r\n      <th style=\"text-align: left; padding: 12px;\">工作时间</th>\r\n      <th style=\"text-align: left; padding: 12px;\">工作地点</th>\r\n    </tr>\r\n  </thead>\r\n  <tbody>\r\n    {{#each scheduleList}}\r\n    <tr>\r\n      <td style=\"padding: 10px; border-bottom: 1px solid #eee;\">{{date}}</td>\r\n      <td style=\"padding: 10px; border-bottom: 1px solid #eee;\">{{shiftName}}</td>\r\n      <td style=\"padding: 10px; border-bottom: 1px solid #eee;\">{{shiftTime}}</td>\r\n      <td style=\"padding: 10px; border-bottom: 1px solid #eee;\">{{location}}</td>\r\n    </tr>\r\n    {{/each}}\r\n  </tbody>\r\n</table>\r\n<p><strong>注意事项：</strong></p>\r\n<ul>\r\n<li>请提前查看排班安排，合理安排时间</li>\r\n<li>如有疑问或需要调班，请及时联系管理员</li>\r\n<li>请按时到岗，确保工作正常进行</li>\r\n</ul>\r\n<p><em>生成时间：{{generatedTime}}</em></p>\r\n<hr>\r\n<small>此邮件由AI智能排班系统自动发送，请及时查看安排。如有问题请联系管理员。</small>',NULL,'aiScheduleNotification',1,1,'2025-08-12 17:15:55','2025-08-12 17:39:13'),(6,'调班申请通知','新的调班申请需要处理','<h3>调班申请通知</h3>\n<p>有新的调班申请需要您处理：</p>\n<ul>\n<li><strong>申请人：</strong>{{requesterName}}</li>\n<li><strong>原班次：</strong>{{originalShift}}</li>\n<li><strong>目标班次：</strong>{{targetShift}}</li>\n<li><strong>申请原因：</strong>{{reason}}</li>\n<li><strong>申请时间：</strong>{{requestTime}}</li>\n</ul>\n<p>请登录系统查看详细信息并进行审批。</p>\n<hr>\n<small>此邮件由排班管理系统自动发送。</small>',NULL,'shiftRequest',1,1,'2025-08-12 17:15:55','2025-08-12 17:15:55'),(7,'调班成功通知','您的调班申请已通过','<h3>亲爱的 {{employeeName}}：</h3>\n<p>恭喜！您的调班申请已经通过审批：</p>\n<ul>\n<li><strong>原班次：</strong>{{originalShift}}</li>\n<li><strong>新班次：</strong>{{newShift}}</li>\n<li><strong>审批时间：</strong>{{approvalDate}}</li>\n<li><strong>审批备注：</strong>{{approvalNotes}}</li>\n</ul>\n<p>请按照新的班次安排准时到岗。</p>\n<hr>\n<small>此邮件由排班管理系统自动发送。</small>',NULL,'shiftRequestApproved',1,1,'2025-08-12 17:15:55','2025-08-14 17:09:17');
/*!40000 ALTER TABLE `email_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_no` varchar(50) NOT NULL COMMENT '员工编号',
  `name` varchar(100) NOT NULL COMMENT '员工姓名',
  `email` varchar(255) NOT NULL COMMENT '员工邮箱',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号码',
  `position` varchar(100) DEFAULT NULL COMMENT '职位',
  `hire_date` date DEFAULT NULL COMMENT '入职日期',
  `status` enum('active','inactive','leave') NOT NULL DEFAULT 'active' COMMENT '员工状态',
  `role` enum('admin','employee') DEFAULT 'employee',
  `max_shifts_per_week` int NOT NULL DEFAULT '5' COMMENT '每周最大班次数',
  `max_shifts_per_day` int NOT NULL DEFAULT '1' COMMENT '每日最大班次数',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  `password` varchar(255) NOT NULL COMMENT '密码(加密)',
  `experience_level` int DEFAULT '1' COMMENT '经验等级(1-5)',
  `temporary_notes` text COMMENT '临时排班备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_no` (`employee_no`),
  UNIQUE KEY `unique_employee_email` (`email`),
  UNIQUE KEY `employee_no_8` (`employee_no`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `employee_no_9` (`employee_no`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `employee_no_10` (`employee_no`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `employee_no_11` (`employee_no`),
  UNIQUE KEY `email_11` (`email`),
  UNIQUE KEY `employee_no_12` (`employee_no`),
  UNIQUE KEY `email_12` (`email`),
  UNIQUE KEY `employee_no_13` (`employee_no`),
  UNIQUE KEY `email_13` (`email`),
  UNIQUE KEY `employee_no_14` (`employee_no`),
  UNIQUE KEY `email_14` (`email`),
  UNIQUE KEY `employee_no_15` (`employee_no`),
  UNIQUE KEY `email_15` (`email`),
  UNIQUE KEY `employee_no_16` (`employee_no`),
  UNIQUE KEY `email_16` (`email`),
  UNIQUE KEY `employee_no_17` (`employee_no`),
  UNIQUE KEY `email_17` (`email`),
  UNIQUE KEY `employee_no_18` (`employee_no`),
  UNIQUE KEY `email_18` (`email`),
  UNIQUE KEY `employee_no_19` (`employee_no`),
  UNIQUE KEY `email_19` (`email`),
  UNIQUE KEY `employee_no_20` (`employee_no`),
  UNIQUE KEY `email_20` (`email`),
  UNIQUE KEY `employee_no_21` (`employee_no`),
  UNIQUE KEY `email_21` (`email`),
  UNIQUE KEY `employee_no_22` (`employee_no`),
  UNIQUE KEY `email_22` (`email`),
  UNIQUE KEY `employee_no_23` (`employee_no`),
  UNIQUE KEY `email_23` (`email`),
  UNIQUE KEY `employee_no_24` (`employee_no`),
  UNIQUE KEY `email_24` (`email`),
  UNIQUE KEY `employee_no_25` (`employee_no`),
  UNIQUE KEY `email_25` (`email`),
  UNIQUE KEY `employee_no_26` (`employee_no`),
  UNIQUE KEY `email_26` (`email`),
  UNIQUE KEY `employee_no_27` (`employee_no`),
  UNIQUE KEY `email_27` (`email`),
  UNIQUE KEY `employee_no_28` (`employee_no`),
  UNIQUE KEY `email_28` (`email`),
  UNIQUE KEY `employee_no` (`employee_no`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `employee_no_2` (`employee_no`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `employee_no_3` (`employee_no`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `employee_no_4` (`employee_no`),
  UNIQUE KEY `email_4` (`email`),
  KEY `idx_employee_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='å‘˜å·¥ä¿¡æ¯è¡¨';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (19,'EMP815808','陈益金（管理）','1979704182@qq.com','18320210318',NULL,'2025-08-13','active','employee',5,1,'2025-08-13 23:43:35','2025-08-21 18:01:40','$2b$12$XwyietRHuLd5WOd7FrYFHuSZghKfi3DSxGKDYJtQea2nLmDx04GH.',1,NULL),(23,'EMP384908','测试账号','admin@test.com','18320210318',NULL,'2025-08-21','active','admin',5,1,'2025-08-21 17:59:44','2025-08-21 18:01:36','$2b$10$dg/c6d9Dq59bM2FYlDKsauozoa1fPjIrAqjbDchdmqp8MARrPCeO6',1,NULL);
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_rules`
--

DROP TABLE IF EXISTS `schedule_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(100) NOT NULL COMMENT '规则名称',
  `rule_type` enum('max_shifts_per_day','max_shifts_per_week','min_rest_hours','fairness_weight','priority_rule') NOT NULL COMMENT '规则类型',
  `rule_value` json NOT NULL COMMENT '规则值(JSON格式)',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `priority` int NOT NULL DEFAULT '0' COMMENT '规则优先级',
  `description` text COMMENT '规则描述',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_rule_type` (`rule_type`),
  KEY `idx_priority` (`priority`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='æŽ’ç­è§„åˆ™é…ç½®è¡¨';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_rules`
--

LOCK TABLES `schedule_rules` WRITE;
/*!40000 ALTER TABLE `schedule_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedule_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_templates`
--

DROP TABLE IF EXISTS `schedule_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_templates` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `name` varchar(100) NOT NULL COMMENT '模板名称',
  `description` text COMMENT '模板描述',
  `template_data` json NOT NULL COMMENT '模板数据 [{employeeId, timeSlotId, dayOfWeek, notes}]',
  `template_type` enum('weekly','custom') NOT NULL DEFAULT 'weekly' COMMENT '模板类型',
  `strategy` enum('fair','priority','experience') NOT NULL DEFAULT 'fair' COMMENT '排班策略',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `is_global` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否为全局模板',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='排班模板表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_templates`
--

LOCK TABLES `schedule_templates` WRITE;
/*!40000 ALTER TABLE `schedule_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedule_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedules`
--

DROP TABLE IF EXISTS `schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL COMMENT 'å‘˜å·¥ID',
  `time_slot_id` int NOT NULL COMMENT 'æ—¶é—´æ®µID',
  `week_start_date` date NOT NULL COMMENT '周开始日期(周一)',
  `schedule_date` date NOT NULL COMMENT '排班日期',
  `status` enum('scheduled','confirmed','completed','cancelled') NOT NULL DEFAULT 'scheduled' COMMENT '排班状态',
  `assigned_by` int DEFAULT NULL COMMENT 'åˆ†é…äººå‘˜ID',
  `assigned_method` varchar(20) DEFAULT 'manual' COMMENT '分配方式: manual(手动), ai(AI推荐)',
  `notes` text COMMENT '备注',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  `ai_confidence` decimal(3,2) DEFAULT NULL COMMENT 'AI排班置信度(0-1)',
  `ai_reason` text COMMENT 'AI推荐理由',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_schedule` (`employee_id`,`time_slot_id`,`schedule_date`),
  KEY `idx_employee_week` (`employee_id`,`week_start_date`),
  KEY `idx_schedule_date` (`schedule_date`),
  KEY `idx_timeslot_date` (`time_slot_id`,`schedule_date`),
  KEY `assigned_by` (`assigned_by`)
) ENGINE=InnoDB AUTO_INCREMENT=402 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='æŽ’ç­ç»“æžœè¡¨';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedules`
--

LOCK TABLES `schedules` WRITE;
/*!40000 ALTER TABLE `schedules` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shift_requests`
--

DROP TABLE IF EXISTS `shift_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shift_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `requester_id` int NOT NULL COMMENT 'ç”³è¯·äººID',
  `original_schedule_id` int NOT NULL COMMENT 'åŽŸæŽ’ç­è®°å½•ID',
  `target_employee_id` int DEFAULT NULL COMMENT 'ç›®æ ‡å‘˜å·¥ID(æ¢ç­)',
  `target_time_slot_id` int DEFAULT NULL COMMENT 'ç›®æ ‡æ—¶é—´æ®µID(è°ƒç­)',
  `target_date` date DEFAULT NULL COMMENT '目标日期(调班)',
  `request_type` enum('swap','transfer','cancel') NOT NULL COMMENT '申请类型:换班/转班/取消',
  `reason` text COMMENT '申请原因',
  `status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending' COMMENT '申请状态',
  `approved_by` int DEFAULT NULL COMMENT 'å®¡æ‰¹äººID',
  `approved_at` datetime DEFAULT NULL COMMENT '审批时间',
  `approval_notes` text COMMENT '审批备注',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_requester` (`requester_id`),
  KEY `idx_status` (`status`),
  KEY `idx_original_schedule` (`original_schedule_id`),
  KEY `target_employee_id` (`target_employee_id`),
  KEY `target_time_slot_id` (`target_time_slot_id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='è°ƒç­ç”³è¯·è¡¨';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shift_requests`
--

LOCK TABLES `shift_requests` WRITE;
/*!40000 ALTER TABLE `shift_requests` DISABLE KEYS */;
INSERT INTO `shift_requests` VALUES (11,20,382,22,26,'2025-08-19','swap','肚子疼','approved',19,'2025-08-14 17:05:42','批准','2025-08-14 17:00:37','2025-08-21 17:58:18','2025-08-21 09:58:18');
/*!40000 ALTER TABLE `shift_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ä¸»é”®ID',
  `category` enum('general','schedule','notification','ai') NOT NULL COMMENT 'è®¾ç½®ç±»åˆ«',
  `key` varchar(100) NOT NULL COMMENT 'è®¾ç½®é”®å',
  `value` json NOT NULL COMMENT 'è®¾ç½®å€¼(JSONæ ¼å¼)',
  `description` text COMMENT 'è®¾ç½®æè¿°',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'æ˜¯å¦å¯ç”¨',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åˆ›å»ºæ—¶é—´',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'æ›´æ–°æ—¶é—´',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_category_key` (`category`,`key`),
  KEY `idx_category` (`category`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ç³»ç»Ÿè®¾ç½®è¡¨';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES (10,'general','system_config','{\"workDays\": [\"1\", \"2\", \"3\", \"4\", \"5\"], \"weekStartDate\": \"2025-08-18\"}','general - system_config 设置',1,'2025-08-12 14:51:21','2025-08-21 17:58:07'),(11,'notification','email_config','{\"enabled\": true, \"smtpSsl\": false, \"fromName\": \"排班管理系统\", \"smtpHost\": \"smtp.qq.com\", \"smtpPort\": 587, \"smtpUser\": \"1979704182@qq.com\", \"smtpPassword\": \"gjgnluprpbtzdcja\"}','notification - email_config 设置',1,'2025-08-13 01:29:07','2025-08-13 11:01:05'),(12,'notification','email_events','{\"newSchedule\": true, \"shiftRequest\": true, \"scheduleChange\": true, \"scheduleReminder\": true, \"shiftRequestApproved\": true, \"aiScheduleNotification\": true}','notification - email_events 设置',1,'2025-08-13 01:29:07','2025-08-13 01:29:07'),(13,'ai','ai_config','{\"config\": {\"deepseek\": {\"apiKey\": \"sk-74a71a3795ca4fbf90e4997638e682b8\"}}, \"enabled\": true, \"provider\": \"deepseek\"}','ai - ai_config 设置',1,'2025-08-13 11:35:09','2025-08-13 11:35:09'),(14,'general','website_url','{\"url\": \"http://8.138.227.145:3000\"}','Website base URL for email links',1,'2025-08-21 09:53:58','2025-08-21 09:53:58');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `time_slots`
--

DROP TABLE IF EXISTS `time_slots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `time_slots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT '时间段名称',
  `day_of_week` tinyint DEFAULT NULL COMMENT '星期几(1=周一,7=周日)',
  `start_time` time NOT NULL COMMENT '开始时间',
  `end_time` time NOT NULL COMMENT '结束时间',
  `required_people` int NOT NULL DEFAULT '1' COMMENT '需要人数',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_slot` (`start_time`,`end_time`) USING BTREE,
  KEY `idx_day_time` (`day_of_week`,`start_time`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='æ—¶é—´æ®µé…ç½®è¡¨';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `time_slots`
--

LOCK TABLES `time_slots` WRITE;
/*!40000 ALTER TABLE `time_slots` DISABLE KEYS */;
INSERT INTO `time_slots` VALUES (24,'早班',NULL,'09:00:00','13:00:00',1,1,'2025-08-12 14:52:15','2025-08-12 14:52:15'),(25,'中班',NULL,'13:00:00','17:00:00',1,1,'2025-08-12 14:52:29','2025-08-12 14:52:29'),(26,'晚班',NULL,'17:00:00','21:00:00',1,1,'2025-08-12 14:52:44','2025-08-12 14:52:44');
/*!40000 ALTER TABLE `time_slots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'schedule_system'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-22  4:09:13
