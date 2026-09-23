# POS-Polar — ระบบ POS ร้าน Polar Snow (Refactored)

ระบบสั่งอาหารผ่านมือถือ + จอครัว + แคชเชียร์ แยกจากโปรเจกต์เดิม `P-05-app`
(`index.js` ไฟล์เดียวยาว 909 บรรทัด) มาเป็นโครง MVC ที่แยก routes/services/repositories
ชัดเจน ใช้ transaction กันข้อมูลพัง และมี validation ทุกเส้น

---

## 1. สิ่งที่ต้องมีก่อนรัน

| อย่าง | เวอร์ชัน |
|---|---|
| Node.js | 20 ขึ้นไป (ทดสอบบน 24.19.0) |
| npm | มากับ Node |
| OS | Windows (มี `start-pos.bat` / `stop-pos.bat`) |
| Network | Wi-Fi วงเดียวกับอุปกรณ์ลูกค้า (ดูข้อ 4) |

ไม่ต้องติดตั้งฐานข้อมูลเพิ่ม — ใช้ SQLite ไฟล์เดียว (`data/polarsnow.db`)
ผ่าน `node:sqlite` ที่มากับ Node เลย

---

## 2. ติดตั้งครั้งแรก

```powershell
cd D:\project\1\pos-polar
npm install
Copy-Item .env.example .env   # แล้วเปิด .env แก้ค่าตามข้อ 3
npm start
```

เปิดเบราว์เซอร์: `http://127.0.0.1:3100/` (จะเด้งไป `/menu/1` เอง)

### สคริปต์ที่มี

| คำสั่ง | ทำอะไร |
|---|---|
| `npm start` | รันเซิร์ฟเวอร์จริง |
| `npm run dev` | รันแบบ watch (แก้โค้ดแล้วรีเอง) |
| `npm run migrate` | รัน `migrate/001_schema.sql` ใส่ DB (ระวัง: สร้างตารางที่ขาด ไม่ลบข้อมูล) |
| `npm test` | รัน unit test (`vitest`) |
| `start-pos.bat` | ดับเบิลคลิกสตาร์ทแบบไม่ต้องเปิด terminal |
| `stop-pos.bat` | ปิดเซิร์ฟเวอร์ (ยิงเฉพาะ node บนพอร์ต 3100) |

---

## 3. ตั้งค่า `.env`

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `PORT` | `3100` | พอร์ตเซิร์ฟเวอร์ |
| `HOST` | `0.0.0.0` | `0.0.0.0` = ให้เครื่องอื่นในวง LAN เข้าได้, `127.0.0.1` = เข้าได้เฉพาะเครื่องตัวเอง |
| `DB_PATH` | `./data/polarsnow.db` | ที่อยู่ไฟล์ฐานข้อมูล |
| `TABLE_MIN` / `TABLE_MAX` | `1` / `15` | ช่วงเลขโต๊ะที่รับ (`/menu/99` จะ 404) |
| `DEFAULT_SIZE_ID` | `1` | size ตั้งต้นเมื่อลูกค้าไม่เลือก |
| `QR_IMAGE` | `/img/qr.png` | รูป QR ที่หน้า `/qr/:table` |
| `QR_COUNTDOWN_SEC` | `15` | เวลานับถอยหลังหน้า QR |
| `COMPLETE_REDIRECT_SEC` | `5` | เวลาก่อน redirect หน้าชำระเสร็จ |
| `ADMIN_USER` / `ADMIN_PASS` | (ว่าง) | เมื่อตั้งทั้งคู่ โซนครัว/แคชเชียร์จะถาม Basic Auth |

---

## 4. วิธีเข้าใช้งาน (3 บทบาท)

### ลูกค้า (iPad ประจำโต๊ะ)
**Setup ครั้งเดียวต่อเครื่อง:** เปิด `http://<IP-คอม>:3100/tables` → แตะเลขโต๊ะ
→ Share → **Add to Home Screen** → เปิดจากไอคอนจะเต็มจอ (PWA standalone)
→ เปิด **Guided Access** ล็อกไว้แอปเดียว (ดูวิธีด้านล่าง)

#### เปิด Guided Access (ทำที่ตัว iPad)
1. `Settings` → `Accessibility` → `Guided Access` → **ON** → ตั้งรหัส
   (`Passcode Settings`) จดรหัสไว้ให้พนักงาน
2. `Settings` → `Accessibility` → `Accessibility Shortcut` (ล่างสุด)
   → ติ๊ก **Guided Access** (ไม่ติ๊ก = กดยังไงก็ไม่ขึ้น)
3. เปิดหน้าเมนูโต๊ะจากไอคอน Home Screen แล้วกดปุ่ม **3 ครั้งรัวๆ**
   - iPad มีปุ่ม Home (เช่น Gen 9): กด**ปุ่ม Home** 3 ครั้ง
   - iPad ไม่มีปุ่ม Home: กด**ปุ่มด้านบน/ข้าง** 3 ครั้ง
   → กด **Start** มุมขวาบน (วงบริเวณที่ห้ามแตะได้ก่อนกด Start)
4. ปลดล็อก: กดปุ่มเดิม 3 ครั้ง → ใส่รหัส → **End**
5. กันจอดับ: `Settings` → `Display & Brightness` → `Auto-Lock` → `Never`

#### เน็ตเวิร์กสำหรับ iPad
- iPad + คอม server ต้องอยู่ Wi-Fi **วงเดียวกัน** (IP ขึ้นต้นชุดเดียวกัน)
- จอง IP ให้คอม (DHCP reservation / static IP) ไม่งั้น IP เปลี่ยน iPad ทุกโต๊ะหลุดหมด
- `127.0.0.1` ใช้ได้เฉพาะบนคอม — iPad ต้องใช้ IP LAN ของคอม
```
http://<IP-คอม>:3100/menu/<เลขโต๊ะ>   เช่น http://192.168.1.112:3100/menu/5
```
- เลือกเมนู → ปรับแต่ง (size/topping/จำนวน/note) → ลงตะกร้า → สั่ง
- ดูประวัติที่ `/history/<โต๊ะ>` → เลือกวิธีจ่ายที่ `/chose-pay/<โต๊ะ>`

> **`127.0.0.1` ใช้ได้เฉพาะบนคอมเครื่องนั้น** มือถือต้องใช้ IP LAN ของคอม
> (ดู IP ปัจจุบันได้จาก log ตอนสตาร์ท บรรทัด `LAN http://...`)
> คอมกับมือถือต้องอยู่ Wi-Fi วงเดียวกัน (IP ขึ้นต้นชุดเดียวกัน)

### ครัว (จอในครัว)
```
http://<IP-คอม>:3100/kitchen
```
- ออเดอร์ `pending` โผล่อัตโนมัติ (จอรีเฟรชทุก 5 วินาที)
- กด **อัปเดต** = ทำเสร็จ (`pending` → `done`) / กด **ลบ** = ยกเลิกออเดอร์

### แคชเชียร์ (เคาน์เตอร์)
```
http://<IP-คอม>:3100/cashier → จิ้มโต๊ะ → /cashier-table/<โต๊ะ>
```
- เห็นออเดอร์แยกใบ + ยอดต่อใบ + ยอดรวม → กด **ชำระเงิน** (บันทึกแบบ `cash`)

---

## 5. รายการ routes ทั้งหมด (19 เส้น)

| Method | Path | ใช้ทำอะไร |
|---|---|---|
| GET | `/` | redirect → `/menu/1` |
| GET | `/health` | เช็คเซิร์ฟเวอร์ (`{"ok":true}`) |
| GET | `/menu/:table_id` | หน้าเมนู + ตะกร้าย่อ |
| GET/POST | ดูตารางเต็มใน `PROJECT.md` | — |
| GET | `/customize/:food_id/:table_id` (`?cart_id=` ตอนแก้ไข) | หน้าปรับแต่ง |
| GET | `/cart/:table_id` | หน้าตะกร้า |
| POST | `/cart/add` | เพิ่มลงตะกร้า |
| POST | `/cart/edit/:cart_id` | แก้ไขของในตะกร้า |
| POST | `/cart/delete/:id/:table_id` | ลบของในตะกร้า |
| POST | `/order/:table_id` | ยืนยันสั่ง (ย้าย cart → orders, transaction เดียว) |
| GET | `/history/:table_id` | ประวัติออเดอร์ที่ยังไม่จ่าย |
| GET | `/kitchen` 🔒 | จอครัว |
| POST | `/kitchen/done` | ติ๊กทำเสร็จ (ของใหม่) |
| GET | `/update-status?order_id=` | ของเดิม (compat → เรียกตัวบน) |
| POST | `/orders/delete` | ลบออเดอร์ (ของใหม่) |
| GET | `/delete-order`, `/cashier-delete-order` | ของเดิม (compat) |
| GET | `/chose-pay/:table_id` | เลือกวิธีจ่าย |
| GET | `/qr/:table_id` | หน้า QR |
| GET | `/qr-complete/:table_id` | จบจ่าย QR (compat) |
| POST | `/payments/qr-complete/:table_id` | จบจ่าย QR (ของใหม่) |
| GET | `/customer-cashier-payment/:table_id` | หน้า "ไปจ่ายที่แคชเชียร์" |
| GET | `/cashier` 🔒 | เลือกโต๊ะ |
| GET | `/cashier-table/:id` 🔒 | บิลของโต๊ะ |
| POST | `/payment/:table_id` | รับเงินสด ปิดบิล |

🔒 = ต้องผ่าน Basic Auth เมื่อตั้ง `ADMIN_USER/ADMIN_PASS`

---

## 6. โครงไฟล์

```
pos-polar/
├── src/
│   ├── app.js            # ประกอบ express (helmet, static, views, routes)
│   ├── server.js         # listen + โชว์ IP LAN
│   ├── config.js         # อ่าน .env
│   ├── db.js             # node:sqlite + WAL + FK ON + migrate()
│   ├── routes/           # menu, cart, order, payment (4 ไฟล์)
│   ├── repositories/     # SQL อยู่ที่เดียว (repos.js)
│   ├── services/         # logic + transaction (services.js)
│   ├── utils/            # pricing.js (สูตรยอดเดียว), groupBy.js
│   └── middlewares/      # validate (zod), staffAuth, asyncHandler
├── views/                # EJS 12 หน้า + layout.ejs สำรอง
├── public/               # css + รูปเมนู
├── migrate/001_schema.sql
├── data/polarsnow.db (+ -wal/-shm ขณะรัน — ไฟล์ชั่วคราวของ SQLite ห้ามลบตอนรัน)
├── tests/pricing.test.js
├── PROJECT.md            # แผน refactor + บั๊กที่แก้
└── start-pos.bat / stop-pos.bat
```

---

## 7. ฐานข้อมูล

SQLite ไฟล์เดียว 13 ตาราง: `food`, `toppings`, `food_toppings`, `sizes`,
`food_sizes`, `cart`, `cart_toppings`, `orders`, `order_items`,
`order_item_toppings`, `payments`, `table_store`

- สถานะออเดอร์: `pending` → `done` (ครัวทำเสร็จ) → `completed` (จ่ายแล้ว)
- **Backup:** ปิดเซิร์ฟเวอร์ก่อน แล้วก๊อป `data/polarsnow.db` (ไฟล์เดียวพอ)
- ห้ามลบ `polarsnow.db-wal` / `-shm` ขณะเซิร์ฟเวอร์รัน (ข้อมูลล่าสุดอยู่ในนั้น)

---

## 8. ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / ทางแก้ |
|---|---|
| มือถือเข้า `127.0.0.1` ไม่ได้ | ปกติ — `127.0.0.1` คือเครื่องตัวเอง ให้ใช้ IP LAN (`192.168.1.x`) |
| มือถือเข้า IP LAN ไม่ได้ | 1) คนละวง Wi-Fi 2) เซิร์ฟเวอร์ดับ 3) Firewall — รัน rule ใน `PROJECT.md` ด้วย admin |
| IP เปลี่ยนหลังสลับเน็ต | ดู IP ใหม่จาก log บรรทัด `LAN http://...` |
| `/menu/99` 404 | ตั้งใจ — แก้ช่วงโต๊ะที่ `TABLE_MIN/MAX` |
| เปิด `/kitchen` แล้วถามรหัส | ตั้ง `ADMIN_USER/ADMIN_PASS` ไว้ — ใส่ตาม `.env` หรือลบออกแล้วรีสตาร์ท |
| `npm install` เตือน allow-scripts | ปกติ (esbuild ของ vitest) ไม่มีผลกับการรัน |

---

## 9. ประวัติ refactor (ย่อ)

ต้นทาง `P-05-app/index.js` (909 บรรทัด, Express 5 + `sqlite3` callback):
MONOLITH → แยกชั้น MVC, Express 4, `node:sqlite` sync (เคยจะใช้
better-sqlite3 แต่คอมไพล์ native ไม่ผ่านบน Node 24), transaction ครอบ
cart→order→payment, สูตรยอดเงินที่เดียว, zod validate, helmet, Basic Auth
โซนพนักงาน, compat routes เก่า, ซ่อม schema (`toppings` ไม่มี PK, FK ชี้
ตารางขยะ, orphan 120 แถว) — รายละเอียดเต็มดู `PROJECT.md`
