const os = require("os");
const { createApp } = require("./app");
const config = require("./config");
function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const a of ifaces || []) if (a.family === "IPv4" && !a.internal) return a.address;
  }
  return "127.0.0.1";
}
const app = createApp();
app.listen(config.port, config.host, () => {
  console.log(`POS-Polar on http://${config.host}:${config.port} (LAN http://${getLocalIP()}:${config.port})`);
});
