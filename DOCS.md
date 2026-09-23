# DOCS — คู่มือระบบ POS-Polar (ละเอียดรายไฟล์)

> แอป: ระบบสั่งอาหารผ่าน iPad ประจำโต๊ะ + จอครัว + เคาน์เตอร์แคชเชียร์
> Stack: Node 20+ / Express 4 / node:sqlite (WAL) / EJS / Bootstrap 5.3 / zod / helmet

---

## สารบัญ
1. [ภาพรวม + ผังระบบ](#1-ภาพรวม--ผังระบบ)
2. [โฟลว์การใช้งาน 3 บทบาท](#2-โฟลว์การใช้งาน-3-บทบาท)
3. [ไฟล์รายตัว — `src/`](#3-ไฟล์รายตัว--src)
4. [ไฟล์รายตัว — routes ทั้ง 4 ไฟล์ + ตาราง routes 20 เส้น](#4-ไฟล์รายตัว--routes)
5. [ไฟล์รายตัว — `views/` 15 ไฟล์](#5-ไฟล์รายตัว--views)
6. [ไฟล์รายตัว — `public/`, `migrate/`, `tests/`, ไฟล์ราก](#6-ไฟล์รายตัว--public-migrate-tests-ไฟล์ราก)
7. [ฐานข้อมูล 13 ตาราง](#7-ฐานข้อมูล-13-ตาราง)
8. [สูตรคำนวณเงิน + สถานะออเดอร์](#8-สูตรคำนวณเงิน--สถานะออเดอร์)
9. [ความปลอดภัย + PWA/iPad](#9-ความปลอดภัย--pwaipad)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. ภาพรวม + ผังระบบ

```
iPad โต๊ะ N ── /menu/N ──┐
iPad โต๊ะ M ── /menu/M ──┼──▶ Express (src/app.js :3100) ──▶ SQLite (data/polarsnow.db)
จอครัว ─────── /kitchen ──┤         │ repositories (SQL) · services (transaction)
แคชเชียร์ ──── /cashier ──┘         │ views (EJS) ◀── public/ (css+รูป)
```

**หลักการแบ่งชั้น (MVC แบบย่อ):**
`routes/` (รับ request/ส่ง response อย่างเดียว) → `services/` (logic + transaction)
→ `repositories/` (SQL ดิบที่เดียว) → `db.js` (connection เดียวทั้งแอป).
`utils/` คือฟังก์ชันบริสุทธิ์ที่ใช้ร่วมกัน (คำนวณเงิน/จัดกลุ่มแถว)

---

## 2. โฟลว์การใช้งาน 3 บทบาท

**ลูกค้า (iPad โต๊ะ N):**
`/tables` (ตอน setup) → `/menu/N` → `/customize/:food/N` → `POST /cart/add`
→ `/cart/N` (ตรวจ/แก้/ลบ) → `POST /order/N` (cart → orders) → `/history/N`
→ `/chose-pay/N` → `/qr/N` → `/qr-complete/N` **หรือ** `/customer-cashier-payment/N`

**ครัว:** `/kitchen` (เห็นเฉพาะ `status='pending'`) → `POST /kitchen/done`
(`pending`→`done`) / ลบออเดอร์

**แคชเชียร์:** `/cashier` → `/cashier-table/:id` (ดูบิลแยกใบ+ยอดรวม)
→ `POST /payment/:table` (ปิดบิล `cash`, `pending/done`→`completed` + ลง `payments`)

---

## 3. ไฟล์รายตัว — `src/`

### `src/server.js` (496 B) — จุดสตาร์ท
- `require ./app` มาสร้างแอป, `app.listen(config.port, config.host)`
- ฟังก์ชัน `getLocalIP()` วน `os.networkInterfaces()` หา IPv4 ที่ไม่ใช่ internal
  ตัวแรก แล้วพิมพ์ log 2 บรรทัด (`Local` + `Network`) — เอาไว้ดู IP ปัจจุบัน
  เวลา IP เปลี่ยน (เช่น สลับ LAN/Wi-Fi)
- รันด้วย `npm start` / `start-pos.bat`. **ไม่มี logic ธุรกิจใดๆ ที่นี่**

### `src/app.js` (927 B) — ประกอบแอป
- `helmet({contentSecurityPolicy:false})` (ปิด CSP เหลือแต่ headers พื้นฐาน
  เพราะยังโหลด Bootstrap CDN + inline script), `morgan("dev")` log request
- `express.json/urlencoded`, `express.static(public)`, ตั้ง view engine `ejs`
- `GET /health` → `{"ok":true}` (ไว้เช็คว่า server ติด), `GET /` → redirect `/menu/1`
- mount routers 4 ไฟล์ตามลำดับ: menu → cart → order → payment
- `errorHandler` เป็น middleware ตัวสุดท้าย (error ใดๆ ที่ throw จะมาตกที่นี่)

### `src/config.js` (576 B) — อ่าน `.env`
- ใช้ `dotenv`, แปลงตัวเลขด้วย `parseInt` พร้อมค่า default:
  `PORT=3100`, `HOST=127.0.0.1`, `DB_PATH=./data/polarsnow.db`,
  `TABLE_MIN/MAX=1/15`, `DEFAULT_SIZE_ID=1`, `QR_IMAGE=/img/qr.png`,
  `QR_COUNTDOWN_SEC=15`, `COMPLETE_REDIRECT_SEC=5`
- **ทุกค่า hardcode เดิม** (พอร์ต, ช่วงโต๊ะ, รูป QR, เวลา countdown) มาอยู่ที่นี่ที่เดียว

### `src/db.js` (1588 B) — เชื่อม SQLite
- ใช้ `node:sqlite` (`DatabaseSync`, built-in ตั้งแต่ Node 22 — **ไม่ต้องคอมไพล์
  native**; เดิมจะใช้ better-sqlite3 แต่ build ไม่ผ่านบน Node 24 จึงเปลี่ยน)
- เปิด `PRAGMA journal_mode=WAL` (อ่าน/เขียนพร้อมกันได้) + `foreign_keys=ON`
- ห่อ API ให้เหมือน better-sqlite3: `db.prepare(sql).get/all/run`,
  `db.exec`, `db.transaction(fn)` (ใช้ BEGIN/COMMIT/ROLLBACK จริง)
- `migrate()` อ่าน `migrate/001_schema.sql` มารัน; `node src/db.js --migrate`

### `src/middlewares/validate.js` (737 B) — ตรวจพารามิเตอร์
- `tableId` = zod `coerce.number().int().min(TABLE_MIN).max(TABLE_MAX)`
- `validateTable` ใช้กับ `/menu/:table_id` (ผิดช่วง → 404 ข้อความไทย);
  `idParam(name)` ตรวจ id ทั่วไป (ไม่ใช่จำนวนเต็มบวก → 400)
- แทน `isValidTableId()` เดิมที่มีแค่หน้าเดียว

### `src/middlewares/staffAuth.js` (693 B) — Basic Auth โซนพนักงาน
- ถ้า `.env` **ไม่ได้ตั้ง** `ADMIN_USER/ADMIN_PASS` → `next()` ผ่านเลย (โหมดร้านเล็ก)
- ถ้าตั้ง → ตรวจ header `Authorization: Basic base64(user:pass)` ผิด/ไม่มี → 401 + `WWW-Authenticate`
- ใช้กับ `GET /kitchen`, `/cashier`, `/cashier-table/*`

### `src/middlewares/asyncHandler.js` (393 B)
- `asyncHandler(fn)` ห่อ route async ส่ง error ต่อให้ `errorHandler`
- `errorHandler` ดึง `table_id` จาก params/body แล้ว **render `views/error.ejs`**
  (หน้าไทย + ปุ่มกลับเมนู) แทนข้อความ `Internal Error` ดิบๆ

### `src/utils/pricing.js` (578 B) — สูตรเงินสูตรเดียวทั้งระบบ
- `itemTotal(foodPrice, extraPrice, toppings)` = `food + extra + Σ(price×qty)`
- `cartTotal(cart)` = รวมทุก item. ใช้ใน services + test
- เกิดมาเพื่อแก้บั๊กเดิมที่ JS กับ SQL คำนวณไม่ตรงกัน (QR นับ `food_price` ซ้ำตาม topping)

### `src/utils/groupBy.js` (1344 B) — จัดกลุ่มแถว join
- `groupCartRows(rows)`: แถวดิบ 1 แถวต่อ 1 topping → รวมเป็น object ต่อ `cart_id`
  (เคยเขียนซ้ำใน `/menu` กับ `/cart`)
- `groupOrderItemRows(rows)`: รวมต่อ `order_item_id` พร้อมคำนวณ `price` ต่อชิ้น
  และรวมชื่อ topping เป็น `"ชื่อ xจำนวน"`

### `src/repositories/repos.js` (2786 B) — SQL อยู่ที่เดียว
- `foodRepo.menuWithToppings()` — ดึง `food` ทั้งหมด + topping ที่อนุญาตต่อจาน
  (`food_toppings JOIN toppings`) → คืน `{categories}` จัดกลุ่มตาม `category`
- `cartRepo.byTable(tableId)` — `CART_SQL` (cart JOIN food/sizes/cart_toppings/toppings)
  แล้วผ่าน `groupCartRows`
- `cartRepo.rawByTable(tableId)` — แถวดิบสำหรับ `confirmOrder` (มี `topping_id/price`)
- `orderRepo.openByTable(tableId)` — orders ที่ `status IN ('pending','done')` ใหม่สุดก่อน
- `orderRepo.itemsByOrderIds(ids)` — สร้าง `IN (?,?,...)` แบบ placeholder ปลอดภัย
  แล้วผ่าน `groupOrderItemRows`
- `orderRepo.deleteCascade(orderId)` — ลบ `order_item_toppings → order_items → orders`
  ใน transaction เดียว (แทนโค้ดลบ 3 ขั้นที่เคยซ้ำ 2 จุด)

### `src/services/services.js` (3145 B) — logic + transaction
- `addToCart({table_id, food_id, size_id, note, toppings, qtyByTopping})` —
  transaction เดียว: `INSERT cart` → วน `SELECT topping_price` → `INSERT cart_toppings`
  (แก้ race เดิมที่ `forEach(db.get)` ไม่ await ทำให้ topping หายตอน redirect)
- `confirmOrder(table_id)` — transaction เดียว: อ่าน cart → `INSERT orders('pending')`
  → จัดกลุ่มตาม `cart_id` → `INSERT order_items + order_item_toppings`
  → ล้าง `cart_toppings/cart` ของโต๊ะ → คืน `orderId` (ตะกร้าว่างคืน `null`)
- `completePayment(table_id, method)` — transaction เดียว: เอา orders ที่เปิดอยู่
  → คำนวณยอด**ต่อใบ** → `INSERT payments` ทีละใบ → `UPDATE orders→'completed'` → คืนยอดรวม
  (แก้บั๊กเดิม: cash เก็บแค่ใบแรก, QR ใช้ SUM บน join ที่นับราคาซ้ำ)

---

## 4. ไฟล์รายตัว — routes

### `src/routes/menu.routes.js` (2135 B)
| Method + Path | ทำอะไร | render/redirect |
|---|---|---|
| `GET /tables` | หน้า setup iPad: อ่าน `table_store` (พัง→ใช้ช่วงจาก config) | `tables.ejs {tables}` |
| `GET /menu/:table_id` | หน้าเมนู (`validateTable`) + ตะกร้าย่อ | `menu.ejs {categories, cart, table_id}` |
| `GET /customize/:food_id/:table_id[?cart_id=]` | หน้าปรับแต่ง: อาหาร 1 จาน + toppings ทั้งหมด + ที่อนุญาต + sizes + ค่าเดิม (ถ้าแก้) | `customize.ejs {food, toppings, allowedToppings, sizes, table_id, cart_id, selectedSize, selectedToppings, note}` |

### `src/routes/cart.routes.js` (2017 B)
| Method + Path | ทำอะไร |
|---|---|
| `GET /cart/:table_id` | หน้าตะกร้า (`cart.ejs`) |
| `POST /cart/add` | normalize `toppings` (dē่ยว→array), `size_id` ว่าง→default, `topping_qty_*` → เรียก `addToCart` → redirect `/menu/:table` |
| `POST /cart/edit/:cart_id` | transaction: `UPDATE cart` → ลบ toppings เดิม → insert ชุดใหม่ → redirect `/cart/:table` |
| `POST /cart/delete/:id/:table_id` | transaction ลบลูกก่อนแม่ → redirect `/cart/:table` |

### `src/routes/order.routes.js` (2647 B)
| Method + Path | ทำอะไร |
|---|---|
| `POST /order/:table_id` | เรียก `confirmOrder`; ได้ id → `/menu/:table` / ตะกร้าว่าง → `/cart/:table` |
| `GET /history/:table_id` | orders ที่เปิดอยู่ + items (map ให้ view) → `history.ejs` |
| `GET /kitchen` 🔒 | เฉพาะ `pending`, join รวม topping ด้วย `GROUP_CONCAT` → `kitchen.ejs {data}` (จอรีเฟรชทุก 5 วิ) |
| `POST /kitchen/done` (ใหม่) / `GET /update-status` (compat) | `pending`→`done` → กลับ `/kitchen` |
| `POST /orders/delete` (ใหม่) / `GET /delete-order`, `/cashier-delete-order` (compat) | `deleteCascade`; มี `table_id` → กลับ `/cashier-table/:table` ไม่งั้น `/kitchen` |

### `src/routes/payment.routes.js` (2145 B)
| Method + Path | ทำอะไร |
|---|---|
| `GET /chose-pay/:table_id` | รวม items ทุกใบที่เปิดอยู่ + `total` → `chose-pay.ejs` |
| `GET /qr/:table_id` | `qr-payment.ejs {table_id, qrImage, countdown}` (countdown เสร็จ → GET `/qr-complete/:table`) |
| `GET /customer-cashier-payment/:table_id` | หน้า "ไปจ่ายที่แคชเชียร์" + redirect กลับเมนู |
| `POST /payments/qr-complete/:table_id` (ใหม่) / `GET /qr-complete/:table_id` (compat) | `completePayment(table,'qrcode')` → `customer-payment-complete.ejs` |
| `POST /payment/:table_id` | `completePayment(table,'cash')` → `payment-complete.ejs {table_id, amount}` / ไม่มีของ → `/cashier` |
| `GET /cashier` 🔒 / `GET /cashier-table/:id` 🔒 | เลือกโต๊ะ / บิลแยกใบ + `total` ต่อใบ |
- `summary(tableId)` helper: `openByTable` → `itemsByOrderIds` ทีละใบ → เติม `total`

---

## 5. ไฟล์รายตัว — `views/`

| ไฟล์ | หน้าที่ + ตัวแปรที่ใช้ + ปุ่มไปไหน |
|---|---|
| `menu.ejs` (87 บรรทัด) | 3 คอลัมน์: nav หมวดซ้าย / grid เมนูกลาง (`food_pic/food_name/food_price` → `/customize/:food/:table`) / sidebar ตะกร้าขวา (ปุ่ม: ดูตะกร้า→`/cart`, สั่งสินค้า→`POST /order`, ประวัติ→`/history`, จ่าย→`/chose-pay`) + PWA meta |
| `customize.ejs` (105) | ฟอร์ม `POST /cart/add` หรือ `/cart/edit/:cart_id`: radio size, checkbox topping (ตัวที่ไม่อนุญาต disabled + จาง), ปุ่ม +/− จำนวน (`updateQty()` inline JS), textarea note → บันทึก/ยกเลิก |
| `cart.ejs` (125) | วน `cart` คำนวณ `price` ต่อชิ้นใน EJS + `total` รวม; ปุ่มปรับแต่ง→customize`?cart_id=`, ลบ→`POST /cart/delete`, กลับเมนู |
| `chose-pay.ejs` (125) | ตาราง `items/total` + ปุ่ม QR→`/qr/:table`, แคชเชียร์→`/customer-cashier-payment/:table`, กลับเมนู |
| `qr-payment.ejs` (96) | โลโก้ + รูป `qrImage` + countdown (`countdown` วิ) → หมดเวลาไป `/qr-complete/:table` |
| `customer-payment-complete.ejs` (49) | "ขอบคุณที่ใช้บริการ" + redirect `/menu/:table` ใน `redirectSec` วิ |
| `customer-cashier-payment.ejs` (40) | "ชำระเงินได้ที่แคชเชียร์" + redirect `/menu/:table` |
| `payment-complete.ejs` (38) | "Payment Complete!" + `amount` + redirect `/cashier` |
| `history.ejs` (98) | การ์ดออเดอร์ (`food_name/toppings/note`) + ปุ่มสั่งเพิ่ม/ชำระเงิน |
| `kitchen.ejs` (79) | ตารางคิว (คิว/โต๊ะ/อาหาร/size/topping/note/สถานะ) + ปุ่มอัปเดต→`/update-status?order_id=` + ลบ→`/delete-order?order_id=` + `setInterval reload 5 วิ` |
| `cashier.ejs` (60) | grid การ์ดโต๊ะจาก `table_store` → `/cashier-table/:id` |
| `cashier-table.ejs` (148) | การ์ดออเดอร์แยกใบ (`items/total`) + ยอดรวม + ปุ่มลบ (มี confirm) → floating button `POST /payment/:table` |
| `tables.ejs` (ใหม่) | setup iPad: ปุ่มใหญ่ 1–15 → `/menu/:table` + วิธี Add to Home Screen + Guided Access |
| `error.ejs` (ใหม่) | หน้าไทย + ปุ่มกลับเมนู (จำโต๊ะ) / เลือกโต๊ะ + ลองใหม่ |
| `layout.ejs` | layout สำรอง (top-nav + `<%- body %>`) — **ยังไม่มีหน้าไหนใช้** (views ปัจจุบันเป็นไฟล์ standalone) |

> หมายเหตุ: `<%= %>` ของ EJS escape HTML ให้แล้ว (กัน XSS จาก note/ชื่อเมนู);
> inline `<style>` ในหลาย view ยังไม่ถูกรวมเข้า `style.css` (งานค้าง)

---

## 6. ไฟล์รายตัว — public / migrate / tests / ไฟล์ราก

- `public/css/style.css` (322 บรรทัด) — theme หลัก: `top-nav`, `left-nav-sticky`,
  `category-title`, `card`, `sidebar/sticky-sidebar`, `btn-pink/orange/green`,
  `size-option/topping-option/qty-control`, `menu-grid`, `Prompt` font
- `public/img/` — รูปเมนู 30 ไฟล์แยกโฟลเดอร์ `1–5` (ตามหมวด) + `logo.jfif`,
  `thanks_logo.jfif`, `qr.png` (QR ตัวอย่าง — **ของจริงต้องแทนด้วย QR พร้อมเพย์ร้าน**)
- `public/manifest.webmanifest` — PWA (`standalone`, `start_url:/tables`, icon=logo)
- `migrate/001_schema.sql` — schema 12 ตาราง + FK (`ON DELETE CASCADE` ที่ลูก cart/order)
  + index `orders(table_id,status)`, `order_items(order_id)`; รันด้วย `npm run migrate`
- `tests/pricing.test.js` — vitest 2 เคส (`base+topping×qty`, null-safe)
- `package.json` — scripts `start/dev/migrate/test`; deps:
  `express@4` (เสถียร ไม่ใช้ v5), `ejs`, `helmet`, `morgan`, `dotenv`, `zod`
  (dev: `vitest`, `supertest`)
- `.env` / `.env.example` — ค่าตามตารางใน README (ไฟล์ `.env` มีจริงแล้ว `HOST=0.0.0.0`)
- `start-pos.bat` — `cd` โฟลเดอร์ตัวเอง + `npm start` + `pause`
- `stop-pos.bat` — kill เฉพาะ `node.exe` ที่ listen `:3100` (ของเดิม kill ทุก process)
- `PROJECT.md` — แผน refactor + บั๊กที่แก้; `README.md` — คู่มือผู้ใช้

---

## 7. ฐานข้อมูล 13 ตาราง

`food(food_id, food_name, food_price, category, food_pic)` ·
`toppings(topping_id PK, topping_name, topping_price)` *(ซ่อมแล้ว: เดิมไม่มี PK จน FK พัง)* ·
`food_toppings(food_id, topping_id)` *(เมนูไหนแต่งอะไรได้บ้าง)* ·
`sizes(size_id, size_name, extra_price)` · `food_sizes(food_id, size_id)` ·
`table_store(table_id, table_number)` ·
`cart(cart_id, table_id, food_id, size_id, note)` (ตะกร้าที่ยังไม่สั่ง) ·
`cart_toppings(id, cart_id→cart CASCADE, topping_id, price, quantity)` ·
`orders(order_id, table_id, status)` · `order_items(order_item_id, order_id→orders CASCADE, food_id, size_id, note)` ·
`order_item_toppings(id, order_item_id→items CASCADE, topping_id, price, quantity)` ·
`payments(payment_id, order_id, method['cash'/'qrcode'], amount, created_at)`
(+ `sqlite_sequence` ของระบบ) ·
ไฟล์ runtime: `data/polarsnow.db` (จริง) + `-wal`/`-shm` (ชั่วคราว ห้ามลบตอนรัน)

---

## 8. สูตรคำนวณเงิน + สถานะออเดอร์

**สูตรต่อชิ้น:** `(food_price + extra_price) + Σ(topping_price × quantity)` —
นับ `food_price` ครั้งเดียวเสมอ (บั๊กเดิมนับซ้ำตามจำนวน topping) —
รวมบิล = Σ ต่อชิ้น; จ่ายทีเดียวหลายใบ = `INSERT payments` ทีละใบ (ไม่ใช่แถวเดียว)

**สถานะ:** `pending` (สั่งแล้วรอครัว) → `done` (ครัวกดอัปเดต) → `completed`
(จ่ายแล้ว; ครัว/แคชเชียร์/ประวัติจะมองไม่เห็นอีก)

---

## 9. ความปลอดภัย + PWA/iPad

- `helmet` headers พื้นฐาน (CSP ปิดเพราะยังพึ่ง CDN+inline script), EJS escape อัตโนมัติ,
  SQL ใช้ placeholder `?` ทั้งหมด (ส่วน `IN (...)` สร้าง `?` เท่าจำนวน id — ปลอดภัย),
  Basic Auth โซนพนักงาน (เมื่อตั้ง env), bind `HOST` คุมว่าให้ LAN เข้าได้หรือไม่
- PWA: manifest + `apple-mobile-web-app-capable` + `apple-touch-icon` ใน 4 หน้าลูกค้า
  + ล็อก zoom; setup: `/tables` → Add to Home Screen → Guided Access
  (iPad มีปุ่ม Home = กด Home 3 ครั้ง, ไม่มี = กดปุ่มบน/ข้าง 3 ครั้ง;
  ต้องติ๊ก `Accessibility Shortcut → Guided Access` ก่อน)

---

## 10. Troubleshooting

| อาการ | สาเหตุ/ทางแก้ |
|---|---|
| `Cannot GET /tables` | server ที่รันเป็นโค้ดเก่า → kill node แล้ว `npm start` ใหม่ |
| มือถือเข้า `127.0.0.1` ไม่ได้ | ปกติ (loopback) → ใช้ IP LAN ของคอม |
| IP เปลี่ยนหลังสลับเน็ต | ดูบรรทัด `LAN http://...` ตอนสตาร์ท; จอง IP (DHCP reservation) |
| `connection timed out` จากเครื่องอื่น | Firewall → เพิ่ม inbound TCP 3100 (ต้อง admin) |
