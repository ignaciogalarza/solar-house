ALTER TABLE `electricity_tariffs` ADD `is_prospect` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `electricity_tariffs` ADD `switching_bonus` real;--> statement-breakpoint
ALTER TABLE `electricity_tariffs` ADD `exit_fee` real;
