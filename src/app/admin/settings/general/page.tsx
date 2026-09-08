import { requireAdmin } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings/store";
import { saveSettingsAction } from "../actions";
import { SettingsForm, type FieldSpec } from "../settings-form";

export const metadata = { title: "ทั่วไป" };

const FIELDS: FieldSpec[] = [
  { name: "siteName", label: "ชื่อเว็บไซต์", required: true },
  { name: "organisation", label: "หน่วยงานต้นสังกัด" },
  { name: "tagline", label: "คำโปรย" },
  { name: "address", label: "ที่อยู่", type: "textarea" },
  { name: "businessHours", label: "เวลาทำการ", placeholder: "จันทร์–ศุกร์ ๐๘.๓๐–๑๖.๓๐ น." },
  { name: "logoMediaId", label: "รหัสภาพโลโก้", hint: "เลือกจากคลังภาพ แล้ววางรหัสไฟล์" },
  { name: "faviconMediaId", label: "รหัสภาพไอคอนเว็บ" },
  { name: "ogMediaId", label: "รหัสภาพสำหรับแชร์ (OG)" },
];

export default async function Page() {
  await requireAdmin();
  const values = await getSetting("general");
  const action = saveSettingsAction.bind(null, "general");
  return <SettingsForm action={action} fields={FIELDS} values={values} />;
}
