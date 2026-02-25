CREATE TABLE `electricity_tariffs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider_name` text,
	`tariff_name` text,
	`tariff_type` text,
	`is_current` integer DEFAULT false,
	`export_rate` real,
	`standing_charge` real,
	`valid_from` text NOT NULL,
	`valid_to` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `energy_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text NOT NULL,
	`solar_generation_wh` integer,
	`grid_import_wh` integer,
	`grid_export_wh` integer,
	`ev_charge_kwh` real,
	`hot_water_diverted_wh` integer,
	`hot_water_boost_wh` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `energy_readings_timestamp_unique` ON `energy_readings` (`timestamp`);--> statement-breakpoint
CREATE TABLE `export_tracking` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`total_export_kwh` real,
	`total_revenue_eur` real,
	`tax_limit_eur` real DEFAULT 400,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `export_tracking_year_unique` ON `export_tracking` (`year`);--> statement-breakpoint
CREATE TABLE `gas_tariffs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider_name` text,
	`rate_per_kwh` real,
	`standing_charge` real,
	`valid_from` text,
	`valid_to` text,
	`is_current` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `hot_water_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gas_hot_water_percentage` integer,
	`boiler_efficiency` integer DEFAULT 85,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tariff_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tariff_id` integer,
	`name` text,
	`rate` real,
	`start_time` text,
	`end_time` text,
	`days_of_week` text,
	FOREIGN KEY (`tariff_id`) REFERENCES `electricity_tariffs`(`id`) ON UPDATE no action ON DELETE no action
);
