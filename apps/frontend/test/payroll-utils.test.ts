import { test } from "node:test";
import assert from "node:assert/strict";
import { amountInWords, inputRupees, parseRupees, slipAmount, slipDate } from "../src/app/admin/payroll/payroll-utils";

test("rupee input converts to exact paise", () => {
  assert.equal(parseRupees("140000"), 14_000_000);
  assert.equal(parseRupees("0.1"), 10);
  assert.equal(parseRupees(" 1800.05 "), 180_005);
  assert.throws(() => parseRupees("-5"));
  assert.throws(() => parseRupees("1.234"));
  assert.throws(() => parseRupees("1,40,000"));
  assert.equal(inputRupees(180_005), "1800.05");
});

test("payslip amounts and dates print like the sample", () => {
  assert.equal(slipAmount(14_000_000), "1,40,000");
  assert.equal(slipAmount(0), "-");
  assert.equal(slipAmount(150), "1.50");
  assert.equal(slipDate("1980-06-04"), "04-06-1980");
  assert.equal(slipDate("2022-03-01", true), "01-Mar-22");
  assert.equal(slipDate(""), "");
});

test("amount in words uses lakh and crore", () => {
  assert.equal(amountInWords(19_700_000), "One Lakh Ninety Seven Thousand Rupees Only");
  assert.equal(amountInWords(1_234_567_850), "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Rupees and Fifty Paise Only");
  assert.equal(amountInWords(0), "Zero Rupees Only");
});
