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

// ================= BanBotakExplainer =================
// "Ban botak bikin selip." — sekuel ban-slick, dengan paket upgrade
// Antigravity 2026-11-24 (bukan remake 3 video motor — keputusan Maya).
// Profil B toy-explainer, Sami, 8 scene, 1080x1920.
// UPGRADES (wajib, bukan opsional):
//  - Lighting baru: ambient 0.28 + hemisphere 0.55 + warm sun 1.45 +
//    cool rim 0.45 + fog + sky dome (BUKAN ambient 0.85 datar).
//  - Fake AO contact shadow (plane y=0.02, CanvasTexture gradien radial).
//    JANGAN real-time shadow map (berat di SwiftShader CPU).
//  - CanvasTexture prosedural (aspal + skid mark, beton, rumput) —
//    tidak ada lagi permukaan warna hex polos.
//  - Font woff2 via FontFace (BarlowCondensed-ExtraBold + SpaceGrotesk-Bold)
//    dari public/fonts/ — JANGAN "Inter, Arial, sans-serif" (DejaVu).
//  - GLB lingkungan (streetlamp, house, car, person) + 3 layer kedalaman.
//    Hero rider tetap prosedural (tidak ada GLB rider duduk CC0) tapi
//    dengan lighting baru + fake AO + CanvasTexture + ink outline.
//  - Cutaway 2.5D (S3 aquaplaning) pakai SVG berlapis + kinetic type.
//  - Kamera: micro-handheld breathing sin(frame*0.06)*0.05, orbit
//    kontinu Easing.bezier(0.76,0,0.24,1), putaran roda = s / wheelRadius.
// Angka bersumber: TWI 1,6 mm (pabrikan/Eropa), PP 55/2012 Pasal 73 = 1 mm,
// buang air 30 L/dtk @ 80 km/jam (Continental), rem basah 25,9 m vs 37,8 m
// (TyreSafe/MIRA), aquaplaning ~60-80 km/jam, slick 80-120C (motogp.com).

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
const TIRE_Y = 1.27;

const Tire: React.FC<{
  variant: "treaded" | "bald" | "slick" | "wet" | "worn";
  spin: number;
  heat?: number;
  warmer?: boolean;
  position?: [number, number, number];
  scale?: number;
}> = ({ variant, spin, heat = 0, warmer = false, position = [0, TIRE_Y, 0], scale = 1 }) => {
  const tube = variant === "worn" || variant === "bald" ? 0.22 : 0.32;
  // Ban botak/aus lebih terang (#454545, bukan #3A3A3A): dengan ambient 0.28,
  // warna terlalu gelap jadi siluet hitam pekat tanpa detail (still S1).
  const tireColor = variant === "worn" || variant === "bald" ? "#454545" : TIRE;
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <group rotation={[0, 0, spin]}>
        <mesh>
          <torusGeometry args={[0.95, tube, 16, 32]} />
          <meshStandardMaterial color={tireColor} roughness={0.95} emissive="#FF7A00" emissiveIntensity={heat * 1.4} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.3, 24]} />
          <meshStandardMaterial color={RIM} roughness={0.35} metalness={0.55} />
        </mesh>
        {[0, 1, 2, 3, 4].map((k) => {
          const a = (k / 5) * Math.PI * 2;
          return (
            <mesh key={k} position={[Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.5, 0.1, 0.32]} />
              <meshStandardMaterial color="#6B7280" roughness={0.5} metalness={0.4} />
            </mesh>
          );
        })}
        {/* tapak (treaded): balok kembang dalam di sekeliling */}
        {variant === "treaded" &&
          Array.from({ length: 18 }).map((_, k) => {
            const a = (k / 18) * Math.PI * 2;
            return (
              <mesh key={k} position={[Math.cos(a) * 1.27, Math.sin(a) * 1.27, 0]} rotation={[0, 0, a]}>
                <boxGeometry args={[0.14, 0.12, 0.4]} />
                <meshStandardMaterial color="#2E2E2E" roughness={1} />
              </mesh>
            );
          })}
        {/* tapak (bald): halus total — tanpa tonjolan sisa (tonjolan tipis
            terbaca seperti tab menonjol di still S1). "Botak" dibaca dari
            perbandingan dengan treaded di S2 + label. */}
        {/* alur (wet): 3 cincin gelap di permukaan */}
        {variant === "wet" &&
          [-0.18, 0, 0.18].map((z, k) => (
            <mesh key={k} position={[0, 0, z]}>
              <torusGeometry args={[1.27, 0.035, 8, 32]} />
              <meshStandardMaterial color="#0A0A0A" roughness={1} />
            </mesh>
          ))}
        {/* TWI: tonjolan kecil di dasar alur (S5) — amber supaya ketemu */}
        {variant === "worn" && (
          <mesh position={[0, -1.13, 0]}>
            <boxGeometry args={[0.22, 0.09, 0.4]} />
            <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.7} roughness={0.6} />
          </mesh>
        )}
      </group>
      {warmer && (
        <mesh>
          <torusGeometry args={[0.98, 0.5, 16, 32]} />
          <meshStandardMaterial color="#D32F2F" roughness={0.9} transparent opacity={0.95} />
        </mesh>
      )}
    </group>
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

// ================= Studio ban (close-up) =================
const TireStudio: React.FC<{
  scene: number;
  local: number;
  frame: number;
  sceneLen: number;
  models: GlbModels | null;
}> = ({ scene, local, frame, sceneLen, models }) => {
  const spinSlow = frame * 0.01;
  const tex = useTextures();
  const heat =
    scene === 6
      ? interpolate(local, [0, sceneLen - 1], [0, 1], {
          easing: Easing.inOut(Easing.quad),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
  // Hujan S1 (ringan) + S6 tidak ada (studio kering).
  const rain = useMemo(() => {
    if (scene !== 0) return [];
    const out: { pos: [number, number, number] }[] = [];
    for (let i = 0; i < 24; i++) {
      const x = (pseudo(i) - 0.5) * 6;
      const z = (pseudo(i + 100) - 0.5) * 5;
      const y = 8 - ((frame * 0.35 + i * 0.53) % 8);
      out.push({ pos: [x, y, z] });
    }
    return out;
  }, [scene, frame]);
  // Lampu GLB di studio (midground) — clone sekali.
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
      {lampClones[0] && <primitive object={lampClones[0]} position={[-5.5, 0, -3]} />}
      {lampClones[1] && <primitive object={lampClones[1]} position={[5.5, 0, -3]} />}
      {houseClone && <primitive object={houseClone} position={[13, 0, -16]} />}
      {carClone && <primitive object={carClone} position={[-13, 0, -14]} rotation={[0, 0.6, 0]} />}
      {/* ===== Ban hero per scene ===== */}
      {scene === 1 ? (
        <>
          <Tire variant="treaded" spin={spinSlow} position={[-2.0, TIRE_Y, 0]} scale={0.8} />
          <Tire variant="bald" spin={spinSlow} position={[2.0, TIRE_Y, 0]} scale={0.8} />
          <mesh position={[-2.0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.45, 0.3]} />
            <meshStandardMaterial color={AMBER} transparent opacity={0.55} roughness={0.6} />
          </mesh>
          <mesh position={[2.0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.45, 0.7]} />
            <meshStandardMaterial color={AMBER} transparent opacity={0.55} roughness={0.6} />
          </mesh>
        </>
      ) : scene === 4 ? (
        // S5 TWI: ban DIAM (spin 0) — marker TWI di [0,-1.13,0] ikut putaran
        // kalau spinSlow: di frame 825 marker muter ke jam 3, callout di
        // bawah jadi salah arah (audit). Close-up inspeksi tidak perlu putar.
        <Tire variant="worn" spin={0} />
      ) : scene === 6 ? (
        <>
          <Tire variant="slick" spin={spinSlow} heat={heat} position={[-2.0, TIRE_Y, 0]} scale={0.8} />
          <Tire variant="bald" spin={spinSlow} position={[2.0, TIRE_Y, 0]} scale={0.8} />
        </>
      ) : (
        <Tire variant="bald" spin={spinSlow} />
      )}
      {/* hujan S1 — strip tipis putih UNLIT + jatuh (frame). Statis +
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
      {/* fake AO di bawah ban hero (bukan di split — di sana ada contact patch amber) */}
      {scene !== 1 && scene !== 6 && (
        <FakeAO position={[0, 0.02, 0]} scale={[1.1, 1.1, 1]} opacity={0.9} />
      )}
      {scene === 1 && (
        <>
          <FakeAO position={[-2.0, 0.02, 0]} scale={[0.9, 0.9, 1]} opacity={0.7} />
          <FakeAO position={[2.0, 0.02, 0]} scale={[0.9, 0.9, 1]} opacity={0.7} />
        </>
      )}
      {scene === 6 && (
        <>
          <FakeAO position={[-2.0, 0.02, 0]} scale={[0.9, 0.9, 1]} opacity={0.7} />
          <FakeAO position={[2.0, 0.02, 0]} scale={[0.9, 0.9, 1]} opacity={0.7} />
        </>
      )}
    </>
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
    if (scene !== 7) return [];
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
const CutawayScene: React.FC<{ frame: number }> = ({ frame }) => {
  // Tetes air jatuh di panel kiri (alur): loop deterministik.
  const drops = [0, 1, 2, 3, 4].map((i) => ({
    x: 150 + i * 42,
    y: 150 + ((frame * 2.2 + i * 47) % 170),
  }));
  // Gelembung air di baji panel kanan: goyang pelan.
  const bubbles = [0, 1, 2].map((i) => ({
    x: 170 + i * 65,
    y: 352 + Math.sin(frame * 0.08 + i * 2.1) * 3,
  }));
  const panel: React.CSSProperties = {
    width: 470,
    height: 640,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  };
  const headerBar = (bg: string, text: string): React.ReactNode => (
    <div
      style={{
        backgroundColor: bg,
        color: "#FFFFFF",
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
        <MaskedKineticLine
          words={["AQUAPLANING"]}
          fontSize={88}
          accentWord="AQUAPLANING"
          accentColor="#D32F2F"
          align="center"
        />
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
        {/* Panel kiri: BAN BARU */}
        <div style={panel}>
          {headerBar(STREET_TEAL, "BAN BARU")}
          <svg width="470" height="420" viewBox="0 0 470 420">
            <rect x="0" y="360" width="470" height="60" fill={ASPHALT} />
            <rect x="0" y="360" width="470" height="6" fill={ASPHALT_LINE} opacity={0.7} />
            {/* tapak ban baru: kubah + balok kembang (alur = celah antar balok) */}
            <path d="M 110,360 L 110,180 Q 110,90 235,90 Q 360,90 360,180 L 360,360 Z" fill={TIRE} />
            {[135, 185, 235, 285, 330].map((x) => (
              <rect key={x} x={x - 13} y={330} width={26} height={30} fill="#2E2E2E" />
            ))}
            <circle cx="235" cy="225" r="62" fill={RIM} />
            <circle cx="235" cy="225" r="30" fill="#6B7280" />
            {/* air mengalir ke bawah lewat alur */}
            {drops.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={9} fill={WATER_DEEP} opacity={0.9} />
            ))}
            <text x="235" y="405" textAnchor="middle" fontSize="26" fontWeight="700" fill="#FFFFFF" fontFamily={EDITORIAL_FONTS.sans}>
              JALAN
            </text>
          </svg>
          <div style={{ padding: "10px 22px", fontFamily: EDITORIAL_FONTS.sans, fontSize: 30, fontWeight: 700, color: "#1F1F1F", lineHeight: 1.3, textAlign: "center" }}>
            alur buang air → karet nempel aspal
          </div>
        </div>
        {/* Panel kanan: BAN BOTAK */}
        <div style={panel}>
          {headerBar(RACE_RED, "BAN BOTAK")}
          <svg width="470" height="420" viewBox="0 0 470 420">
            <rect x="0" y="360" width="470" height="60" fill={ASPHALT} />
            <rect x="0" y="360" width="470" height="6" fill={ASPHALT_LINE} opacity={0.7} />
            {/* lapisan air di bawah ban botak */}
            <rect x="110" y="346" width="250" height="14" fill={WATER_DEEP} />
            {bubbles.map((b, i) => (
              <circle key={i} cx={b.x} cy={b.y} r={6} fill={WATER} opacity={0.95} />
            ))}
            {/* ban botak: kubah halus (tanpa kembang), terangkat 14px di atas jalan */}
            <path d="M 110,346 L 110,166 Q 110,76 235,76 Q 360,76 360,166 L 360,346 Z" fill="#3A3A3A" />
            <circle cx="235" cy="211" r="62" fill={RIM} />
            <circle cx="235" cy="211" r="30" fill="#6B7280" />
            <text x="235" y="405" textAnchor="middle" fontSize="26" fontWeight="700" fill="#FFFFFF" fontFamily={EDITORIAL_FONTS.sans}>
              JALAN
            </text>
          </svg>
          <div style={{ padding: "10px 22px", fontFamily: EDITORIAL_FONTS.sans, fontSize: 30, fontWeight: 700, color: "#D32F2F", lineHeight: 1.3, textAlign: "center" }}>
            air kejebak → ban ngambang → selip
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
        air kejebak → ban ngambang → setir nggak nurut
      </div>
    </AbsoluteFill>
  );
};

// ================= Lapisan teks =================
const Headline: React.FC = () => (
  <div style={{ position: "absolute", top: 170, left: 70, right: 70, textAlign: "center" }}>
    <MaskedKineticLine
      words={["BOTAK.", "LICIN."]}
      fontSize={104}
      accentWord="LICIN."
      accentColor={AMBER}
      align="center"
    />
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
      Ban botak itu licin
    </div>
  </div>
);

// SUBTITLES per KALIMAT (bukan per scene): 1 kalimat tampil 1× — pill per
// scene yang gabung 3 kalimat jadi paragraf raksasa (audit S2/S3/S5/S7/S8).
// start = frame global dari silencedetect (VO 51.456 dtk). Subtitle yang
// aktif = kalimat terakhir yang sudah mulai (tahan saat jeda, tanpa kedip).
const SUBS: { text: string; highlight: string; start: number }[] = [
  { text: "Ban botak itu licin.", highlight: "licin", start: 0 },
  { text: "Alur bannya udah habis, nggak ada yang buang air hujan.", highlight: "habis", start: 61 },
  { text: "Ban baru bisa buang 30 liter air per detik.", highlight: "30", start: 178 },
  { text: "Ban botak, setengahnya pun nggak nyampe.", highlight: "setengahnya", start: 263 },
  { text: "Airnya kejebak di bawah ban, ban lo ngambang di atas air.", highlight: "ngambang", start: 339 },
  { text: "Itu namanya aquaplaning.", highlight: "aquaplaning", start: 459 },
  { text: "Setir nggak nurut, rem nggak gigit.", highlight: "nurut", start: 526 },
  { text: "Di jalan basah, ban botak ngerem 11 meter lebih jauh dari ban baru.", highlight: "11", start: 610 },
  { text: "1,6 milimeter itu batasnya.", highlight: "1,6", start: 751 },
  { text: "Kalau tapak lo udah rata sama tonjolan kecil itu, ganti.", highlight: "ganti", start: 823 },
  { text: "Di Indonesia, aturan laik jalannya malah 1 milimeter.", highlight: "1", start: 944 },
  { text: "Bedain sama ban balap MotoGP.", highlight: "MotoGP", start: 1047 },
  { text: "Itu botak sengaja, karet lunak, panas 80–120 derajat, cuma buat trek kering.", highlight: "80–120", start: 1106 },
  { text: "Ban lo botak, karetnya keras dan dingin.", highlight: "keras", start: 1311 },
  { text: "Jangan tunggu selip dulu baru nyesel.", highlight: "selip", start: 1394 },
  { text: "Cek ban lo sekarang, masih ada alurnya nggak?", highlight: "alurnya", start: 1463 },
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
    Sumber: Continental, TyreSafe/MIRA, PP 55/2012, motogp.com
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
// RETIME 2026-11-24: VO Sami asli 51.456s (ffprobe) -> 1544f. Bounds dari
// ffmpeg silencedetect (-40dB), scene ganti di AWAL jeda (silence_start,
// pola ban-slick): S1->S2 2.02 dtk, S2->S3 10.95 dtk, S3->S4 19.90 dtk,
// S4->S5 24.29 dtk, S5->S6 30.72 dtk, S6->S7 34.32 dtk, S7->S8 45.91 dtk.
// Payoff S4 (rem 11 meter) mulai 19.90 dtk — sebelum detik 20.
export const TOTAL_FRAMES = 1544;

const SCENE_BOUNDS = [0, 61, 329, 597, 729, 922, 1030, 1377, 1544];
const S_RANGES: [number, number][] = [
  [0, 0], // S1 hook (studio)
  [0, 0], // S2 split alur (studio)
  [0, 0], // S3 cutaway 2.5D (DOM — s tidak dipakai)
  [14, 2], // S4 rem jalan basah (jalan, melambat)
  [0, 0], // S5 TWI (studio)
  [0, 0], // S6 aturan RI (studio)
  [0, 0], // S7 slick vs botak (studio)
  [6, 14], // S8 penutup (jalan, hujan)
];

export const BanBotakExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps;
  useEditorialFonts();

  // Load GLB lingkungan sekali (pola cinta): lanjut render kalau selesai/gagal.
  const [models, setModels] = useState<GlbModels | null>(null);
  const [handle] = useState(() => delayRender("Loading GLB models ban-botak"));
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
  if (scene === 0) {
    camPos = [lerpE(5, 4.2), lerpE(2.8, 2.4), lerpE(8.8, 7.8)];
    camTarget = [0, 1.2, 0];
  } else if (scene === 1) {
    camPos = [0, lerpE(3.2, 2.9), lerpE(15, 14)];
    camTarget = [0, 1.2, 0];
  } else if (scene === 3) {
    camPos = camFrom(lerpE(-6, -5), lerpE(2.6, 2.2), lerpE(-8, -7));
    camTarget = targetAhead(1, 1.2);
  } else if (scene === 4) {
    // S5 TWI: close-up rendah, target ke tonjolan TWI di dasar ban (y ~0.35).
    camPos = [lerpE(3.4, 2.8), lerpE(1.4, 1.1), lerpE(5.2, 4.4)];
    camTarget = [0, 0.35, 0];
  } else if (scene === 5) {
    camPos = [lerpE(6.4, 5.6), lerpE(2.4, 2.1), lerpE(4.8, 4)];
    camTarget = [0, 1.2, 0];
  } else if (scene === 6) {
    camPos = [0, lerpE(3.2, 2.9), lerpE(15, 14)];
    camTarget = [0, 1.2, 0];
  } else {
    camPos = camFrom(lerpE(-6, -5), lerpE(2.6, 2.2), lerpE(-8.5, -7));
    camTarget = targetAhead(1, 1.2);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      {scene === 2 ? (
        <CutawayScene frame={frame} />
      ) : (
        <ThreeCanvas
          width={1080}
          height={1920}
          camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
        >
          {[0, 1, 4, 5, 6].includes(scene) ? (
            <TireStudio scene={scene} local={local} frame={frame} sceneLen={sceneLen} models={models} />
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
          <HairlineLabel top={755} left={70} text="ban baru: alur dalam, buang air" />
          <HairlineLabel top={755} right={70} text="ban botak: alur rata" />
        </>
      )}
      {scene === 3 && (
        <BigNumber value="11 METER" caption="lebih jauh ngerem di jalan basah" top={560} local={local} />
      )}
      {scene === 4 && (
        <>
          <BigNumber value="1,6 mm" caption="batas TWI — tapak rata = ganti" top={560} local={local} />
          <HairlineLabel top={1090} left={70} right={70} text="tonjolan TWI di dasar alur" />
        </>
      )}
      {scene === 5 && (
        <div
          style={{
            position: "absolute",
            top: 560,
            left: 70,
            right: 70,
            display: "flex",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: "18px 26px",
              textAlign: "center",
              boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ fontFamily: EDITORIAL_FONTS.display, fontSize: 64, fontWeight: 800, color: "#1F1F1F", lineHeight: 1 }}>
              1 mm
            </div>
            <div style={{ fontFamily: EDITORIAL_FONTS.sans, fontSize: 26, fontWeight: 700, color: "#1F1F1F", marginTop: 8 }}>
              PP 55/2012 — aturan RI
            </div>
          </div>
          <div
            style={{
              backgroundColor: AMBER,
              borderRadius: 16,
              padding: "18px 26px",
              textAlign: "center",
              boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ fontFamily: EDITORIAL_FONTS.display, fontSize: 64, fontWeight: 800, color: "#1F1F1F", lineHeight: 1 }}>
              1,6 mm
            </div>
            <div style={{ fontFamily: EDITORIAL_FONTS.sans, fontSize: 26, fontWeight: 700, color: "#1F1F1F", marginTop: 8 }}>
              batas pabrikan (TWI)
            </div>
          </div>
        </div>
      )}
      {scene === 6 && (
        <>
          <HairlineLabel top={755} left={70} text="slick balap: lunak, 80–120°C" />
          <HairlineLabel top={755} right={70} text="ban botak: keras, dingin" />
        </>
      )}
      {scene === 7 && <SourceLine />}
      <WatermarkText />

      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      <Audio src={staticFile("audio/ban-botak/vo_sami.mp3")} volume={1} />
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {[0, 61, 329, 597, 729, 922, 1030, 1377].map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      <Sequence from={597} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={729} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
