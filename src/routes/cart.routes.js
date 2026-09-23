const express = require("express");
const { db } = require("../db");
const { cartRepo } = require("../repositories/repos");
const { addToCart } = require("../services/services");
const config = require("../config");
const r = express.Router();
const normTop = (t) => (!t ? [] : Array.isArray(t) ? t : [t]);
r.get("/cart/:table_id", (req, res) => res.render("cart", { cart: cartRepo.byTable(req.params.table_id), table_id: req.params.table_id }));
r.post("/cart/add", (req, res) => {
  const { table_id, food_id, note } = req.body;
  const size_id = req.body.size_id || config.defaultSizeId;
  const toppings = normTop(req.body.toppings);
  const qtyByTopping = {}; toppings.forEach(tp => { qtyByTopping[tp] = parseInt(req.body[`topping_qty_${tp}`], 10) || 1; });
  addToCart({ table_id, food_id, size_id, note, toppings, qtyByTopping });
  res.redirect(`/menu/${table_id}`);
});
r.post("/cart/edit/:cart_id", (req, res) => {
  const { cart_id } = req.params; const { table_id, food_id, note } = req.body;
  const size_id = req.body.size_id || config.defaultSizeId;
  const toppings = normTop(req.body.toppings);
  db.transaction(() => {
    db.prepare("UPDATE cart SET food_id=?,size_id=?,note=? WHERE cart_id=?").run(food_id, size_id, note || "", cart_id);
    db.prepare("DELETE FROM cart_toppings WHERE cart_id=?").run(cart_id);
    toppings.forEach(tp => {
      const row = db.prepare("SELECT topping_price FROM toppings WHERE topping_id=?").get(tp);
      if (row) db.prepare("INSERT INTO cart_toppings (cart_id,topping_id,price,quantity) VALUES (?,?,?,?)").run(cart_id, tp, row.topping_price, parseInt(req.body[`topping_qty_${tp}`], 10) || 1);
    });
  })();
  res.redirect(`/cart/${table_id}`);
});
r.post("/cart/delete/:id/:table_id", (req, res) => {
  db.transaction(() => {
    db.prepare("DELETE FROM cart_toppings WHERE cart_id=?").run(req.params.id);
    db.prepare("DELETE FROM cart WHERE cart_id=?").run(req.params.id);
  })();
  res.redirect(`/cart/${req.params.table_id}`);
});
module.exports = r;
