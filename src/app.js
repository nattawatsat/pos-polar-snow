const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { errorHandler } = require("./middlewares/asyncHandler");

function createApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "views"));
  app.get("/health", (req, res) => res.json({ ok: true }));
  app.get("/", (req, res) => res.redirect("/menu/1"));
  app.use(require("./routes/menu.routes"));
  app.use(require("./routes/cart.routes"));
  app.use(require("./routes/order.routes"));
  app.use(require("./routes/payment.routes"));
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
