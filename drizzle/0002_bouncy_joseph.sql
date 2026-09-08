ALTER TABLE "media" ADD COLUMN "focal_x" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "focal_y" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "original_kept" boolean DEFAULT false NOT NULL;