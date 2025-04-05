ALTER TABLE "events" ADD COLUMN "slug" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_slug_unique" UNIQUE("slug");