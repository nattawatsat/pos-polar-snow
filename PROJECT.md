# POS-Polar — Refactor Plan (P-05-app → pos-polar)

## 1. Context
Legacy: `D:\project\1\P-05-app\index.js` (909 บรรทัด, Express 5 + sqlite3 callback + EJS 12 ไฟล์, 19 routes)
Target: `D:\project\1\pos-polar\` (MVC, better-sqlite3 sync + transaction-safe)

Schema จริง (dump 2026-09-23, 13 ตาราง): food, food_toppings, toppings, sizes, food_sizes,
cart, cart_toppings, orders, order_items, order_item_toppings, payments, table_store (+ sqlite_sequence)

## 2. Tech Stack (final)
| Layer | เลือก | เหตุผล |
|---|---|---|
| Runtime | Node 20 LTS, CommonJS | เข้ากัน .bat เดิม |
| Web | Express 4 | เสถียรกว่า v5 สำหรับ POS |
| DB | better-sqlite3 (sync, WAL, FK ON) | transaction ง่าย, แก้ race |
| View | EJS + layout/partials + Bootstrap 5.3 CDN | คง UI เดิม |
| Validation | zod | แทน isValidTableId จุดเดียว |
| Security | helmet | CSP กัน XSS จาก food_pic/note |
| Config/Log | dotenv + morgan | เลิก hardcode port/โต๊ะ/timer |
| Test | vitest + supertest | กันยอดเงินเพี้ยนซ้ำ |

## 3. Structure
```
src/app.js server.js config.js db.js
src/routes/{index,menu,cart,order,payment,admin}.routes.js
src/repositories/{food,cart,order,payment,table}.js
src/services/{cart,order,payment}Service.js
src/utils/{pricing,groupBy}.js
src/middlewares/{validate,asyncHandler,errorHandler}.js
views/layout.ejs + partials + 12 views (refactor ต่อ)
migrate/001_schema.sql | tests/pricing.test.js | data/polarsnow.db (copy)
```

## 4. Bugs ที่ต้องแก้ (อ้าง index.js เดิม)
1. Race `POST /cart/add` (243) + `POST /order/:table` (594): forEach(db.run) ไม่ await → transaction
2. ยอดผิด `GET /qr-complete` (191): SUM บน join นับ food_price ซ้ำตาม topping → สูตรเดียวใน utils/pricing.js
3. `POST /payment/:table` (838): เก็บแค่ orderIds[0] → เก็บต่อ order
4. State-changing GET: /update-status, /delete-order, /cashier-delete-order, /qr-complete → POST/DELETE (+307 redirect เก่า)
5. Validate มีแค่ /menu (25) → zod ทุก route
6. Cascade delete ซ้ำ (664 vs 856) → orderRepo.deleteCascade + ON DELETE CASCADE
7. Cart-group map ซ้ำ (/menu vs /cart) → utils/groupBy.js
8. Inline CSS 8 views → รวม style.css; stop-pos.bat kill :3000 มั่ว → PID file

## 5. Phases / DoD
P0 scaffold + /health ✅ (รอบนี้) → P1 repo+pricing → P2 transaction → P3 routes+zod → P4 views → P5 helmet/auth/bat → P6 test + cutover :3100→:3000
DoD: npm start รัน, order→pay ยอดตรง, test ผ่าน, README 3 actor
