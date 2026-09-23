const { z } = require("zod");
const config = require("../config");
const tableId = z.coerce.number().int().min(config.tableMin).max(config.tableMax);
const idParam = (name) => (req, res, next) => {
  const v = parseInt(req.params[name], 10);
  if (!Number.isInteger(v) || v <= 0) return res.status(400).send(`Invalid ${name}`);
  req.params[name] = v; next();
};
const validateTable = (req, res, next) => {
  const p = tableId.safeParse(req.params.table_id ?? req.params.id);
  if (!p.success) return res.status(404).send(`ไม่พบโต๊ะนี้ (รองรับเฉพาะโต๊ะ ${config.tableMin}-${config.tableMax})`);
  req.params.table_id = p.data; next();
};
module.exports = { validateTable, idParam };
