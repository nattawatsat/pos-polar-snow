-- POS-Polar 001_schema (dump จาก P-05-app/polarsnow.db 2026-09-23, เสริม FK/INDEX)
PRAGMA foreign_keys=OFF;
CREATE TABLE IF NOT EXISTS food (food_id INTEGER PRIMARY KEY AUTOINCREMENT, food_name TEXT NOT NULL, food_price REAL NOT NULL, category TEXT NOT NULL, food_pic TEXT);
CREATE TABLE IF NOT EXISTS toppings (topping_id INTEGER PRIMARY KEY, topping_name TEXT, topping_price REAL);
CREATE TABLE IF NOT EXISTS food_toppings (food_id INTEGER, topping_id INTEGER, PRIMARY KEY(food_id, topping_id), FOREIGN KEY(food_id) REFERENCES food(food_id), FOREIGN KEY(topping_id) REFERENCES toppings(topping_id));
CREATE TABLE IF NOT EXISTS sizes (size_id INTEGER PRIMARY KEY AUTOINCREMENT, size_name TEXT NOT NULL, extra_price REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS food_sizes (food_id INTEGER, size_id INTEGER, PRIMARY KEY(food_id, size_id), FOREIGN KEY(food_id) REFERENCES food(food_id), FOREIGN KEY(size_id) REFERENCES sizes(size_id));
CREATE TABLE IF NOT EXISTS table_store (table_id INTEGER PRIMARY KEY AUTOINCREMENT, table_number TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cart (cart_id INTEGER PRIMARY KEY AUTOINCREMENT, table_id INTEGER NOT NULL, food_id INTEGER NOT NULL, size_id INTEGER, note TEXT, FOREIGN KEY(food_id) REFERENCES food(food_id), FOREIGN KEY(size_id) REFERENCES sizes(size_id));
CREATE TABLE IF NOT EXISTS cart_toppings (id INTEGER PRIMARY KEY AUTOINCREMENT, cart_id INTEGER NOT NULL, topping_id INTEGER NOT NULL, price REAL, quantity INTEGER DEFAULT 1, FOREIGN KEY(cart_id) REFERENCES cart(cart_id) ON DELETE CASCADE, FOREIGN KEY(topping_id) REFERENCES toppings(topping_id));
CREATE TABLE IF NOT EXISTS orders (order_id INTEGER PRIMARY KEY AUTOINCREMENT, table_id INTEGER, status TEXT DEFAULT 'pending', FOREIGN KEY(table_id) REFERENCES table_store(table_id));
CREATE TABLE IF NOT EXISTS order_items (order_item_id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, food_id INTEGER NOT NULL, size_id INTEGER, note TEXT, FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE CASCADE, FOREIGN KEY(food_id) REFERENCES food(food_id), FOREIGN KEY(size_id) REFERENCES sizes(size_id));
CREATE TABLE IF NOT EXISTS order_item_toppings (id INTEGER PRIMARY KEY AUTOINCREMENT, order_item_id INTEGER, topping_id INTEGER, price REAL, quantity INTEGER DEFAULT 1, FOREIGN KEY(order_item_id) REFERENCES order_items(order_item_id) ON DELETE CASCADE, FOREIGN KEY(topping_id) REFERENCES toppings(topping_id));
CREATE TABLE IF NOT EXISTS payments (payment_id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, method TEXT, amount REAL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(order_id) REFERENCES orders(order_id));
CREATE INDEX IF NOT EXISTS idx_orders_table_status ON orders(table_id, status);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
