const express = require("express");
const { db } = require("../db");
const { orderRepo } = require("../repositories/repos");
const { completePayment } = require("../services/services");
const config = require("../config");
const { staffAuth } = require("../middlewares/staffAuth");
const r = express.Router();
const summary = (tableId) => {
  const orders = orderRepo.openByTable(tableId);
  const byOrder = orders.map(o => ({ ...o, items: orderRepo.itemsByOrderIds([o.order_id]) }));
  byOrder.forEach(o => { o.total = o.items.reduce((s, i) => s + i.price, 0); });
  return byOrder;
};
r.get("/chose-pay/:table_id", (req, res) => {
  const rows = summary(req.params.table_id);
  const items = rows.flatMap(o => o.items);
  res.render("chose-pay", { table_id: req.params.table_id, items, total: items.reduce((s, i) => s + i.price, 0) });
});
r.get("/qr/:table_id", (req, res) => res.render("qr-payment", { table_id: req.params.table_id, qrImage: config.qrImage, countdown: config.qrCountdownSec }));
r.get("/customer-cashier-payment/:table_id", (req, res) => res.render("customer-cashier-payment", { table_id: req.params.table_id, redirectSec: config.completeRedirectSec }));
// ใหม่ POST + เก่า GET compat
const qrComplete = (req, res) => {
  const tableId = req.params.table_id || req.body.table_id;
  completePayment(tableId, "qrcode");
  res.render("customer-payment-complete", { table_id: tableId, redirectSec: config.completeRedirectSec });
};
r.post("/payments/qr-complete/:table_id", qrComplete); r.get("/qr-complete/:table_id", qrComplete);
r.post("/payment/:table_id", (req, res) => {
  const amount = completePayment(req.params.table_id, "cash");
  if (amount === null) return res.redirect("/cashier");
  res.render("payment-complete", { table_id: req.params.table_id, amount, redirectSec: config.completeRedirectSec });
});
r.get("/cashier", staffAuth, (req, res) => res.render("cashier", { data: db.prepare("SELECT table_id FROM table_store").all() }));
r.get("/cashier-table/:id", staffAuth, (req, res) => res.render("cashier-table", { table_id: req.params.id, rows: summary(req.params.id) }));
module.exports = r;
