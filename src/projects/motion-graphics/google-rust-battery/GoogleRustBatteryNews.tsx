import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  EDITORIAL_FONTS,
  EditorialBackdrop,
  HeroStatSlam,
  HighlighterSweep,
  MaskedKineticLine,
  MythStrike,
  PALETTE,
  SyncedKineticSubtitle,
  useEditorialFonts,
} from "../editorial-kit/EditorialPrimitives";
import {
  AiGridDrainGraphic,
  DurationComparisonChart,
  HomesAndTimelineGraphic,
  IronAirCutawayGraphic,
  LithiumDrainGraphic,
  MinnesotaMapGraphic,
  RenewablesFlowGraphic,
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
 * Beat 1: Evidence + Betrayal Hook ("$1B ON RUST" + Slashing "LITHIUM")
 */
const Beat1Hook: React.FC<{ strikeLocalFrame: number }> = ({
  strikeLocalFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const punch = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 260 },
  });
  const drift = interpolate(frame, [0, 140], [1.0, 1.035], {
    extrapolateRight: "clamp",
  });
  const rustBurst = interpolate(frame, [0, 18], [0.6, 1.05], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: 430,
        paddingLeft: 74,
        paddingRight: 74,
        transform: `scale(${drift})`,
      }}
    >
      {/* Subtle kinetic sunburst accent lines behind hero number */}
      <svg
        viewBox="0 0 900 420"
        width="900"
        height="420"
        style={{
          position: "absolute",
          top: 405,
          opacity: 0.22,
          transform: `scale(${rustBurst})`,
          pointerEvents: "none",
        }}
      >
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
          <line
            key={deg}
            x1="450"
            y1="210"
            x2={450 + Math.cos((deg * Math.PI) / 180) * 380}
            y2={210 + Math.sin((deg * Math.PI) / 180) * 195}
            stroke={PALETTE.rust}
            strokeWidth="3"
            strokeDasharray="16 14"
          />
        ))}
      </svg>

      {/* Editorial Eyebrow */}
      <div
        style={{
          fontFamily: EDITORIAL_FONTS.mono,
          fontSize: 26,
          letterSpacing: "0.18em",
          color: PALETTE.rust,
          marginBottom: 20,
          opacity: punch,
        }}
      >
        GOOGLE · ENERGY BET
      </div>

      {/* Burned-in Hook Text <= 4 words: "$1 BILLION ON RUST" */}
      <HeroStatSlam
        valueText="$1 BILLION"
        startFrame={0}
        fontSize={214}
        color={PALETTE.rust}
      />

      <div style={{ marginTop: 14 }}>
        <MaskedKineticLine
          words={["ON", "RUST"]}
          startFrame={6}
          staggerFrames={4}
          fontSize={138}
          color={PALETTE.ink}
          accentWord="RUST"
          accentColor={PALETTE.rustDeep}
        />
      </div>

      {/* Divider Hairline */}
      <div
        style={{
          width: interpolate(frame, [10, 28], [0, 560], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.22, 1, 0.36, 1),
          }),
          height: 4,
          backgroundColor: PALETTE.ink,
          marginTop: 64,
          marginBottom: 64,
        }}
      />

      {/* Betrayal Visual: LITHIUM slashed with animated red marker */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            fontFamily: EDITORIAL_FONTS.mono,
            fontSize: 24,
            letterSpacing: "0.16em",
            color: PALETTE.inkMuted,
            opacity: interpolate(
              frame,
              [Math.max(0, strikeLocalFrame - 12), strikeLocalFrame],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
          }}
        >
          NOT EXPENSIVE
        </div>
        <MythStrike
          text="LITHIUM"
          startFrame={Math.max(0, strikeLocalFrame - 10)}
          strikeDelay={10}
          fontSize={124}
          textColor={PALETTE.ink}
          strikeColor={PALETTE.crimson}
        />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Beat 5B: Core Payoff Slam ("1/10TH THE COST") on high-impact Rust canvas
 */
const Beat5PayoffSlam: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 90], [1.0, 1.05], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: 530,
        paddingLeft: 74,
        paddingRight: 74,
        transform: `scale(${drift})`,
      }}
    >
      <div
        style={{
          fontFamily: EDITORIAL_FONTS.mono,
          fontSize: 28,
          letterSpacing: "0.2em",
          color: PALETTE.amber,
          marginBottom: 28,
        }}
      >
        THE REAL BREAKTHROUGH
      </div>

      <HeroStatSlam
        valueText="1/10TH"
        startFrame={0}
        fontSize={248}
        color={PALETTE.white}
      />

      <div style={{ marginTop: 28 }}>
        <MaskedKineticLine
          words={["THE", "COST", "OF"]}
          startFrame={6}
          staggerFrames={3}
          fontSize={96}
          color={PALETTE.white}
        />
      </div>
      <div style={{ marginTop: 14 }}>
        <HighlighterSweep
          startFrame={14}
          durationFrames={12}
          color={PALETTE.amber}
          textColor={PALETTE.ink}
        >
          <span
            style={{
              fontFamily: EDITORIAL_FONTS.display,
              fontSize: 112,
              fontWeight: 800,
              letterSpacing: "0.02em",
            }}
          >
            LITHIUM-ION
          </span>
        </HighlighterSweep>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Beat 10: High-Contrast Split Debate Outro ("GENIUS" vs "HYPE") + Loop Transition
 */
const Beat10DebateOutro: React.FC<{ totalLocalFrames: number }> = ({
  totalLocalFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftSpring = spring({
    frame,
    fps,
    config: { damping: 13, stiffness: 240 },
  });
  const rightSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 13, stiffness: 240 },
  });
  const vsSpring = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 12, stiffness: 260 },
  });

  // Seamless zoom flash in the last 10 frames back to Beat 1 paper tone
  const loopFlash = interpolate(
    frame,
    [Math.max(10, totalLocalFrames - 10), totalLocalFrames],
    [0, 0.85],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: 430,
        paddingLeft: 74,
        paddingRight: 74,
      }}
    >
      <div
        style={{
          fontFamily: EDITORIAL_FONTS.mono,
          fontSize: 28,
          letterSpacing: "0.2em",
          color: PALETTE.inkMuted,
          marginBottom: 42,
        }}
      >
        YOUR VERDICT
      </div>

      {/* Top Split Word: GENIUS */}
      <div
        style={{
          width: "100%",
          padding: "46px 0",
          backgroundColor: PALETTE.obsidian,
          borderRadius: 24,
          display: "flex",
          justifyContent: "center",
          transform: `translateX(${interpolate(leftSpring, [0, 1], [-120, 0])}px) scale(${interpolate(leftSpring, [0, 1], [0.92, 1])})`,
          opacity: leftSpring,
        }}
      >
        <span
          style={{
            fontFamily: EDITORIAL_FONTS.display,
            fontSize: 164,
            fontWeight: 800,
            color: PALETTE.emerald,
            letterSpacing: "0.03em",
            lineHeight: 0.9,
          }}
        >
          GENIUS
        </span>
      </div>

      {/* Center VS Divider */}
      <div
        style={{
          margin: "-24px 0",
          zIndex: 5,
          width: 94,
          height: 94,
          borderRadius: 47,
          backgroundColor: PALETTE.amber,
          border: `6px solid ${PALETTE.paper}`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: EDITORIAL_FONTS.display,
          fontSize: 48,
          fontWeight: 800,
          color: PALETTE.ink,
          transform: `scale(${vsSpring})`,
        }}
      >
        OR
      </div>

      {/* Bottom Split Word: HYPE */}
      <div
        style={{
          width: "100%",
          padding: "46px 0",
          backgroundColor: PALETTE.rust,
          borderRadius: 24,
          display: "flex",
          justifyContent: "center",
          transform: `translateX(${interpolate(rightSpring, [0, 1], [120, 0])}px) scale(${interpolate(rightSpring, [0, 1], [0.92, 1])})`,
          opacity: rightSpring,
        }}
      >
        <span
          style={{
            fontFamily: EDITORIAL_FONTS.display,
            fontSize: 164,
            fontWeight: 800,
            color: PALETTE.white,
            letterSpacing: "0.03em",
            lineHeight: 0.9,
          }}
        >
          HYPE
        </span>
      </div>

      <div
        style={{
          marginTop: 56,
          fontFamily: EDITORIAL_FONTS.mono,
          fontSize: 32,
          letterSpacing: "0.14em",
          color: PALETTE.ink,
          textAlign: "center",
        }}
      >
        COMMENT ONE WORD BELOW
      </div>

      {/* Subtle loop blend into frame 0 */}
      <AbsoluteFill
        style={{
          backgroundColor: PALETTE.paper,
          opacity: loopFlash,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

export const GoogleRustBatteryNews: React.FC = () => {
  useEditorialFonts();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  // Determine current editorial canvas theme & masthead tag based on real audio beats
  let theme: "paper" | "obsidian" | "rust" = "paper";
  let accent = PALETTE.rust;
  let beatTag = "GLOBAL TECH · ENERGY";

  if (t >= BEAT_SEC.b10DebateOutro) {
    theme = "paper";
    accent = PALETTE.rust;
    beatTag = "VERDICT · 2026";
  } else if (t >= BEAT_SEC.b9Homes2028) {
    theme = "obsidian";
    accent = PALETTE.amber;
    beatTag = "GRID IMPACT · 2028";
  } else if (t >= BEAT_SEC.b8Renewables) {
    theme = "paper";
    accent = PALETTE.emerald;
    beatTag = "CLEAN POWER · 1.6 GW";
  } else if (t >= BEAT_SEC.b7CutawayCharge) {
    theme = "obsidian";
    accent = PALETTE.emerald;
    beatTag = "HOW IT RECHARGES";
  } else if (t >= BEAT_SEC.b6CutawayDischarge) {
    theme = "paper";
    accent = PALETTE.rust;
    beatTag = "REVERSIBLE RUST TECH";
  } else if (t >= BEAT_SEC.b5PayoffCost) {
    theme = "rust";
    accent = PALETTE.amber;
    beatTag = "COST BREAKTHROUGH";
  } else if (t >= BEAT_SEC.b5Bar100h) {
    theme = "obsidian";
    accent = PALETTE.amber;
    beatTag = "DURATION COMPARISON";
  } else if (t >= BEAT_SEC.b4Minnesota) {
    theme = "paper";
    accent = PALETTE.rust;
    beatTag = "MINNESOTA · USA";
  } else if (t >= BEAT_SEC.b3Lithium4h) {
    theme = "paper";
    accent = PALETTE.crimson;
    beatTag = "THE LITHIUM LIMIT";
  } else if (t >= BEAT_SEC.b2AiGrid) {
    theme = "obsidian";
    accent = PALETTE.cyan;
    beatTag = "AI POWER CRISIS";
  }

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

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.paper }}>
      {/* Continuous Editorial Backdrop + Progress Hairline */}
      <EditorialBackdrop
        theme={theme}
        accent={accent}
        progress={frame / Math.max(1, durationInFrames - 1)}
        beatTag={beatTag}
      />

      {/* Audio Track: Real English Voiceover + Subtle Editorial Underscore + Crisp Beat SFX */}
      <Audio src={staticFile("audio/google-rust-battery/vo_en.mp3")} volume={1.0} />
      <Audio
        src={staticFile("audio/google-rust-battery/bgm_editorial.mp3")}
        volume={0.11}
      />

      <Sequence from={f1} durationInFrames={30}>
        <Audio src={staticFile("audio/google-rust-battery/sfx_slam.mp3")} volume={0.5} />
      </Sequence>
      <Sequence from={f1Strike} durationInFrames={20}>
        <Audio src={staticFile("audio/google-rust-battery/sfx_slash.mp3")} volume={0.55} />
      </Sequence>
      <Sequence from={f2} durationInFrames={24}>
        <Audio src={staticFile("audio/google-rust-battery/sfx_zap.mp3")} volume={0.35} />
      </Sequence>
      <Sequence from={f3} durationInFrames={18}>
        <Audio src={staticFile("audio/google-rust-battery/sfx_pop.mp3")} volume={0.45} />
      </Sequence>
      <Sequence from={f4} durationInFrames={24}>
        <Audio src={staticFile("audio/google-rust-battery/sfx_whoosh.mp3")} volume={0.42} />
      </Sequence>
      <Sequence from={f5a} durationInFrames={24}>
        <Audio src={staticFile("audio/google-rust-battery/sfx_whoosh.mp3")} volume={0.45} />
      </Sequence>
      <Sequence from={f5b} durationInFrames={30}>
        <Audio src={staticFile("audio/google-rust-battery/sfx_slam.mp3")} volume={0.62} />
      </Sequence>
      <Sequence from={f6} durationInFrames={24}>
        <Audio src={staticFile("audio/google-rust-battery/sfx_zap.mp3")} volume={0.38} />
      </Sequence>
      <Sequence from={f7} durationInFrames={24}>
        <Audio src={staticFile("audio/google-rust-battery/sfx_whoosh.mp3")} volume={0.42} />
      </Sequence>
      <Sequence from={f8} durationInFrames={18}>
        <Audio src={staticFile("audio/google-rust-battery/sfx_pop.mp3")} volume={0.42} />
      </Sequence>
      <Sequence from={f9} durationInFrames={18}>
        <Audio src={staticFile("audio/google-rust-battery/sfx_pop.mp3")} volume={0.45} />
      </Sequence>
      <Sequence from={f10} durationInFrames={30}>
        <Audio src={staticFile("audio/google-rust-battery/sfx_slam.mp3")} volume={0.5} />
      </Sequence>

      {/* BEAT 1: Evidence + Betrayal Hook */}
      <Sequence from={f1} durationInFrames={Math.max(1, f2 - f1)}>
        <Beat1Hook strikeLocalFrame={Math.max(6, f1Strike - f1)} />
      </Sequence>

      {/* BEAT 2: AI Data Centers Drain Power Grids */}
      <Sequence from={f2} durationInFrames={Math.max(1, f3 - f2)}>
        <AbsoluteFill
          style={{
            alignItems: "center",
            paddingTop: 385,
            paddingLeft: 74,
            paddingRight: 74,
          }}
        >
          <MaskedKineticLine
            words={["AI", "DRAINS", "POWER", "GRIDS"]}
            startFrame={0}
            staggerFrames={3}
            fontSize={106}
            color={PALETTE.white}
            accentWord="DRAINS"
            accentColor={PALETTE.amber}
          />
          <div style={{ marginTop: 64 }}>
            <AiGridDrainGraphic startFrame={0} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* BEAT 3: Standard Lithium Batteries Die in 4 Hours */}
      <Sequence from={f3} durationInFrames={Math.max(1, f4 - f3)}>
        <AbsoluteFill
          style={{
            alignItems: "center",
            paddingTop: 410,
            paddingLeft: 74,
            paddingRight: 74,
          }}
        >
          <MaskedKineticLine
            words={["STANDARD", "BATTERIES"]}
            startFrame={0}
            staggerFrames={3}
            fontSize={98}
            color={PALETTE.ink}
          />
          <div style={{ marginTop: 10 }}>
            <HighlighterSweep
              startFrame={8}
              durationFrames={12}
              color={PALETTE.crimson}
              textColor={PALETTE.white}
            >
              <span
                style={{
                  fontFamily: EDITORIAL_FONTS.display,
                  fontSize: 104,
                  fontWeight: 800,
                }}
              >
                DIE IN 4 HOURS
              </span>
            </HighlighterSweep>
          </div>
          <div style={{ marginTop: 84 }}>
            <LithiumDrainGraphic startFrame={0} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* BEAT 4: Minnesota Giant — 30 GWh World's Largest */}
      <Sequence from={f4} durationInFrames={Math.max(1, f5a - f4)}>
        <AbsoluteFill
          style={{
            alignItems: "center",
            paddingTop: 350,
            paddingLeft: 74,
            paddingRight: 74,
          }}
        >
          <HeroStatSlam
            valueText="30 GWh"
            startFrame={0}
            fontSize={190}
            color={PALETTE.rust}
          />
          <div style={{ marginTop: 12 }}>
            <HighlighterSweep
              startFrame={10}
              durationFrames={14}
              color={PALETTE.amber}
              textColor={PALETTE.ink}
            >
              <span
                style={{
                  fontFamily: EDITORIAL_FONTS.display,
                  fontSize: 66,
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                }}
              >
                WORLD&apos;S LARGEST GRID BATTERY
              </span>
            </HighlighterSweep>
          </div>
          <div style={{ marginTop: 56 }}>
            <MinnesotaMapGraphic startFrame={0} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* BEAT 5A: 100 Hours vs 4 Hours Animated Bar Chart */}
      <Sequence from={f5a} durationInFrames={Math.max(1, f5b - f5a)}>
        <AbsoluteFill
          style={{
            alignItems: "center",
            paddingTop: 345,
            paddingLeft: 74,
            paddingRight: 74,
          }}
        >
          <MaskedKineticLine
            words={["100", "HOURS", "NONSTOP"]}
            startFrame={0}
            staggerFrames={3}
            fontSize={114}
            color={PALETTE.white}
            accentWord="100"
            accentColor={PALETTE.amber}
          />
          <div
            style={{
              marginTop: 10,
              fontFamily: EDITORIAL_FONTS.mono,
              fontSize: 26,
              letterSpacing: "0.14em",
              color: PALETTE.cyan,
            }}
          >
            OVER 4 FULL DAYS OF CONTINUOUS POWER
          </div>
          <div style={{ marginTop: 40 }}>
            <DurationComparisonChart startFrame={0} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* BEAT 5B: CORE PAYOFF SLAM — 1/10TH COST */}
      <Sequence from={f5b} durationInFrames={Math.max(1, f6 - f5b)}>
        <Beat5PayoffSlam />
      </Sequence>

      {/* BEAT 6: 2D Cutaway Mechanism — Reversible Rust Discharge */}
      <Sequence from={f6} durationInFrames={Math.max(1, f7 - f6)}>
        <AbsoluteFill
          style={{
            alignItems: "center",
            paddingTop: 375,
            paddingLeft: 74,
            paddingRight: 74,
          }}
        >
          <MaskedKineticLine
            words={["HOW?", "REVERSIBLE", "RUST"]}
            startFrame={0}
            staggerFrames={3}
            fontSize={106}
            color={PALETTE.ink}
            accentWord="RUST"
            accentColor={PALETTE.rust}
          />
          <div style={{ marginTop: 54 }}>
            <IronAirCutawayGraphic mode="discharge" startFrame={0} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* BEAT 7: 2D Cutaway Reversal — Charging Turns Rust Back to Iron */}
      <Sequence from={f7} durationInFrames={Math.max(1, f8 - f7)}>
        <AbsoluteFill
          style={{
            alignItems: "center",
            paddingTop: 365,
            paddingLeft: 74,
            paddingRight: 74,
          }}
        >
          <MaskedKineticLine
            words={["RECHARGING", "REVERSES", "RUST"]}
            startFrame={0}
            staggerFrames={3}
            fontSize={98}
            color={PALETTE.white}
            accentWord="REVERSES"
            accentColor={PALETTE.emerald}
          />
          <div style={{ marginTop: 54 }}>
            <IronAirCutawayGraphic mode="charge" startFrame={0} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* BEAT 8: 1.6 GW Wind + Solar Clean Ecosystem */}
      <Sequence from={f8} durationInFrames={Math.max(1, f9 - f8)}>
        <AbsoluteFill
          style={{
            alignItems: "center",
            paddingTop: 380,
            paddingLeft: 74,
            paddingRight: 74,
          }}
        >
          <MaskedKineticLine
            words={["1.6 GW", "CLEAN", "POWER"]}
            startFrame={0}
            staggerFrames={3}
            fontSize={112}
            color={PALETTE.ink}
            accentWord="1.6 GW"
            accentColor={PALETTE.emerald}
          />
          <div style={{ marginTop: 48 }}>
            <RenewablesFlowGraphic startFrame={0} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* BEAT 9: 200,000+ Homes & 2028 Delivery Timeline + Verified Sources */}
      <Sequence from={f9} durationInFrames={Math.max(1, f10 - f9)}>
        <AbsoluteFill
          style={{
            alignItems: "center",
            paddingTop: 430,
            paddingLeft: 74,
            paddingRight: 74,
          }}
        >
          <HomesAndTimelineGraphic startFrame={0} />
        </AbsoluteFill>
      </Sequence>

      {/* BEAT 10: Split Debate Outro + Seamless Loop */}
      <Sequence from={f10} durationInFrames={Math.max(1, durationInFrames - f10)}>
        <Beat10DebateOutro totalLocalFrames={Math.max(1, durationInFrames - f10)} />
      </Sequence>

      {/* Floating Word-Synced Kinetic Subtitles (NO box, safe zone bottom >= 248px) */}
      <SyncedKineticSubtitle groups={SUBTITLE_GROUPS} theme={theme} />
    </AbsoluteFill>
  );
};
