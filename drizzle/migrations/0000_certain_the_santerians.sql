CREATE TABLE `studio_login_failures` (
	`id` integer PRIMARY KEY NOT NULL,
	`failures` integer NOT NULL,
	`window_start` integer NOT NULL,
	CONSTRAINT "studio_login_failures_single_row" CHECK("studio_login_failures"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `studio_pages` (
	`slug` text PRIMARY KEY NOT NULL,
	`draft_json` text NOT NULL,
	`draft_updated_at` integer NOT NULL,
	`published_json` text,
	`published_at` integer
);
--> statement-breakpoint
CREATE TABLE `studio_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
