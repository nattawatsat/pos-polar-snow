import { describe, it, expect } from "vitest";
import { itemTotal, cartTotal } from "../src/utils/pricing.js";
describe("pricing (สูตรเดียวทั้งระบบ)", () => {
  it("base + topping*qty", () => {
    expect(itemTotal(50, 10, [{ price: 15, qty: 2 }])).toBe(90);
  });
  it("null-safe", () => {
    expect(itemTotal(50, null, [])).toBe(50);
    expect(cartTotal([])).toBe(0);
  });
});
