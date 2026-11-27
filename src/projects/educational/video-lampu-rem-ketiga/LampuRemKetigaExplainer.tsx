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

// ================= LampuRemKetigaExplainer =================
// "Kenapa lampu rem ketiga ada di tengah" — video 5/6 batch 6.
// Profil B toy-explainer, Sami, 7 scene, 18 kalimat, 1080x1920.
// KONFLIK TERCATAT: brief memerintahkan "jalan malam" (lampu rem dibaca
// saat malam) — scene malam biru-dusk, BUKAN siang terang Profil B.
// Brief terbaru > profil gaya; teks tetap kontras (pill gelap + putih).
// PAKET UPGRADE ANTIGRAVITY (ban-botak/CVT/soal-SKD/jalan-rusak):
//  - Lighting malam adaptasi: ambient 0.30 + hemisphere 0.50 + warm 1.1 +
//    cool rim 0.50 + fog + sky dome dusk.
//  - Fake AO contact shadow + CanvasTexture prosedural (aspal malam,
//    beton, glow merah) — tidak ada permukaan warna hex polos.
//  - Font woff2 via EditorialPrimitives + FontFace + delayRender.
//  - GLB hero: car/car.glb (Quaternius; depan = +Z lokal, roda depan
//    z +0.8..+1.29, roda belakang z -1.2..-0.71 — diverifikasi dari
//    accessor min/max GLB). Lampu rem + CHMSL diposisikan dari bound
//    mesh ASLI (bukan tebak): lampu bawah y 0.89, CHMSL y 1.12.
//  - 3 layer kedalaman tiap scene (foreground: mobil tengah / garis
//    pandang; midground: mobil hero + lampu jalan; background: rumah,
//    skyline, bulan, fog). Kamera ganti sudut tiap 3-6 detik (keyframes
//    per scene) + micro-handheld breathing deterministik.
//  - Lalu lintas BERHENTI (macet/lampu merah, rem ditahan) — roda GLB
//    tidak bisa diputar terpisah; gerak datang dari kamera, denyut
//    lampu rem, dan mobil lawan arah yang lewat (roda prosedural
//    berputar = jarak/radius).
// Angka bersumber: CHMSL wajib mobil baru AS 1986 (FMVSS 108); uji
// armada 1970-an turun 48-54% (kasus mobil depan ngerem); jangka
// panjang 1989-95 turun 4,3%; 92.000-137.000 tabrakan dicegah/tahun.
// Sumber: NHTSA DOT HS 808 696 (Kahane & Hertz, Maret 1998).

// ================= Palette (malam dusk, tetap terbaca) =================
const SKY = "#33415C";
const SKY_TOP = "#141D2E";
const SKY_HORIZON = "#5A5A72";
const GROUND = "#232936";
const TIRE = "#1F1F1F";
const RIM = "#9AA0A6";
const GLASS = "#1E2E42";
const AMBER = "#FFB300";
const BRAKE_RED = "#FF2A1E";
const BRAKE_DIM = "#7A1512";
const CAR_BLUE = "#5A6B80";
const CABIN_GLASS = "#3A4A63";
const VAN_GREY = "#8A8F98";
const BUILDING = "#2C3A50";
const BUILDING_LIT = "#F5C96B";
const MOON = "#F2EAD8";

const SHADOW = "0 4px 14px rgba(0,0,0,0.85)";

// ================= Posisi dunia (jalan lurus sumbu Z) =================
// Kamera = mata pengemudi mobil belakang (z ~ 0). Mobil hero di lajur
// kanan (x 0.9), menghadap -Z (membelakangi kamera, yaw PI karena
// depan model GLB = +Z lokal).
const LEAD_CAR: [number, number, number] = [0.9, 0, -15];
const LEAD_YAW = Math.PI;
// Lampu rem (posisi dunia, diturunkan dari bound mesh GLB setelah
// normalizeHeight(1.5): skala ~1.304, tinggi total 1.5).
const LAMP_Y = 0.89;
const LAMP_X = 0.62;
const LAMP_Z = -12.82;
const CHMSL_Y = 1.12;
const CHMSL_Z = -13.55;
// Mobil tengah S2 (prosedural, atap ~1.07) di lajur yang sama.
const MID_CAR: [number, number, number] = [0.9, 0, -8];

function pseudo(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ================= CanvasTexture prosedural =================
function makeNightAsphaltTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2E3440";
  g.fillRect(0, 0, 256, 256);
  const rnd = seededRand(2024);
  for (let i = 0; i < 5200; i++) {
    const v = 38 + Math.floor(rnd() * 42);
    g.fillStyle = `rgba(${v},${v + 3},${v + 10},${0.25 + rnd() * 0.45})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  g.strokeStyle = "rgba(18,20,28,0.5)";
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
  tex.repeat.set(3, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeConcreteTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#4A4E58";
  g.fillRect(0, 0, 256, 256);
  const rnd = seededRand(777);
  for (let i = 0; i < 2600; i++) {
    const v = 62 + Math.floor(rnd() * 36);
    g.fillStyle = `rgba(${v},${v},${v + 6},${0.2 + rnd() * 0.4})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

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

// Glow merah radial untuk cahaya lampu rem (plane transparan).
function makeRedGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, "rgba(255,42,30,0.85)");
  grad.addColorStop(0.45, "rgba(255,42,30,0.35)");
  grad.addColorStop(1, "rgba(255,42,30,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Gradien langit dusk untuk sky dome.
function makeSkyTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(0.55, SKY);
  grad.addColorStop(0.8, SKY_HORIZON);
  grad.addColorStop(1, "#8A6F5C");
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ================= Fake AO contact shadow =================
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

// ================= Ink outline box =================
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
        <lineBasicMaterial color="#101418" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
};

// ================= Beam: silinder di antara dua titik =================
const Beam: React.FC<{
  a: [number, number, number];
  b: [number, number, number];
  r?: number;
  color: string;
  emissive?: string;
  opacity?: number;
}> = ({ a, b, r = 0.05, color, emissive, opacity = 1 }) => {
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
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
};

// ================= Camera rig + micro-handheld breathing =================
const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
  frame: number;
}> = ({ position, target, frame }) => {
  const camera = useThree((state) => state.camera);
  const bx = Math.sin(frame * 0.06) * 0.05;
  const by = Math.sin(frame * 0.06 + 1.3) * 0.05;
  camera.position.set(position[0] + bx, position[1] + by, position[2]);
  camera.lookAt(target[0], target[1], target[2]);
  return null;
};

// ================= Lighting rig malam (adaptasi Antigravity #2) =================
const LightingRig: React.FC = () => {
  const skyTex = useMemo(() => makeSkyTexture(), []);
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 35, 130]} />
      <mesh scale={[1, 1, 1]}>
        <sphereGeometry args={[150, 24, 16]} />
        <meshBasicMaterial map={skyTex} side={THREE.BackSide} fog={false} />
      </mesh>
      <ambientLight intensity={0.3} />
      <hemisphereLight args={["#8FA8CC", "#3A3340", 0.5]} />
      <directionalLight position={[20, 30, 10]} intensity={1.1} color="#FFC46B" />
      <directionalLight
        position={[-20, 15, -25]}
        intensity={0.5}
        color="#7FA8FF"
      />
    </>
  );
};

// ================= Roda (berputar mengikuti jarak: spin = s / R) =================
const WHEEL_R = 0.35;

const Wheel: React.FC<{ spin: number; width?: number }> = ({
  spin,
  width = 0.16,
}) => (
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
  </group>
);

// ================= Mobil prosedural toy (roda berputar) =================
// Dipakai untuk: mobil tengah S2, mobil lawan arah, taksi S3 diganti GLB.
// yaw: 0 = menghadap -Z (membelakangi kamera, seperti hero); PI/2 = profil.
const ProceduralCar: React.FC<{
  position: [number, number, number];
  yaw?: number;
  bodyColor: string;
  spin?: number;
  brakeOn?: boolean;
  brakePulse?: number;
  roofSign?: boolean;
  length?: number;
  height?: number;
}> = ({
  position,
  yaw = 0,
  bodyColor,
  spin = 0,
  brakeOn = false,
  brakePulse = 1,
  roofSign = false,
  length = 3.4,
  height = 1.0,
}) => {
  const halfL = length / 2;
  const wheelZ = halfL - 0.75;
  const bodyH = height * 0.55;
  const cabH = height * 0.42;
  const lampI = brakeOn ? 2.4 * brakePulse : 0.15;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* bodi + kabin */}
      <InkBox
        position={[0, bodyH / 2 + 0.12, 0]}
        size={[1.8, bodyH, length]}
        color={bodyColor}
        roughness={0.6}
      />
      <InkBox
        position={[0, bodyH + 0.12 + (cabH * 0.8) / 2, -0.15]}
        size={[1.4, cabH * 0.8, length * 0.45]}
        color={CABIN_GLASS}
        emissive="#22303F"
        emissiveIntensity={0.35}
        roughness={0.25}
      />
      {/* panel atap di atas kabin (membaca sebagai kabin, bukan balok hitam) */}
      <InkBox
        position={[0, bodyH + 0.12 + cabH * 0.8 + 0.03, -0.15]}
        size={[1.45, 0.06, length * 0.45]}
        color={bodyColor}
        roughness={0.6}
      />
      {/* atap taksi */}
      {roofSign && (
        <InkBox
          position={[0, bodyH + 0.12 + cabH * 0.8 + 0.16, 0.1]}
          size={[0.62, 0.2, 0.34]}
          color={AMBER}
          emissive={AMBER}
          emissiveIntensity={1.4}
        />
      )}
      {/* roda (sumbu X, putaran = spin) — di dalam lebar bodi supaya
          dari belakang tidak terbaca sebagai balok hitam di sisi mobil */}
      {([
        [-0.8, wheelZ],
        [0.8, wheelZ],
        [-0.8, -wheelZ],
        [0.8, -wheelZ],
      ] as [number, number][]).map(([x, z], i) => (
        <group key={i} position={[x, WHEEL_R, z]}>
          <Wheel spin={spin} />
        </group>
      ))}
      {/* lampu rem belakang (sisi +Z lokal = belakang saat yaw 0... 
          mobil menghadap -Z: belakang di +Z lokal) */}
      <InkBox
        position={[-0.62, 0.62, halfL + 0.01]}
        size={[0.42, 0.16, 0.06]}
        color={brakeOn ? BRAKE_RED : BRAKE_DIM}
        emissive={BRAKE_RED}
        emissiveIntensity={lampI}
        roughness={0.3}
      />
      <InkBox
        position={[0.62, 0.62, halfL + 0.01]}
        size={[0.42, 0.16, 0.06]}
        color={brakeOn ? BRAKE_RED : BRAKE_DIM}
        emissive={BRAKE_RED}
        emissiveIntensity={lampI}
        roughness={0.3}
      />
      {/* lampu depan (sisi -Z lokal) */}
      <InkBox
        position={[-0.62, 0.62, -halfL - 0.01]}
        size={[0.4, 0.14, 0.06]}
        color="#FFF6D8"
        emissive="#FFE9A8"
        emissiveIntensity={1.6}
        roughness={0.3}
      />
      <InkBox
        position={[0.62, 0.62, -halfL - 0.01]}
        size={[0.4, 0.14, 0.06]}
        color="#FFF6D8"
        emissive="#FFE9A8"
        emissiveIntensity={1.6}
        roughness={0.3}
      />
      <FakeAO
        position={[0, 0.02, 0]}
        scale={[2.6, 1.6, 1]}
        opacity={0.85}
      />
    </group>
  );
};

// ================= Lampu rem + CHMSL untuk mobil hero GLB =================
// Posisi dunia diturunkan dari bound mesh GLB (lihat header). Lampu
// bawah di bidang belakang (z -12.82), CHMSL di pangkal kaca belakang.
const BrakeLightBar: React.FC<{ pulse: number }> = ({ pulse }) => {
  const glowTex = useMemo(() => makeRedGlowTexture(), []);
  const lampI = 2.4 * pulse;
  const chmslI = 3.0 * pulse;
  return (
    <group>
      {/* lampu rem bawah kiri/kanan */}
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[LEAD_CAR[0] + s * LAMP_X, LAMP_Y, LAMP_Z]}>
          <mesh>
            <boxGeometry args={[0.44, 0.18, 0.08]} />
            <meshStandardMaterial
              color={BRAKE_RED}
              emissive={BRAKE_RED}
              emissiveIntensity={lampI}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
      {/* CHMSL: strip tengah di pangkal kaca belakang, miring ikut kaca */}
      <group
        position={[LEAD_CAR[0], CHMSL_Y, CHMSL_Z]}
        rotation={[-0.35, 0, 0]}
      >
        <mesh>
          <boxGeometry args={[0.62, 0.09, 0.1]} />
          <meshStandardMaterial
            color={BRAKE_RED}
            emissive={BRAKE_RED}
            emissiveIntensity={chmslI}
            roughness={0.3}
          />
        </mesh>
      </group>
      {/* glow merah di belakang mobil */}
      <mesh position={[LEAD_CAR[0], 0.95, LAMP_Z + 0.35]}>
        <planeGeometry args={[3.4, 1.5]} />
        <meshBasicMaterial
          map={glowTex}
          transparent
          opacity={0.55 * pulse}
          depthWrite={false}
        />
      </mesh>
      {/* cahaya merah titik di buritan */}
      <pointLight
        position={[LEAD_CAR[0], 1.1, LAMP_Z + 0.9]}
        color="#FF2222"
        intensity={1.1 * pulse}
        distance={10}
        decay={2}
      />
    </group>
  );
};

// ================= Close-up buritan (S5): panel prosedural =================
// Kamera sangat dekat — GLB disembunyikan, panel buritan prosedural yang
// posisinya diketahui persis (bukan tebakan dari bound GLB).
const RearPanel: React.FC<{ local: number; frame: number }> = ({
  local,
  frame,
}) => {
  // LED menyala seketika: ramp 0 -> penuh dalam 6 frame di awal scene.
  const snap = interpolate(local, [0, 6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.12);
  const chmslI = 3.2 * snap * pulse;
  const lampI = 2.4 * snap * pulse;
  const glowTex = useMemo(() => makeRedGlowTexture(), []);
  return (
    <group position={[0.9, 0, -14.9]}>
      {/* bodi buritan */}
      <InkBox
        position={[0, 0.75, 0]}
        size={[2.3, 1.3, 0.5]}
        color={CAR_BLUE}
        roughness={0.55}
      />
      {/* kaca belakang */}
      <InkBox
        position={[0, 1.12, 0.26]}
        size={[1.7, 0.52, 0.06]}
        color={GLASS}
        roughness={0.2}
      />
      {/* CHMSL strip */}
      <mesh position={[0, 1.42, 0.27]}>
        <boxGeometry args={[0.72, 0.1, 0.07]} />
        <meshStandardMaterial
          color={BRAKE_RED}
          emissive={BRAKE_RED}
          emissiveIntensity={chmslI}
          roughness={0.3}
        />
      </mesh>
      {/* lampu rem bawah */}
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[s * 0.72, 0.62, 0.27]}>
          <boxGeometry args={[0.52, 0.22, 0.07]} />
          <meshStandardMaterial
            color={BRAKE_RED}
            emissive={BRAKE_RED}
            emissiveIntensity={lampI}
            roughness={0.3}
          />
        </mesh>
      ))}
      {/* pelat nomor */}
      <InkBox
        position={[0, 0.32, 0.27]}
        size={[0.5, 0.14, 0.03]}
        color="#E8E6DF"
        roughness={0.5}
      />
      {/* glow (di antara lampu bawah, bukan di tengah kaca) */}
      <mesh position={[0, 0.75, 0.45]}>
        <planeGeometry args={[2.4, 1.0]} />
        <meshBasicMaterial
          map={glowTex}
          transparent
          opacity={0.35 * snap * pulse}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        position={[0, 0.8, 1.2]}
        color="#FF2222"
        intensity={0.9 * snap * pulse}
        distance={7}
        decay={2}
      />
      <FakeAO position={[0, 0.02, 0.4]} scale={[3.0, 1.4, 1]} opacity={0.85} />
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

// ================= Dunia 3D =================
const LAMP_ZS = [-10, -22, -34, -46];
const HOUSE_SPOTS: [number, number][] = [
  [-13, -28],
  [14, -30],
  [-14, -44],
  [13, -46],
];

const Scene: React.FC<{
  scene: number;
  local: number;
  frame: number;
  models: GlbModels | null;
}> = ({ scene, local, frame, models }) => {
  const asphaltTex = useMemo(() => makeNightAsphaltTexture(), []);
  const concreteTex = useMemo(() => makeConcreteTexture(), []);
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.12);
  // Mobil lawan arah (lajur kiri, x -2.8): melintas sepanjang video.
  const passerZ = 12 - (frame / 1665) * 64;
  const passerSpin = (12 - passerZ) / WHEEL_R;
  const carClone = useMemo(
    () => (models?.car ? models.car.clone() : null),
    [models]
  );
  const taxiClone = useMemo(
    () => (models?.car ? models.car.clone() : null),
    [models]
  );
  const lampClones = useMemo(
    () =>
      models?.lamp
        ? LAMP_ZS.map(() => models.lamp!.clone())
        : [],
    [models]
  );
  const houseClones = useMemo(
    () =>
      models?.house
        ? HOUSE_SPOTS.map(() => models.house!.clone())
        : [],
    [models]
  );
  const personClone = useMemo(
    () => (models?.person ? models.person.clone() : null),
    [models]
  );

  return (
    <group>
      <LightingRig />
      {/* bulan */}
      <mesh position={[-18, 33, -75]}>
        <circleGeometry args={[3.8, 32]} />
        <meshBasicMaterial color={MOON} fog={false} />
      </mesh>
      {/* skyline jauh: siluet gedung + jendela menyala */}
      {[
        [-16, 6, -58],
        [-8, 9, -62],
        [2, 7, -60],
        [10, 11, -63],
        [18, 6, -58],
      ].map(([x, h, z], i) => (
        <group key={i}>
          <InkBox
            position={[x, h / 2, z]}
            size={[7, h, 4]}
            color={BUILDING}
            roughness={1}
          />
          {[0.25, 0.5, 0.75].map((fy, j) => (
            <mesh key={j} position={[x - 1.5 + j * 1.5, h * fy, z + 2.05]}>
              <planeGeometry args={[0.7, 0.9]} />
              <meshBasicMaterial
                color={pseudo(i * 7 + j) > 0.38 ? BUILDING_LIT : "#2A3648"}
                transparent
                opacity={pseudo(i * 7 + j) > 0.38 ? 0.9 : 0.5}
              />
            </mesh>
          ))}
        </group>
      ))}
      {/* tanah + trotoar */}
      <mesh position={[0, -0.02, -30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 90]} />
        <meshStandardMaterial color={GROUND} roughness={1} />
      </mesh>
      <mesh position={[-6.8, 0.02, -30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 90]} />
        <meshStandardMaterial map={concreteTex} roughness={1} />
      </mesh>
      <mesh position={[6.8, 0.02, -30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 90]} />
        <meshStandardMaterial map={concreteTex} roughness={1} />
      </mesh>
      {/* jalan */}
      <mesh position={[0, 0.04, -30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 90]} />
        <meshStandardMaterial map={asphaltTex} roughness={0.95} />
      </mesh>
      {/* marka tengah (putus-putus) + tepi */}
      {Array.from({ length: 30 }, (_, i) => i).map((i) => {
        const z = 8 - i * 3;
        return (
          <mesh key={i} position={[-0.95, 0.06, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.18, 1.5]} />
            <meshStandardMaterial color="#C8C4B8" roughness={0.8} />
          </mesh>
        );
      })}
      {([-4.7, 4.7] as const).map((x) => (
        <mesh
          key={x}
          position={[x, 0.06, -30]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.14, 90]} />
          <meshStandardMaterial color="#8A8F98" roughness={0.8} />
        </mesh>
      ))}
      {/* lampu jalan GLB (layer midground) */}
      {lampClones.map((lamp, i) => (
        <primitive
          key={i}
          object={lamp}
          position={[i % 2 === 0 ? -5.4 : 5.4, 0, LAMP_ZS[i]]}
          rotation={[0, i % 2 === 0 ? 0.4 : -0.4, 0]}
        />
      ))}
      {/* rumah GLB (layer background) */}
      {houseClones.map((house, i) => (
        <primitive
          key={i}
          object={house}
          position={[HOUSE_SPOTS[i][0], 0, HOUSE_SPOTS[i][1]]}
          rotation={[0, pseudo(i) * 0.6 - 0.3, 0]}
        />
      ))}
      {/* mobil lawan arah (foreground gerak, roda berputar) */}
      {scene !== 2 && scene !== 4 && (
        <ProceduralCar
          position={[-2.8, 0, passerZ]}
          yaw={0}
          bodyColor="#7A4A52"
          spin={passerSpin}
          brakeOn={false}
        />
      )}
      {/* ======== per-scene ======== */}
      {scene === 2 ? (
        <>
          {/* S3 taksi 1970-an: GLB parkir di pangkalan + tanda taksi */}
          {taxiClone && (
            <primitive
              object={taxiClone}
              position={[0, 0, -14]}
              rotation={[0, Math.PI / 2, 0]}
            />
          )}
          <InkBox
            position={[0, 1.62, -14]}
            size={[0.62, 0.2, 0.34]}
            color={AMBER}
            emissive={AMBER}
            emissiveIntensity={1.4}
          />
          {personClone && (
            <primitive
              object={personClone}
              position={[2.2, 0, -12.2]}
              rotation={[0, -0.7, 0]}
            />
          )}
          <FakeAO position={[0, 0.02, -14]} scale={[3.2, 2.4, 1]} opacity={0.85} />
          <FakeAO position={[2.2, 0.02, -12.2]} scale={[0.9, 0.9, 1]} opacity={0.8} />
        </>
      ) : scene === 4 ? (
        <>
          {/* S5 close-up buritan prosedural */}
          <RearPanel local={local} frame={frame} />
        </>
      ) : (
        <>
          {/* S1/S2/S4/S6/S7: mobil hero GLB + lampu rem */}
          {carClone && (
            <primitive
              object={carClone}
              position={LEAD_CAR}
              rotation={[0, LEAD_YAW, 0]}
            />
          )}
          <BrakeLightBar pulse={pulse} />
          <FakeAO
            position={[LEAD_CAR[0], 0.02, LEAD_CAR[2]]}
            scale={[3.0, 2.6, 1]}
            opacity={0.85}
          />
          {/* S2: mobil tengah menutup lampu bawah + garis pandang amber
              (garis HANYA saat k6 — "tengah pandangan pengemudi belakang";
              mulai di depan mobil tengah supaya tidak membesar di depan
              lensa; tipis + redup) */}
          {scene === 1 && (
            <>
              <ProceduralCar
                position={MID_CAR}
                yaw={0}
                bodyColor={VAN_GREY}
                spin={0}
                brakeOn
                brakePulse={pulse}
                length={3.2}
                height={1.02}
              />
              {local >= 240 && (
                <>
                  <Beam
                    a={[0.9, 1.18, -5.5]}
                    b={[LEAD_CAR[0], CHMSL_Y, CHMSL_Z]}
                    r={0.02}
                    color={AMBER}
                    emissive={AMBER}
                    opacity={0.45}
                  />
                  <mesh position={[LEAD_CAR[0], CHMSL_Y, CHMSL_Z + 0.15]}>
                    <sphereGeometry args={[0.09, 12, 12]} />
                    <meshBasicMaterial color={AMBER} />
                  </mesh>
                </>
              )}
            </>
          )}
        </>
      )}
    </group>
  );
};

// ================= Kamera: keyframes per scene =================
// Ganti sudut tiap 3-6 detik (aturan 2): tiap scene punya 2-4 keyframe,
// diinterpolasi dengan easing bezier (orbit kontinu, bukan hard-cut).
type CamKey = {
  t: number;
  pos: [number, number, number];
  tgt: [number, number, number];
};

const camInterp = (
  keys: CamKey[],
  u: number
): { pos: [number, number, number]; tgt: [number, number, number] } => {
  const e = Easing.bezier(0.76, 0, 0.24, 1);
  let i = 0;
  while (i < keys.length - 2 && u >= keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const seg = interpolate(u, [a.t, b.t], [0, 1], {
    easing: e,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lerp = (p: number, q: number) => p + (q - p) * seg;
  return {
    pos: [
      lerp(a.pos[0], b.pos[0]),
      lerp(a.pos[1], b.pos[1]),
      lerp(a.pos[2], b.pos[2]),
    ],
    tgt: [
      lerp(a.tgt[0], b.tgt[0]),
      lerp(a.tgt[1], b.tgt[1]),
      lerp(a.tgt[2], b.tgt[2]),
    ],
  };
};

const CAM_KEYS: CamKey[][] = [
  // S1 hook: push-in dari kiri-belakang.
  [
    { t: 0, pos: [-3.4, 1.8, 2.0], tgt: [0.9, 1.1, -15] },
    { t: 0.5, pos: [-2.6, 1.6, 0.5], tgt: [0.9, 1.15, -15] },
    { t: 1, pos: [-2.2, 1.5, -0.5], tgt: [0.9, 1.2, -15] },
  ],
  // S2 lampu ketutup: turun ke mata pengemudi, lalu garis pandang.
  [
    { t: 0, pos: [-3.2, 1.7, 2.2], tgt: [0.9, 0.8, -8] },
    { t: 0.35, pos: [0.9, 1.15, 0.5], tgt: [0.9, 1.1, -15] },
    { t: 0.7, pos: [0.2, 1.3, 1.0], tgt: [0.9, 1.25, -15] },
    { t: 1, pos: [0.9, 1.25, 0.0], tgt: [0.9, 1.2, -15] },
  ],
  // S3 taksi: samping pangkalan, geser mendekat.
  [
    { t: 0, pos: [7.5, 2.4, -5], tgt: [0, 0.9, -14] },
    { t: 1, pos: [5.5, 1.8, -8], tgt: [0, 0.9, -14] },
  ],
  // S4 1986 + 4,3%: tinggi lalu ayun ke sisi lain.
  [
    { t: 0, pos: [-4.5, 4.2, -1], tgt: [0.9, 1.0, -15] },
    { t: 0.5, pos: [-3.0, 3.2, -3], tgt: [0.9, 1.1, -15] },
    { t: 1, pos: [2.5, 2.6, -4], tgt: [0.9, 1.1, -15] },
  ],
  // S5 close-up buritan: kamera mundur supaya panel 2,3 unit muat
  // (lebar pandang di 5,5 unit = 2,88 unit) + push-in halus.
  [
    { t: 0, pos: [0.9, 1.6, -9.6], tgt: [0.9, 1.2, -14.9] },
    { t: 1, pos: [0.9, 1.45, -10.4], tgt: [0.9, 1.15, -14.9] },
  ],
  // S6 wide: mundur lebar.
  [
    { t: 0, pos: [-5.5, 3.4, 4.5], tgt: [0.5, 1.0, -18] },
    { t: 1, pos: [-3.5, 2.8, 2.5], tgt: [0.5, 1.0, -18] },
  ],
  // S7 penutup: sisi kanan, mendekat.
  [
    { t: 0, pos: [4.5, 2.6, 2.0], tgt: [0, 1.0, -16] },
    { t: 1, pos: [3.5, 2.2, 0.5], tgt: [0, 1.0, -16] },
  ],
];

// ================= Overlay DOM =================
const Headline: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 170,
      left: 70,
      right: 70,
      textAlign: "center",
    }}
  >
    <MaskedKineticLine
      words={["KENAPA", "DI", "TENGAH?"]}
      fontSize={96}
      color="#FFFFFF"
      accentWord="TENGAH?"
      accentColor={AMBER}
      align="center"
    />
    <div
      style={{
        fontFamily: EDITORIAL_FONTS.sans,
        fontSize: 44,
        fontWeight: 700,
        color: "#FFFFFF",
        lineHeight: 1.25,
        marginTop: 18,
        textShadow: SHADOW,
      }}
    >
      Lampu kecil ini cegah seratus ribu tabrakan
    </div>
  </div>
);

// SUBTITLES per KALIMAT. start = frame global dari timestamp VO asli
// (ffprobe 55.512 dtk + faster-whisper tiny word timestamps, 2026-11-27).
// BUKAN estimasi jumlah kata.
const SUBS: { text: string; highlight: string; start: number }[] = [
  { text: "Lampu kecil ini cegah seratus ribu tabrakan.", highlight: "tabrakan", start: 0 },
  { text: "Lampu rem ketiga itu bukan hiasan.", highlight: "hiasan", start: 106 },
  { text: "Dia ada di tengah, setinggi mata lo.", highlight: "tengah", start: 180 },
  { text: "Dua lampu bawah sering ketutup mobil di depan.", highlight: "ketutup", start: 259 },
  { text: "Lampu tengah ini tetap kelihatan dari jauh.", highlight: "kelihatan", start: 342 },
  { text: "Posisinya pas di tengah pandangan pengemudi belakang.", highlight: "pandangan", start: 425 },
  { text: "Idenya lahir dari uji taksi tahun tujuh puluhan.", highlight: "taksi", start: 534 },
  { text: "Di uji itu, tabrakan belakang turun sampai separuh.", highlight: "separuh", start: 630 },
  { text: "Amerika lalu mewajibkannya di semua mobil baru.", highlight: "mewajibkannya", start: 734 },
  { text: "Mulai tahun delapan enam.", highlight: "delapan", start: 840 },
  { text: "Tabrakan belakang turun empat koma tiga persen.", highlight: "tiga", start: 883 },
  { text: "Sembilan puluh dua ribu tabrakan dicegah tiap tahun.", highlight: "ribu", start: 981 },
  { text: "Sekarang rata-rata sudah LED, nyalanya lebih cepat.", highlight: "LED", start: 1087 },
  { text: "Beda sepersekian detik saja bisa batalin tabrakan.", highlight: "batalin", start: 1188 },
  { text: "Jadi lampu kecil itu penjaga di kaca belakang.", highlight: "penjaga", start: 1298 },
  { text: "Lampu kecil di tengah kaca, tugasnya gede banget.", highlight: "tugasnya", start: 1411 },
  { text: "Makanya kalau mati satu, jangan dibiarkan.", highlight: "dibiarkan", start: 1509 },
  { text: "Lampu rem ketiga mobil lo masih nyala?", highlight: "nyala", start: 1604 },
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
          const isMatch =
            clean === highlight.toLowerCase().replace(/[^a-z0-9°–-]/g, "");
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

const BigNumber: React.FC<{
  value: string;
  caption: string;
  top?: number;
  local: number;
  fontSize?: number;
}> = ({ value, caption, top = 480, local, fontSize = 110 }) => {
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
          fontSize,
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
    Sumber: NHTSA DOT HS 808 696 (1998)
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
// RETIME FINAL dari VO asli (ffprobe 55.512 dtk, 1666f @30fps;
// kalimat dari faster-whisper tiny word timestamps, 2026-11-27).
// Scene: S1 hook (k1-k2), S2 lampu ketutup (k3-k6), S3 taksi (k7-k8),
// S4 1986 + 4,3% (k9-k12), S5 LED close-up (k13-k14),
// S6 penjaga (k15-k17), S7 penutup (k18).
// Ucapan terakhir berakhir 55.16 dtk — TIDAK ADA tail tak bernaskah.
export const TOTAL_FRAMES = 1666;

const SCENE_BOUNDS = [0, 180, 534, 734, 1087, 1298, 1604, 1666];

export const LampuRemKetigaExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps;
  useEditorialFonts();

  const [models, setModels] = useState<GlbModels | null>(null);
  const [handle] = useState(() => delayRender("Loading GLB models lampu-rem-ketiga"));
  useEffect(() => {
    let cancelled = false;
    const jobs: [keyof GlbModels, string, number][] = [
      ["lamp", "models/streetlamp/street-light.glb", 4.5],
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
  for (let i = 0; i < 7; i++) {
    if (frame >= SCENE_BOUNDS[i] && frame < SCENE_BOUNDS[i + 1]) {
      scene = i;
      break;
    }
  }
  const sceneLen = SCENE_BOUNDS[scene + 1] - SCENE_BOUNDS[scene];
  const local = frame - SCENE_BOUNDS[scene];
  const u = sceneLen > 1 ? local / (sceneLen - 1) : 0;
  const { pos: camPos, tgt: camTarget } = camInterp(CAM_KEYS[scene], u);

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
      >
        <Scene scene={scene} local={local} frame={frame} models={models} />
        <CameraRig position={camPos} target={camTarget} frame={frame} />
      </ThreeCanvas>
      {scene === 0 && <Headline />}
      <Subtitle frame={frame} />
      {scene === 0 && (
        <BigNumber
          value="92.000–137.000"
          caption="tabrakan dicegah per tahun (NHTSA)"
          top={640}
          local={local}
          fontSize={84}
        />
      )}
      {scene === 2 && (
        <BigNumber
          value="48–54%"
          caption="tabrakan belakang turun — uji armada taksi 1970-an"
          top={520}
          local={local}
        />
      )}
      {scene === 3 && (
        <>
          <div
            style={{
              position: "absolute",
              top: 480,
              left: 70,
              right: 70,
              textAlign: "center",
              fontFamily: EDITORIAL_FONTS.display,
              fontSize: 64,
              fontWeight: 800,
              color: "#FFFFFF",
              textShadow: SHADOW,
            }}
          >
            WAJIB SEJAK 1986
          </div>
          <BigNumber
            value="4,3%"
            caption="tabrakan belakang turun — jangka panjang 1989–95"
            top={580}
            local={local}
          />
        </>
      )}
      {scene === 6 && (
        <>
          <div
            style={{
              position: "absolute",
              top: 500,
              left: 70,
              right: 70,
              textAlign: "center",
              fontFamily: EDITORIAL_FONTS.sans,
              fontSize: 58,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.3,
              textShadow: SHADOW,
            }}
          >
            Lampu rem ketiga mobil lo masih nyala?
          </div>
          <SourceLine />
        </>
      )}
      <WatermarkText />

      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      <Audio src={staticFile("audio/lampu-rem-ketiga/vo_sami.mp3")} volume={1} />
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {SCENE_BOUNDS.slice(0, 7).map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      <Sequence from={SCENE_BOUNDS[1]} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={SCENE_BOUNDS[3]} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
