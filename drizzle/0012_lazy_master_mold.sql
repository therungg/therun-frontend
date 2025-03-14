CREATE TABLE "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"remark" varchar(1000),
	"action" varchar(255) NOT NULL,
	"entity" varchar(255) NOT NULL,
	"target" varchar(255),
	"data" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "logs_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;