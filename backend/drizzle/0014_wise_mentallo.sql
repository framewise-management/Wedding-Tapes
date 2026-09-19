ALTER TABLE "businesses" ADD COLUMN "payment_conditions" jsonb;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "payment_modes" jsonb;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "gst_number" varchar;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "invoice_prefix" varchar;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "invoice_next_number" integer;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "receipt_prefix" varchar;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "receipt_next_number" integer;