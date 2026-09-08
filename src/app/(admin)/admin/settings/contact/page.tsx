import { requireAdmin } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings/store";
import { saveSettingsAction } from "../actions";
import { SettingsForm, type FieldSpec } from "../settings-form";

export const metadata = { title: "ติดต่อ" };

const FIELDS: FieldSpec[] = [
  { name: "phone", label: "หมายเลขโทรศัพท์" },
  { name: "email", label: "อีเมล", type: "email" },
  { name: "mapEmbedUrl", label: "ลิงก์แผนที่ฝัง", type: "url" },
  { name: "facebookUrl", label: "Facebook", type: "url" },
  { name: "youtubeUrl", label: "YouTube", type: "url" },
  {
    name: "privacyNote",
    label: "ข้อความแจ้ง PDPA ใต้แบบฟอร์ม",
    type: "textarea",
    hint: "อธิบายว่าเก็บข้อมูลใดและเพื่ออะไร",
  },
];

export default async function Page() {
  await requireAdmin();
  const values = await getSetting("contact");
  const action = saveSettingsAction.bind(null, "contact");
  return <SettingsForm action={action} fields={FIELDS} values={values} />;
}
