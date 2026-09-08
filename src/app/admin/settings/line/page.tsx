import { requireAdmin } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings/store";
import { saveSettingsAction } from "../actions";
import { SettingsForm, type FieldSpec } from "../settings-form";

export const metadata = { title: "LINE" };

const FIELDS: FieldSpec[] = [
  {
    name: "oaId",
    label: "รหัส LINE Official Account",
    required: true,
    placeholder: "@355kxfoj",
    hint: "ใช้เป็นแหล่งข้อมูลเดียวของทั้งลิงก์เพิ่มเพื่อนและลิงก์ส่งข้อความ",
  },
  { name: "buttonLabel", label: "ข้อความบนปุ่ม", required: true },
  {
    name: "messageTemplate",
    label: "ข้อความตั้งต้น",
    type: "textarea",
    required: true,
    hint: "ใช้ {product_name} และ {product_url} แทนชื่อและลิงก์สินค้า",
  },
];

export default async function Page() {
  await requireAdmin();
  const values = await getSetting("line");
  const action = saveSettingsAction.bind(null, "line");
  return <SettingsForm action={action} fields={FIELDS} values={values} />;
}
