CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"client_name" varchar NOT NULL,
	"bride_name" varchar,
	"groom_name" varchar,
	"phone" varchar,
	"email" varchar,
	"event_date" date,
	"event_type" varchar,
	"event_duration" integer,
	"location" varchar,
	"services" jsonb,
	"budget" varchar,
	"message" text,
	"source" varchar,
	"status" varchar DEFAULT 'NEW' NOT NULL,
	"assigned_to" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enquiries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;