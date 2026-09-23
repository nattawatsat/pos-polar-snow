// Basic Auth สำหรับโซนครัว/แคชเชียร์ — เปิดเมื่อตั้ง ADMIN_USER/ADMIN_PASS ใน .env
function staffAuth(req, res, next) {
  const user = process.env.ADMIN_USER, pass = process.env.ADMIN_PASS;
  if (!user || !pass) return next();
  const hdr = req.headers.authorization || "";
  const [scheme, encoded] = hdr.split(" ");
  if (scheme === "Basic" && encoded) {
    const [u, p] = Buffer.from(encoded, "base64").toString().split(":");
    if (u === user && p === pass) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="staff"');
  return res.status(401).send("Staff only");
}
module.exports = { staffAuth };
