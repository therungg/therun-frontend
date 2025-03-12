DROP INDEX "idx_users_username_lower ";--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_username_lower" ON "users" USING btree ((lower("username")));