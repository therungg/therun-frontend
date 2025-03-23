ALTER TABLE "events" ADD COLUMN "isHighlighted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "tier" varchar(255);