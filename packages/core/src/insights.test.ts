import { describe, expect, it } from "vitest";
import { parseSseData } from "./insights";

describe("parseSseData", () => {
  it("extracts data payloads from SSE text", () => {
    expect(
      parseSseData('data: {"text": "olá"}\n\ndata: {"text": " mundo"}\n\n'),
    ).toEqual(['{"text": "olá"}', '{"text": " mundo"}']);
  });
  it("ignores comments, blank lines and [DONE]", () => {
    expect(parseSseData(": ping\n\ndata: [DONE]\n\n")).toEqual([]);
  });
});
