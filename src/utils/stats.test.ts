import { describe, it, expect } from "vitest";
import { computeStats } from "./stats";
import type { GameGroup, ParsedFile } from "../types";

function makeParsedFile(
  name: string,
  year: number,
  month: number,
  day: number,
  size: number,
  hour = 12,
): ParsedFile {
  return {
    file: { name, size } as File,
    screenshot: {
      year,
      month,
      day,
      hour,
      minute: 0,
      second: 0,
      captureId: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1",
      gameName: "Test",
    },
  };
}

describe("computeStats", () => {
  it("should return zeroed stats for empty groups", () => {
    const stats = computeStats([]);
    expect(stats.totalFiles).toBe(0);
    expect(stats.totalImages).toBe(0);
    expect(stats.totalVideos).toBe(0);
    expect(stats.totalSize).toBe(0);
    expect(stats.totalGames).toBe(0);
    expect(stats.firstCapture).toBeNull();
    expect(stats.lastCapture).toBeNull();
    expect(stats.gameStats).toEqual([]);
    expect(stats.timeline).toEqual([]);
    expect(stats.busiestMonth).toBeNull();
    expect(stats.topGame).toBeNull();
    expect(stats.averageCapturesPerGame).toBe(0);
    expect(stats.hourDistribution).toEqual(new Array(24).fill(0));
    expect(stats.dayOfWeekDistribution).toEqual(new Array(7).fill(0));
    expect(stats.funFacts.busiestDay).toBeNull();
    expect(stats.funFacts.longestGap).toBeNull();
    expect(stats.funFacts.singleCaptureGames).toBe(0);
  });

  it("should compute stats for a single game with images and videos", () => {
    const groups: GameGroup[] = [
      {
        latestTimestamp: 0,
        gameName: "TETRIS 99",
        files: [
          makeParsedFile("screenshot1.jpg", 2023, 0, 15, 500_000),
          makeParsedFile("screenshot2.jpg", 2023, 0, 20, 600_000),
          makeParsedFile("video1.mp4", 2023, 1, 10, 5_000_000),
        ],
      },
    ];

    const stats = computeStats(groups);

    expect(stats.totalFiles).toBe(3);
    expect(stats.totalImages).toBe(2);
    expect(stats.totalVideos).toBe(1);
    expect(stats.totalSize).toBe(6_100_000);
    expect(stats.totalGames).toBe(1);
    expect(stats.averageCapturesPerGame).toBe(3);
    expect(stats.topGame?.gameName).toBe("TETRIS 99");
  });

  it("should sort games by file count descending", () => {
    const groups: GameGroup[] = [
      {
        latestTimestamp: 0,
        gameName: "Game A",
        files: [makeParsedFile("a.jpg", 2023, 0, 1, 100)],
      },
      {
        latestTimestamp: 0,
        gameName: "Game B",
        files: [
          makeParsedFile("b1.jpg", 2023, 0, 1, 100),
          makeParsedFile("b2.jpg", 2023, 0, 2, 100),
          makeParsedFile("b3.mp4", 2023, 0, 3, 100),
        ],
      },
      {
        latestTimestamp: 0,
        gameName: "Game C",
        files: [
          makeParsedFile("c1.jpg", 2023, 0, 1, 100),
          makeParsedFile("c2.jpg", 2023, 0, 2, 100),
        ],
      },
    ];

    const stats = computeStats(groups);

    expect(stats.gameStats[0]!.gameName).toBe("Game B");
    expect(stats.gameStats[1]!.gameName).toBe("Game C");
    expect(stats.gameStats[2]!.gameName).toBe("Game A");
    expect(stats.topGame?.gameName).toBe("Game B");
  });

  it("should compute correct date range", () => {
    const groups: GameGroup[] = [
      {
        latestTimestamp: 0,
        gameName: "Game",
        files: [
          makeParsedFile("a.jpg", 2020, 5, 15, 100),
          makeParsedFile("b.jpg", 2023, 11, 25, 100),
          makeParsedFile("c.jpg", 2021, 3, 1, 100),
        ],
      },
    ];

    const stats = computeStats(groups);

    expect(stats.firstCapture).toEqual(new Date(2020, 5, 15));
    expect(stats.lastCapture).toEqual(new Date(2023, 11, 25));
  });

  it("should build a sorted timeline of monthly buckets", () => {
    const groups: GameGroup[] = [
      {
        latestTimestamp: 0,
        gameName: "Game",
        files: [
          makeParsedFile("a.jpg", 2023, 2, 1, 100),
          makeParsedFile("b.jpg", 2023, 2, 15, 100),
          makeParsedFile("c.jpg", 2023, 0, 5, 100),
          makeParsedFile("d.mp4", 2022, 11, 20, 100),
        ],
      },
    ];

    const stats = computeStats(groups);

    expect(stats.timeline).toHaveLength(3);
    // Should be sorted chronologically
    expect(stats.timeline[0]!.label).toBe("Dec 2022");
    expect(stats.timeline[0]!.count).toBe(1);
    expect(stats.timeline[1]!.label).toBe("Jan 2023");
    expect(stats.timeline[1]!.count).toBe(1);
    expect(stats.timeline[2]!.label).toBe("Mar 2023");
    expect(stats.timeline[2]!.count).toBe(2);
  });

  it("should identify the busiest month", () => {
    const groups: GameGroup[] = [
      {
        latestTimestamp: 0,
        gameName: "Game",
        files: [
          makeParsedFile("a.jpg", 2023, 5, 1, 100),
          makeParsedFile("b.jpg", 2023, 5, 2, 100),
          makeParsedFile("c.jpg", 2023, 5, 3, 100),
          makeParsedFile("d.jpg", 2023, 6, 1, 100),
        ],
      },
    ];

    const stats = computeStats(groups);

    expect(stats.busiestMonth?.label).toBe("Jun 2023");
    expect(stats.busiestMonth?.count).toBe(3);
  });

  it("should compute per-game size and media counts", () => {
    const groups: GameGroup[] = [
      {
        latestTimestamp: 0,
        gameName: "Game A",
        files: [
          makeParsedFile("a1.jpg", 2023, 0, 1, 1_000),
          makeParsedFile("a2.mp4", 2023, 0, 1, 50_000),
        ],
      },
    ];

    const stats = computeStats(groups);

    expect(stats.gameStats[0]!.totalSize).toBe(51_000);
    expect(stats.gameStats[0]!.imageCount).toBe(1);
    expect(stats.gameStats[0]!.videoCount).toBe(1);
  });

  it("should compute hour distribution", () => {
    const groups: GameGroup[] = [
      {
        latestTimestamp: 0,
        gameName: "Game",
        files: [
          makeParsedFile("a.jpg", 2023, 0, 1, 100, 8),
          makeParsedFile("b.jpg", 2023, 0, 2, 100, 8),
          makeParsedFile("c.jpg", 2023, 0, 3, 100, 14),
          makeParsedFile("d.jpg", 2023, 0, 4, 100, 22),
          makeParsedFile("e.jpg", 2023, 0, 5, 100, 3),
        ],
      },
    ];

    const stats = computeStats(groups);

    expect(stats.hourDistribution[8]).toBe(2);
    expect(stats.hourDistribution[14]).toBe(1);
    expect(stats.hourDistribution[22]).toBe(1);
    expect(stats.hourDistribution[3]).toBe(1);
    expect(stats.hourDistribution[0]).toBe(0);
  });

  it("should compute day-of-week distribution", () => {
    // 2023-01-02 is a Monday (month 0 = January)
    const groups: GameGroup[] = [
      {
        latestTimestamp: 0,
        gameName: "Game",
        files: [
          makeParsedFile("a.jpg", 2023, 0, 2, 100), // Mon
          makeParsedFile("b.jpg", 2023, 0, 3, 100), // Tue
          makeParsedFile("c.jpg", 2023, 0, 7, 100), // Sat
          makeParsedFile("d.jpg", 2023, 0, 8, 100), // Sun
          makeParsedFile("e.jpg", 2023, 0, 9, 100), // Mon
        ],
      },
    ];

    const stats = computeStats(groups);

    // getDay(): 0=Sun, 1=Mon, 2=Tue, ...
    expect(stats.dayOfWeekDistribution[0]).toBe(1); // Sun
    expect(stats.dayOfWeekDistribution[1]).toBe(2); // Mon
    expect(stats.dayOfWeekDistribution[2]).toBe(1); // Tue
    expect(stats.dayOfWeekDistribution[6]).toBe(1); // Sat
  });

  it("should find the busiest day", () => {
    const groups: GameGroup[] = [
      {
        latestTimestamp: 0,
        gameName: "Game",
        files: [
          makeParsedFile("a.jpg", 2023, 0, 15, 100),
          makeParsedFile("b.jpg", 2023, 0, 15, 100),
          makeParsedFile("c.jpg", 2023, 0, 15, 100),
          makeParsedFile("d.jpg", 2023, 0, 16, 100),
        ],
      },
    ];

    const stats = computeStats(groups);

    expect(stats.funFacts.busiestDay?.count).toBe(3);
    expect(stats.funFacts.busiestDay?.date).toEqual(new Date(2023, 0, 15));
  });

  it("should find the longest gap between captures", () => {
    const groups: GameGroup[] = [
      {
        latestTimestamp: 0,
        gameName: "Game",
        files: [
          makeParsedFile("a.jpg", 2023, 0, 1, 100),
          makeParsedFile("b.jpg", 2023, 0, 5, 100),  // 4 day gap
          makeParsedFile("c.jpg", 2023, 3, 1, 100),  // ~86 day gap
        ],
      },
    ];

    const stats = computeStats(groups);

    expect(stats.funFacts.longestGap).not.toBeNull();
    expect(stats.funFacts.longestGap!.from).toEqual(new Date(2023, 0, 5));
    expect(stats.funFacts.longestGap!.to).toEqual(new Date(2023, 3, 1));
    expect(stats.funFacts.longestGap!.days).toBeGreaterThan(80);
  });

  it("should count single-capture games", () => {
    const groups: GameGroup[] = [
      {
        latestTimestamp: 0,
        gameName: "Game A",
        files: [makeParsedFile("a.jpg", 2023, 0, 1, 100)],
      },
      {
        latestTimestamp: 0,
        gameName: "Game B",
        files: [
          makeParsedFile("b1.jpg", 2023, 0, 1, 100),
          makeParsedFile("b2.jpg", 2023, 0, 2, 100),
        ],
      },
      {
        latestTimestamp: 0,
        gameName: "Game C",
        files: [makeParsedFile("c.jpg", 2023, 0, 1, 100)],
      },
    ];

    const stats = computeStats(groups);

    expect(stats.funFacts.singleCaptureGames).toBe(2);
  });

  it("should return null for longestGap with a single capture day", () => {
    const groups: GameGroup[] = [
      {
        latestTimestamp: 0,
        gameName: "Game",
        files: [makeParsedFile("a.jpg", 2023, 0, 1, 100)],
      },
    ];

    const stats = computeStats(groups);

    expect(stats.funFacts.longestGap).toBeNull();
  });
});
