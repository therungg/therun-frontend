ALTER TABLE "events" ADD COLUMN "url" varchar(255);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "imageUrl" varchar(255);--> statement-breakpoint
CREATE INDEX "starts_at_index" ON "events" USING btree ("startsAt");