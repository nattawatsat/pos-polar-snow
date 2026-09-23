// รวม logic group cart/order rows ที่เคยซ้ำใน GET /menu vs GET /cart
function groupCartRows(rows) {
  const cart = []; const map = {};
  for (const r of rows) {
    if (!map[r.cart_id]) {
      map[r.cart_id] = {
        cart_id: r.cart_id, food_id: r.food_id, food_name: r.food_name,
        food_price: r.food_price, note: r.note, size_id: r.size_id,
        size_name: r.size_name, size_extra: r.size_extra, toppings: [],
      };
      cart.push(map[r.cart_id]);
    }
    if (r.topping_name) map[r.cart_id].toppings.push({ name: r.topping_name, price: r.topping_price, qty: r.topping_qty || 1 });
  }
  return cart;
}
function groupOrderItemRows(rows) {
  const items = {};
  for (const r of rows) {
    if (!items[r.order_item_id]) {
      items[r.order_item_id] = {
        order_id: r.order_id, order_item_id: r.order_item_id, food_name: r.food_name,
        size_name: r.size_name, note: r.note,
        price: Number(r.food_price || 0) + Number(r.extra_price || 0), toppings: [],
      };
    }
    if (r.topping_name) {
      items[r.order_item_id].toppings.push(`${r.topping_name} x${r.topping_qty || 1}`);
      items[r.order_item_id].price += Number(r.topping_price || 0) * Number(r.topping_qty || 1);
    }
  }
  return Object.values(items);
}
module.exports = { groupCartRows, groupOrderItemRows };
