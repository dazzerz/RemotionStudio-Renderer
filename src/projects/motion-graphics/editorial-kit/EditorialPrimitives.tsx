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
  mono: "'MonoEditorial', 'DejaVu Sans Mono', monospace",
};

export const PALETTE = {
  paper: "#F6F2E9",
  paperAlt: "#EFE9DC",
  ink: "#10131A",
  inkMuted: "#475062",
  obsidian: "#0D1118",
  obsidianCard: "#161C27",
  rust: "#E34F1D",
  rustDeep: "#B5380F",
  amber: "#FFB300",
  cyan: "#00A8E8",
  emerald: "#0FB981",
  crimson: "#E63946",
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
    {
      family: "MonoEditorial",
      file: "fonts/JetBrainsMono-Bold.woff2",
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
        // Fallback silently to system font if unavailable
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

export const EditorialBackdrop: React.FC<{
  theme: "paper" | "obsidian" | "rust";
  accent?: string;
  progress: number;
  beatTag?: string;
}> = ({ theme, accent = PALETTE.rust, progress, beatTag }) => {
  const frame = useCurrentFrame();

  const bg =
    theme === "paper"
      ? PALETTE.paper
      : theme === "rust"
        ? PALETTE.rust
        : PALETTE.obsidian;

  const gridColor =
    theme === "paper"
      ? "rgba(16, 19, 26, 0.065)"
      : theme === "rust"
        ? "rgba(255, 255, 255, 0.10)"
        : "rgba(255, 255, 255, 0.06)";

  const driftX = (frame * 0.55) % 60;
  const driftY = (frame * 0.35) % 60;
  const glowScale = 1 + Math.sin(frame * 0.05) * 0.06;

  return (
    <AbsoluteFill style={{ backgroundColor: bg, overflow: "hidden" }}>
      {/* Soft radial ambient lighting */}
      <div
        style={{
          position: "absolute",
          inset: -200,
          background:
            theme === "paper"
              ? `radial-gradient(circle at 75% 22%, ${accent}22 0%, transparent 48%), radial-gradient(circle at 20% 78%, ${PALETTE.cyan}18 0%, transparent 50%)`
              : theme === "rust"
                ? `radial-gradient(circle at 50% 35%, #FF9F1C40 0%, transparent 55%), radial-gradient(circle at 50% 90%, #10131A60 0%, transparent 60%)`
                : `radial-gradient(circle at 78% 24%, ${accent}30 0%, transparent 48%), radial-gradient(circle at 22% 76%, ${PALETTE.cyan}24 0%, transparent 52%)`,
          transform: `scale(${glowScale})`,
        }}
      />

      {/* Moving architectural dot + hairline grid */}
      <svg
        width="1080"
        height="1920"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <defs>
          <pattern
            id={`grid-${theme}`}
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${driftX}, ${driftY})`}
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke={gridColor}
              strokeWidth="1.2"
            />
            <circle cx="0" cy="0" r="2.2" fill={gridColor} />
          </pattern>
        </defs>
        <rect width="1080" height="1920" fill={`url(#grid-${theme})`} />
      </svg>

      {/* Top safe-zone editorial masthead hairline (y=148, well inside safe zone >=140) */}
      <div
        style={{
          position: "absolute",
          top: 146,
          left: 74,
          right: 74,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: EDITORIAL_FONTS.mono,
            fontSize: 22,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color:
              theme === "paper"
                ? PALETTE.inkMuted
                : "rgba(255, 255, 255, 0.72)",
          }}
        >
          <span>{beatTag ?? "GLOBAL TECH BRIEF"}</span>
          <span>2026 REPORT</span>
        </div>
        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            height: 4,
            backgroundColor:
              theme === "paper"
                ? "rgba(16, 19, 26, 0.14)"
                : "rgba(255, 255, 255, 0.18)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, progress * 100))}%`,
              height: "100%",
              backgroundColor: theme === "rust" ? PALETTE.amber : accent,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Masked Baseline Spring Reveal per word (Kinetic Typography core primitive)
 */
export const MaskedKineticLine: React.FC<{
  words: string[];
  startFrame?: number;
  staggerFrames?: number;
  fontSize?: number;
  color?: string;
  accentWord?: string;
  accentColor?: string;
  fontFamily?: string;
  align?: "left" | "center";
  lineHeight?: number;
  letterSpacing?: string;
  uppercase?: boolean;
}> = ({
  words,
  startFrame = 0,
  staggerFrames = 3,
  fontSize = 96,
  color = PALETTE.ink,
  accentWord,
  accentColor = PALETTE.rust,
  fontFamily = EDITORIAL_FONTS.display,
  align = "center",
  lineHeight = 1.0,
  letterSpacing = "-0.01em",
  uppercase = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: Math.round(fontSize * 0.22),
        rowGap: Math.round(fontSize * 0.08),
      }}
    >
      {words.map((w, idx) => {
        const local = Math.max(0, frame - (startFrame + idx * staggerFrames));
        const p = spring({
          frame: local,
          fps,
          config: { damping: 15, stiffness: 230, mass: 0.7 },
        });
        const ty = interpolate(p, [0, 1], [118, 0]);
        const op = interpolate(local, [0, 4], [0, 1], {
          extrapolateRight: "clamp",
        });
        const isAccent =
          accentWord &&
          w.replace(/[^a-zA-Z0-9$%-]/g, "").toLowerCase() ===
            accentWord.replace(/[^a-zA-Z0-9$%-]/g, "").toLowerCase();

        return (
          <span
            key={`${w}-${idx}`}
            style={{
              display: "inline-block",
              overflow: "hidden",
              paddingBottom: Math.round(fontSize * 0.06),
              paddingTop: Math.round(fontSize * 0.03),
            }}
          >
            <span
              style={{
                display: "inline-block",
                fontFamily,
                fontSize,
                fontWeight: 800,
                lineHeight,
                letterSpacing,
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
 * Animated Editorial Highlighter Sweep behind text
 */
export const HighlighterSweep: React.FC<{
  children: React.ReactNode;
  startFrame?: number;
  durationFrames?: number;
  color?: string;
  textColor?: string;
  skewDeg?: number;
}> = ({
  children,
  startFrame = 0,
  durationFrames = 14,
  color = PALETTE.amber,
  textColor = PALETTE.ink,
  skewDeg = -2,
}) => {
  const frame = useCurrentFrame();
  const sweep = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }
  );

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        padding: "2px 16px",
        color: textColor,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          top: "6%",
          bottom: "4%",
          width: `${sweep * 100}%`,
          backgroundColor: color,
          transform: `skewX(${skewDeg}deg)`,
          borderRadius: 6,
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
  );
};

/**
 * Animated SVG Strikethrough for Evidence + Betrayal Myth Slashing
 */
export const MythStrike: React.FC<{
  text: string;
  startFrame?: number;
  strikeDelay?: number;
  fontSize?: number;
  textColor?: string;
  strikeColor?: string;
}> = ({
  text,
  startFrame = 0,
  strikeDelay = 12,
  fontSize = 104,
  textColor = PALETTE.inkMuted,
  strikeColor = PALETTE.crimson,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 16, stiffness: 210 },
  });
  const strikeProgress = interpolate(
    frame,
    [startFrame + strikeDelay, startFrame + strikeDelay + 12],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    }
  );
  const dimOpacity = interpolate(strikeProgress, [0, 1], [1, 0.42]);

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        transform: `scale(${interpolate(enter, [0, 1], [0.88, 1])})`,
        opacity: enter,
      }}
    >
      <span
        style={{
          fontFamily: EDITORIAL_FONTS.display,
          fontSize,
          fontWeight: 800,
          letterSpacing: "0.02em",
          color: textColor,
          opacity: dimOpacity,
          textTransform: "uppercase",
        }}
      >
        {text}
      </span>
      <svg
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          left: "-5%",
          top: "-10%",
          width: "110%",
          height: "120%",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <path
          d="M 8 68 Q 200 38 392 30"
          fill="none"
          stroke={strikeColor}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray="440"
          strokeDashoffset={440 * (1 - strikeProgress)}
        />
      </svg>
    </div>
  );
};

/**
 * Hero Stat Slam with spring punch and optional counter roll-up
 */
export const HeroStatSlam: React.FC<{
  valueText: string;
  label?: string;
  startFrame?: number;
  fontSize?: number;
  color?: string;
  labelColor?: string;
}> = ({
  valueText,
  label,
  startFrame = 0,
  fontSize = 180,
  color = PALETTE.rust,
  labelColor = PALETTE.ink,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const local = Math.max(0, frame - startFrame);
  const p = spring({
    frame: local,
    fps,
    config: { damping: 12, stiffness: 250, mass: 0.75 },
  });
  const sc = interpolate(p, [0, 1], [1.35, 1]);
  const op = interpolate(local, [0, 4], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: `scale(${sc})`,
        opacity: op,
      }}
    >
      <div
        style={{
          fontFamily: EDITORIAL_FONTS.display,
          fontSize,
          fontWeight: 800,
          lineHeight: 0.9,
          letterSpacing: "-0.02em",
          color,
          textTransform: "uppercase",
        }}
      >
        {valueText}
      </div>
      {label && (
        <div
          style={{
            marginTop: 14,
            fontFamily: EDITORIAL_FONTS.mono,
            fontSize: 30,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: labelColor,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

/**
 * Hairline SVG callout (ZERO card box, pure 2px leader line + dot + mono text)
 */
export const HairlineCallout: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  sublabel?: string;
  startFrame?: number;
  color?: string;
  textColor?: string;
  align?: "left" | "right";
}> = ({
  x1,
  y1,
  x2,
  y2,
  label,
  sublabel,
  startFrame = 0,
  color = PALETTE.rust,
  textColor = PALETTE.ink,
  align = "left",
}) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [startFrame, startFrame + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const textOp = interpolate(frame, [startFrame + 8, startFrame + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) + 120;
  const elbowX = align === "left" ? x2 + 90 : x2 - 90;

  return (
    <g>
      <circle cx={x1} cy={y1} r={8 * draw} fill={color} />
      <circle
        cx={x1}
        cy={y1}
        r={16 * draw}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        opacity={0.5}
      />
      <path
        d={`M ${x1} ${y1} L ${x2} ${y2} L ${elbowX} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - draw)}
      />
      <g opacity={textOp}>
        <text
          x={align === "left" ? x2 + 8 : x2 - 8}
          y={y2 - 12}
          textAnchor={align === "left" ? "start" : "end"}
          fill={textColor}
          fontFamily={EDITORIAL_FONTS.mono}
          fontSize="26"
          fontWeight="700"
          letterSpacing="0.06em"
        >
          {label}
        </text>
        {sublabel && (
          <text
            x={align === "left" ? x2 + 8 : x2 - 8}
            y={y2 + 28}
            textAnchor={align === "left" ? "start" : "end"}
            fill={color}
            fontFamily={EDITORIAL_FONTS.sans}
            fontSize="24"
            fontWeight="700"
          >
            {sublabel}
          </text>
        )}
      </g>
    </g>
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
 * Floating Kinetic Subtitle (NO box/card, mobile safe zone bottom >= 235px)
 */
export const SyncedKineticSubtitle: React.FC<{
  groups: SubtitleGroup[];
  theme: "paper" | "obsidian" | "rust";
}> = ({ groups, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const activeGroup = groups.find((g) => t >= g.startSec && t <= g.endSec);
  if (!activeGroup) return null;

  const isLightBg = theme === "paper";
  const baseTextColor = isLightBg ? PALETTE.ink : PALETTE.white;
  const activeColor =
    theme === "rust"
      ? PALETTE.amber
      : isLightBg
        ? PALETTE.rust
        : PALETTE.amber;
  const shadow = isLightBg
    ? "0 3px 10px rgba(246, 242, 233, 0.95), 0 0 2px rgba(246, 242, 233, 1)"
    : "0 5px 18px rgba(0, 0, 0, 0.92), 0 2px 4px rgba(0, 0, 0, 0.95)";

  return (
    <div
      style={{
        position: "absolute",
        left: 76,
        right: 76,
        bottom: 275,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        columnGap: 24,
        rowGap: 10,
        pointerEvents: "none",
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
              config: { damping: 14, stiffness: 280, mass: 0.6 },
            })
          : 0;
        const sc = isCurrent ? interpolate(popSpring, [0, 1], [1.0, 1.07]) : 1;
        const op = isCurrent ? 1 : isPast ? 0.9 : 0.5;

        return (
          <span
            key={`${w.word}-${idx}`}
            style={{
              display: "inline-block",
              padding: "0 3px",
              fontFamily: EDITORIAL_FONTS.sans,
              fontSize: w.emphasis ? 48 : 44,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: isCurrent
                ? activeColor
                : w.emphasis && isPast
                  ? activeColor
                  : baseTextColor,
              opacity: op,
              transform: `scale(${sc})`,
              textShadow: shadow,
              WebkitTextStroke: isLightBg
                ? "0px transparent"
                : "1.2px rgba(0,0,0,0.45)",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
