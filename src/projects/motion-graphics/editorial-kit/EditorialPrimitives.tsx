import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const EDITORIAL_FONTS = {
  display: "'BarlowEditorial', 'Arial Narrow', sans-serif",
  sans: "'SpaceEditorial', 'Helvetica Neue', sans-serif",
};

/**
 * Anti-Slop R-29 Palette:
 * 2 core neutrals (Warm Newsprint + Carbon Ink/Steel) + 1 deliberate accent (Iron-Oxide Rust).
 * Chosen specifically because the story is about iron turning to rust.
 */
export const PALETTE = {
  paper: "#F3EFE6",
  paperDim: "#E6E0D3",
  ink: "#121316",
  steel: "#5A6270",
  steelLight: "#9CA3AF",
  rust: "#D94616",
  rustDark: "#A8330D",
  white: "#FFFFFF",
};

let fontsLoadedPromise: Promise<void> | null = null;

function ensureEditorialFonts(): Promise<void> {
  if (fontsLoadedPromise) return fontsLoadedPromise;
  const specs = [
    {
      family: "BarlowEditorial",
      file: "fonts/BarlowCondensed-ExtraBold.woff2",
      weight: "800",
    },
    {
      family: "SpaceEditorial",
      file: "fonts/SpaceGrotesk-Bold.woff2",
      weight: "700",
    },
  ];
  fontsLoadedPromise = Promise.all(
    specs.map(async (s) => {
      try {
        const face = new FontFace(s.family, `url(${staticFile(s.file)})`, {
          weight: s.weight,
          style: "normal",
        });
        await face.load();
        document.fonts.add(face);
      } catch {
        // Silent fallback
      }
    })
  ).then(() => undefined);
  return fontsLoadedPromise;
}

export const useEditorialFonts = () => {
  const [handle] = useState(() => delayRender("Loading editorial fonts"));
  useEffect(() => {
    ensureEditorialFonts().finally(() => continueRender(handle));
  }, [handle]);
};

/**
 * Clean Print-Editorial Surface (ZERO blueprint grids R-07, ZERO radial glow blobs R-01/R-13).
 * Uses a single thin top progress hairline (inside safe zone >= 148px) and whisper-subtle paper grain.
 */
export const EditorialSurface: React.FC<{
  bgColor: string;
  progress: number;
  progressTrackColor: string;
  progressFillColor: string;
}> = ({ bgColor, progress, progressTrackColor, progressFillColor }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: "hidden" }}>
      {/* Tactile print grain texture (subtle monochrome noise, no tech grid) */}
      <svg
        width="1080"
        height="1920"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.032,
          pointerEvents: "none",
        }}
      >
        <filter id="print-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1080" height="1920" filter="url(#print-grain)" />
      </svg>

      {/* Minimal structural progress hairline at y=152 (no wide-tracked mono eyebrow R-06) */}
      <div
        style={{
          position: "absolute",
          top: 152,
          left: 74,
          right: 74,
          height: 3,
          backgroundColor: progressTrackColor,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, progress * 100))}%`,
            height: "100%",
            backgroundColor: progressFillColor,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Masked Baseline Spring Reveal per word (iart-ai kinetic typography recipe)
 */
export const MaskedKineticLine: React.FC<{
  words: string[];
  startFrame?: number;
  staggerFrames?: number;
  fontSize?: number;
  color?: string;
  accentWord?: string;
  accentColor?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  uppercase?: boolean;
}> = ({
  words,
  startFrame = 0,
  staggerFrames = 3,
  fontSize = 104,
  color = PALETTE.ink,
  accentWord,
  accentColor = PALETTE.rust,
  align = "left",
  lineHeight = 0.96,
  uppercase = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const justify =
    align === "center"
      ? "center"
      : align === "right"
        ? "flex-end"
        : "flex-start";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: justify,
        columnGap: Math.round(fontSize * 0.2),
        rowGap: Math.round(fontSize * 0.06),
      }}
    >
      {words.map((w, idx) => {
        const local = Math.max(0, frame - (startFrame + idx * staggerFrames));
        const p = spring({
          frame: local,
          fps,
          config: { damping: 16, stiffness: 250, mass: 0.65 },
        });
        const ty = interpolate(p, [0, 1], [116, 0]);
        const op = interpolate(local, [0, 3], [0, 1], {
          extrapolateRight: "clamp",
        });
        const isAccent =
          accentWord &&
          w.replace(/[^a-zA-Z0-9$%/-]/g, "").toLowerCase() ===
            accentWord.replace(/[^a-zA-Z0-9$%/-]/g, "").toLowerCase();

        return (
          <span
            key={`${w}-${idx}`}
            style={{
              display: "inline-block",
              overflow: "hidden",
              paddingBottom: Math.round(fontSize * 0.05),
              paddingTop: Math.round(fontSize * 0.02),
            }}
          >
            <span
              style={{
                display: "inline-block",
                fontFamily: EDITORIAL_FONTS.display,
                fontSize,
                fontWeight: 800,
                lineHeight,
                letterSpacing: "-0.015em",
                textTransform: uppercase ? "uppercase" : "none",
                color: isAccent ? accentColor : color,
                transform: `translateY(${ty}%)`,
                opacity: op,
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/**
 * Identity Motif: Solid Iron-Oxide Curtain Wipe linking major structural shifts
 */
export const RustCurtainWipe: React.FC<{
  triggerFrame: number;
  durationFrames?: number;
  direction?: "left-to-right" | "bottom-to-top";
}> = ({ triggerFrame, durationFrames = 18, direction = "left-to-right" }) => {
  const frame = useCurrentFrame();
  const f = frame - triggerFrame;
  if (f < 0 || f > durationFrames) return null;

  const half = durationFrames / 2;
  const inP = interpolate(f, [0, half], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.76, 0, 0.24, 1),
  });
  const outP = interpolate(f, [half, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.76, 0, 0.24, 1),
  });

  if (direction === "bottom-to-top") {
    const topPct = interpolate(inP, [0, 1], [100, 0]);
    const botPct = interpolate(outP, [0, 1], [0, 100]);
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${topPct}%`,
          bottom: `${botPct}%`,
          backgroundColor: PALETTE.rust,
          zIndex: 50,
          pointerEvents: "none",
        }}
      />
    );
  }

  const leftPct = interpolate(outP, [0, 1], [0, 100]);
  const rightPct = interpolate(inP, [0, 1], [100, 0]);
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: `${leftPct}%`,
        right: `${rightPct}%`,
        backgroundColor: PALETTE.rust,
        zIndex: 50,
        pointerEvents: "none",
      }}
    />
  );
};

export interface WordCue {
  word: string;
  startSec: number;
  endSec: number;
  emphasis?: boolean;
}

export interface SubtitleGroup {
  startSec: number;
  endSec: number;
  words: WordCue[];
}

/**
 * Floating Word-Synced Kinetic Subtitles (NO boxes, mobile safe zone bottom >= 265px, WCAG AAA contrast)
 */
export const SyncedKineticSubtitle: React.FC<{
  groups: SubtitleGroup[];
  surface: "paper" | "ink" | "rust";
}> = ({ groups, surface }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const activeGroup = groups.find((g) => t >= g.startSec && t <= g.endSec);
  if (!activeGroup) return null;

  const isLight = surface === "paper";
  const baseColor = isLight ? PALETTE.ink : PALETTE.white;
  const activeColor =
    surface === "rust" ? PALETTE.ink : PALETTE.rust;

  const shadow = isLight
    ? "0 2px 10px rgba(243, 239, 230, 0.96)"
    : surface === "rust"
      ? "0 2px 10px rgba(217, 70, 22, 0.55)"
      : "0 4px 16px rgba(18, 19, 22, 0.92)";

  return (
    <div
      style={{
        position: "absolute",
        left: 76,
        right: 76,
        bottom: 268,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        columnGap: 24,
        rowGap: 10,
        pointerEvents: "none",
        zIndex: 40,
      }}
    >
      {activeGroup.words.map((w, idx) => {
        const isCurrent = t >= w.startSec && t <= w.endSec + 0.08;
        const isPast = t > w.endSec + 0.08;
        const popLocal = Math.max(0, (t - w.startSec) * fps);
        const popSpring = isCurrent
          ? spring({
              frame: popLocal,
              fps,
              config: { damping: 16, stiffness: 300, mass: 0.55 },
            })
          : 0;
        const sc = isCurrent ? interpolate(popSpring, [0, 1], [1.0, 1.06]) : 1;
        const op = isCurrent ? 1 : isPast ? 0.9 : 0.45;

        return (
          <span
            key={`${w.word}-${idx}`}
            style={{
              display: "inline-block",
              padding: "0 3px",
              fontFamily: EDITORIAL_FONTS.sans,
              fontSize: w.emphasis ? 48 : 44,
              fontWeight: 700,
              letterSpacing: "-0.015em",
              color: isCurrent
                ? activeColor
                : w.emphasis && isPast
                  ? activeColor
                  : baseColor,
              opacity: op,
              transform: `scale(${sc})`,
              textShadow: shadow,
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
