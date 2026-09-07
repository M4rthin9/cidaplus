import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["owner", "editor"]);

/** How a product's price renders. `contact` shows สอบถามราคา (docs/DESIGN.md). */
export const priceDisplay = pgEnum("price_display", ["exact", "from", "contact", "hidden"]);

export const postType = pgEnum("post_type", ["news", "event"]);

export const menuLocation = pgEnum("menu_location", ["header", "footer_a", "footer_b"]);
