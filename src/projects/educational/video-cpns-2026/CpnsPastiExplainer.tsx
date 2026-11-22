import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  BigCheck,
  BigNumberOverlay,
  brightenHouse,
  Calendar,
  CameraRig,
  Clouds,
  CoinsX,
  easeCam,
  Figure,
  Fire,
  Flag,
  Ground,
  Headline2,
  Models,
  normalizeHeight,
  Phone,
  SKY,
  SKY_WARM,
  SubtitleText,
  TreeCluster,
  WatermarkText,
} from "./CpnsShared";

// ================= CpnsPastiExplainer =================
// "Yang Sudah Pasti soal CPNS 2026" — keputusan Menpan 9 Nov 2026.
// TOTAL dikunci ke durasi VO Sami asli via ffprobe (ubah 1 angka).
// 1080x1920, 9 scene. Profil B. Slot 16:00 WIB 2026-11-22.
// Sumber (resmi): menpan.go.id Q&A 9 Nov 2026; keputusan Pemerintah + DPR RI 6 Nov 2026.

const TOTAL = 1641; // retimed to real VO: 54.696s x 30fps (ffprobe 2026-11-22)
const FRAC = [0, 0.1, 0.2, 0.32, 0.44, 0.56, 0.68, 0.78, 0.88, 1.0];
const SCENE_BOUNDS = FRAC.map((f) => Math.round(f * TOTAL));
const SKIES = [SKY, SKY, SKY, SKY, SKY, SKY, SKY, SKY, SKY_WARM];

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "CPNS 2026 beneran ada. Bukan rumor.", highlight: "beneran" },
  { text: "6 November 2026, Pemerintah dan DPR mutusin.", highlight: "mutusin" },
  { text: "Rekrutmen CPNS diadain tahun 2026.", highlight: "2026" },
  { text: "Fokus ke program prioritas Presiden.", highlight: "prioritas" },
  { text: "Polisi Hutan, Manggala Agni, guru, Garuda.", highlight: "manggala" },
  { text: "PPPK Paruh Waktu jadi Penuh Waktu 1 Jan 2027.", highlight: "2027" },
  { text: "PPPK Penuh Waktu boleh ikut CPNS 2027.", highlight: "boleh" },
  { text: "Gratis, berbasis merit. Nggak ada jual kursi.", highlight: "gratis" },
  { text: "Ada yang minta duit? Lapor SP4N-LAPOR.", highlight: "lapor" },
];

const Scene: React.FC<{
  frame: number;
  scene: number;
  local: number;
  models: Models | null;
}> = ({ frame, scene, local, models }) => {
  const sway = Math.sin(frame * 0.02) * 0.02;
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[30, 50, 20]} intensity={1.2} />
      <Ground />
      <Clouds frame={frame} />
      {models?.house && (
        <group position={[0, 0, -12]}>
          <primitive object={models.house} />
        </group>
      )}
      <TreeCluster position={[-11, 0, -7]} seed={3} sway={sway} />
      <TreeCluster position={[11, 0, -9]} seed={7} sway={-sway} />
      {models?.lamp && (
        <group position={[4.5, 0, -5]}>
          <primitive object={models.lamp} />
        </group>
      )}

      {scene === 0 && (
        <>
          <BigCheck position={[0, 2.0, -6]} frame={frame} />
          <Figure group={models?.man} position={[0, 0, -5]} rotY={0} bob={0.05} frame={frame} />
          <Figure group={models?.woman} position={[-2.4, 0, -6]} rotY={0.4} bob={0.03} frame={frame} />
        </>
      )}
      {scene === 1 && (
        <>
          <Calendar position={[0, 2.2, -7]} frame={frame} />
          <Figure group={models?.man} position={[0.4, 0, -5.5]} rotY={0} bob={0.03} frame={frame} />
        </>
      )}
      {scene === 2 && (
        <>
          <Figure group={models?.man} position={[0, 0, -5]} rotY={0} bob={0.04} frame={frame} />
          <Figure group={models?.woman} position={[-2.2, 0, -6]} rotY={0.4} bob={0.03} frame={frame} />
        </>
      )}
      {scene === 3 && (
        <>
          <Flag position={[0, 0, -6]} frame={frame} />
          <Figure group={models?.man} position={[-1.8, 0, -6]} rotY={0.5} bob={0.04} frame={frame} />
          <Figure group={models?.woman} position={[1.8, 0, -6.5]} rotY={-0.5} bob={0.03} frame={frame} />
        </>
      )}
      {scene === 4 && (
        <>
          <TreeCluster position={[-3, 0, -8]} seed={11} sway={sway} />
          <Fire position={[1.5, 0, -6]} frame={frame} />
          <Figure group={models?.woman} position={[-0.5, 0, -5]} rotY={0.2} bob={0.03} frame={frame} />
          <Figure group={models?.man} position={[2.6, 0, -6]} rotY={-0.4} bob={0.04} frame={frame} />
        </>
      )}
      {scene === 5 && (
        <>
          <Calendar position={[0, 2.2, -7]} frame={frame} />
          <Figure group={models?.woman} position={[0.4, 0, -5.5]} rotY={0} bob={0.03} frame={frame} />
        </>
      )}
      {scene === 6 && (
        <>
          <BigCheck position={[0, 2.0, -6]} frame={frame} />
          <Figure group={models?.man} position={[0, 0, -5]} rotY={0} bob={0.05} frame={frame} />
        </>
      )}
      {scene === 7 && (
        <>
          <CoinsX position={[0, 0.6, -5.5]} frame={frame} />
          <Figure group={models?.man} position={[-1.8, 0, -6]} rotY={0.5} bob={0.04} frame={frame} />
          <Figure group={models?.woman} position={[2.0, 0, -6.5]} rotY={-0.5} bob={0.03} frame={frame} />
        </>
      )}
      {scene === 8 && (
        <>
          <Phone position={[0.4, 1.35, -7.8]} frame={frame} />
          <Figure group={models?.woman} position={[-0.9, 0, -9.3]} rotY={0.15} bob={0.02} frame={frame} />
          <Figure group={models?.man} position={[0.9, 0, -8.2]} rotY={-0.15} bob={0.04} frame={frame} />
        </>
      )}
    </>
  );
};

export const CpnsPastiExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const [models, setModels] = useState<Models | null>(null);
  const [handle] = useState(() => delayRender("Loading GLB models cpns-pasti"));

  useEffect(() => {
    let cancelled = false;
    const jobs: [keyof Models, string, number][] = [
      ["house", "models/house/house.glb", 7],
      ["man", "models/person/man.glb", 1.8],
      ["woman", "models/person/woman-casual.glb", 1.75],
      ["lamp", "models/streetlamp/street-light.glb", 2.6],
    ];
    const results: Models = {};
    let done = 0;
    const loader = new GLTFLoader();
    jobs.forEach(([key, url, h]) => {
      loader.load(
        staticFile(url),
        (g: { scene: THREE.Group }) => {
          if (cancelled) return;
          if (key === "house") {
            brightenHouse(g.scene);
          }
          results[key] = normalizeHeight(g.scene, h);
          done += 1;
          if (done === jobs.length) {
            setModels(results);
            setTimeout(() => continueRender(handle), 3000);
          }
        },
        undefined,
        () => {
          if (cancelled) return;
          done += 1;
          if (done === jobs.length) {
            setModels(results);
            setTimeout(() => continueRender(handle), 3000);
          }
        }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  let scene = 0;
  for (let i = 0; i < 9; i++) {
    if (frame >= SCENE_BOUNDS[i] && frame < SCENE_BOUNDS[i + 1]) {
      scene = i;
      break;
    }
  }
  const sceneLen = SCENE_BOUNDS[scene + 1] - SCENE_BOUNDS[scene];
  const local = frame - SCENE_BOUNDS[scene];

  let camPos: [number, number, number];
  let camTarget: [number, number, number];

  if (scene === 0) {
    camPos = easeCam(local, sceneLen, [12, 6, 7], [10, 5, 4]);
    camTarget = [0, 2.2, -7];
  } else if (scene === 1) {
    camPos = easeCam(local, sceneLen, [4, 3.5, 2], [3, 3, 0.5]);
    camTarget = [0, 1.8, -7];
  } else if (scene === 2) {
    camPos = easeCam(local, sceneLen, [4, 3, 2], [3, 2.5, 0]);
    camTarget = [0, 1.5, -5];
  } else if (scene === 3) {
    camPos = easeCam(local, sceneLen, [5, 3.5, 2], [4, 3, 0.5]);
    camTarget = [0, 1.8, -6];
  } else if (scene === 4) {
    camPos = easeCam(local, sceneLen, [6, 3.5, 2], [4.5, 3, 0.5]);
    camTarget = [0, 1.5, -7];
  } else if (scene === 5) {
    camPos = easeCam(local, sceneLen, [4, 3.5, 2], [3, 3, 0.5]);
    camTarget = [0, 1.8, -7];
  } else if (scene === 6) {
    camPos = easeCam(local, sceneLen, [4, 3, 2], [3, 2.5, 0]);
    camTarget = [0, 1.5, -6];
  } else if (scene === 7) {
    camPos = easeCam(local, sceneLen, [4, 3, 2], [3, 2.5, 0]);
    camTarget = [0, 1.2, -5.5];
  } else {
    camPos = easeCam(local, sceneLen, [10, 5.5, 4], [13, 7, 8]);
    camTarget = [1, 2, -8];
  }

  return (
    <AbsoluteFill style={{ backgroundColor: SKIES[scene] }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
      >
        <Scene frame={frame} scene={scene} local={local} models={models} />
        <CameraRig position={camPos} target={camTarget} />
      </ThreeCanvas>
      <Audio src={staticFile("audio/cpns-pasti/vo_sami.mp3")} volume={1} />
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {SCENE_BOUNDS.slice(0, 9).map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {scene === 0 && <Headline2 line1="CPNS 2026 Beneran Ada." line2="Ini Buktinya." />}
      {scene === 2 && <BigNumberOverlay n="2026" label="rekrutmen CPNS diadain" />}
      <SubtitleText text={SUBTITLES[scene].text} highlight={SUBTITLES[scene].highlight} local={local} />
      <WatermarkText />
    </AbsoluteFill>
  );
};
