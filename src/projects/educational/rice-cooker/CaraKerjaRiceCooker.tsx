import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const RICE_COOKER_FPS = 30;
export const RICE_COOKER_DURATION_FRAMES = 1565; // 52.16s

interface SubtitleSegment {
  startSec: number;
  endSec: number;
  text: string;
  highlightWords: string[];
  accentColor?: string;
}

const SUBTITLES: SubtitleSegment[] = [
  {
    startSec: 0.0,
    endSec: 2.6,
    text: "Pernah mikir gak...",
    highlightWords: ["mikir"],
    accentColor: "#FFE600",
  },
  {
    startSec: 2.6,
    endSec: 5.6,
    text: "kenapa rice cooker di rumah lu bisa tahu persis kapan nasinya matang,",
    highlightWords: ["tahu", "persis", "matang,"],
    accentColor: "#FFE600",
  },
  {
    startSec: 5.6,
    endSec: 8.6,
    text: "dan otomatis jepret sendiri ke mode Warm?",
    highlightWords: ["otomatis", "jepret", "Warm?"],
    accentColor: "#00F2FE",
  },
  {
    startSec: 9.4,
    endSec: 12.2,
    text: "Kalau kita bedah dalemnya... lu bakal kaget!",
    highlightWords: ["bedah", "kaget!"],
    accentColor: "#FFE600",
  },
  {
    startSec: 12.2,
    endSec: 16.2,
    text: "Karena sama sekali gak ada sensor canggih, apalagi komputer pintar di sini.",
    highlightWords: ["gak", "ada", "sensor", "komputer"],
    accentColor: "#FF5E5E",
  },
  {
    startSec: 16.9,
    endSec: 23.4,
    text: "Rahasia utamanya ada di satu silinder koin magnet di dasar panci.",
    highlightWords: ["silinder", "koin", "magnet"],
    accentColor: "#00F2FE",
  },
  {
    startSec: 23.8,
    endSec: 27.5,
    text: "Selama masih ada air...",
    highlightWords: ["masih", "air..."],
    accentColor: "#00F2FE",
  },
  {
    startSec: 27.5,
    endSec: 31.0,
    text: "suhu dasar rice cooker bakal terkunci mentok di 100 derajat Celsius.",
    highlightWords: ["terkunci", "100", "derajat"],
    accentColor: "#FFE600",
  },
  {
    startSec: 31.0,
    endSec: 35.0,
    text: "Tapi begitu airnya habis terserap nasi...",
    highlightWords: ["airnya", "habis"],
    accentColor: "#FF8C42",
  },
  {
    startSec: 35.0,
    endSec: 39.5,
    text: "suhunya langsung melonjak nembus 103 derajat!",
    highlightWords: ["melonjak", "103", "derajat!"],
    accentColor: "#FF3B30",
  },
  {
    startSec: 39.5,
    endSec: 43.2,
    text: "Di suhu inilah, magnet kehilangan daya tariknya karena melewati titik Curie.",
    highlightWords: ["kehilangan", "titik", "Curie."],
    accentColor: "#FFE600",
  },
  {
    startSec: 43.2,
    endSec: 47.0,
    text: "Magnetnya lepas... dan per pegas langsung ngejepret tuas sakelar ke mode Warm!",
    highlightWords: ["Magnetnya", "lepas...", "ngejepret", "Warm!"],
    accentColor: "#70FF00",
  },
  {
    startSec: 47.0,
    endSec: 50.0,
    text: "Murni fisika mekanis sederhana tanpa mikrochip.",
    highlightWords: ["fisika", "mekanis", "tanpa", "mikrochip."],
    accentColor: "#00F2FE",
  },
  {
    startSec: 50.0,
    endSec: 52.16,
    text: "Coba cek rice cooker di dapur lu sekarang!",
    highlightWords: ["cek", "sekarang!"],
    accentColor: "#FFE600",
  },
];

interface ScenePlateConfig {
  src: string;
  startSec: number;
  endSec: number;
  scaleFrom: number;
  scaleTo: number;
  panXFrom?: number;
  panXTo?: number;
  panYFrom?: number;
  panYTo?: number;
  shakeAtSec?: number;
}

const SCENES: ScenePlateConfig[] = [
  {
    src: "images/rice-cooker/scene1_exterior.jpg",
    startSec: 0,
    endSec: 9.0,
    scaleFrom: 1.0,
    scaleTo: 1.08,
    panYFrom: 0,
    panYTo: -18,
  },
  {
    src: "images/rice-cooker/scene2_cutaway.jpg",
    startSec: 8.6,
    endSec: 17.0,
    scaleFrom: 1.02,
    scaleTo: 1.12,
    panYFrom: 10,
    panYTo: -15,
  },
  {
    src: "images/rice-cooker/scene3_boiling_100c.jpg",
    startSec: 16.5,
    endSec: 31.2,
    scaleFrom: 1.0,
    scaleTo: 1.1,
    panXFrom: -8,
    panXTo: 8,
  },
  {
    src: "images/rice-cooker/scene4_curie_snap_103c.jpg",
    startSec: 30.8,
    endSec: 47.2,
    scaleFrom: 1.02,
    scaleTo: 1.12,
    panYFrom: 8,
    panYTo: -12,
    shakeAtSec: 43.2,
  },
  {
    src: "images/rice-cooker/scene5_warm_ready.jpg",
    startSec: 46.8,
    endSec: 52.5,
    scaleFrom: 1.06,
    scaleTo: 1.0,
    panYFrom: -10,
    panYTo: 0,
  },
];

const ScenePlate: React.FC<{ scene: ScenePlateConfig }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = Math.round(scene.startSec * fps);
  const endFrame = Math.round(scene.endSec * fps);
  const fadeFrames = Math.round(0.45 * fps);

  if (frame < startFrame - 2 || frame > endFrame + fadeFrames) {
    return null;
  }

  const fadeIn =
    scene.startSec === 0
      ? 1
      : interpolate(frame, [startFrame, startFrame + fadeFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  const fadeOut = interpolate(
    frame,
    [endFrame - fadeFrames, endFrame],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  const scale = interpolate(
    frame,
    [startFrame, endFrame],
    [scene.scaleFrom, scene.scaleTo],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    }
  );

  const panX = interpolate(
    frame,
    [startFrame, endFrame],
    [scene.panXFrom ?? 0, scene.panXTo ?? 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const panY = interpolate(
    frame,
    [startFrame, endFrame],
    [scene.panYFrom ?? 0, scene.panYTo ?? 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Mechanical snap micro-shake when the Curie magnet detaches
  let shakeX = 0;
  let shakeY = 0;
  if (scene.shakeAtSec !== undefined) {
    const shakeFrame = Math.round(scene.shakeAtSec * fps);
    const dt = frame - shakeFrame;
    if (dt >= 0 && dt <= 14) {
      const decay = Math.exp(-dt * 0.28);
      shakeX = Math.sin(dt * 2.4) * 11 * decay;
      shakeY = Math.cos(dt * 3.1) * 14 * decay;
    }
  }

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={staticFile(scene.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${panX + shakeX}px, ${panY + shakeY}px) scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

const SteamParticles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Show gentle steam during exterior (0-9s), boiling (16.5-31s), and warm ready (46.8-52.16s)
  const active =
    t < 9.0 || (t > 16.5 && t < 31.2) || t > 46.8;
  if (!active) return null;

  const intensity = t > 16.5 && t < 31.2 ? 0.55 : 0.35;

  const wisps = Array.from({ length: 12 }, (_, i) => {
    const speed = 0.35 + (i % 4) * 0.12;
    const progress = ((t * speed + i * 0.19) % 1);
    const xBase = 420 + (i - 5.5) * 38;
    const xDrift = Math.sin(t * 1.8 + i * 1.3) * 26;
    const y = interpolate(progress, [0, 1], [980, 340]);
    const opacity =
      Math.sin(progress * Math.PI) * intensity;
    const size = 44 + progress * 90;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: xBase + xDrift - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 70%)",
          opacity,
          pointerEvents: "none",
        }}
      />
    );
  });

  return <AbsoluteFill style={{ pointerEvents: "none" }}>{wisps}</AbsoluteFill>;
};

const HairlineCallout: React.FC<{
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  startSec: number;
  endSec: number;
  color?: string;
  align?: "left" | "right";
}> = ({
  label,
  sublabel,
  x,
  y,
  anchorX,
  anchorY,
  startSec,
  endSec,
  color = "#00F2FE",
  align = "left",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = Math.round(startSec * fps);
  const endFrame = Math.round(endSec * fps);
  if (frame < startFrame || frame > endFrame) return null;

  const enter = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 16, stiffness: 180 },
  });

  const fadeOut = interpolate(
    frame,
    [endFrame - 10, endFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(enter, fadeOut);
  const dx = anchorX - x;
  const dy = anchorY - y;
  const length = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      {/* Anchor dot on physical part */}
      <div
        style={{
          position: "absolute",
          left: anchorX - 7,
          top: anchorY - 7,
          width: 14,
          height: 14,
          borderRadius: "50%",
          backgroundColor: color,
          boxShadow: `0 0 16px ${color}`,
        }}
      />
      {/* Thin 2px hairline connector */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: length * enter,
          height: 2,
          backgroundColor: color,
          transformOrigin: "0 50%",
          transform: `rotate(${angleDeg}deg)`,
          boxShadow: "0 2px 6px rgba(0,0,0,0.8)",
        }}
      />
      {/* Floating label directly on canvas (no box/card) */}
      <div
        style={{
          position: "absolute",
          left: align === "right" ? undefined : x,
          right: align === "right" ? 1080 - x : undefined,
          top: sublabel ? y - 78 : y - 44,
          textAlign: align,
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 900,
          fontSize: 32,
          letterSpacing: "0.02em",
          color: "#FFFFFF",
          textShadow: "0 4px 14px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9)",
          WebkitTextStroke: "1.5px rgba(0,0,0,0.85)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color }}>{label}</span>
        {sublabel ? (
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#E8EEF2",
              marginTop: 2,
            }}
          >
            {sublabel}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const TemperatureReadout: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  if (t < 24.0 || t > 46.8) return null;

  const temp =
    t < 31.0
      ? 100
      : Math.round(
          interpolate(t, [31.0, 38.5], [100, 103], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        );

  const isCurie = temp >= 103;
  const color = isCurie ? "#FF3B30" : "#FFE600";
  const pulse = isCurie ? 1 + Math.sin(t * 14) * 0.04 : 1;

  const opacity = Math.min(
    interpolate(t, [24.0, 24.5], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(t, [46.2, 46.8], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 165,
        right: 76,
        opacity,
        transform: `scale(${pulse})`,
        textAlign: "right",
        fontFamily: "Inter, system-ui, sans-serif",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "0.14em",
          color: "#E2E8F0",
          textShadow: "0 3px 10px rgba(0,0,0,0.95)",
        }}
      >
        SUHU DASAR PANCI
      </div>
      <div
        style={{
          fontSize: 82,
          fontWeight: 900,
          lineHeight: 1.0,
          color,
          textShadow: "0 6px 20px rgba(0,0,0,0.95)",
          WebkitTextStroke: "2px rgba(0,0,0,0.85)",
        }}
      >
        {temp}°C
      </div>
      {isCurie ? (
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: "#FFE600",
            letterSpacing: "0.08em",
            textShadow: "0 3px 12px rgba(0,0,0,0.95)",
          }}
        >
          TITIK CURIE TERCAPAI
        </div>
      ) : null}
    </div>
  );
};

const HookHeadline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  if (t > 8.6) return null;

  const enter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 150 },
  });

  const fadeOut = interpolate(t, [8.0, 8.6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 155,
        left: 72,
        right: 72,
        opacity: Math.min(enter, fadeOut),
        transform: `translateY(${(1 - enter) * 24}px)`,
        fontFamily: "Inter, system-ui, sans-serif",
        textAlign: "left",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: "0.16em",
          color: "#00F2FE",
          textShadow: "0 4px 12px rgba(0,0,0,0.95)",
          marginBottom: 8,
        }}
      >
        BEDAH MEKANISME
      </div>
      <div
        style={{
          fontSize: 58,
          fontWeight: 900,
          lineHeight: 1.08,
          color: "#FFFFFF",
          textShadow: "0 6px 22px rgba(0,0,0,0.95)",
          WebkitTextStroke: "2px rgba(0,0,0,0.85)",
        }}
      >
        RAHASIA RICE COOKER{" "}
        <span style={{ color: "#FFE600" }}>JEPRET OTOMATIS</span>
      </div>
    </div>
  );
};

const KineticSubtitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const activeSeg = SUBTITLES.find(
    (seg) => t >= seg.startSec && t < seg.endSec
  );
  if (!activeSeg) return null;

  const words = activeSeg.text.split(" ");
  const segStartFrame = Math.round(activeSeg.startSec * fps);
  const segDurationFrames = Math.max(
    1,
    Math.round((activeSeg.endSec - activeSeg.startSec) * fps)
  );
  const framesPerWord = Math.max(2, (segDurationFrames * 0.72) / words.length);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 245,
        left: 74,
        right: 74,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        gap: "10px 14px",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 44,
        fontWeight: 900,
        lineHeight: 1.22,
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      {words.map((word, idx) => {
        const wordStart = segStartFrame + idx * framesPerWord;
        const wordProgress = spring({
          frame: Math.max(0, frame - wordStart),
          fps,
          config: { damping: 14, stiffness: 260 },
        });
        const isHighlighted = activeSeg.highlightWords.includes(word);
        const wordOpacity = frame >= wordStart ? wordProgress : 0.36;
        const scale = frame >= wordStart ? 0.85 + 0.15 * wordProgress : 0.94;

        return (
          <span
            key={`${activeSeg.startSec}-${idx}`}
            style={{
              display: "inline-block",
              opacity: wordOpacity,
              transform: `scale(${scale}) translateY(${(1 - wordProgress) * 10}px)`,
              color: isHighlighted
                ? activeSeg.accentColor ?? "#FFE600"
                : "#FFFFFF",
              textShadow:
                "0 5px 16px rgba(0,0,0,0.98), 0 2px 4px rgba(0,0,0,0.95)",
              WebkitTextStroke: "2.5px rgba(0,0,0,0.92)",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

const ScientificSourceFooter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  if (t < 47.0) return null;

  const opacity = interpolate(t, [47.0, 47.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 160,
        left: 72,
        right: 72,
        opacity,
        fontFamily: "Inter, system-ui, sans-serif",
        textAlign: "left",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "0.12em",
          color: "#70FF00",
          textShadow: "0 3px 12px rgba(0,0,0,0.95)",
        }}
      >
        PRINSIP FISIKA TERMOSTAT MAGNETIK
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "#E2E8F0",
          marginTop: 4,
          textShadow: "0 3px 10px rgba(0,0,0,0.95)",
        }}
      >
        Referensi: Efek Curie Feromagnetik (Pierre Curie, 1895)
      </div>
    </div>
  );
};

export const CaraKerjaRiceCooker: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0E14" }}>
      <Audio src={staticFile("audio/rice-cooker/rice_cooker_vo.mp3")} />

      {/* 1. Full-Bleed 3D Cutaway Visual Plates */}
      {SCENES.map((scene, idx) => (
        <ScenePlate key={idx} scene={scene} />
      ))}

      {/* 2. Subtle Edge Vignette for Text Legibility (No Boxes) */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.0) 24%, rgba(0,0,0,0.0) 64%, rgba(0,0,0,0.72) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* 3. Procedural Steam */}
      <SteamParticles />

      {/* 4. Hairline Technical Callouts */}
      <HairlineCallout
        label="PANCI ALUMINIUM"
        x={120}
        y={520}
        anchorX={390}
        anchorY={620}
        startSec={9.6}
        endSec={16.3}
        color="#00F2FE"
        align="left"
      />
      <HairlineCallout
        label="TANPA MIKROCHIP"
        sublabel="Murni Mekanis"
        x={960}
        y={420}
        anchorX={540}
        anchorY={940}
        startSec={12.0}
        endSec={16.5}
        color="#FF5E5E"
        align="right"
      />
      <HairlineCallout
        label="SILINDER MAGNET CURIE"
        sublabel="Menempel di Dasar Panci"
        x={100}
        y={680}
        anchorX={540}
        anchorY={980}
        startSec={17.2}
        endSec={23.6}
        color="#00F2FE"
        align="left"
      />
      <HairlineCallout
        label="TITIK CURIE 103°C"
        sublabel="Daya Magnet Hilang"
        x={100}
        y={640}
        anchorX={540}
        anchorY={960}
        startSec={39.4}
        endSec={46.6}
        color="#FFE600"
        align="left"
      />
      <HairlineCallout
        label="PEGAS SAKELAR WARM"
        sublabel="Memutus Arus Masak"
        x={970}
        y={1180}
        anchorX={560}
        anchorY={1080}
        startSec={43.2}
        endSec={47.0}
        color="#70FF00"
        align="right"
      />

      {/* 5. Hook, Temperature, Source & Kinetic Subtitles */}
      <HookHeadline />
      <TemperatureReadout />
      <ScientificSourceFooter />
      <KineticSubtitle />
    </AbsoluteFill>
  );
};
