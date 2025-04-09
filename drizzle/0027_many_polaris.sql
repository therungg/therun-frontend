ALTER TABLE "events" ADD COLUMN "isForCharity" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "charityName" varchar(255);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "charityUrl" varchar(255);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "restreams" json DEFAULT '[]'::json NOT NULL;