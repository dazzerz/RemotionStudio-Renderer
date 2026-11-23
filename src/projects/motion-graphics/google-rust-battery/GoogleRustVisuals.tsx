import React from "react";
import {
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  EDITORIAL_FONTS,
  HairlineCallout,
  PALETTE,
} from "../editorial-kit/EditorialPrimitives";

/**
 * Beat 2 Visual: AI Hyperscale Server Racks draining a Power Grid Pylon
 */
export const AiGridDrainGraphic: React.FC<{ startFrame: number }> = ({
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  const enter = spring({
    frame: f,
    fps,
    config: { damping: 16, stiffness: 180 },
  });
  const loadPct = interpolate(f, [6, 58], [44, 98], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const dashOffset = -(f * 9);
  const pulse = 0.7 + 0.3 * Math.sin(f * 0.35);

  return (
    <svg
      viewBox="0 0 920 620"
      width="920"
      height="620"
      style={{
        overflow: "visible",
        transform: `scale(${interpolate(enter, [0, 1], [0.92, 1])})`,
        opacity: enter,
      }}
    >
      {/* Left: Transmission Pylon */}
      <g transform="translate(80, 120)">
        <path
          d="M 80 0 L 32 340 M 80 0 L 128 340 M 14 78 L 146 78 M 24 156 L 136 156 M 44 235 L 116 235 M 40 340 L 120 340 M 44 235 L 124 315 M 116 235 L 36 315 M 52 156 L 112 235 M 108 156 L 48 235"
          stroke={PALETTE.cyan}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="80" cy="0" r="10" fill={PALETTE.amber} opacity={pulse} />
        <text
          x="80"
          y="390"
          textAnchor="middle"
          fill="rgba(255,255,255,0.78)"
          fontFamily={EDITORIAL_FONTS.mono}
          fontSize="24"
          fontWeight="700"
        >
          LOCAL GRID
        </text>
      </g>

      {/* Animated Power Conduits draining toward AI Racks */}
      {[198, 276, 354].map((y, idx) => (
        <g key={y}>
          <path
            d={`M 215 ${y} C 330 ${y}, 355 ${y + (idx - 1) * 12}, 470 ${y}`}
            fill="none"
            stroke="rgba(255, 179, 0, 0.22)"
            strokeWidth="8"
          />
          <path
            d={`M 215 ${y} C 330 ${y}, 355 ${y + (idx - 1) * 12}, 470 ${y}`}
            fill="none"
            stroke={idx === 1 ? PALETTE.rust : PALETTE.amber}
            strokeWidth="6"
            strokeDasharray="24 18"
            strokeDashoffset={dashOffset - idx * 14}
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Right: 3 AI Data Center Server Racks */}
      {[0, 1, 2].map((col) => {
        const rx = 485 + col * 126;
        return (
          <g key={col} transform={`translate(${rx}, 110)`}>
            <rect
              x="0"
              y="0"
              width="104"
              height="350"
              rx="10"
              fill="#192232"
              stroke={PALETTE.cyan}
              strokeWidth="3.5"
            />
            {[0, 1, 2, 3, 4, 5, 6].map((slot) => {
              const sy = 22 + slot * 44;
              const blink = Math.sin(f * 0.45 + col * 2.1 + slot * 1.3) > 0;
              return (
                <g key={slot}>
                  <rect
                    x="14"
                    y={sy}
                    width="76"
                    height="28"
                    rx="4"
                    fill="#0D131E"
                  />
                  <circle
                    cx="28"
                    cy={sy + 14}
                    r="4.5"
                    fill={blink ? PALETTE.amber : PALETTE.cyan}
                  />
                  <rect
                    x="42"
                    y={sy + 10}
                    width="38"
                    height="8"
                    rx="2"
                    fill="rgba(255,255,255,0.22)"
                  />
                </g>
              );
            })}
          </g>
        );
      })}
      <text
        x="668"
        y="510"
        textAnchor="middle"
        fill={PALETTE.white}
        fontFamily={EDITORIAL_FONTS.mono}
        fontSize="24"
        fontWeight="700"
      >
        AI DATA CENTERS
      </text>

      {/* Top Grid Load Bar */}
      <g transform="translate(80, 14)">
        <text
          x="0"
          y="24"
          fill="rgba(255,255,255,0.75)"
          fontFamily={EDITORIAL_FONTS.mono}
          fontSize="24"
          fontWeight="700"
        >
          PEAK GRID STRAIN
        </text>
        <text
          x="760"
          y="24"
          textAnchor="end"
          fill={loadPct > 85 ? PALETTE.crimson : PALETTE.amber}
          fontFamily={EDITORIAL_FONTS.mono}
          fontSize="30"
          fontWeight="700"
        >
          {Math.round(loadPct)}%
        </text>
        <rect
          x="0"
          y="40"
          width="760"
          height="22"
          rx="11"
          fill="rgba(255,255,255,0.12)"
        />
        <rect
          x="0"
          y="40"
          width={(760 * loadPct) / 100}
          height="22"
          rx="11"
          fill={loadPct > 85 ? PALETTE.crimson : PALETTE.amber}
        />
      </g>
    </svg>
  );
};

/**
 * Beat 3 Visual: Standard Lithium Battery Draining in 4 Hours
 */
export const LithiumDrainGraphic: React.FC<{ startFrame: number }> = ({
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);

  const drain = interpolate(f, [6, 56], [1, 0.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.35, 0, 0.2, 1),
  });
  const hrs = interpolate(f, [6, 56], [0, 4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const barColor = interpolateColors(
    drain,
    [0.06, 0.45, 1],
    [PALETTE.crimson, PALETTE.amber, PALETTE.emerald]
  );
  const flash = drain < 0.2 ? 0.55 + 0.45 * Math.sin(f * 0.6) : 1;

  return (
    <svg viewBox="0 0 900 470" width="900" height="470">
      {/* Large Industrial Battery Shell */}
      <rect
        x="70"
        y="80"
        width="720"
        height="240"
        rx="28"
        fill="none"
        stroke={PALETTE.ink}
        strokeWidth="10"
      />
      {/* Battery Cap */}
      <rect x="794" y="150" width="38" height="100" rx="10" fill={PALETTE.ink} />

      {/* Segmented Charge Fill */}
      <clipPath id="bat-clip">
        <rect x="92" y="102" width="676" height="196" rx="16" />
      </clipPath>
      <g clipPath="url(#bat-clip)">
        <rect
          x="92"
          y="102"
          width={676 * drain}
          height="196"
          fill={barColor}
          opacity={flash}
        />
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line
            key={i}
            x1={92 + i * 84.5}
            y1="102"
            x2={92 + i * 84.5}
            y2="298"
            stroke={PALETTE.paper}
            strokeWidth="8"
          />
        ))}
      </g>

      {/* Live Hour Readout */}
      <text
        x="70"
        y="400"
        fill={PALETTE.inkMuted}
        fontFamily={EDITORIAL_FONTS.mono}
        fontSize="24"
        fontWeight="700"
      >
        LITHIUM-ION STORAGE
      </text>
      <text
        x="828"
        y="406"
        textAnchor="end"
        fill={PALETTE.crimson}
        fontFamily={EDITORIAL_FONTS.display}
        fontSize="72"
        fontWeight="800"
      >
        {hrs.toFixed(1)} HRS
      </text>
      {drain < 0.22 && (
        <text
          x="430"
          y="218"
          textAnchor="middle"
          fill={PALETTE.crimson}
          fontFamily={EDITORIAL_FONTS.display}
          fontSize="82"
          fontWeight="800"
          opacity={flash}
        >
          DEPLETED
        </text>
      )}
    </svg>
  );
};

/**
 * Beat 4 Visual: Stylized Editorial US Map zooming on Minnesota
 */
export const MinnesotaMapGraphic: React.FC<{ startFrame: number }> = ({
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  const zoom = interpolate(f, [0, 70], [1.0, 1.12], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const pinSpring = spring({
    frame: Math.max(0, f - 10),
    fps,
    config: { damping: 12, stiffness: 220 },
  });
  const ring1 = (f * 1.8) % 68;
  const ring2 = ((f + 34) * 1.8) % 68;

  return (
    <svg
      viewBox="0 0 920 580"
      width="920"
      height="580"
      style={{ overflow: "visible" }}
    >
      <g
        transform={`translate(460, 310) scale(${zoom}) translate(-460, -280)`}
      >
        {/* Clean Editorial Stylized Continental US Silhouette */}
        <path
          d="M 108 152 L 245 134 L 445 138 L 542 134 L 580 154 L 622 175 L 675 184 L 748 160 L 806 130 L 835 158 L 804 216 L 774 266 L 762 322 L 732 376 L 728 448 L 700 474 L 678 438 L 656 394 L 598 400 L 542 414 L 512 448 L 456 476 L 414 434 L 352 402 L 258 390 L 182 356 L 122 318 L 96 250 Z"
          fill="#E5DEC9"
          stroke={PALETTE.ink}
          strokeWidth="4.5"
          strokeLinejoin="round"
        />

        {/* Subtle editorial latitude/longitude hairlines inside map */}
        <line
          x1="120"
          y1="240"
          x2="780"
          y2="240"
          stroke="rgba(16,19,26,0.12)"
          strokeWidth="1.5"
          strokeDasharray="6 8"
        />
        <line
          x1="150"
          y1="340"
          x2="740"
          y2="340"
          stroke="rgba(16,19,26,0.12)"
          strokeWidth="1.5"
          strokeDasharray="6 8"
        />
        <line
          x1="460"
          y1="138"
          x2="460"
          y2="472"
          stroke="rgba(16,19,26,0.12)"
          strokeWidth="1.5"
          strokeDasharray="6 8"
        />

        {/* Highlighted Minnesota State Polygon */}
        <path
          d="M 518 142 L 566 142 L 584 158 L 564 196 L 574 232 L 520 232 L 516 184 Z"
          fill={PALETTE.rust}
          stroke={PALETTE.ink}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Expanding Radar Pulses at Pine Island, MN */}
        <circle
          cx="548"
          cy="206"
          r={10 + ring1}
          fill="none"
          stroke={PALETTE.rust}
          strokeWidth="3.5"
          opacity={Math.max(0, 1 - ring1 / 68)}
        />
        <circle
          cx="548"
          cy="206"
          r={10 + ring2}
          fill="none"
          stroke={PALETTE.amber}
          strokeWidth="3"
          opacity={Math.max(0, 1 - ring2 / 68)}
        />
        <circle
          cx="548"
          cy="206"
          r={11 * pinSpring}
          fill={PALETTE.amber}
          stroke={PALETTE.ink}
          strokeWidth="4"
        />

        {/* Hairline Callout to Minnesota pointing cleanly into open sky above map */}
        <HairlineCallout
          x1={548}
          y1={206}
          x2={455}
          y2={64}
          label="MINNESOTA, USA"
          sublabel="GOOGLE + XCEL ENERGY"
          startFrame={startFrame + 12}
          color={PALETTE.rust}
          textColor={PALETTE.ink}
          align="right"
        />
      </g>
    </svg>
  );
};

/**
 * Beat 5A Visual: Dramatic 4 HRS vs 100 HRS Animated Bar Chart
 */
export const DurationComparisonChart: React.FC<{ startFrame: number }> = ({
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  const lithBar = spring({
    frame: f,
    fps,
    config: { damping: 16, stiffness: 200 },
  });
  const ironBar = spring({
    frame: Math.max(0, f - 10),
    fps,
    config: { damping: 13, stiffness: 150, mass: 0.9 },
  });

  const lithH = 34 * lithBar;
  const ironH = 540 * ironBar;
  const displayHrs = Math.round(100 * Math.min(1, ironBar));

  return (
    <svg viewBox="0 0 900 720" width="900" height="720">
      {/* Horizontal grid guide lines */}
      {[0, 25, 50, 75, 100].map((val) => {
        const y = 620 - (val / 100) * 540;
        return (
          <g key={val}>
            <line
              x1="110"
              y1={y}
              x2="840"
              y2={y}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="2"
              strokeDasharray={val === 0 ? undefined : "6 8"}
            />
            <text
              x="92"
              y={y + 8}
              textAnchor="end"
              fill="rgba(255,255,255,0.55)"
              fontFamily={EDITORIAL_FONTS.mono}
              fontSize="22"
              fontWeight="700"
            >
              {val}h
            </text>
          </g>
        );
      })}

      {/* Left Bar: Lithium 4 HRS */}
      <rect
        x="210"
        y={620 - lithH}
        width="170"
        height={lithH}
        rx="8"
        fill="#64748B"
      />
      <text
        x="295"
        y={620 - lithH - 18}
        textAnchor="middle"
        fill="#94A3B8"
        fontFamily={EDITORIAL_FONTS.display}
        fontSize="52"
        fontWeight="800"
      >
        4 HRS
      </text>
      <text
        x="295"
        y="668"
        textAnchor="middle"
        fill="rgba(255,255,255,0.75)"
        fontFamily={EDITORIAL_FONTS.mono}
        fontSize="24"
        fontWeight="700"
      >
        LITHIUM-ION
      </text>

      {/* Right Bar: Iron-Air 100 HRS */}
      <defs>
        <linearGradient id="rustBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PALETTE.amber} />
          <stop offset="100%" stopColor={PALETTE.rust} />
        </linearGradient>
      </defs>
      <rect
        x="520"
        y={620 - ironH}
        width="210"
        height={ironH}
        rx="14"
        fill="url(#rustBarGrad)"
      />
      <text
        x="625"
        y={620 - ironH - 22}
        textAnchor="middle"
        fill={PALETTE.amber}
        fontFamily={EDITORIAL_FONTS.display}
        fontSize="94"
        fontWeight="800"
      >
        {displayHrs} HRS
      </text>
      <text
        x="625"
        y="668"
        textAnchor="middle"
        fill={PALETTE.white}
        fontFamily={EDITORIAL_FONTS.mono}
        fontSize="26"
        fontWeight="700"
      >
        IRON-AIR (RUST)
      </text>
    </svg>
  );
};

/**
 * Beat 6 & 7 Visual: 2D Editorial Cutaway of Reversible Rust Battery Cell
 */
export const IronAirCutawayGraphic: React.FC<{
  mode: "discharge" | "charge";
  startFrame: number;
}> = ({ mode, startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);

  const progress = interpolate(f, [4, 72], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 1, 0.5, 1),
  });

  const isDischarge = mode === "discharge";
  const pelletColor = isDischarge
    ? interpolateColors(progress, [0, 1], ["#8D99AE", "#D9481A"])
    : interpolateColors(progress, [0, 1], ["#D9481A", "#A8B5C8"]);

  const strokeCol = isDischarge ? PALETTE.ink : PALETTE.white;
  const chamberBg = isDischarge ? "#EAE3D2" : "#151D2B";
  const dashDir = isDischarge ? -(f * 7) : f * 7;

  return (
    <svg
      viewBox="0 0 920 640"
      width="920"
      height="640"
      style={{ overflow: "visible" }}
    >
      {/* Main Cutaway Cell Container */}
      <rect
        x="240"
        y="120"
        width="440"
        height="360"
        rx="28"
        fill={chamberBg}
        stroke={strokeCol}
        strokeWidth="6"
      />

      {/* Electrolyte liquid subtle fill */}
      <rect
        x="252"
        y="180"
        width="416"
        height="288"
        rx="18"
        fill={isDischarge ? "rgba(0, 168, 232, 0.14)" : "rgba(15, 185, 129, 0.14)"}
      />

      {/* Iron Pellets Matrix (4x3 grid changing between Metallic Silver <-> Rust Orange) */}
      {[0, 1, 2, 3].map((col) =>
        [0, 1, 2].map((row) => {
          const cx = 320 + col * 93;
          const cy = 240 + row * 84;
          const wave = Math.sin(f * 0.2 + col + row) * 2.5;
          return (
            <g key={`${col}-${row}`}>
              <circle
                cx={cx}
                cy={cy + wave}
                r="29"
                fill={pelletColor}
                stroke={strokeCol}
                strokeWidth="3.5"
              />
              <circle
                cx={cx - 8}
                cy={cy - 8 + wave}
                r="7"
                fill="rgba(255,255,255,0.35)"
              />
            </g>
          );
        })
      )}

      {/* Left Port: Oxygen (O2) Air Breathing In (Discharge) or Out (Charge) */}
      {[0, 1, 2].map((i) => {
        const phase = ((f * 2.8 + i * 33) % 100) / 100;
        const px = isDischarge
          ? interpolate(phase, [0, 1], [48, 238])
          : interpolate(phase, [0, 1], [238, 48]);
        const py = 225 + i * 75 + Math.sin(f * 0.2 + i) * 8;
        return (
          <g key={i} opacity={Math.sin(phase * Math.PI)}>
            <circle cx={px} cy={py} r="22" fill={PALETTE.cyan} />
            <text
              x={px}
              y={py + 7}
              textAnchor="middle"
              fill={PALETTE.white}
              fontFamily={EDITORIAL_FONTS.mono}
              fontSize="18"
              fontWeight="700"
            >
              O2
            </text>
          </g>
        );
      })}
      <text
        x="110"
        y="465"
        textAnchor="middle"
        fill={PALETTE.cyan}
        fontFamily={EDITORIAL_FONTS.mono}
        fontSize="24"
        fontWeight="700"
      >
        {isDischarge ? "AIR IN ->" : "<- O2 OUT"}
      </text>

      {/* Right Port: Electricity Flowing OUT (Discharge) or IN (Charge) */}
      <path
        d="M 684 300 L 860 300"
        stroke={isDischarge ? PALETTE.amber : PALETTE.emerald}
        strokeWidth="12"
        strokeDasharray="24 14"
        strokeDashoffset={dashDir}
        strokeLinecap="round"
      />
      {/* Power Bolt Emblem */}
      <g transform="translate(805, 195)">
        <polygon
          points="36,0 8,54 32,54 20,104 64,40 38,40"
          fill={isDischarge ? PALETTE.amber : PALETTE.emerald}
          stroke={strokeCol}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>
      <text
        x="815"
        y="365"
        textAnchor="middle"
        fill={isDischarge ? PALETTE.rust : PALETTE.emerald}
        fontFamily={EDITORIAL_FONTS.mono}
        fontSize="24"
        fontWeight="700"
      >
        {isDischarge ? "POWER OUT" : "CHARGE IN"}
      </text>

      {/* Hairline Technical Callout */}
      <HairlineCallout
        x1={460}
        y1={240}
        x2={530}
        y2={68}
        label={isDischarge ? "IRON OXIDATION" : "REVERSE REDUCTION"}
        sublabel={isDischarge ? "IRON -> RUST" : "RUST -> PURE IRON"}
        startFrame={startFrame + 8}
        color={isDischarge ? PALETTE.rust : PALETTE.emerald}
        textColor={strokeCol}
        align="left"
      />

      {/* Chamber Footer Status */}
      <text
        x="460"
        y="538"
        textAnchor="middle"
        fill={isDischarge ? PALETTE.inkMuted : "rgba(255,255,255,0.75)"}
        fontFamily={EDITORIAL_FONTS.mono}
        fontSize="25"
        fontWeight="700"
        letterSpacing="0.08em"
      >
        {isDischarge
          ? "IRON + OXYGEN = ELECTRICITY"
          : "ELECTRICITY RESTORES IRON PELLETS"}
      </text>
    </svg>
  );
};

/**
 * Beat 8 Visual: 1.4 GW Wind + 200 MW Solar Feeding 300 MW Modular Battery
 */
export const RenewablesFlowGraphic: React.FC<{ startFrame: number }> = ({
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const rot = f * 5.2;
  const dash = -(f * 7);

  return (
    <svg viewBox="0 0 920 620" width="920" height="620">
      {/* Left: Spinning Wind Turbines */}
      {[175, 290].map((tx, idx) => {
        const ty = idx === 0 ? 150 : 180;
        const sc = idx === 0 ? 1 : 0.78;
        return (
          <g key={tx} transform={`translate(${tx}, ${ty}) scale(${sc})`}>
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="175"
              stroke={PALETTE.ink}
              strokeWidth="8"
              strokeLinecap="round"
            />
            <g transform={`rotate(${rot + idx * 45})`}>
              {[0, 120, 240].map((deg) => (
                <path
                  key={deg}
                  d="M 0 0 L -8 -85 L 6 -88 L 6 0 Z"
                  fill={PALETTE.cyan}
                  stroke={PALETTE.ink}
                  strokeWidth="2.5"
                  transform={`rotate(${deg})`}
                />
              ))}
              <circle cx="0" cy="0" r="10" fill={PALETTE.ink} />
            </g>
          </g>
        );
      })}
      <text
        x="225"
        y="384"
        textAnchor="middle"
        fill={PALETTE.ink}
        fontFamily={EDITORIAL_FONTS.display}
        fontSize="52"
        fontWeight="800"
      >
        1.4 GW WIND
      </text>

      {/* Right: Solar Panel Array */}
      <g transform="translate(555, 102)">
        <circle cx="220" cy="14" r="34" fill={PALETTE.amber} />
        <polygon
          points="30,68 265,68 235,190 0,190"
          fill="#1B3B6F"
          stroke={PALETTE.ink}
          strokeWidth="5"
        />
        {[70, 135, 200].map((lx) => (
          <line
            key={lx}
            x1={lx}
            y1="68"
            x2={lx - 26}
            y2="190"
            stroke={PALETTE.cyan}
            strokeWidth="2.5"
          />
        ))}
        {[108, 150].map((ly) => (
          <line
            key={ly}
            x1={30 - (ly - 68) * 0.24}
            y1={ly}
            x2={265 - (ly - 68) * 0.24}
            y2={ly}
            stroke={PALETTE.cyan}
            strokeWidth="2.5"
          />
        ))}
      </g>
      <text
        x="685"
        y="384"
        textAnchor="middle"
        fill={PALETTE.ink}
        fontFamily={EDITORIAL_FONTS.display}
        fontSize="52"
        fontWeight="800"
      >
        200 MW SOLAR
      </text>

      {/* Converging Animated Flow Lines to Modular Battery Containers */}
      <path
        d="M 225 404 L 225 456 L 420 456"
        fill="none"
        stroke={PALETTE.cyan}
        strokeWidth="7"
        strokeDasharray="18 12"
        strokeDashoffset={dash}
      />
      <path
        d="M 685 404 L 685 456 L 500 456"
        fill="none"
        stroke={PALETTE.amber}
        strokeWidth="7"
        strokeDasharray="18 12"
        strokeDashoffset={dash}
      />

      {/* Center Modular Iron-Air Battery Unit */}
      <g transform="translate(270, 476)">
        {[0, 1, 2].map((u) => (
          <g key={u} transform={`translate(${u * 130}, 0)`}>
            <rect
              x="0"
              y="0"
              width="116"
              height="96"
              rx="10"
              fill={PALETTE.rust}
              stroke={PALETTE.ink}
              strokeWidth="4"
            />
            <line
              x1="22"
              y1="20"
              x2="22"
              y2="76"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="4"
            />
            <line
              x1="46"
              y1="20"
              x2="46"
              y2="76"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="4"
            />
            <line
              x1="70"
              y1="20"
              x2="70"
              y2="76"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="4"
            />
            <circle cx="94" cy="24" r="7" fill={PALETTE.amber} />
          </g>
        ))}
      </g>
      <text
        x="460"
        y="610"
        textAnchor="middle"
        fill={PALETTE.rust}
        fontFamily={EDITORIAL_FONTS.mono}
        fontSize="26"
        fontWeight="700"
      >
        300 MW / 30 GWh STORAGE BANK
      </text>
    </svg>
  );
};

/**
 * Beat 9 Visual: 200,000+ Homes Lit Up + 2028 Delivery Timeline
 */
export const HomesAndTimelineGraphic: React.FC<{ startFrame: number }> = ({
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);

  const count = Math.round(
    interpolate(f, [0, 36], [12000, 200000], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    })
  );
  const railProgress = interpolate(f, [45, 92], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

  return (
    <svg viewBox="0 0 920 680" width="920" height="680">
      {/* Massive Home Output Counter */}
      <text
        x="460"
        y="148"
        textAnchor="middle"
        fill={PALETTE.amber}
        fontFamily={EDITORIAL_FONTS.display}
        fontSize="168"
        fontWeight="800"
      >
        {count.toLocaleString("en-US")}+
      </text>
      <text
        x="460"
        y="206"
        textAnchor="middle"
        fill={PALETTE.white}
        fontFamily={EDITORIAL_FONTS.mono}
        fontSize="30"
        fontWeight="700"
        letterSpacing="0.14em"
      >
        HOMES POWERED EQUIVALENT
      </text>

      {/* Row of 7 Vector Houses lighting up sequentially */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const lit = f > 8 + i * 4;
        const hx = 92 + i * 108;
        return (
          <g key={i} transform={`translate(${hx}, 268)`}>
            <polygon
              points="44,0 88,38 78,38 78,94 10,94 10,38 0,38"
              fill={lit ? "#263248" : "#141B29"}
              stroke={lit ? PALETTE.amber : "rgba(255,255,255,0.22)"}
              strokeWidth="3.5"
            />
            <rect
              x="24"
              y="48"
              width="16"
              height="18"
              rx="2"
              fill={lit ? PALETTE.amber : "#0E141F"}
            />
            <rect
              x="48"
              y="48"
              width="16"
              height="18"
              rx="2"
              fill={lit ? PALETTE.amber : "#0E141F"}
            />
          </g>
        );
      })}

      {/* Editorial Rollout Timeline (2026 -> 2028) */}
      <g transform="translate(100, 455)">
        <line
          x1="0"
          y1="40"
          x2="720"
          y2="40"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="0"
          y1="40"
          x2={720 * railProgress}
          y2="40"
          stroke={PALETTE.rust}
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Node 2026 */}
        <circle cx="0" cy="40" r="14" fill={PALETTE.white} />
        <text
          x="0"
          y="92"
          textAnchor="start"
          fill="rgba(255,255,255,0.75)"
          fontFamily={EDITORIAL_FONTS.mono}
          fontSize="24"
          fontWeight="700"
        >
          2026 DEAL SIGNED
        </text>

        {/* Node 2028 */}
        <circle
          cx="720"
          cy="40"
          r={16 + (railProgress > 0.9 ? 4 : 0)}
          fill={railProgress > 0.85 ? PALETTE.amber : "#334155"}
          stroke={PALETTE.white}
          strokeWidth="4"
        />
        <text
          x="720"
          y="92"
          textAnchor="end"
          fill={PALETTE.amber}
          fontFamily={EDITORIAL_FONTS.display}
          fontSize="44"
          fontWeight="800"
        >
          2028 FIRST UNITS SHIP
        </text>
      </g>

      {/* Micro Source Citation */}
      <text
        x="460"
        y="642"
        textAnchor="middle"
        fill="rgba(255,255,255,0.52)"
        fontFamily={EDITORIAL_FONTS.mono}
        fontSize="20"
        fontWeight="700"
        letterSpacing="0.06em"
      >
        SOURCES: FORTUNE · UTILITY DIVE · XCEL ENERGY (2026)
      </text>
    </svg>
  );
};
