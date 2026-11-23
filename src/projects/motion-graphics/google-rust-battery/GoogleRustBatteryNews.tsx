import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  interpolateColors,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  EDITORIAL_FONTS,
  EditorialSurface,
  MaskedKineticLine,
  PALETTE,
  RustCurtainWipe,
  SyncedKineticSubtitle,
  useEditorialFonts,
} from "../editorial-kit/EditorialPrimitives";
import {
  ContinuousBusbarToHomesScene,
  ContinuousIronAirChamber,
  ContinuousLoadAndCliffScene,
  MinnesotaToPayoffDiveScene,
} from "./GoogleRustVisuals";
import {
  BEAT_SEC,
  GOOGLE_RUST_FPS,
  GOOGLE_RUST_FRAMES,
  SUBTITLE_GROUPS,
} from "./googleRustTimings";

export { GOOGLE_RUST_FPS, GOOGLE_RUST_FRAMES };

const s2f = (sec: number) => Math.round(sec * GOOGLE_RUST_FPS);

/**
 * Beat 1 (0.00s - 4.65s): Asymmetric Industrial Editorial Hook ("$1 BILLION ON RUST")
 * Camera physically pans down to reveal "LITHIUM" which gets sheared diagonally in half!
 * Zero mono eyebrows, zero generic icons, zero pills.
 */
const Beat1HookEditorial: React.FC<{ strikeFrame: number }> = ({
  strikeFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heroSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 250, mass: 0.7 },
  });

  // Subtle camera pan down when "Forget expensive lithium batteries" hits
  const camDown = interpolate(
    frame,
    [strikeFrame - 18, strikeFrame + 4],
    [0, -90],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    }
  );

  // Diagonal razor shear progress on "LITHIUM"
  const shearP = interpolate(frame, [strikeFrame, strikeFrame + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const lithiumReveal = spring({
    frame: Math.max(0, frame - (strikeFrame - 16)),
    fps,
    config: { damping: 16, stiffness: 220 },
  });

  return (
    <AbsoluteFill
      style={{
        paddingTop: 340,
        paddingLeft: 74,
        paddingRight: 74,
        transform: `translateY(${camDown}px)`,
      }}
    >
      {/* Massive Left-Aligned Print Headline: "$1 BILLION" */}
      <div
        style={{
          fontFamily: EDITORIAL_FONTS.display,
          fontSize: 236,
          fontWeight: 800,
          lineHeight: 0.86,
          letterSpacing: "-0.025em",
          color: PALETTE.rust,
          transform: `translateY(${interpolate(heroSpring, [0, 1], [60, 0])}px)`,
          opacity: heroSpring,
        }}
      >
        $1 BILLION
      </div>

      <div style={{ marginTop: 12 }}>
        <MaskedKineticLine
          words={["ON", "RUST"]}
          startFrame={5}
          staggerFrames={4}
          fontSize={164}
          color={PALETTE.ink}
          align="left"
        />
      </div>

      {/* Structural Ink Rule */}
      <div
        style={{
          width: interpolate(frame, [8, 26], [0, 932], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.22, 1, 0.36, 1),
          }),
          height: 5,
          backgroundColor: PALETTE.ink,
          marginTop: 58,
          marginBottom: 56,
        }}
      />

      {/* Betrayal Visual: "LITHIUM" cleanly sheared into two offset halves by an iron-oxide cut */}
      <div
        style={{
          position: "relative",
          opacity: lithiumReveal,
          transform: `translateY(${interpolate(lithiumReveal, [0, 1], [40, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: EDITORIAL_FONTS.sans,
            fontSize: 30,
            color: PALETTE.steel,
            marginBottom: 14,
          }}
        >
          Google skipped expensive
        </div>

        <div style={{ position: "relative", height: 150, width: 640 }}>
          {/* Top sheared half shifts slightly right */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              clipPath: "polygon(0 0, 100% 0, 100% 42%, 0 58%)",
              transform: `translate(${shearP * 14}px, ${-shearP * 6}px)`,
              opacity: interpolate(shearP, [0, 1], [1, 0.38]),
            }}
          >
            <span
              style={{
                fontFamily: EDITORIAL_FONTS.display,
                fontSize: 152,
                fontWeight: 800,
                lineHeight: 0.92,
                color: PALETTE.ink,
              }}
            >
              LITHIUM
            </span>
          </div>
          {/* Bottom sheared half shifts slightly left */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              clipPath: "polygon(0 58%, 100% 42%, 100% 100%, 0 100%)",
              transform: `translate(${-shearP * 14}px, ${shearP * 6}px)`,
              opacity: interpolate(shearP, [0, 1], [1, 0.38]),
            }}
          >
            <span
              style={{
                fontFamily: EDITORIAL_FONTS.display,
                fontSize: 152,
                fontWeight: 800,
                lineHeight: 0.92,
                color: PALETTE.ink,
              }}
            >
              LITHIUM
            </span>
          </div>
          {/* Crisp diagonal cut line */}
          <svg
            viewBox="0 0 640 150"
            width="640"
            height="150"
            style={{ position: "absolute", inset: 0, overflow: "visible" }}
          >
            <line
              x1="-12"
              y1="90"
              x2="580"
              y2="56"
              stroke={PALETTE.rust}
              strokeWidth="12"
              strokeDasharray="620"
              strokeDashoffset={620 * (1 - shearP)}
            />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Beat 10 (38.45s - 43.40s): Full-Bleed Architectural Split Shutter ("GENIUS" vs "HYPE")
 * Zero rounded AI cards/pills (R-11). Two stark edge-to-edge typographic slabs locking into place.
 */
const Beat10FullBleedVerdict: React.FC<{ startFrame: number }> = ({
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);

  const leftSlide = interpolate(f, [0, 14], [-1080, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.76, 0, 0.24, 1),
  });
  const rightSlide = interpolate(f, [6, 20], [1080, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.76, 0, 0.24, 1),
  });
  const promptOp = interpolate(f, [18, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", paddingTop: 310 }}>
      {/* Top Full-Bleed Carbon Ink Slab: GENIUS */}
      <div
        style={{
          width: 1080,
          height: 390,
          backgroundColor: PALETTE.ink,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: 80,
          transform: `translateX(${leftSlide}px)`,
        }}
      >
        <div
          style={{
            fontFamily: EDITORIAL_FONTS.display,
            fontSize: 214,
            fontWeight: 800,
            lineHeight: 0.88,
            color: PALETTE.white,
            letterSpacing: "-0.02em",
          }}
        >
          GENIUS
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: EDITORIAL_FONTS.sans,
            fontSize: 30,
            color: PALETTE.steelLight,
          }}
        >
          100 hours at 1/10th the cost
        </div>
      </div>

      {/* Bottom Full-Bleed Iron-Oxide Slab: HYPE */}
      <div
        style={{
          width: 1080,
          height: 390,
          backgroundColor: PALETTE.rust,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-end",
          paddingRight: 80,
          transform: `translateX(${rightSlide}px)`,
        }}
      >
        <div
          style={{
            fontFamily: EDITORIAL_FONTS.display,
            fontSize: 214,
            fontWeight: 800,
            lineHeight: 0.88,
            color: PALETTE.ink,
            letterSpacing: "-0.02em",
          }}
        >
          HYPE
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: EDITORIAL_FONTS.sans,
            fontSize: 30,
            color: PALETTE.paper,
          }}
        >
          First modules do not ship until 2028
        </div>
      </div>

      <div
        style={{
          marginTop: 52,
          paddingLeft: 80,
          fontFamily: EDITORIAL_FONTS.sans,
          fontSize: 32,
          fontWeight: 700,
          color: PALETTE.ink,
          opacity: promptOp,
        }}
      >
        Drop one word in the comments: GENIUS or HYPE.
      </div>
    </AbsoluteFill>
  );
};

export const GoogleRustBatteryNews: React.FC = () => {
  useEditorialFonts();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const f1 = s2f(BEAT_SEC.b1Hook);
  const f1Strike = s2f(BEAT_SEC.b1Strike);
  const f2 = s2f(BEAT_SEC.b2AiGrid);
  const f3 = s2f(BEAT_SEC.b3Lithium4h);
  const f4 = s2f(BEAT_SEC.b4Minnesota);
  const f5a = s2f(BEAT_SEC.b5Bar100h);
  const f5b = s2f(BEAT_SEC.b5PayoffCost);
  const f6 = s2f(BEAT_SEC.b6CutawayDischarge);
  const f7 = s2f(BEAT_SEC.b7CutawayCharge);
  const f8 = s2f(BEAT_SEC.b8Renewables);
  const f9 = s2f(BEAT_SEC.b9Homes2028);
  const f10 = s2f(BEAT_SEC.b10DebateOutro);

  // === CONTINUOUS SMOOTH SURFACE COLOR CHOREOGRAPHY (ZERO 1-frame color jumps!) ===
  // Paper -> Ink (at whip-pan f2) -> Paper (behind rust curtain at f4) -> Ink (at f5a zoom)
  // -> Rust (at f5b zoom-dive) -> Paper (behind shutter pull-up at f6)
  // -> Ink (smooth in-place inversion at f7) -> Paper (whip-pan at f8) -> Paper (f10)
  const bgColor = interpolateColors(
    frame,
    [
      0,
      f2 - 6,
      f2 + 8,
      f4 - 1,
      f4 + 1,
      f5a - 6,
      f5a + 10,
      f5b - 4,
      f5b + 8,
      f6 - 12,
      f6 - 10,
      f7 - 4,
      f7 + 12,
      f8 - 6,
      f8 + 10,
      durationInFrames,
    ],
    [
      PALETTE.paper,
      PALETTE.paper,
      PALETTE.ink,
      PALETTE.ink,
      PALETTE.paper,
      PALETTE.paper,
      PALETTE.ink,
      PALETTE.ink,
      PALETTE.rust,
      PALETTE.rust,
      PALETTE.paper,
      PALETTE.paper,
      PALETTE.ink,
      PALETTE.ink,
      PALETTE.paper,
      PALETTE.paper,
    ]
  );

  // Active subtitle surface contrast mode
  const t = frame / fps;
  let subSurface: "paper" | "ink" | "rust" = "paper";
  if (
    (t >= BEAT_SEC.b2AiGrid && t < BEAT_SEC.b4Minnesota) ||
    (t >= BEAT_SEC.b5Bar100h && t < BEAT_SEC.b5PayoffCost) ||
    (t >= BEAT_SEC.b7CutawayCharge && t < BEAT_SEC.b8Renewables)
  ) {
    subSurface = "ink";
  } else if (t >= BEAT_SEC.b5PayoffCost && t < BEAT_SEC.b6CutawayDischarge) {
    subSurface = "rust";
  }

  // === OVERLAPPED PHYSICAL CAMERA TRANSITIONS ===
  // 1. Beat 1 -> Beat 2+3: Vertical Whip-Pan UP (16 frames overlap)
  const whip12 = interpolate(frame, [f2 - 8, f2 + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.76, 0, 0.24, 1),
  });

  // 2. Beat 5B -> Beat 6+7: Rust Payoff Sheet rolls cleanly upward like an editorial shutter
  const pullUp56 = interpolate(frame, [f6 - 10, f6 + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.76, 0, 0.24, 1),
  });

  // 3. Beat 6+7 -> Beat 8+9: Horizontal Camera Whip-Pan LEFT (16 frames overlap)
  const whip78 = interpolate(frame, [f8 - 8, f8 + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.76, 0, 0.24, 1),
  });

  // 4. Beat 8+9 exit subtle pull-back as Beat 10 full-bleed slabs lock in
  const exit910 = interpolate(frame, [f10 - 2, f10 + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.76, 0, 0.24, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.paper }}>
      {/* Clean Print-Editorial Surface (ZERO blueprint grids, ZERO radial glows) */}
      <EditorialSurface
        bgColor={bgColor}
        progress={frame / Math.max(1, durationInFrames - 1)}
        progressTrackColor={
          subSurface === "paper"
            ? "rgba(18, 19, 22, 0.14)"
            : "rgba(255, 255, 255, 0.2)"
        }
        progressFillColor={
          subSurface === "rust" ? PALETTE.ink : PALETTE.rust
        }
      />

      {/* === ORGANIC STUDIO AUDIO (ZERO synthetic "ctung-ctung" sine chimes!) === */}
      <Audio
        src={staticFile("audio/google-rust-battery/vo_en.mp3")}
        volume={1.0}
      />
      <Audio
        src={staticFile("audio/google-rust-battery/bgm_doc.mp3")}
        volume={0.09}
      />

      {/* Restrained, organic SFX on 5 key physical moments only */}
      <Sequence from={f1} durationInFrames={30}>
        <Audio
          src={staticFile("audio/google-rust-battery/sfx_thump.mp3")}
          volume={0.42}
        />
      </Sequence>
      <Sequence from={f1Strike} durationInFrames={16}>
        <Audio
          src={staticFile("audio/google-rust-battery/sfx_cut.mp3")}
          volume={0.55}
        />
      </Sequence>
      <Sequence from={f4 - 8} durationInFrames={24}>
        <Audio
          src={staticFile("audio/google-rust-battery/sfx_whoosh_soft.mp3")}
          volume={0.36}
        />
      </Sequence>
      <Sequence from={f5b - 4} durationInFrames={30}>
        <Audio
          src={staticFile("audio/google-rust-battery/sfx_thump.mp3")}
          volume={0.52}
        />
      </Sequence>
      <Sequence from={f10 - 4} durationInFrames={24}>
        <Audio
          src={staticFile("audio/google-rust-battery/sfx_whoosh_soft.mp3")}
          volume={0.34}
        />
      </Sequence>

      {/* === CHAPTER 1 (Beat 1: Hook) whips UP off screen at f2 === */}
      {frame < f2 + 10 && (
        <AbsoluteFill
          style={{
            backgroundColor: PALETTE.paper,
            transform: `translateY(${interpolate(whip12, [0, 1], [0, -1920])}px)`,
          }}
        >
          <Beat1HookEditorial strikeFrame={f1Strike} />
        </AbsoluteFill>
      )}

      {/* === CHAPTER 2 (Beat 2 + 3: Continuous Load -> Cliff Horizontal Chart) === */}
      {frame >= f2 - 10 && frame < f4 + 2 && (
        <AbsoluteFill
          style={{
            backgroundColor: PALETTE.ink,
            transform: `translateY(${interpolate(whip12, [0, 1], [1920, 0])}px)`,
          }}
        >
          <ContinuousLoadAndCliffScene
            beat2StartFrame={f2}
            beat3StartFrame={f3}
          />
        </AbsoluteFill>
      )}

      {/* === CHAPTER 4 (Beat 6 + 7: Single Locked Iron-Air Chamber) sits under Chapter 3 shutter === */}
      {frame >= f6 - 10 && frame < f8 + 10 && (
        <AbsoluteFill
          style={{
            backgroundColor: frame >= f8 - 10 ? PALETTE.ink : "transparent",
            transform: `translateX(${interpolate(whip78, [0, 1], [0, -1080])}px)`,
          }}
        >
          <ContinuousIronAirChamber
            beat6StartFrame={f6}
            beat7StartFrame={f7}
          />
        </AbsoluteFill>
      )}

      {/* === CHAPTER 3 (Beat 4 + 5A + 5B: Minnesota -> 100 HRS -> Zoom Dive 1/10TH) === */}
      {/* Pulls cleanly UP at f6 like a print shutter to unveil Chapter 4 underneath! */}
      {frame >= f4 - 1 && frame < f6 + 8 && (
        <AbsoluteFill
          style={{
            backgroundColor:
              frame >= f5b + 6 ? PALETTE.rust : "transparent",
            transform: `translateY(${interpolate(pullUp56, [0, 1], [0, -1920])}px)`,
            zIndex: 10,
          }}
        >
          <MinnesotaToPayoffDiveScene
            beat4StartFrame={f4}
            beat5aStartFrame={f5a}
            beat5bStartFrame={f5b}
          />
        </AbsoluteFill>
      )}

      {/* === CHAPTER 5 (Beat 8 + 9: Continuous Busbar Wind/Solar -> 200k Homes & 2028) === */}
      {frame >= f8 - 10 && frame < f10 + 16 && (
        <AbsoluteFill
          style={{
            backgroundColor: PALETTE.paper,
            transform: `translateX(${interpolate(whip78, [0, 1], [1080, 0])}px) scale(${interpolate(exit910, [0, 1], [1, 0.94])})`,
            opacity: interpolate(exit910, [0, 1], [1, 0]),
          }}
        >
          <ContinuousBusbarToHomesScene
            beat8StartFrame={f8}
            beat9StartFrame={f9}
          />
        </AbsoluteFill>
      )}

      {/* === CHAPTER 6 (Beat 10: Full-Bleed Split Shutter Verdict) === */}
      {frame >= f10 - 2 && <Beat10FullBleedVerdict startFrame={f10} />}

      {/* === IDENTITY MOTIF: Physical Iron-Oxide Curtain Wipes === */}
      {/* Sweep left-to-right bridging Beat 3 cliff -> Beat 4 Minnesota */}
      <RustCurtainWipe
        triggerFrame={f4 - 9}
        durationFrames={18}
        direction="left-to-right"
      />
      {/* Continuous loop sweep bottom-to-top in final 12 frames back into frame 0 */}
      <RustCurtainWipe
        triggerFrame={durationInFrames - 12}
        durationFrames={14}
        direction="bottom-to-top"
      />

      {/* Minimal top progress hairline kept above solid whip-pan sheets (y=152) */}
      <div
        style={{
          position: "absolute",
          top: 152,
          left: 74,
          right: 74,
          height: 3,
          backgroundColor:
            subSurface === "paper"
              ? "rgba(18, 19, 22, 0.14)"
              : "rgba(255, 255, 255, 0.2)",
          overflow: "hidden",
          zIndex: 35,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, (frame / Math.max(1, durationInFrames - 1)) * 100))}%`,
            height: "100%",
            backgroundColor:
              subSurface === "rust" ? PALETTE.ink : PALETTE.rust,
          }}
        />
      </div>

      {/* Floating Word-Synced Kinetic Subtitles (NO box, safe zone bottom >= 268px) */}
      <SyncedKineticSubtitle groups={SUBTITLE_GROUPS} surface={subSurface} />
    </AbsoluteFill>
  );
};
