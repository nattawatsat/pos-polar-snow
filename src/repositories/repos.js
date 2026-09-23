const { db } = require("../db");
const { groupCartRows, groupOrderItemRows } = require("../utils/groupBy");

const foodRepo = {
  menuWithToppings() {
    const foods = db.prepare("SELECT food_id, food_name, food_price, food_pic, category FROM food").all();
    const tops = db.prepare("SELECT ft.food_id, t.topping_id, t.topping_name, t.topping_price FROM food_toppings ft JOIN toppings t ON ft.topping_id=t.topping_id").all();
    const withTops = foods.map((f) => ({ ...f, toppings: tops.filter((t) => t.food_id === f.food_id) }));
    const categories = {};
    withTops.forEach((f) => { (categories[f.category] ||= []).push(f); });
    return { categories };
  },
};
const CART_SQL = `SELECT c.cart_id, f.food_id, f.food_name, f.food_price, c.note, c.size_id,
  s.size_name, s.extra_price AS size_extra, t.topping_name, ct.price AS topping_price, ct.quantity AS topping_qty
  FROM cart c JOIN food f ON c.food_id=f.food_id LEFT JOIN sizes s ON c.size_id=s.size_id
  LEFT JOIN cart_toppings ct ON c.cart_id=ct.cart_id LEFT JOIN toppings t ON ct.topping_id=t.topping_id
  WHERE c.table_id=? ORDER BY c.cart_id`;
const cartRepo = {
  byTable: (tableId) => groupCartRows(db.prepare(CART_SQL).all(tableId)),
  rawByTable: (tableId) => db.prepare(`SELECT c.cart_id,c.food_id,c.size_id,c.note,ct.topping_id,ct.price AS topping_price,f.food_price
    FROM cart c JOIN food f ON c.food_id=f.food_id LEFT JOIN cart_toppings ct ON c.cart_id=ct.cart_id WHERE c.table_id=?`).all(tableId),
};
const ORDER_ITEMS_SQL = (ph) => `SELECT oi.order_id, oi.order_item_id, oi.note, f.food_name, f.food_price,
  s.size_name, s.extra_price, t.topping_name, oit.quantity AS topping_qty, t.topping_price
  FROM order_items oi JOIN food f ON oi.food_id=f.food_id LEFT JOIN sizes s ON oi.size_id=s.size_id
  LEFT JOIN order_item_toppings oit ON oi.order_item_id=oit.order_item_id LEFT JOIN toppings t ON oit.topping_id=t.topping_id
  WHERE oi.order_id IN (${ph}) ORDER BY oi.order_id DESC, oi.order_item_id`;
const orderRepo = {
  openByTable: (tableId) => db.prepare("SELECT order_id, table_id, status FROM orders WHERE table_id=? AND status IN ('pending','done') ORDER BY order_id DESC").all(tableId),
  itemsByOrderIds(orderIds) {
    if (!orderIds.length) return [];
    return groupOrderItemRows(db.prepare(ORDER_ITEMS_SQL(orderIds.map(() => "?").join(","))).all(...orderIds));
  },
  deleteCascade(orderId) {
    return db.transaction(() => {
      db.prepare("DELETE FROM order_item_toppings WHERE order_item_id IN (SELECT order_item_id FROM order_items WHERE order_id=?)").run(orderId);
      db.prepare("DELETE FROM order_items WHERE order_id=?").run(orderId);
      db.prepare("DELETE FROM orders WHERE order_id=?").run(orderId);
    })();
  },
};
module.exports = { foodRepo, cartRepo, orderRepo };
