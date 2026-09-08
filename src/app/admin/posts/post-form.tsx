"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, FieldError, FormBanner, Hint, Input, Label, Select } from "@/components/ui/field";
import { MediaPicker, type PickerItem } from "@/components/media/media-picker";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { derivativeName, mediaUrl } from "@/lib/media/urls";
import { slugify } from "@/lib/slug";
import type { PostFormState } from "./actions";

const initial: PostFormState = {};

export type PostDefaults = {
  type: "news" | "event";
  title: string;
  slug: string;
  excerpt: string;
  body: unknown;
  coverMediaId: string;
  publishState: "draft" | "scheduled" | "published";
  publishedAt: string;
  eventStartAt: string;
  eventEndAt: string;
  eventLocation: string;
};

export function PostForm({
  action,
  mode,
  media,
  locales,
  defaults,
}: {
  action: (prev: PostFormState, fd: FormData) => Promise<PostFormState>;
  mode: "create" | "edit";
  media: PickerItem[];
  locales: { code: string; label: string; enabled: boolean; complete: boolean }[];
  defaults: PostDefaults;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [type, setType] = useState(defaults.type);
  const [title, setTitle] = useState(defaults.title);
  const [slug, setSlug] = useState(defaults.slug);
  const [slugEdited, setSlugEdited] = useState(Boolean(defaults.slug));
  const [publishState, setPublishState] = useState(defaults.publishState);
  const [cover, setCover] = useState<string[]>(
    defaults.coverMediaId ? [defaults.coverMediaId] : [],
  );

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(title));
  }, [title, slugEdited]);

  const urlFor = (id: string) => {
    const m = media.find((x) => x.id === id);
    return m ? mediaUrl(m.storageKey, derivativeName(800, "jpeg")) : "";
  };

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.message ? (
        <FormBanner kind={state.errors ? "error" : "success"}>{state.message}</FormBanner>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-(--color-border)">
        {locales.map((l) => (
          <span
            key={l.code}
            title={l.enabled ? undefined : "ยังไม่เปิดใช้งานภาษานี้"}
            className={
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm " +
              (l.code === "th"
                ? "border-(--color-brand) text-(--color-heading)"
                : "border-transparent text-(--color-text-muted)")
            }
          >
            {l.label}
            {!l.complete ? (
              <span
                className="size-1.5 rounded-full bg-(--color-brand)"
                aria-label="ยังแปลไม่ครบ"
              />
            ) : null}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <div>
            <Label htmlFor="title" required>
              หัวข้อ
            </Label>
            <Input
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={state.errors?.title}
            />
            <FieldError id="title-error" message={state.errors?.title} />
          </div>

          <div>
            <Label htmlFor="slug">ลิงก์ (slug)</Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value);
              }}
              error={state.errors?.slug}
            />
            <FieldError id="slug-error" message={state.errors?.slug} />
            <Hint>{slug ? `/news/${slug}` : "สร้างอัตโนมัติจากหัวข้อ"}</Hint>
          </div>

          <div>
            <Label htmlFor="excerpt">เกริ่นนำ</Label>
            <textarea
              id="excerpt"
              name="excerpt"
              rows={2}
              defaultValue={defaults.excerpt}
              className="mt-1.5 block w-full rounded-(--radius-control) border border-(--color-border) bg-(--color-bg) px-3 py-2.5 text-base leading-[1.8] text-(--color-heading) focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
            />
            <FieldError id="excerpt-error" message={state.errors?.excerpt} />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-(--color-heading)">เนื้อหา</legend>
            <div className="mt-1.5">
              <RichTextEditor
                name="body"
                initialDoc={defaults.body}
                media={media}
                mediaUrlFor={urlFor}
              />
            </div>
          </fieldset>
        </div>

        <div className="space-y-5">
          <div>
            <Label htmlFor="type" required>
              ประเภท
            </Label>
            <Select
              id="type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as "news" | "event")}
            >
              <option value="news">ข่าวประชาสัมพันธ์</option>
              <option value="event">กิจกรรม</option>
            </Select>
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-(--color-heading)">ภาพหน้าปก</legend>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <MediaPicker
                items={media}
                value={cover}
                onChange={setCover}
                triggerLabel="เลือกภาพหน้าปก"
              />
              {cover.length === 0 ? (
                <span className="text-sm text-(--color-text-muted)">ยังไม่ได้เลือก</span>
              ) : null}
            </div>
            <input type="hidden" name="coverMediaId" value={cover[0] ?? ""} />
          </fieldset>

          {type === "event" ? (
            <>
              <div>
                <Label htmlFor="eventStartAt" required>
                  เริ่ม
                </Label>
                <Input
                  id="eventStartAt"
                  name="eventStartAt"
                  type="datetime-local"
                  defaultValue={defaults.eventStartAt}
                  error={state.errors?.eventStartAt}
                />
                <FieldError id="eventStartAt-error" message={state.errors?.eventStartAt} />
              </div>
              <div>
                <Label htmlFor="eventEndAt">สิ้นสุด</Label>
                <Input
                  id="eventEndAt"
                  name="eventEndAt"
                  type="datetime-local"
                  defaultValue={defaults.eventEndAt}
                  error={state.errors?.eventEndAt}
                />
                <FieldError id="eventEndAt-error" message={state.errors?.eventEndAt} />
              </div>
              <div>
                <Label htmlFor="eventLocation">สถานที่</Label>
                <Input
                  id="eventLocation"
                  name="eventLocation"
                  defaultValue={defaults.eventLocation}
                  error={state.errors?.eventLocation}
                />
              </div>
            </>
          ) : (
            <>
              <input type="hidden" name="eventStartAt" value="" />
              <input type="hidden" name="eventEndAt" value="" />
              <input type="hidden" name="eventLocation" value="" />
            </>
          )}

          <div>
            <Label htmlFor="publishState" required>
              สถานะ
            </Label>
            <Select
              id="publishState"
              name="publishState"
              value={publishState}
              onChange={(e) => setPublishState(e.target.value as PostDefaults["publishState"])}
            >
              <option value="draft">ฉบับร่าง</option>
              <option value="scheduled">ตั้งเวลาเผยแพร่</option>
              <option value="published">เผยแพร่</option>
            </Select>
          </div>

          {publishState === "scheduled" ? (
            <div>
              <Label htmlFor="publishedAt" required>
                วันและเวลาที่จะเผยแพร่
              </Label>
              <Input
                id="publishedAt"
                name="publishedAt"
                type="datetime-local"
                defaultValue={defaults.publishedAt}
                error={state.errors?.publishedAt}
              />
              <FieldError id="publishedAt-error" message={state.errors?.publishedAt} />
            </div>
          ) : (
            <input type="hidden" name="publishedAt" value={defaults.publishedAt} />
          )}
        </div>
      </div>

      <div className="border-t border-(--color-border) pt-5">
        <Button type="submit" disabled={pending}>
          {pending
            ? "กำลังบันทึก…"
            : mode === "create"
              ? "เพิ่มข่าว/กิจกรรม"
              : "บันทึกการเปลี่ยนแปลง"}
        </Button>
      </div>
    </form>
  );
}
