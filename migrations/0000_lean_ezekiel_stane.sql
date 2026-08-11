CREATE TABLE `download_diagnostics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`diagnostics_state` text DEFAULT 'None' NOT NULL,
	`interface` text,
	`download_url` text NOT NULL,
	`dscp` integer DEFAULT 0,
	`ethernet_priority` integer DEFAULT 0,
	`protocol_version` text DEFAULT 'Any',
	`number_of_connections` integer DEFAULT 1,
	`enable_per_connection_results` integer DEFAULT false,
	`time_based_test_duration` integer DEFAULT 0,
	`rom_time` integer,
	`bom_time` integer,
	`eom_time` integer,
	`test_bytes_received` integer DEFAULT 0,
	`total_bytes_received` integer DEFAULT 0,
	`tcp_open_request_time` integer,
	`tcp_open_response_time` integer
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`details` text
);
--> statement-breakpoint
CREATE TABLE `parameters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`type` text NOT NULL,
	`writable` integer DEFAULT true NOT NULL,
	`notification` integer DEFAULT 0 NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT "name3_type3_length_check" CHECK(length("parameters"."name") > 3 AND length("parameters"."type") > 2)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parameters_name_unique` ON `parameters` (`name`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `test_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`test_type` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`status` text NOT NULL,
	`url` text NOT NULL,
	`throughput_mbps` integer,
	`bytes_transferred` integer
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`command_key` text NOT NULL,
	`file_type` text NOT NULL,
	`url` text NOT NULL,
	`username` text,
	`password` text,
	`file_size` integer,
	`target_file_name` text,
	`status` text NOT NULL,
	`startTime` integer NOT NULL,
	`completeTime` integer NOT NULL,
	`fault_code` text,
	`fault_string` text,
	`isUpload` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `upload_diagnostics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`diagnostics_state` text DEFAULT 'None' NOT NULL,
	`interface` text,
	`upload_url` text NOT NULL,
	`dscp` integer DEFAULT 0,
	`ethernet_priority` integer DEFAULT 0,
	`test_file_length` integer NOT NULL,
	`protocol_version` text DEFAULT 'Any',
	`number_of_connections` integer DEFAULT 1,
	`enable_per_connection_results` integer DEFAULT false,
	`time_based_test_duration` integer DEFAULT 0,
	`rom_time` integer,
	`bom_time` integer,
	`eom_time` integer,
	`test_bytes_sent` integer DEFAULT 0,
	`total_bytes_received` integer DEFAULT 0,
	`total_bytes_sent` integer DEFAULT 0,
	`tcp_open_request_time` integer,
	`tcp_open_response_time` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text,
	`first_name` text,
	`last_name` text,
	`profile_image_url` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);