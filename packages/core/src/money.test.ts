import { describe, expect, it } from "vitest";
import { formatBRL, parseAmountToCents } from "./money";

const nbsp = " ";

describe("formatBRL", () => {
  it("formats cents as pt-BR currency", () => {
    expect(formatBRL(123456)).toBe(`R$${nbsp}1.234,56`);
    expect(formatBRL(0)).toBe(`R$${nbsp}0,00`);
    expect(formatBRL(-5000)).toBe(`-R$${nbsp}50,00`);
  });
});

describe("parseAmountToCents", () => {
  it("parses pt-BR style", () => {
    expect(parseAmountToCents("1.234,56")).toBe(123456);
    expect(parseAmountToCents("742,00")).toBe(74200);
  });
  it("parses dot-decimal style", () => {
    expect(parseAmountToCents("1234.56")).toBe(123456);
  });
  it("parses bare integers as whole reais", () => {
    expect(parseAmountToCents("50")).toBe(5000);
  });
  it("rejects garbage", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("-10")).toBeNull();
  });
});
