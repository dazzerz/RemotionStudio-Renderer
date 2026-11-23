import { SubtitleGroup } from "../editorial-kit/EditorialPrimitives";

export const GOOGLE_RUST_FPS = 30;
// Locked directly to real ffprobe duration of vo_en.mp3 (43.392s, last word ends 43.18s)
export const GOOGLE_RUST_DURATION_SEC = 43.4;
export const GOOGLE_RUST_FRAMES = Math.round(
  GOOGLE_RUST_DURATION_SEC * GOOGLE_RUST_FPS
); // 1302 frames (43.40s)

export interface BeatTiming {
  b1Hook: number;
  b1Strike: number;
  b2AiGrid: number;
  b3Lithium4h: number;
  b4Minnesota: number;
  b5Bar100h: number;
  b5PayoffCost: number;
  b6CutawayDischarge: number;
  b7CutawayCharge: number;
  b8Renewables: number;
  b9Homes2028: number;
  b10DebateOutro: number;
}

// Exact audio-aligned beat transition seconds from faster-whisper word_timestamps
export const BEAT_SEC: BeatTiming = {
  b1Hook: 0.0,
  b1Strike: 2.85, // Strikes LITHIUM right on "lithium" (3.28s)
  b2AiGrid: 4.65, // "AI data centers drain power grids fast" (4.92s)
  b3Lithium4h: 7.6, // "Normal grid batteries die in four hours" (7.78s)
  b4Minnesota: 10.3, // "In Minnesota, Google is building a giant..." (10.52s)
  b5Bar100h: 16.85, // "It runs 100 hours straight" (17.08s)
  b5PayoffCost: 19.35, // "and it costs one-tenth of lithium" (19.48s): Payoff < 20s!
  b6CutawayDischarge: 21.85, // "How? Reversible rust. Iron breathes oxygen..." (22.00s)
  b7CutawayCharge: 27.35, // "Charging simply turns rust back into iron" (27.40s)
  b8Renewables: 30.75, // "Paired with massive wind and solar farms" (31.00s)
  b9Homes2028: 33.2, // "Enough output for 200,000 homes. First modules ship in 2028" (33.32s)
  b10DebateOutro: 38.45, // "Genius breakthrough or overhyped? Comment genius or hype..." (38.76s)
};

// Word-level kinetic subtitle groups directly synced to vo_en.mp3
export const SUBTITLE_GROUPS: SubtitleGroup[] = [
  {
    startSec: 0.0,
    endSec: 2.45,
    words: [
      { word: "Google", startSec: 0.0, endSec: 0.36 },
      { word: "bet", startSec: 0.36, endSec: 0.66 },
      { word: "a", startSec: 0.66, endSec: 1.04 },
      { word: "billion", startSec: 1.04, endSec: 1.26, emphasis: true },
      { word: "on", startSec: 1.26, endSec: 1.68 },
      { word: "rust.", startSec: 1.68, endSec: 2.18, emphasis: true },
    ],
  },
  {
    startSec: 2.5,
    endSec: 4.5,
    words: [
      { word: "Forget", startSec: 2.6, endSec: 2.76 },
      { word: "expensive", startSec: 2.76, endSec: 3.28 },
      { word: "lithium", startSec: 3.28, endSec: 3.6, emphasis: true },
      { word: "batteries.", startSec: 3.6, endSec: 4.1 },
    ],
  },
  {
    startSec: 4.75,
    endSec: 7.52,
    words: [
      { word: "AI", startSec: 4.82, endSec: 5.02, emphasis: true },
      { word: "data", startSec: 5.02, endSec: 5.3 },
      { word: "centers", startSec: 5.3, endSec: 5.66 },
      { word: "drain", startSec: 5.66, endSec: 6.14, emphasis: true },
      { word: "power", startSec: 6.14, endSec: 6.42 },
      { word: "grids", startSec: 6.42, endSec: 6.72 },
      { word: "fast.", startSec: 6.72, endSec: 7.42 },
    ],
  },
  {
    startSec: 7.68,
    endSec: 10.2,
    words: [
      { word: "Normal", startSec: 7.78, endSec: 7.98 },
      { word: "grid", startSec: 7.98, endSec: 8.22 },
      { word: "batteries", startSec: 8.22, endSec: 8.6 },
      { word: "die", startSec: 8.6, endSec: 8.96, emphasis: true },
      { word: "in", startSec: 8.96, endSec: 9.2 },
      { word: "four", startSec: 9.2, endSec: 9.48, emphasis: true },
      { word: "hours.", startSec: 9.48, endSec: 9.94, emphasis: true },
    ],
  },
  {
    startSec: 10.4,
    endSec: 13.2,
    words: [
      { word: "In", startSec: 10.52, endSec: 10.65 },
      { word: "Minnesota,", startSec: 10.65, endSec: 11.15, emphasis: true },
      { word: "Google", startSec: 11.36, endSec: 11.52 },
      { word: "is", startSec: 11.52, endSec: 11.72 },
      { word: "building", startSec: 11.72, endSec: 12.06 },
      { word: "a", startSec: 12.06, endSec: 12.38 },
      { word: "giant.", startSec: 12.38, endSec: 12.82, emphasis: true },
    ],
  },
  {
    startSec: 13.45,
    endSec: 16.7,
    words: [
      { word: "30", startSec: 13.55, endSec: 13.85, emphasis: true },
      { word: "gigawatt", startSec: 13.85, endSec: 14.22, emphasis: true },
      { word: "hours.", startSec: 14.22, endSec: 14.64 },
      { word: "World's", startSec: 14.96, endSec: 15.54 },
      { word: "largest", startSec: 15.54, endSec: 15.98, emphasis: true },
      { word: "battery.", startSec: 15.98, endSec: 16.36 },
    ],
  },
  {
    startSec: 16.95,
    endSec: 19.3,
    words: [
      { word: "It", startSec: 17.02, endSec: 17.16 },
      { word: "runs", startSec: 17.16, endSec: 17.38 },
      { word: "100", startSec: 17.38, endSec: 18.16, emphasis: true },
      { word: "hours", startSec: 18.16, endSec: 18.7, emphasis: true },
      { word: "straight,", startSec: 18.7, endSec: 19.14 },
    ],
  },
  {
    startSec: 19.38,
    endSec: 21.75,
    words: [
      { word: "and", startSec: 19.48, endSec: 19.64 },
      { word: "it", startSec: 19.64, endSec: 19.72 },
      { word: "costs", startSec: 19.72, endSec: 19.98 },
      { word: "one-tenth", startSec: 19.98, endSec: 20.86, emphasis: true },
      { word: "of", startSec: 20.86, endSec: 21.14 },
      { word: "lithium.", startSec: 21.14, endSec: 21.48, emphasis: true },
    ],
  },
  {
    startSec: 21.9,
    endSec: 24.1,
    words: [
      { word: "How?", startSec: 22.0, endSec: 22.48 },
      { word: "Reversible", startSec: 22.86, endSec: 23.22, emphasis: true },
      { word: "rust.", startSec: 23.22, endSec: 23.74, emphasis: true },
    ],
  },
  {
    startSec: 24.2,
    endSec: 27.32,
    words: [
      { word: "Iron", startSec: 24.34, endSec: 24.64 },
      { word: "breathes", startSec: 24.64, endSec: 25.06 },
      { word: "oxygen,", startSec: 25.06, endSec: 25.48, emphasis: true },
      { word: "rusts,", startSec: 25.94, endSec: 26.52, emphasis: true },
      { word: "and", startSec: 26.54, endSec: 26.7 },
      { word: "sparks", startSec: 26.7, endSec: 26.96 },
      { word: "power.", startSec: 26.96, endSec: 27.32, emphasis: true },
    ],
  },
  {
    startSec: 27.38,
    endSec: 30.65,
    words: [
      { word: "Charging", startSec: 27.4, endSec: 28.38, emphasis: true },
      { word: "simply", startSec: 28.38, endSec: 28.7 },
      { word: "turns", startSec: 28.7, endSec: 29.02 },
      { word: "rust", startSec: 29.02, endSec: 29.28, emphasis: true },
      { word: "back", startSec: 29.28, endSec: 29.64 },
      { word: "into", startSec: 29.64, endSec: 29.88 },
      { word: "iron.", startSec: 29.88, endSec: 30.28, emphasis: true },
    ],
  },
  {
    startSec: 30.85,
    endSec: 33.15,
    words: [
      { word: "Paired", startSec: 30.95, endSec: 31.15 },
      { word: "with", startSec: 31.15, endSec: 31.38 },
      { word: "massive", startSec: 31.38, endSec: 31.78 },
      { word: "wind", startSec: 31.78, endSec: 32.02, emphasis: true },
      { word: "and", startSec: 32.02, endSec: 32.35 },
      { word: "solar", startSec: 32.35, endSec: 32.62, emphasis: true },
      { word: "farms.", startSec: 32.62, endSec: 32.92 },
    ],
  },
  {
    startSec: 33.25,
    endSec: 35.9,
    words: [
      { word: "Enough", startSec: 33.32, endSec: 33.5 },
      { word: "output", startSec: 33.5, endSec: 33.78 },
      { word: "for", startSec: 33.78, endSec: 34.16 },
      { word: "200,000", startSec: 34.16, endSec: 35.18, emphasis: true },
      { word: "homes.", startSec: 35.18, endSec: 35.6, emphasis: true },
    ],
  },
  {
    startSec: 36.0,
    endSec: 38.3,
    words: [
      { word: "First", startSec: 36.08, endSec: 36.34 },
      { word: "modules", startSec: 36.34, endSec: 36.68 },
      { word: "ship", startSec: 36.68, endSec: 37.0 },
      { word: "in", startSec: 37.0, endSec: 37.3 },
      { word: "2028.", startSec: 37.3, endSec: 37.82, emphasis: true },
    ],
  },
  {
    startSec: 38.55,
    endSec: 40.65,
    words: [
      { word: "Genius", startSec: 38.65, endSec: 38.92, emphasis: true },
      { word: "breakthrough", startSec: 38.92, endSec: 39.28 },
      { word: "or", startSec: 39.28, endSec: 39.68 },
      { word: "overhyped?", startSec: 39.68, endSec: 40.48, emphasis: true },
    ],
  },
  {
    startSec: 40.72,
    endSec: 43.35,
    words: [
      { word: "Comment", startSec: 40.76, endSec: 40.98 },
      { word: "GENIUS", startSec: 40.98, endSec: 41.28, emphasis: true },
      { word: "or", startSec: 41.28, endSec: 41.54 },
      { word: "HYPE.", startSec: 41.54, endSec: 41.95, emphasis: true },
      { word: "That", startSec: 42.4, endSec: 42.66 },
      { word: "is", startSec: 42.66, endSec: 42.88 },
      { word: "why...", startSec: 42.88, endSec: 43.25 },
    ],
  },
];
