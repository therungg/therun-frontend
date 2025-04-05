ALTER TABLE "events" ALTER COLUMN "tier" SET DATA TYPE integer USING tier::integer;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "tier" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "name_search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "events"."name")) STORED NOT NULL;