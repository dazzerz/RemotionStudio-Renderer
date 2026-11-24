import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  EDITORIAL_FONTS,
  MaskedKineticLine,
  useEditorialFonts,
} from "../../motion-graphics/editorial-kit/EditorialPrimitives";

// ================= CvtMaticExplainer =================
// "Motor matic nggak ada gigi." — video 2/6 batch Antigravity.
// Profil B toy-explainer, Sami, 8 scene, 1080x1920.
// PAKET UPGRADE ANTIGRAVITY (sama seperti ban-botak):
//  - Lighting: ambient 0.28 + hemisphere 0.55 + warm sun 1.45 +
//    cool rim 0.45 + fog + sky dome.
//  - Fake AO contact shadow (plane y=0.02, CanvasTexture gradien radial).
//  - CanvasTexture prosedural — tidak ada permukaan warna hex polos.
//  - Font woff2 via EditorialPrimitives + FontFace + delayRender.
//  - GLB lingkungan + 3 layer kedalaman. Hero rider tetap prosedural
//    (tidak ada GLB rider duduk CC0) + lighting baru + fake AO + ink outline.
//  - Cutaway 2.5D variator (S4) + perbandingan manual vs CVT (S5) pakai SVG.
//  - Kamera: breathing sin(frame*0.06)*0.05, orbit bezier,
//    putaran roda = s / wheelRadius.
// Angka bersumber: 2 puli + 1 sabuk karet (Yamaha), roller 5–6 buah
// (Yamaha), sabuk ganti 15.000–25.000 km (panduan produsen).

// ================= Palette (terang, Profil B) =================
const SKY = "#C8DCE8";
const SKY_TOP = "#9CC3E0";
const CREAM = "#F5EFE0";
const GREEN_DARK = "#8FAE8A";
const GREEN_LIGHT = "#B5CBA8";
const ASPHALT = "#55565E";
const ASPHALT_LINE = "#F5F5F5";
const STEEL_DARK = "#6B7280";
const TIRE = "#1F1F1F";
const RIM = "#9AA0A6";
const GLASS = "#2E4A63";
const AMBER = "#FFB300";
const TRUNK = "#8A6B4F";
const LEAF = "#7FAE7A";
const LEAF_DARK = "#6B9E6B";
const RACE_RED = "#D32F2F";
const RACE_WHITE = "#F4F2EC";
const STREET_TEAL = "#2A8A8A";
const JACKET_BLUE = "#3A5A78";
const WATER = "#7FB8D8";
const WATER_DEEP = "#4A90C2";

const SHADOW = "0 4px 14px rgba(0,0,0,0.85)";

// ================= Jalan melengkung (tikungan) =================
const R = 20;

function arcPos(s: number, r: number = R): [number, number] {
  const phi = s / r;
  return [r * Math.sin(phi), r * Math.cos(phi)];
}

function arcYaw(s: number, r: number = R): number {
  return s / r + Math.PI / 2;
}

function worldPoint(
  px: number,
  pz: number,
  yaw: number,
  lx: number,
  ly: number,
  lz: number
): [number, number, number] {
  return [
    px + lx * Math.cos(yaw) + lz * Math.sin(yaw),
    ly,
    pz - lx * Math.sin(yaw) + lz * Math.cos(yaw),
  ];
}

// Deterministik (bukan Math.random): hash dari indeks.
function pseudo(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// LCG deterministik untuk tekstur kanvas (seed tetap).
function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ================= CanvasTexture prosedural (Antigravity #1) =================
// Semua tekstur dibuat sekali via useMemo + di-cache — beban CPU SwiftShader
// hampir nol, tapi permukaan tidak lagi polos.
function makeAsphaltTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#55565E";
  g.fillRect(0, 0, 256, 256);
  const rnd = seededRand(1337);
  for (let i = 0; i < 5200; i++) {
    const v = 60 + Math.floor(rnd() * 50);
    g.fillStyle = `rgba(${v},${v + 2},${v + 8},${0.25 + rnd() * 0.45})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  // Retak halus + noda gelap.
  g.strokeStyle = "rgba(30,30,36,0.5)";
  g.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    let x = rnd() * 256;
    let y = rnd() * 256;
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (rnd() - 0.5) * 40;
      y += (rnd() - 0.5) * 40;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeConcreteTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#C9C4B8";
  g.fillRect(0, 0, 256, 256);
  const rnd = seededRand(777);
  for (let i = 0; i < 2600; i++) {
    const v = 170 + Math.floor(rnd() * 45);
    g.fillStyle = `rgba(${v},${v - 4},${v - 14},${0.2 + rnd() * 0.4})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  // TANPA garis sambungan: garis di tengah tekstur jadi salib raksasa
  // kalau tekstur direntang ke lantai r=30 (terbukti di still S1).
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGrassTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#A8C3A0";
  g.fillRect(0, 0, 256, 256);
  const rnd = seededRand(4242);
  for (let i = 0; i < 3200; i++) {
    const gg = 140 + Math.floor(rnd() * 60);
    g.fillStyle = `rgba(${90 + rnd() * 40},${gg},${80 + rnd() * 30},${0.25 + rnd() * 0.4})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 3, 2 + rnd() * 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Gradien gelap radial untuk fake AO contact shadow.
function makeRadialShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(0.6, "rgba(0,0,0,0.28)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Gradien langit vertikal untuk sky dome.
function makeSkyTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(0.55, SKY);
  grad.addColorStop(0.8, "#EFE7D3");
  grad.addColorStop(1, CREAM);
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ================= Fake AO contact shadow (Antigravity #2) =================
// Plane tipis y=0.02 dengan gradien radial — motor/ban/pohon langsung
// terasa menapak tanah, tanpa real-time shadow map.
const FakeAO: React.FC<{
  position: [number, number, number];
  scale?: [number, number, number];
  opacity?: number;
}> = ({ position, scale = [1, 1, 1], opacity = 1 }) => {
  const tex = useMemo(() => makeRadialShadowTexture(), []);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
};

// ================= Ink outline (Antigravity #3) =================
// Kotak dengan garis tepi gelap tegas (EdgesGeometry) — bentuk mekanis
// terbaca tajam, bukan balok polos.
const InkBox: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}> = ({
  position,
  size,
  color,
  rotation = [0, 0, 0],
  roughness = 0.85,
  emissive,
  emissiveIntensity = 0,
  transparent = false,
  opacity = 1,
}) => {
  const { boxGeo, edgesGeo } = useMemo(() => {
    const boxGeo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo, 25);
    return { boxGeo, edgesGeo };
  }, [size]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={boxGeo}>
        <meshStandardMaterial
          color={color}
          roughness={roughness}
          emissive={emissive ?? "#000000"}
          emissiveIntensity={emissive ? emissiveIntensity : 0}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color="#1F1F1F" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
};

// ================= Camera rig + micro-handheld breathing =================
const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
  frame: number;
}> = ({ position, target, frame }) => {
  const camera = useThree((state) => state.camera);
  // Breathing deterministik (Antigravity #5): sin(frame*0.06)*0.05.
  const bx = Math.sin(frame * 0.06) * 0.05;
  const by = Math.sin(frame * 0.06 + 1.3) * 0.05;
  camera.position.set(position[0] + bx, position[1] + by, position[2]);
  camera.lookAt(target[0], target[1], target[2]);
  return null;
};

// ================= Lighting rig baru (Antigravity #2) =================
// ambient 0.28 (BUKAN 0.85) + hemisphere + warm sun 1.45 + cool rim 0.45
// + fog + sky dome. Dipakai di SEMUA scene 3D.
const LightingRig: React.FC = () => {
  const skyTex = useMemo(() => makeSkyTexture(), []);
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 40, 150]} />
      {/* sky dome gradien (fog dimatikan supaya tidak ketutup kabut) */}
      <mesh scale={[1, 1, 1]}>
        <sphereGeometry args={[170, 24, 16]} />
        <meshBasicMaterial map={skyTex} side={THREE.BackSide} fog={false} />
      </mesh>
      <ambientLight intensity={0.28} />
      <hemisphereLight args={["#DCEEFF", "#5A4E41", 0.55]} />
      <directionalLight position={[30, 50, 20]} intensity={1.45} />
      <directionalLight
        position={[-25, 18, -30]}
        intensity={0.45}
        color="#BFD4FF"
      />
    </>
  );
};

// ================= Beam: silinder di antara dua titik =================
const Beam: React.FC<{
  a: [number, number, number];
  b: [number, number, number];
  r?: number;
  color: string;
  emissive?: string;
}> = ({ a, b, r = 0.05, color, emissive }) => {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(a[0], a[1], a[2]);
    const vb = new THREE.Vector3(b[0], b[1], b[2]);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    const pos = va.clone().add(vb).multiplyScalar(0.5);
    return { pos, quat, len };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshStandardMaterial
        color={color}
        roughness={0.5}
        metalness={0.4}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 1.6 : 0}
      />
    </mesh>
  );
};

// ================= Roda motor (berputar mengikuti jarak: spin = s / R) =================
const WHEEL_R = 0.35;

const Wheel: React.FC<{ spin: number; width?: number }> = ({ spin, width = 0.16 }) => (
  <group rotation={[spin, 0, 0]}>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[WHEEL_R, WHEEL_R, width, 24]} />
      <meshStandardMaterial color={TIRE} roughness={0.95} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.22, 0.22, width + 0.02, 20]} />
      <meshStandardMaterial color={RIM} roughness={0.35} metalness={0.55} />
    </mesh>
    {[0, 1, 2, 3, 4].map((k) => {
      const a = (k / 5) * Math.PI * 2;
      return (
        <mesh
          key={k}
          position={[0, Math.sin(a) * 0.11, Math.cos(a) * 0.11]}
          rotation={[a, 0, 0]}
        >
          <boxGeometry args={[width + 0.04, 0.2, 0.05]} />
          <meshStandardMaterial color="#6B7280" roughness={0.5} metalness={0.4} />
        </mesh>
      );
    })}
    {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
      const a = (k / 8) * Math.PI * 2;
      return (
        <mesh
          key={k}
          position={[0, Math.sin(a) * WHEEL_R, Math.cos(a) * WHEEL_R]}
          rotation={[a, 0, 0]}
        >
          <boxGeometry args={[width + 0.02, 0.06, 0.1]} />
          <meshStandardMaterial color="#2E2E2E" roughness={1} />
        </mesh>
      );
    })}
  </group>
);

// ================= Pengendara (toy, tanpa wajah) =================
const Rider: React.FC<{
  lean: number;
  variant: "race" | "street";
}> = ({ lean, variant }) => {
  const suit = variant === "race" ? RACE_RED : JACKET_BLUE;
  const helmet = variant === "race" ? RACE_WHITE : "#2B2B2B";
  const sinLean = Math.sin(lean);
  const hangX = sinLean * 0.14;
  const extraLean = lean * 0.18;
  const kneeIn: [number, number, number] = [
    0.3 + sinLean * 0.3,
    -0.55 - sinLean * 0.28,
    0.35,
  ];
  const kneeOut: [number, number, number] = [-0.32, -0.18, 0.28];
  return (
    <group position={[hangX, 0.92, -0.32]} rotation={[0, 0, -extraLean]}>
      <mesh position={[0, 0.42, 0.02]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.42, 0.62, 0.3]} />
        <meshStandardMaterial color={suit} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.82, 0.22]}>
        <sphereGeometry args={[0.21, 18, 14]} />
        <meshStandardMaterial color={helmet} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.8, 0.4]}>
        <boxGeometry args={[0.26, 0.1, 0.1]} />
        <meshStandardMaterial color={GLASS} roughness={0.25} />
      </mesh>
      <Beam a={[0.24, 0.55, 0.05]} b={[0.35, 0.23, 0.87]} r={0.07} color={suit} />
      <Beam a={[-0.24, 0.55, 0.05]} b={[-0.35, 0.23, 0.87]} r={0.07} color={suit} />
      <mesh position={[0.35, 0.23, 0.87]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#2B2B2B" roughness={0.9} />
      </mesh>
      <mesh position={[-0.35, 0.23, 0.87]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#2B2B2B" roughness={0.9} />
      </mesh>
      <Beam a={[0.2, 0.02, -0.05]} b={kneeIn} r={0.09} color="#2B2B2B" />
      <Beam a={[-0.2, 0.02, -0.05]} b={kneeOut} r={0.09} color="#2B2B2B" />
      <Beam a={kneeIn} b={[0.28, -0.47, 0.22]} r={0.07} color="#2B2B2B" />
      <Beam a={kneeOut} b={[-0.28, -0.47, 0.22]} r={0.07} color="#2B2B2B" />
      <mesh position={[0.28, -0.47, 0.22]}>
        <boxGeometry args={[0.12, 0.09, 0.26]} />
        <meshStandardMaterial color="#1F1F1F" roughness={0.9} />
      </mesh>
      <mesh position={[-0.28, -0.47, 0.22]}>
        <boxGeometry args={[0.12, 0.09, 0.26]} />
        <meshStandardMaterial color="#1F1F1F" roughness={0.9} />
      </mesh>
    </group>
  );
};

// ================= Motor (hero prosedural + ink outline tegas) =================
const Motor: React.FC<{
  variant: "race" | "street";
  spin: number;
  lean: number;
  steer: number;
  frame: number;
  position: [number, number, number];
  yaw: number;
}> = ({ variant, spin, lean, steer, frame, position, yaw }) => {
  const body = variant === "race" ? RACE_RED : STREET_TEAL;
  const vibe = Math.sin(frame * 0.9) * 0.008;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group position={[0, vibe, 0]}>
        <group rotation={[0, 0, -lean]}>
          <mesh position={[0, 0.55, 0.1]}>
            <boxGeometry args={[0.4, 0.35, 0.55]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.7} />
          </mesh>
          {/* tangki + strip amber — pakai InkBox supaya tepi terbaca tajam */}
          <InkBox position={[0, 0.95, 0.15]} size={[0.55, 0.35, 0.7]} color={body} roughness={0.55} />
          <mesh position={[0, 0.95, 0.15]}>
            <boxGeometry args={[0.57, 0.1, 0.72]} />
            <meshStandardMaterial color={AMBER} roughness={0.55} />
          </mesh>
          <InkBox position={[0, 0.86, -0.45]} size={[0.42, 0.14, 0.55]} color="#2B2B2B" roughness={0.95} />
          <InkBox position={[0, 0.98, -0.82]} size={[0.4, 0.12, 0.4]} color={body} roughness={0.55} rotation={[0.25, 0, 0]} />
          <mesh position={[0, 0.95, -1.0]}>
            <boxGeometry args={[0.25, 0.08, 0.06]} />
            <meshStandardMaterial color="#FF2222" emissive="#FF2222" emissiveIntensity={1.2} />
          </mesh>
          <mesh position={[0.3, 0.45, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 0.95, 12]} />
            <meshStandardMaterial color="#C8CCD2" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[0.28, 0.45, -0.1]}>
            <boxGeometry args={[0.12, 0.05, 0.2]} />
            <meshStandardMaterial color="#2B2B2B" roughness={0.8} />
          </mesh>
          <mesh position={[-0.28, 0.45, -0.1]}>
            <boxGeometry args={[0.12, 0.05, 0.2]} />
            <meshStandardMaterial color="#2B2B2B" roughness={0.8} />
          </mesh>
          <group position={[0, WHEEL_R, -0.85]}>
            <Wheel spin={spin} width={0.2} />
          </group>
          {/* fake AO contact shadow — motor menapak tanah (Antigravity #2) */}
          <FakeAO position={[0, 0.02, 0]} scale={[1, 1.9, 1]} opacity={0.9} />
          <group position={[0, 1.0, 0.7]} rotation={[0, steer, 0]}>
            <Beam a={[-0.14, 0, 0]} b={[-0.14, -0.65, 0.15]} r={0.05} color={STEEL_DARK} />
            <Beam a={[0.14, 0, 0]} b={[0.14, -0.65, 0.15]} r={0.05} color={STEEL_DARK} />
            <group position={[0, -0.65, 0.15]}>
              <Wheel spin={spin} width={0.16} />
            </group>
            <mesh position={[0, 0.15, -0.15]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.75, 10]} />
              <meshStandardMaterial color="#2B2B2B" roughness={0.6} />
            </mesh>
            <mesh position={[0.36, 0.15, -0.15]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.06, 0.14, 10]} />
              <meshStandardMaterial color="#1F1F1F" roughness={0.9} />
            </mesh>
            <mesh position={[-0.36, 0.15, -0.15]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.06, 0.14, 10]} />
              <meshStandardMaterial color="#1F1F1F" roughness={0.9} />
            </mesh>
            <Beam a={[0.3, 0.15, -0.15]} b={[0.42, 0.38, -0.18]} r={0.02} color="#2B2B2B" />
            <Beam a={[-0.3, 0.15, -0.15]} b={[-0.42, 0.38, -0.18]} r={0.02} color="#2B2B2B" />
            <mesh position={[0.42, 0.4, -0.18]}>
              <boxGeometry args={[0.12, 0.09, 0.03]} />
              <meshStandardMaterial color="#2B2B2B" roughness={0.6} />
            </mesh>
            <mesh position={[-0.42, 0.4, -0.18]}>
              <boxGeometry args={[0.12, 0.09, 0.03]} />
              <meshStandardMaterial color="#2B2B2B" roughness={0.6} />
            </mesh>
            {variant === "race" ? (
              <>
                <InkBox position={[0, -0.05, 0.28]} size={[0.6, 0.7, 0.5]} color={body} roughness={0.55} />
                <mesh position={[0, 0.28, 0.45]} rotation={[-0.5, 0, 0]}>
                  <boxGeometry args={[0.45, 0.3, 0.04]} />
                  <meshStandardMaterial color={GLASS} roughness={0.2} transparent opacity={0.85} />
                </mesh>
                <mesh position={[0, -0.05, 0.54]}>
                  <boxGeometry args={[0.4, 0.14, 0.06]} />
                  <meshStandardMaterial color="#FFF8DC" emissive="#FFF8DC" emissiveIntensity={1.4} />
                </mesh>
              </>
            ) : (
              <mesh position={[0, -0.02, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.14, 0.14, 0.1, 14]} />
                <meshStandardMaterial color="#FFF8DC" emissive="#FFF8DC" emissiveIntensity={1.4} />
              </mesh>
            )}
          </group>
          <Rider lean={lean} variant={variant} />
        </group>
      </group>
    </group>
  );
};

// ================= Lingkungan =================
const HILLS: { pos: [number, number, number]; r: number; color: string }[] = [
  { pos: [-90, 0, -60], r: 40, color: GREEN_DARK },
  { pos: [90, 0, -50], r: 45, color: GREEN_DARK },
  { pos: [-80, 0, 70], r: 38, color: GREEN_LIGHT },
  { pos: [85, 0, 75], r: 42, color: GREEN_LIGHT },
];

const CLOUDS: { pos: [number, number, number]; scale: number; phase: number }[] = [
  { pos: [-25, 38, -40], scale: 1, phase: 0 },
  { pos: [30, 42, -20], scale: 1.2, phase: 1.7 },
  { pos: [5, 36, 30], scale: 0.85, phase: 3.1 },
  { pos: [-10, 40, -70], scale: 1, phase: 4.4 },
  { pos: [35, 39, 25], scale: 0.9, phase: 5.6 },
];

const Cloud: React.FC<{
  position: [number, number, number];
  scale: number;
  drift: number;
}> = ({ position, scale, drift }) => (
  <group position={[position[0] + drift, position[1], position[2]]} scale={[scale, scale, scale]}>
    <mesh position={[0, 0, 0]} scale={[1, 0.35, 1]}>
      <sphereGeometry args={[6, 20, 16]} />
      <meshStandardMaterial color={CREAM} roughness={1} />
    </mesh>
    <mesh position={[5, 0.5, 0]} scale={[1, 0.35, 1]}>
      <sphereGeometry args={[4.5, 20, 16]} />
      <meshStandardMaterial color={CREAM} roughness={1} />
    </mesh>
    <mesh position={[-5, 0.5, 0]} scale={[1, 0.35, 1]}>
      <sphereGeometry args={[4, 20, 16]} />
      <meshStandardMaterial color={CREAM} roughness={1} />
    </mesh>
  </group>
);

const Tree: React.FC<{
  position: [number, number, number];
  scale: number;
  sway: number;
}> = ({ position, scale, sway }) => (
  <group position={position} scale={[scale, scale, scale]} rotation={[0, 0, sway]}>
    <mesh position={[0, 0.7, 0]}>
      <cylinderGeometry args={[0.18, 0.24, 1.4, 10]} />
      <meshStandardMaterial color={TRUNK} roughness={1} />
    </mesh>
    <mesh position={[0, 2.2, 0]}>
      <sphereGeometry args={[1.3, 18, 14]} />
      <meshStandardMaterial color={LEAF} roughness={1} />
    </mesh>
    <mesh position={[0, 3.2, 0]}>
      <coneGeometry args={[0.9, 1.6, 12]} />
      <meshStandardMaterial color={LEAF_DARK} roughness={1} />
    </mesh>
    <FakeAO position={[0, 0.02, 0]} scale={[1.6, 1.6, 1]} opacity={0.7} />
  </group>
);

const Building: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}> = ({ position, size, color }) => {
  const [w, h, d] = size;
  const rows = Math.max(1, Math.floor(h / 3.2));
  const cols = Math.max(1, Math.floor(d / 2.4));
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[w + 0.4, 0.3, d + 0.4]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={1} />
      </mesh>
      {[1, -1].map((sx) =>
        Array.from({ length: rows }).flatMap((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <mesh
              key={`${sx}-${r}-${c}`}
              position={[sx * (w / 2 + 0.03), 2.2 + r * 3.2, -d / 2 + 1.4 + c * 2.4]}
            >
              <boxGeometry args={[0.06, 1.4, 1.2]} />
              <meshStandardMaterial color={GLASS} roughness={0.3} />
            </mesh>
          ))
        )
      )}
    </group>
  );
};

// ================= GLB lingkungan (pola cinta — fix invisible) =================
interface GlbModels {
  lamp?: THREE.Group;
  house?: THREE.Group;
  car?: THREE.Group;
  person?: THREE.Group;
}

const normalizeHeight = (scene: THREE.Group, targetH: number): THREE.Group => {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const scale = targetH / Math.max(size.y, 0.001);
  scene.traverse((o: THREE.Object3D) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.frustumCulled = false;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat: THREE.Material) => {
        const std = mat as THREE.MeshStandardMaterial;
        std.side = THREE.DoubleSide;
        std.metalness = 0;
      });
    }
  });
  const outer = new THREE.Group();
  scene.position.set(-center.x, -box.min.y, -center.z);
  outer.add(scene);
  outer.scale.setScalar(scale);
  return outer;
};

const brightenHouse = (scene: THREE.Group): void => {
  const REMAP: Record<string, string> = {
    Grey: "#A9B2BC",
    DarkGrey: "#4A525E",
    White: "#F2EFE8",
    Brown: "#9A7B52",
  };
  scene.traverse((o: THREE.Object3D) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mat: THREE.Material) => {
      const std = mat as THREE.MeshStandardMaterial;
      const bright = REMAP[std.name];
      if (bright) {
        std.color.set(bright);
      }
      std.roughness = 0.85;
    });
  });
};

// ================= Ban hero (studio) =================
// ================= Variator CVT: dua puli + sabuk (3D studio) =================
// Puli primer (sisi mesin) kiri, puli sekunder (sisi roda) kanan.
// ratio 0 = gigi rendah (primer kecil, sekunder besar); 1 = gigi tinggi.
const PULLEY_X = 1.6;
const PULLEY_Y = 1.4;

const PulleyWheel: React.FC<{
  rBelt: number; // jari-jari efektif tempat sabuk berjalan
  rRoll: number; // jari-jari lingkaran roller (0 = tanpa roller)
  spin: number;
  color: string;
  position: [number, number, number];
}> = ({ rBelt, rRoll, spin, color, position }) => {
  void rBelt;
  const spokes = [0, 1, 2].map((k) => (k / 3) * Math.PI * 2 + spin);
  const rollers = [0, 1, 2, 3, 4, 5].map((k) => (k / 6) * Math.PI * 2 + spin);
  return (
    <group position={position}>
      {/* cakram belakang */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.3]}>
        <cylinderGeometry args={[1.18, 1.18, 0.1, 28]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.45} />
      </mesh>
      {/* kerucut depan (alur V) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.05]}>
        <cylinderGeometry args={[0.34, 1.15, 0.36, 28]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.35} />
      </mesh>
      {/* hub */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.2, 0.2, 0.16, 16]} />
        <meshStandardMaterial color="#3A3F46" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* ring tepi gelap (ink edge) */}
      <mesh position={[0, 0, 0.24]}>
        <torusGeometry args={[1.15, 0.025, 8, 40]} />
        <meshBasicMaterial color="#1F1F1F" />
      </mesh>
      {/* jari-jari (supaya putaran terbaca) */}
      {spokes.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.26]} rotation={[0, 0, a - Math.PI / 2]}>
          <boxGeometry args={[0.09, 0.95, 0.06]} />
          <meshStandardMaterial color="#5A6270" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      {/* roller (hanya di primer): 6 bola amber, radius ikut ratio */}
      {rRoll > 0 &&
        rollers.map((a, i) => (
          <mesh key={`r-${i}`} position={[Math.cos(a) * rRoll, Math.sin(a) * rRoll, 0.34]}>
            <sphereGeometry args={[0.13, 14, 12]} />
            <meshStandardMaterial color={AMBER} roughness={0.4} metalness={0.2} emissive="#7A4A00" emissiveIntensity={0.5} />
          </mesh>
        ))}
    </group>
  );
};

// Sabuk: dua run lurus + dua busur (toy — toleransi bentuk).
// Sabuk duduk DI DEPAN kerucut puli (z=+0.35) supaya loop-nya terbaca penuh;
// kalau di z=0 sabuk tenggelam di dalam siluet kerucut dan terbaca seperti
// sebatang balok melintang.
const CvtBelt: React.FC<{ rP: number; rS: number }> = ({ rP, rS }) => {
  const rAvg = (rP + rS) / 2;
  return (
    <group position={[0, 0, 0.35]}>
      <mesh position={[0, PULLEY_Y + rAvg, 0]}>
        <boxGeometry args={[PULLEY_X * 2 + 0.3, 0.2, 0.34]} />
        <meshStandardMaterial color="#262626" roughness={0.95} />
      </mesh>
      <mesh position={[0, PULLEY_Y - rAvg, 0]}>
        <boxGeometry args={[PULLEY_X * 2 + 0.3, 0.2, 0.34]} />
        <meshStandardMaterial color="#262626" roughness={0.95} />
      </mesh>
      <mesh position={[-PULLEY_X, PULLEY_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[rP, 0.1, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#262626" roughness={0.95} />
      </mesh>
      <mesh position={[PULLEY_X, PULLEY_Y, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <torusGeometry args={[rS, 0.1, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#262626" roughness={0.95} />
      </mesh>
    </group>
  );
};

const VariatorPair: React.FC<{
  ratio: number;
  spin: number;
  position?: [number, number, number];
}> = ({ ratio, spin, position = [0, 0, 0] }) => {
  const rP = 0.55 + ratio * 0.5;
  const rS = 1.05 - ratio * 0.5;
  const rRoll = 0.3 + ratio * 0.45;
  return (
    <group position={position}>
      {/* panel belakang rumah CVT — dipersempit (ronde 2) supaya lingkungan
          (rumput/bukit/lampu GLB) terlihat di kiri-kanan, bukan ketutup penuh */}
      <InkBox position={[0, 1.4, -0.62]} size={[6.4, 3.4, 0.3]} color="#B9B2A4" />
      <PulleyWheel rBelt={rP} rRoll={rRoll} spin={spin} color={STREET_TEAL} position={[-PULLEY_X, PULLEY_Y, 0]} />
      <PulleyWheel rBelt={rS} rRoll={0} spin={-spin} color="#7A6A8A" position={[PULLEY_X, PULLEY_Y, 0]} />
      <CvtBelt rP={rP} rS={rS} />
    </group>
  );
};

// Sabuk aus close-up (S7): loop sabuk TERBARING DATAR di atas pedestal
// (seperti karet gelang di meja) — busur tegak raksasa terbaca seperti
// pelengkung hitam, bukan sabuk (audit ronde 1). Sabuk lebih terang (#333)
// supaya retakan gelap terbaca; ada serat sobek terang di tepi.
const BeltCloseup: React.FC = () => {
  const cracks = [0.5, 1.4, 2.3, 3.4, 4.4];
  return (
    <group>
      <InkBox position={[0, 0.25, 0]} size={[2.8, 0.5, 1.8]} color="#C9C4B8" />
      <group position={[0, 0.62, 0]} rotation={[-Math.PI / 2 + 0.18, 0, 0.12]}>
        <mesh>
          <torusGeometry args={[0.72, 0.13, 10, 32, 5.4]} />
          <meshStandardMaterial color="#3A3A3A" roughness={1} />
        </mesh>
        {/* retakan di permukaan atas loop — posisi dalam bidang lokal torus
            (X=cos, Y=sin, Z=offset permukaan); rotasi z=a = arah tangensial.
            (Ronde 2: posisi lama pakai Y=0.14/Z=sin sehingga retakan
            melayang di udara.) */}
        {cracks.map((a, i) => (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.14]}
            rotation={[0, 0, a]}
          >
            <boxGeometry args={[0.03, 0.3, 0.02]} />
            <meshBasicMaterial color="#0D0D0D" />
          </mesh>
        ))}
        {/* serat sobek terang di tepi luar — sumbu panjang radial */}
        {[1.1, 2.9, 4.9].map((a, i) => (
          <mesh
            key={`f-${i}`}
            position={[Math.cos(a) * 0.86, Math.sin(a) * 0.86, 0.1]}
            rotation={[0, 0, a - Math.PI / 2]}
          >
            <boxGeometry args={[0.02, 0.16, 0.02]} />
            <meshBasicMaterial color="#8A8A8A" />
          </mesh>
        ))}
      </group>
      <FakeAO position={[0, 0.02, 0]} scale={[1.6, 1.2, 1]} opacity={0.9} />
    </group>
  );
};

const CvtStudio: React.FC<{
  scene: number;
  local: number;
  frame: number;
  sceneLen: number;
  models: GlbModels | null;
}> = ({ scene, local, frame, sceneLen, models }) => {
  const spin = frame * 0.02;
  const tex = useTextures();
  // S3: ratio merangkak 0 -> 0.3 (belt naik sedikit — "diameter berubah").
  const ratioS3 = interpolate(local, [0, sceneLen - 1], [0, 0.3], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lampClones = useMemo(() => {
    if (!models?.lamp) return [];
    return [models.lamp.clone(), models.lamp.clone()];
  }, [models]);
  const houseClone = useMemo(() => (models?.house ? models.house.clone() : null), [models]);
  const carClone = useMemo(() => (models?.car ? models.car.clone() : null), [models]);
  return (
    <>
      <LightingRig />
      {/* lantai beton bertekstur */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[30, 40]} />
        <meshStandardMaterial map={tex.concrete} roughness={1} />
      </mesh>
      {/* rumput jauh bertekstur */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -20]}>
        <planeGeometry args={[120, 40]} />
        <meshStandardMaterial map={tex.grass} roughness={1} />
      </mesh>
      {HILLS.map((h, i) => (
        <mesh key={i} position={h.pos} scale={[1, 0.18, 1]}>
          <sphereGeometry args={[h.r, 24, 18]} />
          <meshStandardMaterial color={h.color} roughness={1} />
        </mesh>
      ))}
      {CLOUDS.map((c, i) => (
        <Cloud key={i} position={c.pos} scale={c.scale} drift={Math.sin(frame * 0.004 + c.phase) * 6} />
      ))}
      {/* GLB lingkungan studio: lampu (midground) + rumah & mobil (background) */}
      {lampClones[0] && <primitive object={lampClones[0]} position={[-4.3, 0, -3]} />}
      {lampClones[1] && <primitive object={lampClones[1]} position={[4.3, 0, -3]} />}
      {houseClone && <primitive object={houseClone} position={[13, 0, -16]} />}
      {carClone && <primitive object={carClone} position={[-13, 0, -14]} rotation={[0, 0.6, 0]} />}
      {scene === 6 ? (
        <BeltCloseup />
      ) : scene === 2 ? (
        <>
          <VariatorPair ratio={ratioS3} spin={spin} />
          <FakeAO position={[0, 0.02, 0]} scale={[2.8, 1.3, 1]} opacity={0.8} />
        </>
      ) : (
        <>
          <VariatorPair ratio={0.5} spin={spin} />
          <FakeAO position={[0, 0.02, 0]} scale={[2.8, 1.3, 1]} opacity={0.8} />
        </>
      )}
    </>
  );
};

// ================= Tekstur skid mark (jejak rem) =================
function makeSkidTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, 128, 256);
  const rnd = seededRand(99);
  for (let i = 0; i < 2; i++) {
    const x = 34 + i * 60;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "rgba(20,20,22,0.75)");
    grad.addColorStop(0.7, "rgba(20,20,22,0.45)");
    grad.addColorStop(1, "rgba(20,20,22,0)");
    g.fillStyle = grad;
    g.fillRect(x - 9, 0, 18, 256);
  }
  for (let i = 0; i < 300; i++) {
    g.fillStyle = `rgba(20,20,22,${0.1 + rnd() * 0.3})`;
    g.fillRect(20 + rnd() * 88, rnd() * 256, 2, 2 + rnd() * 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const useTextures = () => {
  return useMemo(
    () => ({
      asphalt: makeAsphaltTexture(),
      concrete: makeConcreteTexture(),
      grass: makeGrassTexture(),
      skid: makeSkidTexture(),
    }),
    []
  );
};

// ================= Scene jalan (3D) =================
const Scene: React.FC<{
  s: number;
  lean: number;
  steer: number;
  variant: "race" | "street";
  scene: number;
  local: number;
  frame: number;
  speedPerFrame: number;
  models: GlbModels | null;
}> = ({ s, lean, steer, variant, scene, local, frame, speedPerFrame, models }) => {
  const spin = s / WHEEL_R;
  const [mx, mz] = arcPos(s);
  const yaw = arcYaw(s);
  const tex = useTextures();

  const roadSegs = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number; s: number }[] = [];
    for (let ss = -6; ss <= 54; ss += 1.2) {
      const [x, z] = arcPos(ss);
      out.push({ pos: [x, 0.03, z], yaw: arcYaw(ss), s: ss });
    }
    return out;
  }, []);
  const dashes = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number }[] = [];
    for (let ss = -6; ss <= 54; ss += 2.4) {
      const [x, z] = arcPos(ss);
      out.push({ pos: [x, 0.07, z], yaw: arcYaw(ss) });
    }
    return out;
  }, []);
  const trees = useMemo(() => {
    const out: { pos: [number, number, number]; scale: number; phase: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const ss = -4 + i * 3.6 + pseudo(i) * 1.5;
      const side = i % 2 === 0 ? 1 : -1;
      const rad = R + side * (11 + pseudo(i + 50) * 9);
      const [x, z] = arcPos(ss, rad);
      out.push({ pos: [x, 0, z], scale: 0.6 + pseudo(i + 40) * 0.5, phase: pseudo(i + 90) * 6.28 });
    }
    return out;
  }, []);
  const buildings = useMemo(() => {
    const defs: { s: number; rad: number; size: [number, number, number]; color: string }[] = [
      { s: 32, rad: 40, size: [10, 12, 10], color: "#D8CFC0" },
      { s: 38, rad: 41, size: [12, 9, 10], color: "#C8D8C0" },
      { s: 44, rad: 39, size: [10, 15, 12], color: "#D0C8D8" },
    ];
    return defs.map((d) => {
      const [x, z] = arcPos(d.s, d.rad);
      return { pos: [x, 0, z] as [number, number, number], size: d.size, color: d.color };
    });
  }, []);
  // Hujan S8 (jalan): 48 strip terbaca.
  const rain = useMemo(() => {
    if (scene !== 999) return [];
    const out: { pos: [number, number, number] }[] = [];
    for (let i = 0; i < 48; i++) {
      const x = (pseudo(i) - 0.5) * 6;
      const z = (pseudo(i + 100) - 0.5) * 5;
      const y = 8 - ((frame * 0.35 + i * 0.53) % 8);
      out.push({ pos: [x, y, z] });
    }
    return out;
  }, [scene, frame]);
  // Jejak rem (skid mark) S4: 3 bidang gelap di belakang motor.
  const skidMarks = useMemo(() => {
    if (scene !== 3) return [];
    return [1.5, 3, 4.5].map((back) => {
      const [x, z] = arcPos(Math.max(-6, s - back));
      return { pos: [x, 0.06, z] as [number, number, number], yaw: arcYaw(Math.max(-6, s - back)) };
    });
  }, [scene, s]);
  // GLB jalan: lampu di tepi jalan + rumah/mobil/orang (background).
  const lampClones = useMemo(() => {
    if (!models?.lamp) return [];
    return [models.lamp.clone(), models.lamp.clone()];
  }, [models]);
  const houseClone = useMemo(() => (models?.house ? models.house.clone() : null), [models]);
  const carClone = useMemo(() => (models?.car ? models.car.clone() : null), [models]);
  const personClone = useMemo(() => (models?.person ? models.person.clone() : null), [models]);
  const lampPos = useMemo(() => {
    const [x1, z1] = arcPos(10, R + 7);
    const [x2, z2] = arcPos(26, R + 8);
    return [
      { pos: [x1, 0, z1] as [number, number, number] },
      { pos: [x2, 0, z2] as [number, number, number] },
    ];
  }, []);
  const housePos = useMemo(() => {
    const [x, z] = arcPos(44, 42);
    return [x, 0, z] as [number, number, number];
  }, []);
  const carPos = useMemo(() => {
    const [x, z] = arcPos(47, 40);
    return [x, 0, z] as [number, number, number];
  }, []);
  const personPos = useMemo(() => {
    const [x, z] = arcPos(18, R + 12);
    return [x, 0, z] as [number, number, number];
  }, []);

  return (
    <>
      <LightingRig />
      {/* tanah hijau bertekstur */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7, 0, 3]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial map={tex.grass} roughness={1} />
      </mesh>
      {HILLS.map((h, i) => (
        <mesh key={i} position={h.pos} scale={[1, 0.18, 1]}>
          <sphereGeometry args={[h.r, 24, 18]} />
          <meshStandardMaterial color={h.color} roughness={1} />
        </mesh>
      ))}
      {CLOUDS.map((c, i) => (
        <Cloud key={i} position={c.pos} scale={c.scale} drift={Math.sin(frame * 0.004 + c.phase) * 6} />
      ))}
      {/* jalan melengkung: segmen aspal bertekstur */}
      {roadSegs.map((seg, i) => (
        <mesh key={i} position={seg.pos} rotation={[0, seg.yaw, 0]}>
          <boxGeometry args={[6.4, 0.06, 1.35]} />
          <meshStandardMaterial map={tex.asphalt} roughness={1} />
        </mesh>
      ))}
      {dashes.map((d, i) => (
        <mesh key={i} position={d.pos} rotation={[0, d.yaw, 0]}>
          <boxGeometry args={[0.18, 0.02, 1.2]} />
          <meshStandardMaterial color={ASPHALT_LINE} roughness={1} />
        </mesh>
      ))}
      {roadSegs.map((seg, i) => (
        <group key={`sh-${i}`} position={seg.pos} rotation={[0, seg.yaw, 0]}>
          <mesh position={[3.45, 0.01, 0]}>
            <boxGeometry args={[0.5, 0.04, 1.35]} />
            <meshStandardMaterial map={tex.concrete} roughness={1} />
          </mesh>
          <mesh position={[-3.45, 0.01, 0]}>
            <boxGeometry args={[0.5, 0.04, 1.35]} />
            <meshStandardMaterial map={tex.concrete} roughness={1} />
          </mesh>
        </group>
      ))}
      {/* jejak rem S4 */}
      {skidMarks.map((sk, i) => (
        <mesh key={`sk-${i}`} position={sk.pos} rotation={[-Math.PI / 2, 0, sk.yaw]}>
          <planeGeometry args={[1.1, 2.2]} />
          <meshBasicMaterial map={tex.skid} transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}
      {trees.map((t, i) => (
        <Tree key={i} position={t.pos} scale={t.scale} sway={Math.sin(frame * 0.02 + t.phase) * 0.02} />
      ))}
      {buildings.map((b, i) => (
        <Building key={i} position={b.pos} size={b.size} color={b.color} />
      ))}
      {/* GLB: lampu tepi jalan (midground), rumah + mobil + orang (background) */}
      {lampClones[0] && <primitive object={lampClones[0]} position={lampPos[0].pos} />}
      {lampClones[1] && <primitive object={lampClones[1]} position={lampPos[1].pos} />}
      {houseClone && <primitive object={houseClone} position={housePos} />}
      {carClone && <primitive object={carClone} position={carPos} rotation={[0, 0.5, 0]} />}
      {personClone && <primitive object={personClone} position={personPos} rotation={[0, -0.8, 0]} />}
      {/* hujan S8 — strip tipis putih UNLIT + jatuh (frame). Statis +
          meshStandard abu-abu = terbaca tiang (still S1). */}
      {rain.map((r, i) => {
        const y = (((r.pos[1] - frame * 0.09) % 11) + 11) % 11 - 0.5;
        return (
          <mesh key={`r-${i}`} position={[r.pos[0], y, r.pos[2]]} rotation={[0.12, 0, 0.12]}>
            <boxGeometry args={[0.035, 0.7, 0.035]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.65} />
          </mesh>
        );
      })}
      <Motor
        variant="street"
        spin={spin}
        lean={lean}
        steer={steer}
        frame={frame}
        position={[mx, 0, mz]}
        yaw={yaw}
      />
    </>
  );
};

// ================= Cutaway 2.5D: aquaplaning (S3, DOM/SVG — bukan 3D) =================
// Penampang ban + air, 2 panel: BAN BARU (alur buang air) vs BAN BOTAK
// (air kejebak, ban ngambang). Lapisan SVG + kinetic type, render CPU
// 2-3x lebih cepat daripada memaksakan cutaway di Three.js.
// ================= Cutaway 2.5D: variator (S4, DOM/SVG — bukan 3D) =================
// Penampang dua puli + sabuk: PELAN (roller di dalam, puli depan kecil) vs
// KENCANG (roller kelempar ke luar, puli depan besar). Lapisan SVG +
// kinetic type, render CPU 2-3x lebih cepat daripada cutaway Three.js.
const CutawayScene: React.FC<{ frame: number }> = ({ frame }) => {
  const panel: React.CSSProperties = {
    width: 470,
    height: 640,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  };
  const headerBar = (bg: string, text: string, darkText = false): React.ReactNode => (
    <div
      style={{
        backgroundColor: bg,
        color: darkText ? "#1F1F1F" : "#FFFFFF",
        fontFamily: EDITORIAL_FONTS.sans,
        fontSize: 34,
        fontWeight: 700,
        textAlign: "center",
        padding: "14px 0",
        letterSpacing: 1,
      }}
    >
      {text}
    </div>
  );
  // Penampang puli: dua trapesium (sheave atas + bawah) + sabuk + roller.
  const xSection = (rP: number, rS: number, rRoll: number, wobble: number) => {
    const cx1 = 140;
    const cx2 = 330;
    const cy = 215;
    const sheave = (cx: number, color: string) => (
      <g key={cx}>
        <polygon
          points={`${cx - 52},${cy - 85} ${cx + 52},${cy - 85} ${cx + 16},${cy - 16} ${cx - 16},${cy - 16}`}
          fill={color}
        />
        <polygon
          points={`${cx - 16},${cy + 16} ${cx + 16},${cy + 16} ${cx + 52},${cy + 85} ${cx - 52},${cy + 85}`}
          fill={color}
        />
        <circle cx={cx} cy={cy} r={14} fill="#3A3F46" />
      </g>
    );
    const rollers = [0, 1, 2, 3, 4, 5].map((k) => {
      const a = (k / 6) * Math.PI * 2 + wobble;
      return (
        <circle key={k} cx={cx1 + Math.cos(a) * rRoll} cy={cy + Math.sin(a) * rRoll} r={9} fill={AMBER} stroke="#7A4A00" strokeWidth={2} />
      );
    });
    return (
      <svg width="470" height="420" viewBox="0 0 470 420">
        {sheave(cx1, STREET_TEAL)}
        {sheave(cx2, "#7A6A8A")}
        {/* sabuk: dua garis miring (jari-jari beda di tiap puli) */}
        <line x1={cx1} y1={cy - rP} x2={cx2} y2={cy - rS} stroke="#262626" strokeWidth={11} strokeLinecap="round" />
        <line x1={cx1} y1={cy + rP} x2={cx2} y2={cy + rS} stroke="#262626" strokeWidth={11} strokeLinecap="round" />
        {rollers}
      </svg>
    );
  };
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${SKY_TOP} 0%, ${SKY} 55%, ${CREAM} 100%)` }}>
      <div style={{ position: "absolute", top: 168, left: 70, right: 70, textAlign: "center" }}>
        <MaskedKineticLine words={["ROLLER", "YANG", "ATUR"]} fontSize={88} accentWord="ROLLER" accentColor={AMBER} align="center" />
      </div>
      <div
        style={{
          position: "absolute",
          top: 330,
          left: 60,
          right: 60,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {/* Panel kiri: PELAN */}
        <div style={panel}>
          {headerBar(STREET_TEAL, "PELAN — GIGI RENDAH")}
          {xSection(42, 72, 24, 0)}
          <div style={{ padding: "10px 22px", fontFamily: EDITORIAL_FONTS.sans, fontSize: 30, fontWeight: 700, color: "#1F1F1F", lineHeight: 1.3, textAlign: "center" }}>
            roller di dalam • puli depan kecil • torsi besar
          </div>
        </div>
        {/* Panel kanan: KENCANG */}
        <div style={panel}>
          {headerBar(AMBER, "KENCANG — GIGI TINGGI", true)}
          {xSection(72, 42, 48, Math.sin(frame * 0.05) * 0.15)}
          <div style={{ padding: "10px 22px", fontFamily: EDITORIAL_FONTS.sans, fontSize: 30, fontWeight: 700, color: "#1F1F1F", lineHeight: 1.3, textAlign: "center" }}>
            roller kelempar ke luar • puli depan besar • rasio naik
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 1010,
          left: 70,
          right: 70,
          textAlign: "center",
          fontFamily: EDITORIAL_FONTS.sans,
          fontSize: 34,
          fontWeight: 700,
          color: "#1F1F1F",
          textShadow: "0 2px 8px rgba(255,255,255,0.9)",
        }}
      >
        roller kelempar ke luar → puli depan membesar → rasio naik sendiri
      </div>
    </AbsoluteFill>
  );
};

// ================= Perbandingan 2.5D: manual vs CVT (S5, DOM/SVG) =================
const ComparisonScene: React.FC<{ frame: number }> = ({ frame }) => {
  void frame;
  const panel: React.CSSProperties = {
    width: 470,
    height: 640,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  };
  const headerBar = (bg: string, text: string, darkText = false): React.ReactNode => (
    <div
      style={{
        backgroundColor: bg,
        color: darkText ? "#1F1F1F" : "#FFFFFF",
        fontFamily: EDITORIAL_FONTS.sans,
        fontSize: 34,
        fontWeight: 700,
        textAlign: "center",
        padding: "14px 0",
        letterSpacing: 1,
      }}
    >
      {text}
    </div>
  );
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${SKY_TOP} 0%, ${SKY} 55%, ${CREAM} 100%)` }}>
      <div style={{ position: "absolute", top: 168, left: 70, right: 70, textAlign: "center" }}>
        <MaskedKineticLine words={["MANUAL", "vs", "MATIC"]} fontSize={88} accentWord="MATIC" accentColor={AMBER} align="center" />
      </div>
      <div
        style={{
          position: "absolute",
          top: 330,
          left: 60,
          right: 60,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {/* Panel kiri: MANUAL — tangga bertingkat */}
        <div style={panel}>
          {headerBar(STEEL_DARK, "MANUAL")}
          <svg width="470" height="420" viewBox="0 0 470 420">
            <polyline
              points="70,310 150,310 150,250 230,250 230,190 310,190 310,130 390,130"
              fill="none"
              stroke="#6B7280"
              strokeWidth={9}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {[
              [70, 310],
              [150, 250],
              [230, 190],
              [310, 130],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={9} fill="#6B7280" />
            ))}
            {["1", "2", "3", "4"].map((t, i) => (
              <text key={t} x={[105, 185, 265, 345][i]} y={355} textAnchor="middle" fontSize={30} fontWeight={700} fill="#6B7280" fontFamily={EDITORIAL_FONTS.sans}>
                {t}
              </text>
            ))}
          </svg>
          <div style={{ padding: "10px 22px", fontFamily: EDITORIAL_FONTS.sans, fontSize: 30, fontWeight: 700, color: "#1F1F1F", lineHeight: 1.3, textAlign: "center" }}>
            pindah gigi satu-satu • ada jeda + hentakan
          </div>
        </div>
        {/* Panel kanan: CVT — kurva mulus */}
        <div style={panel}>
          {headerBar(AMBER, "CVT MATIC", true)}
          <svg width="470" height="420" viewBox="0 0 470 420">
            <path d="M 70,310 Q 230,290 400,130" fill="none" stroke={AMBER} strokeWidth={9} strokeLinecap="round" />
            <polygon points="400,130 376,130 392,150" fill={AMBER} />
            <circle cx={70} cy={310} r={9} fill={AMBER} />
            <text x={235} y={355} textAnchor="middle" fontSize={30} fontWeight={700} fill="#1F1F1F" fontFamily={EDITORIAL_FONTS.sans}>
              naik terus, tanpa jeda
            </text>
          </svg>
          <div style={{ padding: "10px 22px", fontFamily: EDITORIAL_FONTS.sans, fontSize: 30, fontWeight: 700, color: "#1F1F1F", lineHeight: 1.3, textAlign: "center" }}>
            rasio naik mulus • tanpa jeda
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 1010,
          left: 70,
          right: 70,
          textAlign: "center",
          fontFamily: EDITORIAL_FONTS.sans,
          fontSize: 34,
          fontWeight: 700,
          color: "#1F1F1F",
          textShadow: "0 2px 8px rgba(255,255,255,0.9)",
        }}
      >
        tanpa jeda, tanpa hentakan, tanpa pindah gigi
      </div>
    </AbsoluteFill>
  );
};

// ================= Lapisan teks =================
const Headline: React.FC = () => (
  <div style={{ position: "absolute", top: 170, left: 70, right: 70, textAlign: "center" }}>
    <MaskedKineticLine words={["NGGAK ADA", "GIGI."]} fontSize={104} accentWord="GIGI." accentColor={AMBER} align="center" />
    <div
      style={{
        fontFamily: EDITORIAL_FONTS.sans,
        fontSize: 44,
        fontWeight: 700,
        color: AMBER,
        lineHeight: 1.25,
        marginTop: 18,
        textShadow: SHADOW,
      }}
    >
      Motor matic lo nggak punya gigi
    </div>
  </div>
);

// SUBTITLES per KALIMAT (bukan per scene). start = frame global dari
// silencedetect -40dB (ujung kalimat = silence_end, awal = silence_end sebelumnya).
const SUBS: { text: string; highlight: string; start: number }[] = [
  { text: "Motor matic lo nggak punya gigi.", highlight: "gigi", start: 0 },
  { text: "Bukan rusak, memang nggak ada.", highlight: "nggak", start: 74 },
  { text: "Di dalam CVT cuma ada dua puli dan satu sabuk.", highlight: "puli", start: 145 },
  { text: "Puli depan nyambung ke mesin, puli belakang ke roda.", highlight: "mesin", start: 250 },
  { text: "Dua-duanya bisa berubah diameter.", highlight: "diameter", start: 304 },
  { text: "Pas baru jalan, puli depan mengecil, torsi besar, tarikan enteng.", highlight: "torsi", start: 352 },
  { text: "Begitu gas dibuka, roller kecil di dalam puli kelempar ke luar.", highlight: "roller", start: 425 },
  { text: "Puli depan membesar, puli belakang mengecil, rasio berubah sendiri.", highlight: "rasio", start: 499 },
  { text: "Motor manual pindah gigi satu-satu.", highlight: "satu-satu", start: 610 },
  { text: "Matic nggak pernah pindah.", highlight: "pindah", start: 699 },
  { text: "Tanpa jeda, tanpa hentakan, tanpa pindah gigi.", highlight: "jeda", start: 737 },
  { text: "Itu kenapa matic halus di macet dan di jalan lurus.", highlight: "halus", start: 833 },
  { text: "Tapi sabuk karetnya nggak abadi.", highlight: "abadi", start: 910 },
  { text: "Ganti tiap 15 sampai 25 ribu kilometer.", highlight: "25", start: 965 },
  { text: "Kalau telat, sabuk putus, motor lo mogok.", highlight: "putus", start: 1077 },
  { text: "Motor lo udah berapa ribu kilometer?", highlight: "kilometer", start: 1237 },
];

const Subtitle: React.FC<{ frame: number }> = ({ frame }) => {
  let active = SUBS[0];
  for (const s of SUBS) {
    if (frame >= s.start) active = s;
    else break;
  }
  const { text, highlight } = active;
  const local = frame - active.start;
  const words = text.split(" ");
  return (
    <div
      style={{
        position: "absolute",
        bottom: 380,
        left: 70,
        right: 70,
        textAlign: "center",
        fontFamily: EDITORIAL_FONTS.sans,
        fontSize: 44,
        fontWeight: 700,
        lineHeight: 1.35,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      <span
        style={{
          display: "inline-block",
          backgroundColor: "rgba(0,0,0,0.55)",
          padding: "10px 28px",
          borderRadius: 18,
        }}
      >
        {words.map((w, i) => {
          const clean = w.toLowerCase().replace(/[^a-z0-9°–-]/g, "");
          const isMatch = clean === highlight.toLowerCase().replace(/[^a-z0-9°–-]/g, "");
          const opacity = interpolate(local, [i * 3, i * 3 + 8], [0, 1], {
            easing: Easing.out(Easing.quad),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <span key={i} style={{ opacity, color: isMatch ? AMBER : "#FFFFFF" }}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </span>
    </div>
  );
};

// Callout: dot di ujung KIRI garis 80px di tengah box (dot x = pusat box − 40,
// dot y = top + 42) — ukur posisi layar objek dari still, jangan tebak top.
const HairlineLabel: React.FC<{
  top: number;
  left?: number;
  right?: number;
  text: string;
}> = ({ top, left, right, text }) => (
  <div style={{ position: "absolute", top, left, right, textAlign: "center" }}>
    <div
      style={{
        fontFamily: EDITORIAL_FONTS.sans,
        fontSize: 28,
        fontWeight: 700,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      {text}
    </div>
    <div
      style={{
        width: 80,
        height: 2,
        backgroundColor: "#FFFFFF",
        margin: "8px auto 0",
        boxShadow: "0 2px 6px rgba(0,0,0,0.7)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -5,
          top: -4,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 2px 6px rgba(0,0,0,0.7)",
        }}
      />
    </div>
  </div>
);

const BigNumber: React.FC<{ value: string; caption: string; top?: number; local: number }> = ({
  value,
  caption,
  top = 480,
  local,
}) => {
  const scale = interpolate(local, [0, 12], [0.6, 1], {
    easing: Easing.out(Easing.back(1.7)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(local, [0, 6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        right: 70,
        textAlign: "center",
        scale,
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: EDITORIAL_FONTS.display,
          fontSize: 110,
          fontWeight: 800,
          color: AMBER,
          lineHeight: 1,
          textShadow: SHADOW,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: EDITORIAL_FONTS.sans,
          fontSize: 30,
          fontWeight: 700,
          color: "#FFFFFF",
          marginTop: 10,
          textShadow: SHADOW,
        }}
      >
        {caption}
      </div>
    </div>
  );
};

const SourceLine: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 300,
      left: 70,
      right: 70,
      textAlign: "center",
      fontFamily: EDITORIAL_FONTS.sans,
      fontSize: 26,
      fontWeight: 700,
      color: "#FFFFFF",
      textShadow: SHADOW,
    }}
  >
    Sumber: Yamaha Motor Indonesia
  </div>
);

const WatermarkText: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 48,
      right: 48,
      fontFamily: EDITORIAL_FONTS.sans,
      fontSize: 24,
      fontWeight: 700,
      color: "#FFFFFF",
      textShadow: SHADOW,
    }}
  >
    Nur Maya
  </div>
);

// ================= Scene / kamera =================
// RETIME dari VO asli (ffprobe 49.704 dtk; potong di 44.645 dtk = akhir kalimat 16.
// Ekor 44.645–49.263 dtk = ucapan tak berskrip di luar naskah -> TIDAK dipakai.)
export const TOTAL_FRAMES = 1339;

const SCENE_BOUNDS = [0, 57, 293, 406, 601, 813, 895, 1227, 1339];
const S_RANGES: [number, number][] = [
  [0, 3], // S1 hook (jalan)
  [0, 0], // S2 isi CVT (studio)
  [0, 0], // S3 diameter (studio)
  [0, 0], // S4 cutaway 2.5D (DOM)
  [0, 0], // S5 manual vs matic (DOM)
  [4, 12], // S6 halus (jalan)
  [0, 0], // S7 sabuk aus (studio)
  [10, 18], // S8 penutup (jalan)
];

export const CvtMaticExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps;
  useEditorialFonts();

  // Load GLB lingkungan sekali (pola cinta): lanjut render kalau selesai/gagal.
  const [models, setModels] = useState<GlbModels | null>(null);
  const [handle] = useState(() => delayRender("Loading GLB models cvt-matic"));
  useEffect(() => {
    let cancelled = false;
    const jobs: [keyof GlbModels, string, number][] = [
      ["lamp", "models/streetlamp/street-light.glb", 2.6],
      ["house", "models/house/house.glb", 7],
      ["car", "models/car/car.glb", 1.5],
      ["person", "models/person/man.glb", 1.8],
    ];
    const results: GlbModels = {};
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
  for (let i = 0; i < 8; i++) {
    if (frame >= SCENE_BOUNDS[i] && frame < SCENE_BOUNDS[i + 1]) {
      scene = i;
      break;
    }
  }
  const sceneLen = SCENE_BOUNDS[scene + 1] - SCENE_BOUNDS[scene];
  const local = frame - SCENE_BOUNDS[scene];

  const easeInOut = Easing.inOut(Easing.quad);
  const camEase = Easing.bezier(0.76, 0, 0.24, 1); // orbit kontinu (Antigravity #5)
  const s = interpolate(local, [0, sceneLen - 1], S_RANGES[scene], {
    easing: easeInOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lean = 0;
  const steer = 0;
  const speedPerFrame =
    (S_RANGES[scene][1] - S_RANGES[scene][0]) / Math.max(1, sceneLen - 1);

  const [mx, mz] = arcPos(s);
  const yaw = arcYaw(s);
  const tangent: [number, number, number] = [Math.cos(s / R), 0, -Math.sin(s / R)];
  const camFrom = (lx: number, ly: number, lz: number): [number, number, number] =>
    worldPoint(mx, mz, yaw, lx, ly, lz);
  const targetAhead = (dist: number, y: number): [number, number, number] => [
    mx + tangent[0] * dist,
    y,
    mz + tangent[2] * dist,
  ];
  const lerpE = (a: number, b: number) =>
    interpolate(local, [0, sceneLen - 1], [a, b], {
      easing: camEase,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  let camPos: [number, number, number];
  let camTarget: [number, number, number];
  if (scene === 1 || scene === 2) {
    // S2/S3 studio variator: kamera ditarik mundur (audit ronde 1: puli
    // terpotong kiri-kanan di z=12-13) supaya panel + puli utuh + GLB
    // lingkungan (lampu/rumah/mobil) masuk frame.
    camPos = [0, lerpE(3.2, 2.8), lerpE(16.5, 15.5)];
    camTarget = [0, 1.4, 0];
  } else if (scene === 6) {
    // S7 sabuk aus: close-up rendah ke pedestal.
    camPos = [lerpE(3.4, 2.8), lerpE(2.2, 1.8), lerpE(6.5, 5.5)];
    camTarget = [0, 1.1, 0];
  } else {
    // S1/S6/S8 jalan: kamera mengikuti motor.
    camPos = camFrom(lerpE(-6, -5), lerpE(2.6, 2.2), lerpE(-8, -7));
    camTarget = targetAhead(1, 1.2);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      {scene === 3 ? (
        <CutawayScene frame={frame} />
      ) : scene === 4 ? (
        <ComparisonScene frame={frame} />
      ) : (
        <ThreeCanvas
          width={1080}
          height={1920}
          camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
        >
          {[1, 2, 6].includes(scene) ? (
            <CvtStudio scene={scene} local={local} frame={frame} sceneLen={sceneLen} models={models} />
          ) : (
            <Scene
              s={s}
              lean={lean}
              steer={steer}
              variant="street"
              scene={scene}
              local={local}
              frame={frame}
              speedPerFrame={speedPerFrame}
              models={models}
            />
          )}
          <CameraRig position={camPos} target={camTarget} frame={frame} />
        </ThreeCanvas>
      )}
      {scene === 0 && <Headline />}
      <Subtitle frame={frame} />
      {scene === 1 && (
        <>
          <BigNumber value="2 PULI + 1 SABUK" caption="isi CVT motor matic" top={520} local={local} />
          <HairlineLabel top={1000} left={70} text="puli primer — sisi mesin" />
          <HairlineLabel top={1000} right={70} text="puli sekunder — sisi roda" />
        </>
      )}
      {scene === 2 && (
        <HairlineLabel top={1000} left={70} text="diameter berubah = rasio berubah" />
      )}
      {scene === 6 && (
        <>
          <BigNumber value="15–25 RIBU KM" caption="ganti sabuk karet CVT" top={560} local={local} />
          <HairlineLabel top={1090} left={70} right={70} text="sabuk retak = minta ganti" />
        </>
      )}
      {scene === 7 && <SourceLine />}
      <WatermarkText />

      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      <Audio src={staticFile("audio/cvt-matic/vo_sami.mp3")} volume={1} />
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {[0, 57, 293, 406, 601, 813, 895, 1227].map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      <Sequence from={406} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={895} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
