CREATE TABLE "event_organizers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "event_organizers_id_unique" UNIQUE("id"),
	CONSTRAINT "event_organizers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "createdAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "organizerId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "createdBy" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizerId_event_organizers_id_fk" FOREIGN KEY ("organizerId") REFERENCES "public"."event_organizers"("id") ON DELETE no action ON UPDATE no action;