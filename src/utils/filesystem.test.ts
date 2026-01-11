import { describe, it, expect } from "vitest";
import { isNintendoSwitchScreenshot } from "./filesystem";

// Real Nintendo Switch screenshot filename examples:
// 2019022213273600-691C9B2C6D1F1E032DDC01FD026159FD.jpg
// 2019022214575600-691C9B2C6D1F1E032DDC01FD026159FD.mp4

describe("isNintendoSwitchScreenshot", () => {
  it("should return true for valid .jpg screenshot filename", () => {
    const filename = "2019022213273600-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);
    expect(isNintendoSwitchScreenshot(filename)).toBe(true);
  });

  it("should return true for valid .mp4 video filename", () => {
    const filename = "2019022214575600-691C9B2C6D1F1E032DDC01FD026159FD.mp4";
    expect(filename.length).toBe(53);
    expect(isNintendoSwitchScreenshot(filename)).toBe(true);
  });

  it("should return true for another valid screenshot", () => {
    const filename = "2019021922503100-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);
    expect(isNintendoSwitchScreenshot(filename)).toBe(true);
  });

  it("should return false for wrong length filename", () => {
    const filename = "short.jpg";
    expect(isNintendoSwitchScreenshot(filename)).toBe(false);
  });

  it("should return false for too long filename", () => {
    const filename = "2019022213273600-691C9B2C6D1F1E032DDC01FD026159FD0.jpg";
    expect(filename.length).toBe(54);
    expect(isNintendoSwitchScreenshot(filename)).toBe(false);
  });

  it("should return false for too short filename", () => {
    const filename = "2019022213273600-691C9B2C6D1F1E032DDC01FD026159F.jpg";
    expect(filename.length).toBe(52);
    expect(isNintendoSwitchScreenshot(filename)).toBe(false);
  });

  it("should return false for .png files with correct length", () => {
    const filename = "2019022213273600-691C9B2C6D1F1E032DDC01FD026159FD.png";
    expect(filename.length).toBe(53);
    expect(isNintendoSwitchScreenshot(filename)).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isNintendoSwitchScreenshot("")).toBe(false);
  });

  it("should return false for filename with only extension", () => {
    expect(isNintendoSwitchScreenshot(".jpg")).toBe(false);
  });

  it("should be case-sensitive for extensions", () => {
    const uppercaseJpg = "2019022213273600-691C9B2C6D1F1E032DDC01FD026159FD.JPG";
    const uppercaseMp4 = "2019022213273600-691C9B2C6D1F1E032DDC01FD026159FD.MP4";

    expect(uppercaseJpg.length).toBe(53);
    expect(uppercaseMp4.length).toBe(53);
    expect(isNintendoSwitchScreenshot(uppercaseJpg)).toBe(false);
    expect(isNintendoSwitchScreenshot(uppercaseMp4)).toBe(false);
  });
});
