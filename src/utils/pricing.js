// สูตรคำนวณเดียวของทั้งระบบ — แก้บั๊ก qr-complete ที่ SUM บน join นับ food_price ซ้ำ
function itemTotal(foodPrice, extraPrice, toppings = []) {
  const base = Number(foodPrice || 0) + Number(extraPrice || 0);
  const top = toppings.reduce((s, t) => s + Number(t.price || 0) * Number(t.qty || 1), 0);
  return base + top;
}
function cartTotal(cart) {
  return cart.reduce((s, it) => s + itemTotal(it.food_price, it.size_extra, it.toppings), 0);
}
module.exports = { itemTotal, cartTotal };
