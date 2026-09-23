// ใช้ node:sqlite (built-in ตั้งแต่ Node 22) แทน better-sqlite3 — ไม่ต้องคอมไพล์ native
// API: db.prepare(sql).get/all/run + db.exec + transaction จำลองด้วย BEGIN/COMMIT
const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");
const config = require("./config");

const dbPath = path.isAbsolute(config.dbPath)
  ? config.dbPath
  : path.join(__dirname, "..", config.dbPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const _db = new DatabaseSync(dbPath);
_db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
const db = {
  prepare(sql) {
    const st = _db.prepare(sql);
    return {
      get: (...p) => st.get(...p),
      all: (...p) => st.all(...p),
      run: (...p) => {
        const r = st.run(...p);
        return { lastInsertRowid: Number(r.lastInsertRowid), changes: Number(r.changes) };
      },
    };
  },
  exec: (sql) => _db.exec(sql),
  transaction(fn) {
    const wrapped = (...a) => {
      _db.exec("BEGIN");
      try { const r = fn(...a); _db.exec("COMMIT"); return r; }
      catch (e) { try { _db.exec("ROLLBACK"); } catch {} throw e; }
    };
    wrapped.immediate = wrapped; return wrapped;
  },
};
function migrate() {
  db.exec(fs.readFileSync(path.join(__dirname, "..", "migrate", "001_schema.sql"), "utf8"));
  console.log("migrated OK:", dbPath);
}
if (require.main === module && process.argv.includes("--migrate")) migrate();
module.exports = { db, migrate, transaction: (fn) => db.transaction(fn)() };
