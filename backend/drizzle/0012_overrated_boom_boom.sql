CREATE TABLE "blocked_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"date" date NOT NULL,
	"reason" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UQ_blocked_dates_business_date" UNIQUE("business_id","date")
);
--> statement-breakpoint
ALTER TABLE "blocked_dates" ADD CONSTRAINT "FK_blocked_dates_business" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;