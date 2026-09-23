const express = require("express");
const { foodRepo, cartRepo } = require("../repositories/repos");
const { validateTable } = require("../middlewares/validate");
const r = express.Router();
r.get("/tables", (req, res) => {
  const { db } = require("../db");
  const config = require("../config");
  let tables = [];
  try {
    tables = db.prepare("SELECT table_id FROM table_store ORDER BY table_id").all().map(x => x.table_id);
  } catch {}
  if (!tables.length) for (let i = config.tableMin; i <= config.tableMax; i++) tables.push(i);
  res.render("tables", { tables });
});
r.get("/menu/:table_id", validateTable, (req, res) => {
  const { categories } = foodRepo.menuWithToppings();
  res.render("menu", { categories, cart: cartRepo.byTable(req.params.table_id), table_id: req.params.table_id });
});
r.get("/customize/:food_id/:table_id", (req, res) => {
  const { db } = require("../db");
  const { food_id, table_id } = req.params; const { cart_id } = req.query;
  const food = db.prepare("SELECT * FROM food WHERE food_id=?").get(food_id);
  if (!food) return res.status(404).send("ไม่พบเมนู");
  const allT = db.prepare("SELECT * FROM toppings ORDER BY topping_name").all();
  const allowed = db.prepare("SELECT topping_id FROM food_toppings WHERE food_id=?").all(food_id).map(x => x.topping_id);
  const sizes = db.prepare("SELECT s.size_id,s.size_name,s.extra_price FROM food_sizes fs JOIN sizes s ON fs.size_id=s.size_id WHERE fs.food_id=?").all(food_id);
  let sel = { note: "", size_id: null, toppings: [] };
  if (cart_id) {
    const rows = db.prepare("SELECT c.note,c.size_id,ct.topping_id,ct.quantity FROM cart c LEFT JOIN cart_toppings ct ON c.cart_id=ct.cart_id WHERE c.cart_id=?").all(cart_id);
    if (rows.length) sel = { note: rows[0].note, size_id: rows[0].size_id, toppings: rows.filter(x => x.topping_id).map(x => ({ id: x.topping_id, qty: x.quantity || 1 })) };
  }
  res.render("customize", { food, toppings: allT, allowedToppings: allowed, sizes, table_id, cart_id: cart_id || null, selectedSize: sel.size_id, selectedToppings: sel.toppings, note: sel.note });
});
module.exports = r;
