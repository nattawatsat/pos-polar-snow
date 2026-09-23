const { db } = require("../db");
const config = require("../config");

// transaction เดียว: INSERT cart + toppings (แก้ race เดิมที่ forEach(db.get) ไม่ await)
function addToCart({ table_id, food_id, size_id, note, toppings = [], qtyByTopping = {} }) {
  return db.transaction(() => {
    const { lastInsertRowid } = db.prepare("INSERT INTO cart (table_id, food_id, size_id, note) VALUES (?,?,?,?)")
      .run(table_id, food_id, size_id || config.defaultSizeId, note || "");
    for (const tp of toppings) {
      const row = db.prepare("SELECT topping_price FROM toppings WHERE topping_id=?").get(tp);
      if (row) db.prepare("INSERT INTO cart_toppings (cart_id, topping_id, price, quantity) VALUES (?,?,?,?)")
        .run(lastInsertRowid, tp, row.topping_price, parseInt(qtyByTopping[tp], 10) || 1);
    }
    return Number(lastInsertRowid);
  })();
}
function confirmOrder(table_id) {
  const { cartRepo } = require("../repositories/repos");
  const rows = cartRepo.rawByTable(table_id);
  if (!rows.length) return null;
  return db.transaction(() => {
    const { lastInsertRowid: orderId } = db.prepare("INSERT INTO orders (table_id, status) VALUES (?,'pending')").run(table_id);
    const grouped = {};
    rows.forEach((r) => {
      (grouped[r.cart_id] ||= { food_id: r.food_id, size_id: r.size_id, note: r.note, toppings: [] });
      if (r.topping_id) grouped[r.cart_id].toppings.push({ topping_id: r.topping_id, price: r.topping_price });
    });
    for (const item of Object.values(grouped)) {
      const { lastInsertRowid: oiId } = db.prepare("INSERT INTO order_items (order_id, food_id, size_id, note) VALUES (?,?,?,?)")
        .run(orderId, item.food_id, item.size_id || config.defaultSizeId, item.note || "");
      for (const tp of item.toppings)
        db.prepare("INSERT INTO order_item_toppings (order_item_id, topping_id, price, quantity) VALUES (?,?,?,1)").run(oiId, tp.topping_id, tp.price);
    }
    db.prepare("DELETE FROM cart_toppings WHERE cart_id IN (SELECT cart_id FROM cart WHERE table_id=?)").run(table_id);
    db.prepare("DELETE FROM cart WHERE table_id=?").run(table_id);
    return Number(orderId);
  })();
}
// เก็บ payment ต่อ order (แก้บั๊กเดิมที่ cash เก็บแค่ orderIds[0] และ qr SUM ซ้ำ)
function completePayment(table_id, method) {
  const { orderRepo } = require("../repositories/repos");
  const { cartTotal } = require("../utils/pricing");
  return db.transaction(() => {
    const orders = orderRepo.openByTable(table_id);
    if (!orders.length) return null;
    let grand = 0;
    for (const o of orders) {
      const items = orderRepo.itemsByOrderIds([o.order_id]);
      const total = items.reduce((s, it) => s + it.price, 0);
      grand += total;
      db.prepare("INSERT INTO payments (order_id, method, amount) VALUES (?,?,?)").run(o.order_id, method, total);
    }
    db.prepare("UPDATE orders SET status='completed' WHERE table_id=? AND status IN ('pending','done')").run(table_id);
    return grand;
  })();
}
module.exports = { addToCart, confirmOrder, completePayment };
