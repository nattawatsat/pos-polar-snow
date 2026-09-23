require("dotenv").config();
module.exports = {
  port: parseInt(process.env.PORT || "3100", 10),
  host: process.env.HOST || "127.0.0.1",
  dbPath: process.env.DB_PATH || "./data/polarsnow.db",
  tableMin: parseInt(process.env.TABLE_MIN || "1", 10),
  tableMax: parseInt(process.env.TABLE_MAX || "15", 10),
  defaultSizeId: parseInt(process.env.DEFAULT_SIZE_ID || "1", 10),
  qrImage: process.env.QR_IMAGE || "/img/qr.png",
  qrCountdownSec: parseInt(process.env.QR_COUNTDOWN_SEC || "15", 10),
  completeRedirectSec: parseInt(process.env.COMPLETE_REDIRECT_SEC || "5", 10),
};
