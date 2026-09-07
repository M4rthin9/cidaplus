CREATE TYPE "public"."menu_location" AS ENUM('header', 'footer_a', 'footer_b');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('news', 'event');--> statement-breakpoint
CREATE TYPE "public"."price_display" AS ENUM('exact', 'from', 'contact', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'editor');--> statement-breakpoint
CREATE TABLE "locales" (
	"code" varchar(16) PRIMARY KEY NOT NULL,
	"label_native" varchar(64) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"last_login_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"filename" varchar(255) NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"mime" varchar(128) NOT NULL,
	"width" integer,
	"height" integer,
	"bytes" integer NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"blurhash" varchar(128),
	"uploaded_by" varchar(36),
	"is_seed" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "media_i18n" (
	"media_id" varchar(36) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"alt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_i18n_media_id_locale_pk" PRIMARY KEY("media_id","locale")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"parent_id" varchar(36),
	"hero_media_id" varchar(36),
	"icon_media_id" varchar(36),
	"og_media_id" varchar(36),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_i18n" (
	"category_id" varchar(36) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"seo_title" varchar(255),
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_i18n_category_id_locale_pk" PRIMARY KEY("category_id","locale"),
	CONSTRAINT "category_i18n_locale_slug_key" UNIQUE("locale","slug")
);
--> statement-breakpoint
CREATE TABLE "product_i18n" (
	"product_id" varchar(36) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_desc" text,
	"body" jsonb,
	"seo_title" varchar(255),
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_i18n_product_id_locale_pk" PRIMARY KEY("product_id","locale"),
	CONSTRAINT "product_i18n_locale_slug_key" UNIQUE("locale","slug")
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"product_id" varchar(36) NOT NULL,
	"media_id" varchar(36) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_media_product_id_media_id_pk" PRIMARY KEY("product_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "product_spec_i18n" (
	"spec_id" varchar(36) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"label" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_spec_i18n_spec_id_locale_pk" PRIMARY KEY("spec_id","locale")
);
--> statement-breakpoint
CREATE TABLE "product_specs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"product_id" varchar(36) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"category_id" varchar(36) NOT NULL,
	"price" numeric(12, 2),
	"price_display" "price_display" DEFAULT 'exact' NOT NULL,
	"sku" varchar(64),
	"badge" varchar(64),
	"line_message_override" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"og_media_id" varchar(36),
	"is_seed" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_i18n" (
	"post_id" varchar(36) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"excerpt" text,
	"body" jsonb,
	"seo_title" varchar(255),
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_i18n_post_id_locale_pk" PRIMARY KEY("post_id","locale"),
	CONSTRAINT "post_i18n_locale_slug_key" UNIQUE("locale","slug")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"type" "post_type" DEFAULT 'news' NOT NULL,
	"cover_media_id" varchar(36),
	"event_start_at" timestamp with time zone,
	"event_end_at" timestamp with time zone,
	"event_location" varchar(255),
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"author_id" varchar(36),
	"is_seed" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_i18n" (
	"menu_id" varchar(36) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_i18n_menu_id_locale_pk" PRIMARY KEY("menu_id","locale")
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"location" "menu_location" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menus_location_unique" UNIQUE("location")
);
--> statement-breakpoint
CREATE TABLE "page_i18n" (
	"page_id" varchar(36) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" varchar(255),
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_i18n_page_id_locale_pk" PRIMARY KEY("page_id","locale"),
	CONSTRAINT "page_i18n_locale_slug_key" UNIQUE("locale","slug")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" varchar(64) NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(64) NOT NULL,
	"locale" varchar(16) DEFAULT '*' NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" varchar(36),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_locale_pk" PRIMARY KEY("key","locale")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36),
	"entity" varchar(64) NOT NULL,
	"entity_id" varchar(36),
	"action" varchar(32) NOT NULL,
	"diff" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(64),
	"locale" varchar(16) NOT NULL,
	"subject" varchar(255),
	"body" text NOT NULL,
	"source_path" varchar(512) NOT NULL,
	"ip_hash" varchar(64),
	"is_read" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "line_clicks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"product_id" varchar(36),
	"locale" varchar(16) NOT NULL,
	"path" varchar(512) NOT NULL,
	"referrer" varchar(512),
	"ua_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"from_path" varchar(512) NOT NULL,
	"to_path" varchar(512) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_from_path_key" UNIQUE("from_path")
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_i18n" ADD CONSTRAINT "media_i18n_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_i18n" ADD CONSTRAINT "media_i18n_locale_locales_code_fk" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_icon_media_id_media_id_fk" FOREIGN KEY ("icon_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_og_media_id_media_id_fk" FOREIGN KEY ("og_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_i18n" ADD CONSTRAINT "category_i18n_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_i18n" ADD CONSTRAINT "category_i18n_locale_locales_code_fk" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_i18n" ADD CONSTRAINT "product_i18n_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_i18n" ADD CONSTRAINT "product_i18n_locale_locales_code_fk" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_spec_i18n" ADD CONSTRAINT "product_spec_i18n_spec_id_product_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."product_specs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_spec_i18n" ADD CONSTRAINT "product_spec_i18n_locale_locales_code_fk" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_og_media_id_media_id_fk" FOREIGN KEY ("og_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_i18n" ADD CONSTRAINT "post_i18n_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_i18n" ADD CONSTRAINT "post_i18n_locale_locales_code_fk" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_i18n" ADD CONSTRAINT "menu_i18n_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_i18n" ADD CONSTRAINT "menu_i18n_locale_locales_code_fk" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_i18n" ADD CONSTRAINT "page_i18n_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_i18n" ADD CONSTRAINT "page_i18n_locale_locales_code_fk" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_clicks" ADD CONSTRAINT "line_clicks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "line_clicks_created_idx" ON "line_clicks" USING btree ("created_at");