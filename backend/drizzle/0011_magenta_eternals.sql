ALTER TABLE "proposal_items" ADD COLUMN "proposal_event_id" uuid;--> statement-breakpoint
ALTER TABLE "proposal_packages" ADD COLUMN "proposal_event_id" uuid;--> statement-breakpoint
ALTER TABLE "proposal_items" ADD CONSTRAINT "FK_proposal_items_event" FOREIGN KEY ("proposal_event_id") REFERENCES "public"."proposal_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_packages" ADD CONSTRAINT "FK_proposal_packages_event" FOREIGN KEY ("proposal_event_id") REFERENCES "public"."proposal_events"("id") ON DELETE set null ON UPDATE no action;