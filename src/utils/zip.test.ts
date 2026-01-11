import { describe, it, expect } from "vitest";
import { screenshotToDate } from "./zip";
import type { Screenshot } from "../types";

// Based on real filename: 2019022213273600-691C9B2C6D1F1E032DDC01FD026159FD.jpg
// Date: 2019-02-22 13:27:36

describe("screenshotToDate", () => {
  it("should convert screenshot metadata to Date object", () => {
    const screenshot: Screenshot = {
      year: 2019,
      month: 1, // February (0-indexed)
      day: 22,
      hour: 13,
      minute: 27,
      second: 36,
      gameid: "691C9B2C6D1F1E032DDC01FD026159FD",
      gamename: "The Legend of Zelda: Breath of the Wild",
    };

    const result = screenshotToDate(screenshot);

    expect(result.getFullYear()).toBe(2019);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(22);
    expect(result.getHours()).toBe(13);
    expect(result.getMinutes()).toBe(27);
    expect(result.getSeconds()).toBe(36);
  });

  it("should handle December correctly (month 11)", () => {
    const screenshot: Screenshot = {
      year: 2019,
      month: 11, // December (0-indexed)
      day: 25,
      hour: 10,
      minute: 0,
      second: 0,
      gameid: "691C9B2C6D1F1E032DDC01FD026159FD",
      gamename: "The Legend of Zelda: Breath of the Wild",
    };

    const result = screenshotToDate(screenshot);

    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(25);
  });

  it("should handle midnight correctly", () => {
    const screenshot: Screenshot = {
      year: 2019,
      month: 1,
      day: 19,
      hour: 0,
      minute: 0,
      second: 0,
      gameid: "691C9B2C6D1F1E032DDC01FD026159FD",
      gamename: "The Legend of Zelda: Breath of the Wild",
    };

    const result = screenshotToDate(screenshot);

    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it("should handle end of day correctly", () => {
    const screenshot: Screenshot = {
      year: 2019,
      month: 1,
      day: 19,
      hour: 23,
      minute: 59,
      second: 59,
      gameid: "691C9B2C6D1F1E032DDC01FD026159FD",
      gamename: "The Legend of Zelda: Breath of the Wild",
    };

    const result = screenshotToDate(screenshot);

    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
  });
});
