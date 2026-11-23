import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  EDITORIAL_FONTS,
  MaskedKineticLine,
  PALETTE,
} from "../editorial-kit/EditorialPrimitives";

/**
 * CONTINUOUS ENGINE 1 (Beat 2 + Beat 3: 4.65s -> 10.30s)
 * Single 2160px editorial data canvas panning horizontally from
 * AI Power Grid Spike -> 4-Hour Lithium Discharge Cliff.
 * Zero cartoon icons (R-04), zero slide cuts (MOTION 3).
 */
export const ContinuousLoadAndCliffScene: React.FC<{
  beat2StartFrame: number;
  beat3StartFrame: number;
}> = ({ beat2StartFrame, beat3StartFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const f2 = Math.max(0, frame - beat2StartFrame);
  const f3 = Math.max(0, frame - beat3StartFrame);

  // Smooth physical horizontal camera pan (-1080px) at beat3StartFrame
  const panProgress = interpolate(
    frame,
    [beat3StartFrame - 4, beat3StartFrame + 14],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.76, 0, 0.24, 1),
    }
  );
  const panX = interpolate(panProgress, [0, 1], [0, -1080]);

  // Subtle vertical drift for living camera feel
  const driftY = interpolate(f2, [0, 180], [0, -14], {
    extrapolateRight: "clamp",
  });

  // Beat 2: Rising AI grid strain curve (0..1)
  const spikeDraw = interpolate(f2, [6, 54], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const loadPct = Math.round(interpolate(spikeDraw, [0, 1], [38, 98]));

  // Beat 3: Falling 4-hour lithium discharge curve
  const cliffDraw = interpolate(f3, [4, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 1, 0.5, 1),
  });
  const hrVal = interpolate(cliffDraw, [0, 1], [0.0, 4.0]);

  const stampPop = spring({
    frame: Math.max(0, f3 - 18),
    fps,
    config: { damping: 14, stiffness: 260 },
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 2160,
          height: 1920,
          transform: `translate3d(${panX}px, ${driftY}px, 0)`,
        }}
      >
        {/* === LEFT STATION (x: 0..1080) Beat 2: AI Grid Load Spike === */}
        <div
          style={{
            position: "absolute",
            left: 74,
            top: 295,
            width: 932,
          }}
        >
          <MaskedKineticLine
            words={["AI", "DRAINS"]}
            startFrame={beat2StartFrame}
            staggerFrames={3}
            fontSize={138}
            color={PALETTE.white}
            accentWord="DRAINS"
            accentColor={PALETTE.rust}
            align="left"
          />
          <MaskedKineticLine
            words={["POWER", "GRIDS"]}
            startFrame={beat2StartFrame + 6}
            staggerFrames={3}
            fontSize={138}
            color={PALETTE.white}
            align="left"
          />
          <div
            style={{
              marginTop: 22,
              fontFamily: EDITORIAL_FONTS.sans,
              fontSize: 30,
              color: PALETTE.steelLight,
            }}
          >
            Hyperscale compute spikes utility demand
          </div>
        </div>

        {/* === RIGHT STATION (x: 1080..2160) Beat 3: Lithium 4-Hour Cliff === */}
        <div
          style={{
            position: "absolute",
            left: 1080 + 74,
            top: 295,
            width: 932,
          }}
        >
          <MaskedKineticLine
            words={["NORMAL", "BATTERIES"]}
            startFrame={beat3StartFrame + 2}
            staggerFrames={3}
            fontSize={120}
            color={PALETTE.white}
            align="left"
          />
          <MaskedKineticLine
            words={["DIE", "IN", "4", "HOURS"]}
            startFrame={beat3StartFrame + 8}
            staggerFrames={3}
            fontSize={136}
            color={PALETTE.rust}
            align="left"
          />
          <div
            style={{
              marginTop: 22,
              fontFamily: EDITORIAL_FONTS.sans,
              fontSize: 30,
              color: PALETTE.steelLight,
            }}
          >
            Typical lithium-ion grid storage capacity
          </div>
        </div>

        {/* === SINGLE CONTINUOUS 2160px EDITORIAL DATA AXIS (y: 740..1360) === */}
        <svg
          viewBox="0 0 2160 640"
          width="2160"
          height="640"
          style={{ position: "absolute", left: 0, top: 730 }}
        >
          {/* Continuous baseline & upper ceiling hairline across BOTH beats */}
          <line
            x1="74"
            y1="520"
            x2="2086"
            y2="520"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="3"
          />
          <line
            x1="74"
            y1="120"
            x2="2086"
            y2="120"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="2"
            strokeDasharray="10 10"
          />
          <line
            x1="74"
            y1="320"
            x2="2086"
            y2="320"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
            strokeDasharray="10 10"
          />

          {/* LEFT CHART: AI Grid Strain Curve rising sharply to 98% */}
          <path
            d="M 80 455 C 230 448, 340 420, 470 340 C 610 250, 740 185, 960 128"
            fill="none"
            stroke={PALETTE.rust}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="1100"
            strokeDashoffset={1100 * (1 - spikeDraw)}
          />
          {/* Live endpoint marker & giant metric on Beat 2 */}
          <g opacity={spikeDraw > 0.15 ? 1 : 0}>
            <circle cx="960" cy="128" r={13 * spikeDraw} fill={PALETTE.rust} />
            <text
              x="960"
              y="88"
              textAnchor="end"
              fill={PALETTE.rust}
              fontFamily={EDITORIAL_FONTS.display}
              fontSize="118"
              fontWeight="800"
            >
              {loadPct}% LOAD
            </text>
          </g>
          <text
            x="80"
            y="574"
            fill={PALETTE.steelLight}
            fontFamily={EDITORIAL_FONTS.sans}
            fontSize="26"
            fontWeight="700"
          >
            GRID DEMAND SURGE
          </text>

          {/* CONTINUITY BRIDGE LINE connecting Beat 2 peak right into Beat 3 start */}
          <line
            x1="960"
            y1="128"
            x2="1170"
            y2="128"
            stroke="rgba(217, 70, 22, 0.35)"
            strokeWidth="4"
            strokeDasharray="12 10"
          />

          {/* RIGHT CHART: Lithium 4-Hour Discharge Cliff */}
          {/* 100% -> 0% dropping straight down by x=1690 (4 HRS) */}
          <path
            d="M 1170 128 L 1280 148 L 1420 235 L 1560 390 L 1690 520 L 2010 520"
            fill="none"
            stroke={PALETTE.white}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1200"
            strokeDashoffset={1200 * (1 - cliffDraw)}
          />
          {/* Vertical 4-HOUR hard wall line cleanly below metric label */}
          <line
            x1="1690"
            y1="348"
            x2="1690"
            y2="520"
            stroke={PALETTE.rust}
            strokeWidth="4"
            strokeDasharray="8 8"
            opacity={cliffDraw}
          />
          <circle
            cx="1690"
            cy="520"
            r={14 * stampPop}
            fill={PALETTE.rust}
          />
          {/* Crisp numeric ticks along X-axis */}
          {[
            { x: 1170, t: "0h" },
            { x: 1430, t: "2h" },
            { x: 1690, t: "4h EMPTY" },
          ].map((tk) => (
            <text
              key={tk.t}
              x={tk.x}
              y="574"
              textAnchor={tk.x === 1170 ? "start" : "middle"}
              fill={tk.x === 1690 ? PALETTE.rust : PALETTE.steelLight}
              fontFamily={EDITORIAL_FONTS.sans}
              fontSize="28"
              fontWeight="700"
            >
              {tk.t}
            </text>
          ))}
          {/* Giant live readout on Beat 3 */}
          <text
            x="2010"
            y="265"
            textAnchor="end"
            fill={PALETTE.rust}
            fontFamily={EDITORIAL_FONTS.display}
            fontSize="140"
            fontWeight="800"
            opacity={stampPop}
          >
            {hrVal.toFixed(1)} HRS
          </text>
          <text
            x="2010"
            y="314"
            textAnchor="end"
            fill={PALETTE.steelLight}
            fontFamily={EDITORIAL_FONTS.sans}
            fontSize="28"
            fontWeight="700"
            opacity={stampPop}
          >
            MAX BACKUP DURATION
          </text>
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/**
 * CONTINUOUS ENGINE 2 (Beat 4 + Beat 5A + Beat 5B: 10.30s -> 21.85s)
 * Asymmetric Minnesota 30 GWh Map -> Camera Push-In to 100 HRS Bar ->
 * True Zoom-Through Dive INTO the rust bar flooding screen for 1/10TH COST Payoff!
 */
export const MinnesotaToPayoffDiveScene: React.FC<{
  beat4StartFrame: number;
  beat5aStartFrame: number;
  beat5bStartFrame: number;
}> = ({ beat4StartFrame, beat5aStartFrame, beat5bStartFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const f4 = Math.max(0, frame - beat4StartFrame);
  const f5a = Math.max(0, frame - beat5aStartFrame);
  const f5b = Math.max(0, frame - beat5bStartFrame);

  // Phase 1 -> 2 transition (Minnesota pushes in & dissolves cleanly into dark 100-hr bar stage)
  const toBarP = interpolate(
    frame,
    [beat5aStartFrame - 8, beat5aStartFrame + 10],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.76, 0, 0.24, 1),
    }
  );

  // Phase 2 -> 3 transition (Zoom straight INTO the solid rust 100-HR column to fill entire screen!)
  const diveP = interpolate(
    frame,
    [beat5bStartFrame - 8, beat5bStartFrame + 10],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.76, 0, 0.24, 1),
    }
  );

  // Map animations (Beat 4)
  const mapScale =
    interpolate(f4, [0, 150], [1.0, 1.08], { extrapolateRight: "clamp" }) +
    interpolate(toBarP, [0, 1], [0, 1.45]);
  const mapOp = interpolate(toBarP, [0, 0.7], [1, 0], {
    extrapolateRight: "clamp",
  });

  // Bar animations (Beat 5A)
  const lithBar = spring({
    frame: f5a,
    fps,
    config: { damping: 16, stiffness: 220 },
  });
  const ironBar = spring({
    frame: Math.max(0, f5a - 6),
    fps,
    config: { damping: 14, stiffness: 165, mass: 0.85 },
  });
  const barDiveScale = interpolate(diveP, [0, 1], [1.0, 5.4]);
  const barStageOp =
    interpolate(toBarP, [0.25, 1], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) *
    interpolate(diveP, [0.72, 1], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // Payoff Slam animations (Beat 5B)
  const payoffSpring = spring({
    frame: Math.max(0, f5b - 2),
    fps,
    config: { damping: 13, stiffness: 250, mass: 0.7 },
  });
  const payoffOp = interpolate(diveP, [0.5, 0.95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* === LAYER A: Beat 4 (Minnesota 30 GWh Editorial Map) === */}
      {mapOp > 0.01 && (
        <AbsoluteFill
          style={{
            opacity: mapOp,
            paddingTop: 280,
            paddingLeft: 74,
            paddingRight: 74,
          }}
        >
          {/* Asymmetric Left-Aligned Giant Stat + Clean Editorial Subhead */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <MaskedKineticLine
              words={["30", "GWh"]}
              startFrame={beat4StartFrame}
              staggerFrames={3}
              fontSize={204}
              color={PALETTE.rust}
              align="left"
            />
            <MaskedKineticLine
              words={["WORLD'S", "LARGEST", "BATTERY"]}
              startFrame={beat4StartFrame + 6}
              staggerFrames={3}
              fontSize={86}
              color={PALETTE.ink}
              align="left"
            />
            <div
              style={{
                marginTop: 10,
                fontFamily: EDITORIAL_FONTS.sans,
                fontSize: 30,
                color: PALETTE.steel,
              }}
            >
              Minnesota, USA (Google and Xcel Energy)
            </div>
          </div>

          {/* Crisp Cartographic US Map Silhouette zooming toward Minnesota */}
          <div style={{ marginTop: 64, display: "flex", justifyContent: "center" }}>
            <svg
              viewBox="0 0 920 540"
              width="920"
              height="540"
              style={{ overflow: "visible" }}
            >
              <g
                transform={`translate(548, 195) scale(${mapScale}) translate(-548, -195)`}
              >
                <path
                  d="M 108 142 L 245 124 L 445 128 L 542 124 L 580 144 L 622 165 L 675 174 L 748 150 L 806 120 L 835 148 L 804 206 L 774 256 L 762 312 L 732 366 L 728 438 L 700 464 L 678 428 L 656 384 L 598 390 L 542 404 L 512 438 L 456 466 L 414 424 L 352 392 L 258 380 L 182 346 L 122 308 L 96 240 Z"
                  fill={PALETTE.paperDim}
                  stroke={PALETTE.ink}
                  strokeWidth="4.5"
                  strokeLinejoin="round"
                />
                {/* Minnesota highlighted exclusively in Iron-Oxide Rust */}
                <path
                  d="M 518 132 L 566 132 L 584 148 L 564 186 L 574 222 L 520 222 L 516 174 Z"
                  fill={PALETTE.rust}
                  stroke={PALETTE.ink}
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                {/* Clean hairline pointer into open sky above Midwest */}
                <path
                  d="M 548 176 L 468 62 L 280 62"
                  fill="none"
                  stroke={PALETTE.rust}
                  strokeWidth="3.5"
                />
                <circle cx="548" cy="176" r="9" fill={PALETTE.ink} />
                <text
                  x="456"
                  y="48"
                  textAnchor="end"
                  fill={PALETTE.ink}
                  fontFamily={EDITORIAL_FONTS.sans}
                  fontSize="30"
                  fontWeight="700"
                >
                  Pine Island, MN
                </text>
              </g>
            </svg>
          </div>
        </AbsoluteFill>
      )}

      {/* === LAYER B: Beat 5A (100 HRS vs 4 HRS Scale Explosion + Zoom-Through Dive) === */}
      {barStageOp > 0.01 && (
        <AbsoluteFill
          style={{
            opacity: barStageOp,
            transformOrigin: "64% 62%",
            transform: `scale(${barDiveScale})`,
            paddingTop: 290,
            paddingLeft: 74,
            paddingRight: 74,
          }}
        >
          <MaskedKineticLine
            words={["100", "HOURS", "STRAIGHT"]}
            startFrame={beat5aStartFrame}
            staggerFrames={3}
            fontSize={122}
            color={PALETTE.white}
            accentWord="100"
            accentColor={PALETTE.rust}
            align="left"
          />
          <div
            style={{
              marginTop: 12,
              fontFamily: EDITORIAL_FONTS.sans,
              fontSize: 30,
              color: PALETTE.steelLight,
            }}
          >
            25x longer backup than standard grid lithium
          </div>

          <div style={{ marginTop: 48 }}>
            <svg viewBox="0 0 920 740" width="920" height="740">
              {/* Minimal horizontal guide rules */}
              {[0, 50, 100].map((v) => {
                const y = 640 - (v / 100) * 540;
                return (
                  <g key={v}>
                    <line
                      x1="80"
                      y1={y}
                      x2="880"
                      y2={y}
                      stroke="rgba(255,255,255,0.14)"
                      strokeWidth="2"
                    />
                    <text
                      x="64"
                      y={y + 8}
                      textAnchor="end"
                      fill={PALETTE.steelLight}
                      fontFamily={EDITORIAL_FONTS.sans}
                      fontSize="24"
                      fontWeight="700"
                    >
                      {v}h
                    </text>
                  </g>
                );
              })}

              {/* Tiny 4 HRS Lithium Stub */}
              <rect
                x="170"
                y={640 - 26 * lithBar}
                width="190"
                height={26 * lithBar}
                fill={PALETTE.steel}
              />
              <text
                x="265"
                y={640 - 26 * lithBar - 20}
                textAnchor="middle"
                fill={PALETTE.steelLight}
                fontFamily={EDITORIAL_FONTS.display}
                fontSize="58"
                fontWeight="800"
              >
                4 HRS
              </text>
              <text
                x="265"
                y="694"
                textAnchor="middle"
                fill={PALETTE.steelLight}
                fontFamily={EDITORIAL_FONTS.sans}
                fontSize="26"
                fontWeight="700"
              >
                Lithium-ion
              </text>

              {/* Massive Towering 100 HRS Iron-Oxide Column (Camera dives INTO this!) */}
              <rect
                x="510"
                y={640 - 540 * ironBar}
                width="260"
                height={540 * ironBar}
                fill={PALETTE.rust}
              />
              <text
                x="640"
                y={640 - 540 * ironBar - 22}
                textAnchor="middle"
                fill={PALETTE.white}
                fontFamily={EDITORIAL_FONTS.display}
                fontSize="106"
                fontWeight="800"
              >
                {Math.round(100 * Math.min(1, ironBar))} HRS
              </text>
              <text
                x="640"
                y="694"
                textAnchor="middle"
                fill={PALETTE.white}
                fontFamily={EDITORIAL_FONTS.sans}
                fontSize="28"
                fontWeight="700"
              >
                Iron-air (rust)
              </text>
            </svg>
          </div>
        </AbsoluteFill>
      )}

      {/* === LAYER C: Beat 5B (Core Payoff: Solid Iron-Oxide Screen Flood "1/10TH") === */}
      {payoffOp > 0.01 && (
        <AbsoluteFill
          style={{
            opacity: payoffOp,
            justifyContent: "flex-start",
            alignItems: "flex-start",
            paddingTop: 460,
            paddingLeft: 80,
            paddingRight: 80,
          }}
        >
          <div
            style={{
              fontFamily: EDITORIAL_FONTS.display,
              fontSize: 280,
              fontWeight: 800,
              lineHeight: 0.85,
              letterSpacing: "-0.03em",
              color: PALETTE.white,
              transform: `scale(${interpolate(payoffSpring, [0, 1], [1.24, 1])})`,
              transformOrigin: "left center",
            }}
          >
            1/10TH
          </div>
          <div
            style={{
              width: interpolate(payoffSpring, [0, 1], [0, 880]),
              height: 6,
              backgroundColor: PALETTE.ink,
              marginTop: 34,
              marginBottom: 30,
            }}
          />
          <MaskedKineticLine
            words={["THE", "COST", "OF", "LITHIUM"]}
            startFrame={beat5bStartFrame + 5}
            staggerFrames={3}
            fontSize={106}
            color={PALETTE.ink}
            align="left"
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/**
 * CONTINUOUS ENGINE 3 (Beat 6 + Beat 7: 21.85s -> 30.75s)
 * SINGLE LOCKED PHYSICAL CHAMBER: ZERO SLIDE CUT between Discharge and Charge!
 * Lighting smoothly inverts in-place while pellets oxidize (Steel -> Rust) then restore (Rust -> Steel).
 */
export const ContinuousIronAirChamber: React.FC<{
  beat6StartFrame: number;
  beat7StartFrame: number;
}> = ({ beat6StartFrame, beat7StartFrame }) => {
  const frame = useCurrentFrame();
  const f6 = Math.max(0, frame - beat6StartFrame);
  const f7 = Math.max(0, frame - beat7StartFrame);

  // Smooth 16-frame in-place inversion from Discharge (0) -> Charge (1)
  const invertP = interpolate(
    frame,
    [beat7StartFrame - 4, beat7StartFrame + 12],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.65, 0, 0.35, 1),
    }
  );

  // Oxidation wave during Beat 6 (0 -> 1), then Reduction wave during Beat 7 (1 -> 0)
  const oxProgress = interpolate(f6, [18, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 1, 0.5, 1),
  });
  const redProgress = interpolate(f7, [6, 72], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 1, 0.5, 1),
  });

  const rustAmount =
    frame < beat7StartFrame ? oxProgress : Math.max(0, 1 - redProgress);

  const pelletColor = interpolateColors(
    rustAmount,
    [0, 1],
    ["#6B7280", PALETTE.rust]
  );
  const strokeCol = interpolateColors(
    invertP,
    [0, 1],
    [PALETTE.ink, PALETTE.white]
  );
  const chamberFill = interpolateColors(
    invertP,
    [0, 1],
    [PALETTE.paperDim, "#1B1E24"]
  );
  const subTextColor = interpolateColors(
    invertP,
    [0, 1],
    [PALETTE.steel, PALETTE.steelLight]
  );

  const flowShift =
    frame < beat7StartFrame ? -(f6 * 7) : f7 * 7;

  return (
    <AbsoluteFill
      style={{
        paddingTop: 295,
        paddingLeft: 74,
        paddingRight: 74,
      }}
    >
      {/* Dynamic In-Place Headline Swapping Cleanly via Mask */}
      <div style={{ height: 260, position: "relative" }}>
        {invertP < 0.95 && (
          <div style={{ position: "absolute", inset: 0, opacity: 1 - invertP }}>
            <MaskedKineticLine
              words={["HOW?", "REVERSIBLE", "RUST"]}
              startFrame={beat6StartFrame}
              staggerFrames={3}
              fontSize={114}
              color={PALETTE.ink}
              accentWord="RUST"
              accentColor={PALETTE.rust}
              align="left"
            />
            <div
              style={{
                marginTop: 14,
                fontFamily: EDITORIAL_FONTS.sans,
                fontSize: 30,
                color: PALETTE.steel,
              }}
            >
              Iron breathes oxygen, rusts, and releases electricity
            </div>
          </div>
        )}
        {invertP > 0.05 && (
          <div style={{ position: "absolute", inset: 0, opacity: invertP }}>
            <MaskedKineticLine
              words={["CHARGING", "RESTORES", "PURE", "IRON"]}
              startFrame={beat7StartFrame + 2}
              staggerFrames={3}
              fontSize={112}
              color={PALETTE.white}
              accentWord="RESTORES"
              accentColor={PALETTE.rust}
              align="left"
            />
            <div
              style={{
                marginTop: 14,
                fontFamily: EDITORIAL_FONTS.sans,
                fontSize: 30,
                color: PALETTE.steelLight,
              }}
            >
              Current strips oxygen back out, restoring pure iron
            </div>
          </div>
        )}
      </div>

      {/* SINGLE LOCKED ARCHITECTURAL CUTAWAY CHAMBER */}
      <div style={{ marginTop: 40, display: "flex", justifyContent: "center" }}>
        <svg viewBox="0 0 920 620" width="920" height="620">
          {/* Outer Reactor Casing (sharp architectural 12px radius, no cartoon bubble) */}
          <rect
            x="230"
            y="80"
            width="460"
            height="380"
            rx="14"
            fill={chamberFill}
            stroke={strokeCol}
            strokeWidth="6"
          />

          {/* 4x3 Iron Pellet Electrodes smoothly oxidizing <-> restoring */}
          {[0, 1, 2, 3].map((col) =>
            [0, 1, 2].map((row) => {
              const cx = 310 + col * 100;
              const cy = 175 + row * 95;
              // Stagger pellet color slightly left-to-right for realistic chemical front!
              const localRust = Math.max(
                0,
                Math.min(1, rustAmount * 1.35 - col * 0.11)
              );
              const colFill = interpolateColors(
                localRust,
                [0, 1],
                ["#737C8C", PALETTE.rust]
              );
              return (
                <g key={`${col}-${row}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="32"
                    fill={colFill}
                    stroke={strokeCol}
                    strokeWidth="3.5"
                  />
                </g>
              );
            })
          )}

          {/* Left Channel: Air / O2 Stream */}
          {[0, 1, 2].map((i) => {
            const phase = (((frame - beat6StartFrame) * 2.5 + i * 33) % 100) / 100;
            const px =
              frame < beat7StartFrame
                ? interpolate(phase, [0, 1], [34, 226])
                : interpolate(phase, [0, 1], [226, 34]);
            const py = 195 + i * 75;
            return (
              <g key={i} opacity={Math.sin(phase * Math.PI)}>
                <circle
                  cx={px}
                  cy={py}
                  r="20"
                  fill="none"
                  stroke={strokeCol}
                  strokeWidth="3.5"
                />
                <text
                  x={px}
                  y={py + 7}
                  textAnchor="middle"
                  fill={strokeCol}
                  fontFamily={EDITORIAL_FONTS.sans}
                  fontSize="17"
                  fontWeight="700"
                >
                  O2
                </text>
              </g>
            );
          })}
          <text
            x="112"
            y="455"
            textAnchor="middle"
            fill={subTextColor}
            fontFamily={EDITORIAL_FONTS.sans}
            fontSize="26"
            fontWeight="700"
          >
            {frame < beat7StartFrame ? "Oxygen in" : "Oxygen out"}
          </text>

          {/* Right Channel: Direct Current Busbar (no cartoon lightning bolt R-04!) */}
          <line
            x1="696"
            y1="270"
            x2="890"
            y2="270"
            stroke={PALETTE.rust}
            strokeWidth="12"
            strokeDasharray="24 14"
            strokeDashoffset={flowShift}
            strokeLinecap="round"
          />
          {/* Crisp directional chevron on busbar */}
          <polygon
            points={
              frame < beat7StartFrame
                ? "894,270 860,248 860,292"
                : "700,270 734,248 734,292"
            }
            fill={PALETTE.rust}
          />
          <text
            x="795"
            y="335"
            textAnchor="middle"
            fill={PALETTE.rust}
            fontFamily={EDITORIAL_FONTS.sans}
            fontSize="26"
            fontWeight="700"
          >
            {frame < beat7StartFrame ? "Power out" : "Charge in"}
          </text>

          {/* Bottom live chemical equation state */}
          <text
            x="460"
            y="538"
            textAnchor="middle"
            fill={strokeCol}
            fontFamily={EDITORIAL_FONTS.display}
            fontSize="54"
            fontWeight="800"
            letterSpacing="0.02em"
          >
            {frame < beat7StartFrame
              ? "IRON  +  OXYGEN  =  POWER"
              : "RUST  +  CHARGE  =  PURE IRON"}
          </text>
          {/* Oxidation progress meter */}
          <rect
            x="230"
            y="568"
            width="460"
            height="8"
            fill="rgba(128,128,128,0.22)"
          />
          <rect
            x="230"
            y="568"
            width={460 * rustAmount}
            height="8"
            fill={pelletColor}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/**
 * CONTINUOUS ENGINE 4 (Beat 8 + Beat 9: 30.75s -> 38.45s)
 * Single 2160px horizontal energy busbar panning right from
 * 1.6 GW Wind + Solar Proportional Bars -> 200,000+ Homes & 2028 Rollout Timeline.
 * Zero cartoon turbines, zero cartoon houses (R-04).
 */
export const ContinuousBusbarToHomesScene: React.FC<{
  beat8StartFrame: number;
  beat9StartFrame: number;
}> = ({ beat8StartFrame, beat9StartFrame }) => {
  const frame = useCurrentFrame();
  const f8 = Math.max(0, frame - beat8StartFrame);
  const f9 = Math.max(0, frame - beat9StartFrame);

  const panP = interpolate(
    frame,
    [beat9StartFrame - 4, beat9StartFrame + 16],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.76, 0, 0.24, 1),
    }
  );
  const panX = interpolate(panP, [0, 1], [0, -1080]);

  const windW = interpolate(f8, [6, 38], [0, 740], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const solarW = interpolate(f8, [12, 42], [0, 130], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const homesCount = Math.round(
    interpolate(f9, [4, 42], [18000, 200000], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    })
  );
  const timelineP = interpolate(f9, [58, 108], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const dash = -(f8 * 8);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 2160,
          height: 1920,
          transform: `translate3d(${panX}px, 0, 0)`,
        }}
      >
        {/* === LEFT STATION (Beat 8): 1.6 GW Wind + Solar Clean Input === */}
        <div
          style={{
            position: "absolute",
            left: 74,
            top: 295,
            width: 932,
          }}
        >
          <MaskedKineticLine
            words={["1.6", "GW", "CLEAN", "POWER"]}
            startFrame={beat8StartFrame}
            staggerFrames={3}
            fontSize={122}
            color={PALETTE.ink}
            accentWord="1.6"
            accentColor={PALETTE.rust}
            align="left"
          />
          <div
            style={{
              marginTop: 14,
              fontFamily: EDITORIAL_FONTS.sans,
              fontSize: 30,
              color: PALETTE.steel,
            }}
          >
            New wind and solar built directly for the grid
          </div>

          {/* True Proportional Editorial Input Bars (1.4 GW vs 200 MW) */}
          <div style={{ marginTop: 84, display: "flex", flexDirection: "column", gap: 46 }}>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: EDITORIAL_FONTS.sans,
                  fontSize: 30,
                  fontWeight: 700,
                  color: PALETTE.ink,
                  marginBottom: 14,
                }}
              >
                <span>Wind power</span>
                <span>1,400 MW</span>
              </div>
              <div style={{ width: 920, height: 64, backgroundColor: PALETTE.paperDim }}>
                <div style={{ width: windW, height: 64, backgroundColor: PALETTE.ink }} />
              </div>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: EDITORIAL_FONTS.sans,
                  fontSize: 30,
                  fontWeight: 700,
                  color: PALETTE.ink,
                  marginBottom: 14,
                }}
              >
                <span>Solar power</span>
                <span>200 MW</span>
              </div>
              <div style={{ width: 920, height: 64, backgroundColor: PALETTE.paperDim }}>
                <div style={{ width: solarW, height: 64, backgroundColor: PALETTE.rust }} />
              </div>
            </div>
          </div>
        </div>

        {/* === RIGHT STATION (Beat 9): 200,000+ Homes & 2028 Shipping Timeline === */}
        <div
          style={{
            position: "absolute",
            left: 1080 + 74,
            top: 295,
            width: 932,
          }}
        >
          <div
            style={{
              fontFamily: EDITORIAL_FONTS.display,
              fontSize: 196,
              fontWeight: 800,
              lineHeight: 0.9,
              color: PALETTE.rust,
              letterSpacing: "-0.02em",
            }}
          >
            {homesCount.toLocaleString("en-US")}+
          </div>
          <div
            style={{
              marginTop: 14,
              fontFamily: EDITORIAL_FONTS.display,
              fontSize: 78,
              fontWeight: 800,
              color: PALETTE.ink,
              textTransform: "uppercase",
            }}
          >
            HOMES POWERED AT PEAK
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: EDITORIAL_FONTS.sans,
              fontSize: 28,
              color: PALETTE.steel,
            }}
          >
            300 MW dispatch capacity on the Upper Midwest grid
          </div>

          {/* Crisp Editorial Timeline: 2026 -> 2028 */}
          <svg
            viewBox="0 0 920 260"
            width="920"
            height="260"
            style={{ marginTop: 95 }}
          >
            <line
              x1="16"
              y1="54"
              x2="904"
              y2="54"
              stroke={PALETTE.paperDim}
              strokeWidth="10"
            />
            <line
              x1="16"
              y1="54"
              x2={16 + 888 * timelineP}
              y2="54"
              stroke={PALETTE.rust}
              strokeWidth="10"
            />
            <circle cx="16" cy="54" r="14" fill={PALETTE.ink} />
            <circle
              cx="904"
              cy="54"
              r={timelineP > 0.85 ? 20 : 14}
              fill={timelineP > 0.85 ? PALETTE.rust : PALETTE.steel}
            />
            <text
              x="16"
              y="112"
              fill={PALETTE.steel}
              fontFamily={EDITORIAL_FONTS.sans}
              fontSize="28"
              fontWeight="700"
            >
              2026 deal signed
            </text>
            <text
              x="904"
              y="124"
              textAnchor="end"
              fill={PALETTE.ink}
              fontFamily={EDITORIAL_FONTS.display}
              fontSize="68"
              fontWeight="800"
            >
              2028 FIRST UNITS SHIP
            </text>
            <text
              x="16"
              y="224"
              fill={PALETTE.steel}
              fontFamily={EDITORIAL_FONTS.sans}
              fontSize="24"
              fontWeight="700"
            >
              Sources: Fortune, Utility Dive, Xcel Energy (2026)
            </text>
          </svg>
        </div>

        {/* === CONTINUOUS LIVE POWER BUSBAR LINKING BEAT 8 -> BEAT 9 (y=1185) === */}
        <svg
          viewBox="0 0 2160 120"
          width="2160"
          height="120"
          style={{ position: "absolute", left: 0, top: 1140 }}
        >
          <line
            x1="74"
            y1="60"
            x2="2086"
            y2="60"
            stroke={PALETTE.paperDim}
            strokeWidth="10"
          />
          <line
            x1="74"
            y1="60"
            x2="2086"
            y2="60"
            stroke={PALETTE.rust}
            strokeWidth="10"
            strokeDasharray="34 22"
            strokeDashoffset={dash}
          />
          <text
            x="74"
            y="108"
            fill={PALETTE.rust}
            fontFamily={EDITORIAL_FONTS.sans}
            fontSize="26"
            fontWeight="700"
          >
            300 MW / 30 GWh iron-air storage bank
          </text>
        </svg>
      </div>
    </AbsoluteFill>
  );
};
