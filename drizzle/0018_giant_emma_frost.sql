ALTER TABLE "events" ADD COLUMN "oengus" varchar(255);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "tags" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "isFeatured" boolean DEFAULT false NOT NULL;