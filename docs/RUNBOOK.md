# RUNBOOK — cidapt.com

คู่มือปฏิบัติการสำหรับเว็บไซต์ทัณฑสถานบำบัดพิเศษกลาง · Operations runbook.

ทุกหัวข้อมีทั้งภาษาไทยและภาษาอังกฤษ คำสั่งทั้งหมดรันบนเซิร์ฟเวอร์ในฐานะผู้ใช้ `cidadeploy`
เว้นแต่จะระบุไว้เป็นอย่างอื่น · Every section is in both languages. Unless stated otherwise, run
commands on the server as `cidadeploy`.

```
ที่อยู่แอป / app directory   /opt/cidaplus
ไฟล์ตั้งค่า / env file        /opt/cidaplus/.env      (chmod 600, ไม่อยู่ใน git / never in git)
ใบรับรอง / certificates       /opt/cidaplus/certs/    (chmod 600)
อิมเมจ / image                ghcr.io/m4rthin9/cidaplus:sha-<commit>
```

> **สถานะการตรวจสอบ · Verification status.** ขั้นตอนสำรองและกู้คืนข้อมูลในเอกสารนี้
> **ทดสอบจริงแล้ว** (ดูหัวข้อ 3) ส่วนการตรวจสอบ TLS และ IP ของผู้เข้าชมในหัวข้อ 8
> **ยังไม่ได้ทดสอบ** เพราะยังไม่มีเซิร์ฟเวอร์และโดเมนจริง — ต้องรันในวันติดตั้ง
> · The backup and restore procedure below has been **tested end to end** (§3). The TLS and
> visitor-IP checks in §8 have **not** — there is no server or domain yet. Run them on install day.

---

## 1. ติดตั้งเซิร์ฟเวอร์ครั้งแรก · First-time server setup

**ไทย.** สำหรับ Ubuntu 24.04 เครื่องใหม่ ทำตามลำดับนี้ สคริปต์ `provision.sh` รันซ้ำได้อย่างปลอดภัย

**English.** For a fresh Ubuntu 24.04 box, in order. `provision.sh` is idempotent — re-running it is
how you apply a change.

```bash
# 1. จากเครื่องของคุณ / from your machine
scp scripts/provision.sh root@<server-ip>:/tmp/
ssh root@<server-ip> 'bash /tmp/provision.sh cidadeploy "ssh-ed25519 AAAA... you@laptop"'

# 2. คัดลอกไฟล์ที่ต้องใช้ / copy what the stack needs
scp docker-compose.yml Caddyfile cidadeploy@<server-ip>:/opt/cidaplus/
scp -r scripts cidadeploy@<server-ip>:/opt/cidaplus/

# 3. สร้างไฟล์ .env / write the env file
ssh cidadeploy@<server-ip>
cd /opt/cidaplus
cat > .env <<'EOF'
WEB_IMAGE=ghcr.io/m4rthin9/cidaplus:latest
POSTGRES_PASSWORD=<openssl rand -base64 24>
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://cidapt.com
NEXT_PUBLIC_SITE_URL=https://cidapt.com
LINE_OA_URL=https://line.me/ti/p/%40355kxfoj
EOF
chmod 600 .env
```

**ไทย — ใบรับรอง.** สร้าง Origin Certificate ใน Cloudflare (SSL/TLS → Origin Server → Create
Certificate) เลือกอายุ 15 ปี ครอบคลุม `cidapt.com` และ `*.cidapt.com` แล้ววางไฟล์ทั้งสอง

**English — certificate.** Generate an Origin Certificate in Cloudflare (SSL/TLS → Origin Server →
Create Certificate), 15 years, covering `cidapt.com` and `*.cidapt.com`, then install both halves:

```bash
mkdir -p /opt/cidaplus/certs && chmod 700 /opt/cidaplus/certs
# วางเนื้อหาใบรับรองและคีย์ / paste the certificate and the private key
nano /opt/cidaplus/certs/origin.pem
nano /opt/cidaplus/certs/origin.key
chmod 600 /opt/cidaplus/certs/*
```

**ไทย — ไฟร์วอลล์.** `provision.sh` เปิดพอร์ต 80/443 ให้ทุกคน ต้องจำกัดเฉพาะช่วง IP ของ Cloudflare
มิฉะนั้นผู้โจมตีเข้าถึง origin ได้โดยตรงและ Cloudflare จะไม่มีความหมาย

**English — firewall.** `provision.sh` opens 80/443 to the world. Restrict them to Cloudflare's
ranges, or the origin is directly reachable and the edge is decorative:

```bash
sudo ufw delete allow 80/tcp && sudo ufw delete allow 443/tcp
for ip in $(curl -s https://www.cloudflare.com/ips-v4) $(curl -s https://www.cloudflare.com/ips-v6); do
  sudo ufw allow from "$ip" to any port 80,443 proto tcp
done
sudo ufw allow from <your-office-ip> to any port 443 proto tcp   # ทางออกฉุกเฉิน / emergency access
sudo ufw status numbered
```

ตั้งค่า Cloudflare ตาม SPEC.md §11 · Configure Cloudflare per SPEC.md §11: SSL/TLS **Full
(strict)**, Always Use HTTPS, Brotli, HTTP/3, Bot Fight Mode **off**, cache `/_next/static/*` and
`/media/*` for a year, bypass cache on `/admin/*`, `/api/*`, `/go/line*`, and disable Rocket Loader,
Auto Minify and Email Obfuscation on `/admin/*`.

---

## 2. การติดตั้งเวอร์ชันใหม่ · Deploying

**ไทย.** ทุกเวอร์ชันสร้างเป็นอิมเมจใน GitHub Actions ไม่เคย build บนเซิร์ฟเวอร์ — เครื่อง 6 GB
จะหน่วยความจำไม่พอ สคริปต์จะ pull → migrate → เปลี่ยนคอนเทนเนอร์ → ตรวจสุขภาพ →
ย้อนกลับอัตโนมัติหากไม่ผ่าน

**English.** Every version is built as an image by GitHub Actions; the server never builds — a
production build alongside Postgres OOMs a 6 GB box. The script pulls, migrates, swaps the
container, health-checks, and rolls back automatically if it does not come up.

```bash
cd /opt/cidaplus
./scripts/deploy.sh ghcr.io/m4rthin9/cidaplus:sha-abc1234
```

**ย้อนกลับด้วยตนเอง · Manual rollback** — ใส่แท็กเดิม / name the previous tag:

```bash
docker images ghcr.io/m4rthin9/cidaplus --format '{{.Tag}}\t{{.CreatedSince}}'
./scripts/deploy.sh ghcr.io/m4rthin9/cidaplus:sha-<previous>
```

> **ข้อควรระวัง · Caution.** `deploy.sh` รัน migration ก่อนเสมอ และ drizzle-kit **ไม่มีคำสั่งย้อนกลับ**
> การย้อนอิมเมจไม่ย้อนสคีมา ถ้า migration ลบคอลัมน์ ต้องกู้จากไฟล์สำรอง (หัวข้อ 3)
> · `deploy.sh` migrates first and drizzle-kit has **no down migration**. Rolling the image back does
> not roll the schema back. If a migration dropped a column, recovery is a restore (§3).

**แก้ไข Caddyfile · Changing the Caddyfile.** `Caddyfile` ตั้ง `admin off` จึง**ไม่มี** `caddy reload`
— แก้ไฟล์แล้วต้องรีสตาร์ตคอนเทนเนอร์ · The Caddyfile sets `admin off`, so there is no admin API and
`caddy reload` cannot work. Edit the file, then restart the container:

```bash
docker compose --env-file .env restart caddy
docker compose --env-file .env logs --tail=20 caddy   # ต้องไม่มี error
```

---

## 3. สำรองและกู้คืนข้อมูล · Backup and restore

**ไทย.** คอนเทนเนอร์ `backup` ทำงานทุกคืนเวลา 03:15 น. (เวลาไทย) สร้างไฟล์ dump ของฐานข้อมูลและ
ไฟล์บีบอัดของรูปภาพ เก็บรายวัน 7 ชุด รายสัปดาห์ 4 ชุด และลบข้อมูลคลิก LINE ที่เก่ากว่า 30 วัน

**English.** The `backup` container runs nightly at 03:15 Asia/Bangkok: a database dump plus a media
tarball, 7 daily and 4 weekly copies, and it prunes `line_clicks` past 30 days.

```bash
# ดูรายการไฟล์สำรอง / list backups
docker compose --env-file .env exec backup ls -lh /backups/daily /backups/weekly

# สั่งสำรองทันที / run one now
docker compose --env-file .env exec backup sh /usr/local/bin/backup.sh

# คัดลอกออกนอกเครื่อง — ทำสม่ำเสมอ / copy off the box, regularly
docker run --rm -v cidaplus_backups:/b -v "$PWD":/out alpine \
  sh -c 'cp /b/daily/$(ls -1t /b/daily | head -2 | tr "\n" " ") /out/'
```

### กู้คืน · Restore

**ไทย.** คำสั่งด้านล่างผ่านการทดสอบจริงแล้ว: กู้ลงฐานข้อมูลว่างแล้วเทียบจำนวนแถวทุกตาราง ตรงกันทั้งหมด
สคริปต์จะ **ปฏิเสธ** ถ้าฐานข้อมูลปลายทางมีข้อมูลอยู่แล้ว เว้นแต่ระบุ `FORCE=1`

**English.** Tested: restored into an empty database and compared every table — identical. The script
**refuses** a target that already has tables unless `FORCE=1`, so a mistyped command cannot overwrite
production while you meant to seed a spare.

```bash
cd /opt/cidaplus

# 1. หยุดเว็บ เพื่อไม่ให้เขียนทับระหว่างกู้ / stop the web container so nothing writes mid-restore
docker compose --env-file .env stop web

# 2. กู้ฐานข้อมูลและรูปภาพ / restore the database and the media
docker compose --env-file .env exec -T backup sh -c '
  apk add --no-cache bash >/dev/null 2>&1;
  DB_HOST=db DB_USER=cida DB_NAME=cida FORCE=1 \
  bash /usr/local/bin/restore.sh /backups/daily/db-YYYYMMDD-HHMMSS.dump'

docker run --rm -v cidaplus_backups:/b -v cidaplus_media:/m alpine \
  tar -xzf /b/daily/media-YYYYMMDD-HHMMSS.tar.gz -C /m

# 3. เปิดเว็บอีกครั้ง / bring the site back
docker compose --env-file .env start web
docker compose --env-file .env exec web curl -fsS http://localhost:3000/api/health
```

**ผลการทดสอบจริง · Actual tested output** (จากฐานข้อมูล seed / from a seeded database):

```
[restore] target cida@127.0.0.1:5432/cida_restore_test
[restore] restoring schema and data
[restore] unpacking media into /tmp/restored-media
[restore] row counts:
   table    | count
------------+-------
 categories |     4
 media      |     0
 posts      |     4
 products   |    20
 settings   |     2
 users      |     1

ต้นทาง / source     audit=30 cat=4 locales=3 posts=4 prod=20 prod_i18n=20 settings=2 specs=60 users=1
กู้คืน / restored   audit=30 cat=4 locales=3 posts=4 prod=20 prod_i18n=20 settings=2 specs=60 users=1
สคีมา / schema      tables=22 indexes=33 fks=29  (เท่ากันทั้งสองฝั่ง / identical both sides)
รูปภาพ / media      byte-identical
```

---

## 4. เพิ่มผู้ดูแลระบบ · Adding an admin user

**ไทย.** รหัสผ่านส่งผ่านตัวแปรสภาพแวดล้อม จึงไม่ค้างอยู่ในประวัติคำสั่ง
บทบาท `owner` จัดการผู้ดูแลคนอื่นได้ ส่วน `editor` ทำไม่ได้

**English.** The password goes through an environment variable so it never lands in shell history.
`owner` can manage other admins; `editor` cannot.

```bash
cd /opt/cidaplus
docker compose --env-file .env exec -e ADMIN_PASSWORD='<strong-password>' web \
  node node_modules/.bin/tsx scripts/create-admin.ts somchai@cidapt.com "สมชาย ใจดี" owner
```

**ถ้าคำสั่งข้างต้นใช้ไม่ได้** (อิมเมจ production ไม่มี tsx) ให้เพิ่มผ่านหน้าเว็บ `/admin/users`
โดยผู้ดูแลที่มีอยู่ หรือรันสคริปต์จากเครื่องพัฒนาโดยชี้ `DATABASE_URL` มาที่เซิร์ฟเวอร์ผ่าน SSH tunnel
· **If that fails** (the production image carries no tsx), add the user from `/admin/users` as an
existing admin, or run the script from a dev machine with `DATABASE_URL` pointed through an SSH
tunnel.

**ปิดการใช้งานผู้ดูแล · Disabling an admin** — ทำที่ `/admin/users` การปิดจะเพิ่ม `session_version`
ทำให้ token ที่ออกไปแล้วใช้ไม่ได้ทันที · do it at `/admin/users`; deactivating bumps
`session_version`, which invalidates every token already issued.

---

## 5. เปลี่ยนบัญชี LINE · Rotating the LINE account

**ไทย.** บัญชี LINE เก็บไว้ที่เดียวคือฐานข้อมูล ไม่ต้อง deploy ใหม่

**English.** The account lives in exactly one place — the database. No deploy needed.

1. เข้า `/admin/settings/line` · Open `/admin/settings/line`
2. แก้ `รหัส LINE Official Account` เป็น handle ใหม่ เช่น `@newhandle` · Change the OA handle
3. กดบันทึก · Save

**ไทย.** ระบบจะล้างแคชเองและลิงก์ทุกจุดเปลี่ยนทันที ตรวจสอบด้วย:

**English.** The cache is busted on save and every entry point changes at once. Verify:

```bash
curl -sI 'https://cidapt.com/go/line' | grep -i '^location'
# ต้องเห็น handle ใหม่ / must show the new handle
```

`LINE_OA_URL` ใน `.env` เป็นค่าตั้งต้นตอนบูตเท่านั้น ฐานข้อมูลชนะเสมอเมื่อมีค่าแล้ว
· `LINE_OA_URL` in `.env` is a bootstrap value only; the database wins once a row exists.

---

## 6. พื้นที่ดิสก์ถึง 80% · When disk hits 80%

**ไทย.** ดิสก์ 60 GB คือข้อจำกัดจริงของเครื่องนี้ ไล่ตรวจตามลำดับนี้ — จากปลอดภัยที่สุดไปเสี่ยงที่สุด

**English.** 60 GB is this box's real constraint. Work down the list — safest first.

```bash
df -h /
docker system df                                    # อิมเมจ/คอนเทนเนอร์/โวลุม
du -sh /var/lib/docker/volumes/cidaplus_*/_data     # โวลุมไหนโต / which volume grew
```

| ลำดับ · Order | ทำอะไร · Action | คำสั่ง · Command |
|---|---|---|
| 1 | ลบอิมเมจเก่า (ปลอดภัย) · old images, safe | `docker system prune -af --filter "until=168h"` |
| 2 | ย้ายไฟล์สำรองออกนอกเครื่อง · move backups off-box | ดูหัวข้อ 3 · see §3 |
| 3 | ตัด log ของ Caddy · trim Caddy logs | `docker compose --env-file .env exec caddy sh -c 'rm -f /var/log/caddy/*.log.*'` |
| 4 | ตรวจสื่อที่ไม่ถูกใช้งาน · unused media | `/admin/media` — ลบผ่านหน้าเว็บเท่านั้น · delete only through the admin |

> **ห้ามลบไฟล์ในโวลุม `media` ด้วยมือ** — ฐานข้อมูลจะชี้ไปยังไฟล์ที่ไม่มีอยู่ และคลังภาพจะโกหก
> · **Never delete files in the `media` volume by hand** — the database would point at files that do
> not exist and the media library would lie. Soft-delete through `/admin/media` instead.

---

## 7. อ่าน log · Reading logs

```bash
cd /opt/cidaplus

# แอป — ข้อผิดพลาดตอนรัน / the app: runtime errors
docker compose --env-file .env logs -f --tail 100 web

# Caddy — คำขอทั้งหมด พร้อม IP จริงของผู้เข้าชม / every request, with the visitor's real IP
docker compose --env-file .env exec caddy tail -f /var/log/caddy/access.log

# ฐานข้อมูล / the database
docker compose --env-file .env logs --tail 100 db

# งานสำรองข้อมูลเมื่อคืน / last night's backup run
docker compose --env-file .env logs --tail 50 backup
```

**ไทย.** log ของ Caddy เป็น JSON บรรทัดละหนึ่งคำขอ กรองด้วย `jq` ได้:

**English.** Caddy logs one JSON object per request. Filter with `jq`:

```bash
# คำขอที่ตอบ 5xx / requests that returned 5xx
docker compose --env-file .env exec caddy sh -c \
  'cat /var/log/caddy/access.log' | jq -c 'select(.status >= 500) | {ts, status, uri: .request.uri, ip: .request.client_ip}'

# 10 IP ที่เรียกมากที่สุด / top 10 client IPs
docker compose --env-file .env exec caddy sh -c \
  'cat /var/log/caddy/access.log' | jq -r '.request.client_ip' | sort | uniq -c | sort -rn | head
```

---

## 8. ตรวจสอบหลังติดตั้ง · Post-install verification

**ไทย.** ยังไม่เคยรันจริง เพราะยังไม่มีเซิร์ฟเวอร์และโดเมน ให้รันทั้งหมดในวันติดตั้ง
· **English.** Not yet run — there is no server or domain. Run all of these on install day.

```bash
# 1. TLS ต้องเป็น Full (strict): Cloudflare ต้องเชื่อใบรับรองของ origin
#    TLS must be Full (strict): Cloudflare must trust the origin certificate
curl -sI https://cidapt.com | head -1
#    ต้องได้ 200 ไม่ใช่ 526 (ใบรับรอง origin ไม่ถูกต้อง) หรือ 525 (จับมือ TLS ล้มเหลว)
#    expect 200 — not 526 (invalid origin cert) or 525 (TLS handshake failed)

# 2. ต่อตรงไปยัง origin ต้องได้ใบรับรองของ Cloudflare Origin CA
#    hitting the origin directly must present the Cloudflare Origin CA cert
curl -sv --resolve cidapt.com:443:<origin-ip> https://cidapt.com 2>&1 \
  | grep -E 'issuer|subject'
#    ต้องเห็น "Cloudflare Origin CA" / expect "Cloudflare Origin CA"

# 3. log ของ origin ต้องเห็น IP จริงของผู้เข้าชม ไม่ใช่ IP ของ Cloudflare
#    origin logs must show the visitor's IP, not a Cloudflare edge address
docker compose --env-file .env exec caddy sh -c 'tail -5 /var/log/caddy/access.log' \
  | jq -r '.request.client_ip'
#    เทียบกับ IP ของคุณเอง / compare with your own:
curl -s https://api.ipify.org
#    ต้องตรงกัน ถ้าไม่ตรง แปลว่า trusted_proxies ใน Caddyfile ไม่ทำงาน
#    they must match; if not, trusted_proxies in the Caddyfile is not taking effect

# 4. หน้าเว็บพื้นฐาน / the basics
for p in / /categories /contact /sitemap.xml /robots.txt /favicon.ico; do
  echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' https://cidapt.com$p)"
done

# 5. แบบฟอร์มติดต่อต้องบันทึกได้แม้ไม่มี SMTP / the contact form works without SMTP
#    ส่งจากหน้าเว็บ แล้วตรวจที่ /admin/messages ต้องเห็นข้อความและ emailed_at ว่าง
#    submit from the site, then check /admin/messages — the row exists, emailed_at null
```

---

## 9. เหตุการณ์ที่พบบ่อย · Common incidents

| อาการ · Symptom | สาเหตุที่พบบ่อย · Likely cause | ทำอย่างไร · What to do |
|---|---|---|
| เว็บขึ้น 502 · site 502s | `web` ไม่ผ่าน health check | `docker compose --env-file .env logs --tail 100 web`; ถ้าเพิ่ง deploy ให้ย้อนกลับ (หัวข้อ 2) |
| 526 จาก Cloudflare | ใบรับรอง origin หมดอายุ/ผิด · origin cert wrong or expired | ออกใบใหม่ (หัวข้อ 1) แล้ว `docker compose --env-file .env restart caddy` |
| log เห็นแต่ IP ของ Cloudflare | `trusted_proxies` ไม่ทำงาน | ตรวจ Caddyfile แล้ว restart caddy; ดูหัวข้อ 8 ข้อ 3 |
| อัปโหลดรูปไม่สำเร็จ · uploads fail | ดิสก์เต็ม หรือสิทธิ์โวลุม `media` | `df -h /` (หัวข้อ 6); `docker compose --env-file .env exec web ls -ld /data/media` |
| แก้สีแล้วหน้าเว็บไม่เปลี่ยน · theme change not showing | แก้ในฐานข้อมูลตรง ๆ ไม่ผ่านหน้าแอดมิน | แก้ผ่าน `/admin/settings/theme` — การบันทึกจะล้างแคชให้ |
| ไม่มีอีเมลแจ้งเตือนข้อความติดต่อ · no contact-form email | ยังไม่ได้ตั้งค่า SMTP — เป็นสถานะปกติ · SMTP unset, which is expected | ข้อความยังถูกบันทึกครบ ดูที่ `/admin/messages` · nothing is lost; read them at `/admin/messages` |

---

## 10. สิ่งที่ยังค้าง · Outstanding

- **SMTP ยังไม่ได้จัดหา** · SMTP is not provisioned. แบบฟอร์มติดต่อทำงานได้โดยไม่มีมัน
  (`emailed_at` เป็นค่าว่าง) เมื่อได้ผู้ให้บริการแล้ว ใส่ `SMTP_*` ใน `.env` แล้ว deploy ใหม่
  · The form works without it; add the `SMTP_*` values to `.env` and redeploy when a provider is chosen.
- **ไอคอนเป็นของชั่วคราว** · The app icons are provisional (SPEC.md §14 decision 27) — ย่อจากตราสัญลักษณ์
  รอไฟล์ SVG ต้นฉบับหรือมาร์กที่ออกแบบใหม่ แล้วรัน `pnpm tsx scripts/build-brand-assets.ts`
- **ใบรับรอง origin หมดอายุปี 2041** · The origin certificate expires in 15 years.
  ลงบันทึกในปฏิทินขององค์กร ไม่มีระบบเตือนอัตโนมัติ · Put it in an organisational calendar; nothing
  here will remind you.
