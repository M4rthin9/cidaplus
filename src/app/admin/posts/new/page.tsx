import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { localeTabs, mediaPickerItems } from "@/lib/catalog/queries";
import { createPostAction } from "../actions";
import { PostForm } from "../post-form";

export const metadata = { title: "เพิ่มข่าว/กิจกรรม" };

export default async function NewPostPage() {
  await requireAdmin();
  const [media, locales] = await Promise.all([mediaPickerItems(), localeTabs("post", null)]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/posts" className="text-sm text-(--color-brand) hover:underline">
          ← กลับไปหน้าข่าวและกิจกรรม
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">เพิ่มข่าว/กิจกรรม</h1>
      </div>
      <PostForm
        action={createPostAction}
        mode="create"
        media={media}
        locales={locales}
        defaults={{
          type: "news",
          title: "",
          slug: "",
          excerpt: "",
          body: { type: "doc", content: [] },
          coverMediaId: "",
          publishState: "draft",
          publishedAt: "",
          eventStartAt: "",
          eventEndAt: "",
          eventLocation: "",
        }}
      />
    </div>
  );
}
