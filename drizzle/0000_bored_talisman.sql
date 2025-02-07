CREATE TABLE "events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"startsAt" timestamp NOT NULL,
	"endsAt" timestamp NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"location" varchar(255) NOT NULL,
	"bluesky" varchar(255) NOT NULL,
	"discord" varchar(255) NOT NULL,
	"language" varchar(255) NOT NULL,
	"shortDescription" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
