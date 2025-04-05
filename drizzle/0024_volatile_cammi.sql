ALTER TABLE "events" ALTER COLUMN "tier" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "scheduleUrl" varchar(255);