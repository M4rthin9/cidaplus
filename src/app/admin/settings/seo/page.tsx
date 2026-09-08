import { requireAdmin } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings/store";
import { saveSettingsAction } from "../actions";
import { SettingsForm, type FieldSpec } from "../settings-form";

export const metadata = { title: "SEO" };

const FIELDS: FieldSpec[] = [
  { name: "defaultTitle", label: "ชื่อหน้าเริ่มต้น" },
  { name: "titleTemplate", label: "รูปแบบชื่อหน้า", placeholder: "%s — ทัณฑสถานบำบัดพิเศษกลาง" },
  { name: "defaultDescription", label: "คำอธิบายเริ่มต้น", type: "textarea" },
  { name: "ogMediaId", label: "รหัสภาพสำหรับแชร์ (OG)" },
  { name: "ga4Id", label: "รหัส GA4", placeholder: "G-XXXXXXXXXX" },
  { name: "gtmId", label: "รหัส GTM", placeholder: "GTM-XXXXXXX" },
  {
    name: "allowIndexing",
    label: "อนุญาตให้เครื่องมือค้นหาเก็บข้อมูลเว็บไซต์",
    type: "checkbox",
    hint: "ปิดไว้จนกว่าเนื้อหาจริงจะพร้อมเผยแพร่",
  },
];

export default async function Page() {
  await requireAdmin();
  const values = await getSetting("seo");
  const action = saveSettingsAction.bind(null, "seo");
  return <SettingsForm action={action} fields={FIELDS} values={values} />;
}
