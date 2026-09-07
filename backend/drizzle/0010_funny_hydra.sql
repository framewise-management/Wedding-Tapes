CREATE TABLE "proposal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"event_type_id" uuid,
	"name" varchar NOT NULL,
	"date" date NOT NULL,
	"location" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "wedding_end_date" date;--> statement-breakpoint
ALTER TABLE "proposal_events" ADD CONSTRAINT "FK_proposal_events_proposal" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_events" ADD CONSTRAINT "FK_proposal_events_event_type" FOREIGN KEY ("event_type_id") REFERENCES "public"."event_types"("id") ON DELETE no action ON UPDATE no action;