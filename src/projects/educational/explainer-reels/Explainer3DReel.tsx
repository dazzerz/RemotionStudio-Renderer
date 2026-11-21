import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface HairlineCallout {
  label: string;
  /** Anchor dot X/Y in percentage (0-100) of 1080x1920 */
  anchorX: number;
  anchorY: number;
  /** Label end X/Y in percentage (0-100) */
  labelX: number;
  labelY: number;
  /** Local scene delay in seconds */
  delaySec: number;
  accentColor?: string;
}

export type DiagramVariant =
  | "plug-wedge"
  | "plug-motion"
  | "plug-seal"
  | "traffic-4phase"
  | "traffic-queue"
  | "cta-end";

export interface ExplainerScene {
  imagePath: string;
  /** Optional video clip (under public/) played instead of the still image. */
  videoPath?: string;
  startSec: number;
  endSec: number;
  panDirection: "in" | "out" | "left" | "right";
  callouts: HairlineCallout[];
  diagramVariant?: DiagramVariant;
}

export interface SubtitleCue {
  startSec: number;
  endSec: number;
  text: string;
  highlightWord?: string;
}

export interface CtaBannerConfig {
  actionText: string;
  subText: string;
  startSec: number;
  accentColor?: string;
}

export interface ExplainerConfig {
  id: string;
  theme?: "default" | "editorial_toon";
  channelBadge?: string;
  audioPath: string;
  durationSec: number;
  hookLine1: string;
  hookLine1Color: string;
  hookLine2: string;
  hookLine2Color: string;
  bottomBadge?: string;
  sourceText: string;
  ctaBanner?: CtaBannerConfig;
  scenes: ExplainerScene[];
  subtitles: SubtitleCue[];
}

const AnimatedDiagramLayer: React.FC<{
  variant: DiagramVariant;
  durationFrames: number;
}> = ({ variant, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const pulse = Math.sin((frame / fps) * Math.PI * 3) * 0.5 + 0.5;

  return (
    <AbsoluteFill
      style={{
        background:
          variant.startsWith("traffic")
            ? "radial-gradient(circle at 50% 48%, #1E293B 0%, #0B1120 100%)"
            : "radial-gradient(circle at 50% 48%, #172554 0%, #090D16 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <svg
        width="1080"
        height="1920"
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Subtle technical grid */}
        <defs>
          <pattern id="techGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(148,163,184,0.12)"
              strokeWidth="1.5"
            />
          </pattern>
        </defs>
        <rect width="1080" height="1920" fill="url(#techGrid)" />

        {variant === "plug-wedge" && (
          <g transform="translate(540, 950)">
            {/* Fuselage wall frame with narrower opening */}
            <rect x="-420" y="-40" width="240" height="80" rx="10" fill="#475569" stroke="#CBD5E1" strokeWidth="4" />
            <rect x="180" y="-40" width="240" height="80" rx="10" fill="#475569" stroke="#CBD5E1" strokeWidth="4" />
            {/* Plug door wider than opening, wedged from inside */}
            <g transform={`translate(0, ${85 - 35 * Math.min(1, p * 1.4)})`}>
              <polygon
                points="-235,35 235,35 195,-35 -195,-35"
                fill="#FACC15"
                stroke="#FEF08A"
                strokeWidth="5"
              />
              {/* Pressure arrows pushing outward */}
              {[-120, 0, 120].map((ax, i) => (
                <g key={i} transform={`translate(${ax}, ${130 - 15 * pulse})`}>
                  <line x1="0" y1="70" x2="0" y2="-10" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round" />
                  <polygon points="0,-28 -16,0 16,0" fill="#38BDF8" />
                </g>
              ))}
            </g>
          </g>
        )}

        {variant === "plug-motion" && (
          <g transform="translate(540, 960)">
            <rect x="-420" y="-45" width="220" height="90" rx="10" fill="#475569" stroke="#CBD5E1" strokeWidth="4" />
            <rect x="200" y="-45" width="220" height="90" rx="10" fill="#475569" stroke="#CBD5E1" strokeWidth="4" />
            {/* Step 1: Pull inward (+Y), Step 2: Rotate */}
            <g
              transform={`translate(0, ${
                p < 0.5 ? 55 + 160 * (p * 2) : 215 - 120 * ((p - 0.5) * 2)
              }) rotate(${p < 0.5 ? 0 : 72 * ((p - 0.5) * 2)})`}
            >
              <polygon
                points="-225,32 225,32 190,-32 -190,-32"
                fill="#38BDF8"
                stroke="#E0F2FE"
                strokeWidth="5"
              />
            </g>
            {/* Motion path arc */}
            <path
              d="M 0 110 L 0 230 Q 0 280 95 280"
              fill="none"
              stroke="#FFE600"
              strokeWidth="6"
              strokeDasharray="14 12"
            />
          </g>
        )}

        {variant === "plug-seal" && (
          <g transform="translate(540, 960)">
            {/* Frame stops */}
            <rect x="-360" y="-220" width="90" height="440" rx="14" fill="#334155" stroke="#94A3B8" strokeWidth="4" />
            <rect x="270" y="-220" width="90" height="440" rx="14" fill="#334155" stroke="#94A3B8" strokeWidth="4" />
            {/* Rubber seal rings */}
            <rect x="-270" y="-170" width="32" height="340" rx="8" fill="#EF4444" opacity={0.75 + 0.25 * pulse} />
            <rect x="238" y="-170" width="32" height="340" rx="8" fill="#EF4444" opacity={0.75 + 0.25 * pulse} />
            {/* Locked door */}
            <rect x="-235" y="-150" width="470" height="300" rx="18" fill="#E2E8F0" stroke="#FFFFFF" strokeWidth="6" />
            {/* Red locking pins */}
            <rect x="-295" y="-90" width="90" height="28" rx="8" fill="#F97316" />
            <rect x="205" y="-90" width="90" height="28" rx="8" fill="#F97316" />
            <rect x="-295" y="62" width="90" height="28" rx="8" fill="#F97316" />
            <rect x="205" y="62" width="90" height="28" rx="8" fill="#F97316" />
          </g>
        )}

        {variant === "traffic-4phase" && (
          <g transform="translate(540, 950)">
            {/* 4-way asphalt cross */}
            <rect x="-140" y="-420" width="280" height="840" fill="#1E293B" stroke="#475569" strokeWidth="4" />
            <rect x="-420" y="-140" width="840" height="280" fill="#1E293B" stroke="#475569" strokeWidth="4" />
            <rect x="-140" y="-140" width="280" height="280" fill="#0F172A" stroke="#FACC15" strokeWidth="4" strokeDasharray="16 12" />
            {/* Active phase rotating 1..4 */}
            {(() => {
              const active = Math.floor(p * 4) % 4;
              const dirs = [
                { x: 0, y: -250, rot: 0 },
                { x: 250, y: 0, rot: 90 },
                { x: 0, y: 250, rot: 180 },
                { x: -250, y: 0, rot: 270 },
              ];
              return dirs.map((d, idx) => (
                <g key={idx} transform={`translate(${d.x}, ${d.y}) rotate(${d.rot})`}>
                  <circle r="44" fill={idx === active ? "#22C55E" : "#EF4444"} opacity="0.92" />
                  <circle r="56" fill="none" stroke={idx === active ? "#86EFAC" : "#FCA5A5"} strokeWidth="4" opacity={idx === active ? 0.9 : 0.3} />
                </g>
              ));
            })()}
          </g>
        )}

        {variant === "traffic-queue" && (
          <g transform="translate(540, 960)">
            {/* Long road queue */}
            <rect x="-170" y="-430" width="340" height="860" rx="16" fill="#1E293B" stroke="#475569" strokeWidth="4" />
            <line x1="0" y1="-410" x2="0" y2="410" stroke="#94A3B8" strokeWidth="5" strokeDasharray="24 20" />
            {/* Stop line & red bar */}
            <line x1="-160" y1="-260" x2="160" y2="-260" stroke="#FFFFFF" strokeWidth="10" />
            <circle cx="0" cy="-340" r="36" fill="#EF4444" opacity={0.7 + 0.3 * pulse} />
            {/* Queued miniature cars stacking up */}
            {[0, 1, 2, 3, 4].map((idx) => {
              const appear = interpolate(p, [idx * 0.14, idx * 0.14 + 0.18], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const targetY = -180 + idx * 125;
              const y = targetY + (1 - appear) * 180;
              const colors = ["#38BDF8", "#FACC15", "#F97316", "#A78BFA", "#EC4899"];
              return (
                <g key={idx} transform={`translate(${idx % 2 === 0 ? -75 : 75}, ${y})`} opacity={appear}>
                  <rect x="-42" y="-44" width="84" height="88" rx="16" fill={colors[idx]} stroke="#FFFFFF" strokeWidth="3" />
                  <rect x="-32" y="28" width="20" height="10" rx="3" fill="#EF4444" />
                  <rect x="12" y="28" width="20" height="10" rx="3" fill="#EF4444" />
                </g>
              );
            })}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

const ScenePlate: React.FC<{ scene: ExplainerScene; durationFrames: number }> = ({
  scene,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, Math.round(0.4 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const progress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });

  let scale = 1.03;
  let tx = 0;
  let ty = 0;
  if (scene.panDirection === "in") {
    scale = 1.0 + 0.08 * progress;
  } else if (scene.panDirection === "out") {
    scale = 1.08 - 0.06 * progress;
  } else if (scene.panDirection === "left") {
    scale = 1.06;
    tx = 18 - 36 * progress;
  } else {
    scale = 1.06;
    tx = -18 + 36 * progress;
  }

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {scene.diagramVariant ? (
        <AnimatedDiagramLayer variant={scene.diagramVariant} durationFrames={durationFrames} />
      ) : scene.videoPath ? (
        <OffthreadVideo
          src={staticFile(scene.videoPath)}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale: String(scale),
            translate: `${tx}px ${ty}px`,
          }}
        />
      ) : (
        <Img
          src={staticFile(scene.imagePath)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale: String(scale),
            translate: `${tx}px ${ty}px`,
          }}
        />
      )}
      {/* Subtle top & bottom gradient scrim so floating typography stays crisp */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.05) 68%, rgba(0,0,0,0.72) 100%)",
          pointerEvents: "none",
        }}
      />
      {scene.callouts.map((c, idx) => (
        <CalloutLine key={idx} callout={c} />
      ))}
    </AbsoluteFill>
  );
};

const CalloutLine: React.FC<{ callout: HairlineCallout }> = ({ callout }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const startFrame = Math.round(callout.delaySec * fps);

  const reveal = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 16, stiffness: 180 },
  });

  if (frame < startFrame) {
    return null;
  }

  const accent = callout.accentColor ?? "#FFE600";
  const ax = (callout.anchorX / 100) * 1080;
  const ay = (callout.anchorY / 100) * 1920;
  const lx = (callout.labelX / 100) * 1080;
  const ly = (callout.labelY / 100) * 1920;
  const placeLeft = lx >= 500;

  const lineLen = Math.hypot(lx - ax, ly - ay);
  const dashOffset = interpolate(reveal, [0, 1], [lineLen, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: reveal }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line
          x1={ax}
          y1={ay}
          x2={lx}
          y2={ly}
          stroke={accent}
          strokeWidth={3}
          strokeDasharray={lineLen}
          strokeDashoffset={dashOffset}
        />
        <circle cx={ax} cy={ay} r={8} fill={accent} stroke="#000000" strokeWidth={2.5} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: placeLeft ? undefined : Math.max(70, lx + 12),
          right: placeLeft ? Math.max(70, 1080 - lx + 12) : undefined,
          top: ly - 22,
          maxWidth: 460,
          textAlign: placeLeft ? "right" : "left",
          fontFamily: "Inter, Montserrat, Arial, sans-serif",
          fontSize: 30,
          fontWeight: 800,
          lineHeight: 1.2,
          color: "#FFFFFF",
          textShadow: "0 3px 10px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.95)",
        }}
      >
        {callout.label}
      </div>
    </AbsoluteFill>
  );
};

const HookHeader: React.FC<{
  line1: string;
  line1Color: string;
  line2: string;
  line2Color: string;
}> = ({ line1, line1Color, line2, line2Color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 160 },
  });

  const yOffset = interpolate(enter, [0, 1], [-28, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: 155,
        left: 70,
        right: 70,
        textAlign: "center",
        opacity: enter,
        translate: `0 ${yOffset}px`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: "Inter, Montserrat, Arial, sans-serif",
          fontSize: 54,
          fontWeight: 900,
          lineHeight: 1.15,
          color: line1Color,
          textShadow: "0 5px 18px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
        }}
      >
        {line1}
      </div>
      <div
        style={{
          fontFamily: "Inter, Montserrat, Arial, sans-serif",
          fontSize: 54,
          fontWeight: 900,
          lineHeight: 1.15,
          color: line2Color,
          textShadow: "0 5px 18px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
        }}
      >
        {line2}
      </div>
    </div>
  );
};

const BottomPunchBadge: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({
    frame: frame - Math.round(0.35 * fps),
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const fadeOut = interpolate(frame, [4.2 * fps, 4.8 * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame > 5 * fps) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 430,
        left: 85,
        opacity: pop * fadeOut,
        scale: String(interpolate(pop, [0, 1], [0.7, 1])),
        rotate: "-3.5deg",
        backgroundColor: "#FFE600",
        color: "#0A0A0A",
        padding: "10px 24px",
        border: "4px solid #0A0A0A",
        fontFamily: "Inter, Montserrat, Arial, sans-serif",
        fontSize: 34,
        fontWeight: 900,
        letterSpacing: "0.02em",
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
};

const KineticSubtitle: React.FC<{ cue: SubtitleCue }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 220 },
  });

  const words = cue.text.split(" ");
  const target = cue.highlightWord?.toLowerCase();

  return (
    <div
      style={{
        position: "absolute",
        bottom: 265,
        left: 72,
        right: 72,
        textAlign: "center",
        opacity: pop,
        translate: `0 ${interpolate(pop, [0, 1], [16, 0])}px`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: "Inter, Montserrat, Arial, sans-serif",
          fontSize: 42,
          fontWeight: 900,
          lineHeight: 1.25,
          color: "#FFFFFF",
          WebkitTextStroke: "2px #000000",
          textShadow: "0 4px 14px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.9)",
        }}
      >
        {words.map((w, i) => {
          const clean = w.toLowerCase().replace(/[^a-z0-9]/g, "");
          const isMatch = target ? clean.includes(target) : false;
          return (
            <span
              key={i}
              style={{
                color: isMatch ? "#FFE600" : "#FFFFFF",
              }}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const CtaFloatingBanner: React.FC<{ cta: CtaBannerConfig }> = ({ cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 190 },
  });
  const accent = cta.accentColor ?? "#FFE600";

  return (
    <div
      style={{
        position: "absolute",
        bottom: 430,
        left: 75,
        right: 75,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        scale: String(0.88 + 0.12 * pop),
        opacity: pop,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: "Inter, Montserrat, Arial Black, sans-serif",
          fontSize: 40,
          fontWeight: 900,
          color: accent,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          WebkitTextStroke: "2px rgba(0,0,0,0.85)",
          textShadow: "0 4px 18px rgba(0,0,0,0.95)",
        }}
      >
        {cta.actionText}
      </div>
      <div
        style={{
          fontFamily: "Inter, Montserrat, Arial, sans-serif",
          fontSize: 28,
          fontWeight: 800,
          color: "#FFFFFF",
          textAlign: "center",
          textShadow: "0 3px 12px rgba(0,0,0,0.95)",
        }}
      >
        {cta.subText}
      </div>
    </div>
  );
};

const SourceFooter: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 185,
        left: 70,
        right: 70,
        textAlign: "center",
        opacity,
        fontFamily: "Inter, Montserrat, Arial, sans-serif",
        fontSize: 22,
        fontWeight: 700,
        color: "#E2E8F0",
        textShadow: "0 2px 8px rgba(0,0,0,0.95)",
        pointerEvents: "none",
      }}
    >
      Sumber: {text}
    </div>
  );
};

export const Explainer3DReel: React.FC<{ config: ExplainerConfig }> = ({
  config,
}) => {
  const { fps } = useVideoConfig();
  const isEditorial = config.theme === "editorial_toon";

  return (
    <AbsoluteFill style={{ backgroundColor: isEditorial ? "#F4F2EC" : "#090D16" }}>
      <Audio src={staticFile(config.audioPath)} />

      {config.scenes.map((scene, idx) => {
        const from = Math.round(scene.startSec * fps);
        const dur = Math.max(1, Math.round((scene.endSec - scene.startSec) * fps));
        return (
          <Sequence key={idx} from={from} durationInFrames={dur}>
            <ScenePlate scene={scene} durationFrames={dur} />
          </Sequence>
        );
      })}

      {isEditorial ? (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 430,
              background:
                "linear-gradient(180deg, rgba(244,242,236,0.98) 0%, rgba(244,242,236,0.92) 55%, rgba(244,242,236,0) 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 135,
              left: 72,
              right: 310,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontFamily: "Inter, Montserrat, Arial, sans-serif",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#525852",
                marginBottom: 8,
              }}
            >
              {config.hookLine1}
            </div>
            <div
              style={{
                fontFamily: "Inter, Montserrat, Arial, sans-serif",
                fontSize: 48,
                fontWeight: 900,
                lineHeight: 1.12,
                color: "#1E2421",
              }}
            >
              {config.hookLine2.split(" ").map((w, i, arr) => (
                <span
                  key={i}
                  style={{
                    color: i >= Math.floor(arr.length / 2) ? "#2A6F4E" : "#1E2421",
                  }}
                >
                  {w}{" "}
                </span>
              ))}
            </div>
          </div>
          {config.channelBadge ? (
            <div
              style={{
                position: "absolute",
                top: 135,
                right: 70,
                backgroundColor: "#24352D",
                color: "#FFFFFF",
                padding: "10px 20px",
                borderRadius: 10,
                fontFamily: "Inter, Montserrat, Arial, sans-serif",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "0.02em",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                pointerEvents: "none",
              }}
            >
              {config.channelBadge}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <HookHeader
            line1={config.hookLine1}
            line1Color={config.hookLine1Color}
            line2={config.hookLine2}
            line2Color={config.hookLine2Color}
          />
          {config.bottomBadge ? <BottomPunchBadge text={config.bottomBadge} /> : null}
        </>
      )}

      {config.subtitles.map((cue, idx) => {
        const from = Math.round(cue.startSec * fps);
        const dur = Math.max(1, Math.round((cue.endSec - cue.startSec) * fps));
        if (isEditorial) {
          return (
            <Sequence key={idx} from={from} durationInFrames={dur}>
              <div
                style={{
                  position: "absolute",
                  bottom: 245,
                  left: 72,
                  right: 72,
                  display: "flex",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#24352D",
                    color: "#FFFFFF",
                    padding: "14px 28px",
                    borderRadius: 14,
                    fontFamily: "Inter, Montserrat, Arial, sans-serif",
                    fontSize: 38,
                    fontWeight: 800,
                    lineHeight: 1.28,
                    textAlign: "center",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
                  }}
                >
                  {cue.text}
                </div>
              </div>
            </Sequence>
          );
        }
        return (
          <Sequence key={idx} from={from} durationInFrames={dur}>
            <KineticSubtitle cue={cue} />
          </Sequence>
        );
      })}

      {config.ctaBanner ? (
        <Sequence
          from={Math.round(config.ctaBanner.startSec * fps)}
          durationInFrames={Math.max(
            1,
            Math.round((config.durationSec - config.ctaBanner.startSec) * fps)
          )}
        >
          <CtaFloatingBanner cta={config.ctaBanner} />
        </Sequence>
      ) : null}

      <Sequence
        from={Math.round((config.durationSec - 8) * fps)}
        durationInFrames={Math.round(8 * fps)}
      >
        <SourceFooter text={config.sourceText} />
      </Sequence>
    </AbsoluteFill>
  );
};
