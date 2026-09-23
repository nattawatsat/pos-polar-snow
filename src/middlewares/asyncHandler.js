const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);
  const table_id = req.params.table_id || req.params.id || req.body?.table_id || "";
  res.status(500).render("error", { table_id });
}
module.exports = { asyncHandler, errorHandler };
