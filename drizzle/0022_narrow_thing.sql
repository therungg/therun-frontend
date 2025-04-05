CREATE INDEX "ends_at_index" ON "events" USING btree ("endsAt");--> statement-breakpoint
CREATE INDEX "slug_index" ON "events" USING btree ("slug");