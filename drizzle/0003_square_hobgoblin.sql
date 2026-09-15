ALTER TABLE "posts" ADD COLUMN "external_url" varchar(512);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "products_category_published_idx" ON "products" USING btree ("deleted_at","category_id","is_published","published_at");--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "posts_type_published_idx" ON "posts" USING btree ("deleted_at","type","is_published","published_at");--> statement-breakpoint
CREATE INDEX "posts_event_start_idx" ON "posts" USING btree ("event_start_at");--> statement-breakpoint
CREATE INDEX "posts_featured_idx" ON "posts" USING btree ("is_featured");