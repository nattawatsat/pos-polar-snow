const express = require("express");
const { db } = require("../db");
const { orderRepo } = require("../repositories/repos");
const { confirmOrder } = require("../services/services");
const { staffAuth } = require("../middlewares/staffAuth");
const r = express.Router();
r.post("/order/:table_id", (req, res) => {
  const id = confirmOrder(req.params.table_id);
  res.redirect(id ? `/menu/${req.params.table_id}` : `/cart/${req.params.table_id}`);
});
r.get("/history/:table_id", (req, res) => {
  const orders = orderRepo.openByTable(req.params.table_id);
  const payload = orders.map(o => ({ ...o, items: orderRepo.itemsByOrderIds([o.order_id]) }));
  // history view เดิมคาดหวัง items แบบสั้น — map ให้เข้ากัน
  const mapped = payload.map(o => ({ ...o, items: o.items.map(i => ({ food_name: i.food_name, size_name: i.size_name, note: i.note, price: i.price, toppings: i.toppings })) }));
  res.render("history", { table_id: req.params.table_id, orders: mapped });
});
r.get("/kitchen", staffAuth, (req, res) => {
  const rows = db.prepare(`SELECT o.order_id,o.table_id,o.status,oi.order_item_id,oi.note,f.food_name,s.size_name,GROUP_CONCAT(DISTINCT t.topping_name) AS toppings
    FROM orders o JOIN order_items oi ON o.order_id=oi.order_id JOIN food f ON oi.food_id=f.food_id
    LEFT JOIN sizes s ON oi.size_id=s.size_id LEFT JOIN order_item_toppings oit ON oi.order_item_id=oit.order_item_id
    LEFT JOIN toppings t ON oit.topping_id=t.topping_id WHERE o.status='pending'
    GROUP BY oi.order_item_id ORDER BY o.order_id DESC, oi.order_item_id`).all();
  res.render("kitchen", { data: rows.map(x => ({ order_id: x.order_id, table_id: x.table_id, status: x.status, note: x.note, food: `${x.food_name}${x.size_name ? ` (${x.size_name})` : ""}`, toppings: x.toppings ? x.toppings.split(",").filter(Boolean) : [] })) });
});
// ใหม่ (POST) + เก่า (GET compat)
const doneHandler = (req, res) => {
  const id = req.body.order_id || req.query.order_id;
  if (!id) return res.status(400).send("Missing order_id");
  db.prepare("UPDATE orders SET status='done' WHERE order_id=?").run(id);
  res.redirect("/kitchen");
};
r.post("/kitchen/done", doneHandler); r.get("/update-status", doneHandler);
const delHandler = (req, res) => {
  const id = req.body.order_id || req.query.order_id;
  const back = req.body.table_id || req.query.table_id;
  orderRepo.deleteCascade(id);
  res.redirect(back ? `/cashier-table/${back}` : "/kitchen");
};
r.post("/orders/delete", delHandler); r.get("/delete-order", delHandler); r.get("/cashier-delete-order", delHandler);
module.exports = r;
