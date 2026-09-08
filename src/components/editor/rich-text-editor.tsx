"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { MediaPicker, type PickerItem } from "@/components/media/media-picker";
import { cn } from "@/lib/utils";

/**
 * Tiptap editor. Emits JSON only — never HTML (SPEC.md §3). Whatever it
 * produces is rebuilt server-side against the whitelist before storage, so this
 * component is a convenience for the operator, not a security boundary.
 */

/** Carries a media id rather than a URL, matching the stored document model. */
const MediaImage = Image.extend({
  addAttributes() {
    return {
      mediaId: { default: null },
      alt: { default: null },
      // Display only. The server drops it and the renderer resolves the media row.
      src: { default: null },
    };
  },
});

type Props = {
  name: string;
  initialDoc: unknown;
  media: PickerItem[];
  mediaUrlFor: (id: string) => string;
};

export function RichTextEditor({ name, initialDoc, media, mediaUrlFor }: Props) {
  const [json, setJson] = useState(() =>
    JSON.stringify(initialDoc ?? { type: "doc", content: [] }),
  );
  const [pick, setPick] = useState<string[]>([]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
      }),
      Link.configure({ openOnClick: false, autolink: false }),
      MediaImage,
    ],
    content: (initialDoc as object) ?? { type: "doc", content: [] },
    editorProps: {
      attributes: {
        class:
          "min-h-64 rounded-b-(--radius-control) border border-t-0 border-(--color-border) bg-(--color-bg) px-4 py-3 leading-[1.8] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => setJson(JSON.stringify(editor.getJSON())),
  });

  // Insert whatever the picker returns, then clear it so the next pick fires.
  useEffect(() => {
    const id = pick[0];
    if (!editor || !id) return;
    const item = media.find((m) => m.id === id);
    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: { mediaId: id, alt: item?.alt ?? "", src: mediaUrlFor(id) },
      })
      .run();
    setPick([]);
  }, [pick, editor, media, mediaUrlFor]);

  if (!editor)
    return <div className="min-h-64 rounded-(--radius-control) border border-(--color-border)" />;

  const tool = (active: boolean) =>
    cn(
      "rounded-(--radius-control) px-2.5 py-1.5 text-sm",
      active
        ? "bg-(--color-brand-tint) text-(--color-brand)"
        : "text-(--color-text) hover:bg-(--color-surface)",
    );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-(--radius-control) border border-(--color-border) bg-(--color-surface) p-2">
        <button
          type="button"
          className={tool(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-pressed={editor.isActive("bold")}
        >
          <b>ตัวหนา</b>
        </button>
        <button
          type="button"
          className={tool(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-pressed={editor.isActive("italic")}
        >
          <i>ตัวเอียง</i>
        </button>
        <span className="mx-1 h-5 w-px bg-(--color-border)" />
        <button
          type="button"
          className={tool(editor.isActive("heading", { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          หัวข้อ
        </button>
        <button
          type="button"
          className={tool(editor.isActive("heading", { level: 3 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          หัวข้อย่อย
        </button>
        <span className="mx-1 h-5 w-px bg-(--color-border)" />
        <button
          type="button"
          className={tool(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          รายการ
        </button>
        <button
          type="button"
          className={tool(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          รายการมีเลข
        </button>
        <button
          type="button"
          className={tool(editor.isActive("blockquote"))}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          คำพูด
        </button>
        <button
          type="button"
          className={tool(false)}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          เส้นคั่น
        </button>
        <span className="mx-1 h-5 w-px bg-(--color-border)" />
        <button
          type="button"
          className={tool(editor.isActive("link"))}
          onClick={() => {
            const href = window.prompt(
              "ลิงก์ (ขึ้นต้นด้วย https:// หรือ /)",
              editor.getAttributes("link").href ?? "",
            );
            if (href === null) return;
            if (href === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href }).run();
          }}
        >
          ลิงก์
        </button>
        <span className="ms-auto">
          <MediaPicker items={media} value={pick} onChange={setPick} triggerLabel="แทรกรูปภาพ" />
        </span>
      </div>

      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={json} />

      <p className="mt-2 text-sm text-(--color-text-muted)">
        รูปภาพต้องเลือกจากคลังภาพเท่านั้น · ระบบจะตรวจสอบเนื้อหาอีกครั้งก่อนบันทึก
      </p>
    </div>
  );
}
