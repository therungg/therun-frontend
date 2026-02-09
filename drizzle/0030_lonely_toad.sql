CREATE TABLE "finished_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"game" text NOT NULL,
	"category" text NOT NULL,
	"time" bigint NOT NULL,
	"gameTime" bigint,
	"startedAt" timestamp,
	"endedAt" timestamp NOT NULL,
	"isPb" boolean DEFAULT false,
	"platform" text,
	"emulator" boolean DEFAULT false,
	"runId" integer
);
--> statement-breakpoint
CREATE TABLE "speedrun_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"game" text NOT NULL,
	"category" text NOT NULL,
	"personalBest" bigint,
	"sumOfBests" bigint,
	"attemptCount" integer,
	"finishedAttemptCount" integer,
	"totalRunTime" bigint,
	"platform" text,
	"emulator" boolean DEFAULT false,
	"gameRegion" text,
	"variables" jsonb,
	"hasGameTime" boolean DEFAULT false,
	"gameTimePb" bigint,
	"gameTimeSob" bigint,
	"personalBestTime" timestamp,
	"uploadTime" timestamp,
	"highlighted" boolean DEFAULT false,
	"vod" text,
	"description" text,
	"customUrl" text,
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "finished_runs" ADD CONSTRAINT "finished_runs_runId_speedrun_runs_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."speedrun_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "finished_runs_game_category_ended_at_idx" ON "finished_runs" USING btree ("game","category","endedAt");--> statement-breakpoint
CREATE INDEX "finished_runs_username_ended_at_idx" ON "finished_runs" USING btree ("username","endedAt");--> statement-breakpoint
CREATE INDEX "finished_runs_game_category_time_pb_idx" ON "finished_runs" USING btree ("game","category","time") WHERE "isPb" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "speedrun_runs_username_game_category_idx" ON "speedrun_runs" USING btree ("username","game","category");--> statement-breakpoint
CREATE INDEX "speedrun_runs_game_category_pb_idx" ON "speedrun_runs" USING btree ("game","category","personalBest");--> statement-breakpoint
CREATE INDEX "speedrun_runs_username_idx" ON "speedrun_runs" USING btree ("username");