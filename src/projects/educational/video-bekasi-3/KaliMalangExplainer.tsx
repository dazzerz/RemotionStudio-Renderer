import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ================= KaliMalangExplainer — "Kenapa Jembatan Kali Malang Dibikin Tinggi Banget?" =================
// 1349 frame = 44.96 detik, 30fps, 1080x1920. 9 scene x 150 frame.
// VO Sami 44.96 detik (ffprobe) — durasi komposisi = durasi VO.
// Profil B toy-explainer, TANPA header band / kotak gelap (judul + subtitle
// melayang bebas dengan text-shadow tebal). Visual 3D detail mirip aslinya
// (tetap kartun): Jembatan Lengkung Kalimalang (lengkung beton putih/krem,
// pagar besi, trotoar, lampu hias), Kali Malang (kanal lurus, air hijau
// kecoklatan, turap beton), Tol Becakayu (jalan layang beton di latar),
// perahu wisata kayu beratap + penumpang. Environment PENUH: pohon,
// bangunan, lampu jalan, tiang, awan, bukit 2 lapis, marka, guardrail,
// orang siluet, kontainer UMKM. Penempatan masuk akal: perahu DI DALAM air,
// mobil DI ATAS jalan/jembatan, jembatan DI ATAS sungai.
// NO AUDIO di komposisi ini (VO/BGM/SFX dipasang terpisah nanti).

// ================= Palette (terang, warm cream / langit cerah) =================
const SKY = "#BFE0EE";
const GROUND = "#A8C3A0";
const HILL_FAR = "#7FA06E";
const HILL_NEAR = "#B5CBA8";
const CREAM = "#FFF8E7";
const CONCRETE = "#B5B5AC";
const CONCRETE_DARK = "#9A9A90";
const CONCRETE_LIGHT = "#D8D8CE";
const ASPHALT = "#5C5C5C";
const ROAD_EDGE = "#F5F5F0";
const ORANGE = "#FF7A00";
const AMBER = "#FFB300";
const GLASS = "#6E93B0";
const GLASS_LIGHT = "#A8C8DC";
const TIRE = "#262626";
const HUB = "#D8D8D8";
const RED = "#E63946";
const HEADLIGHT = "#FFF3C4";
const TRUNK = "#8B6B4A";
const LEAF = "#5E9B4D";
const LEAF_LIGHT = "#7FB069";
const WATER = "#5F7D5C";
const WATER_DARK = "#4E6B4D";
const WOOD = "#8B5E34";
const WOOD_DARK = "#6E4A26";
const ARCH_WHITE = "#F5EFE0";
const STEEL = "#C8C8C8";
const TEAL = "#2A9D8F";

const FONT = "Inter, Arial, sans-serif";

// ================= Geometri kanal + jembatan =================
// Kanal sepanjang sumbu Z. Air y=0, tepi kanal x=±7, permukaan tanah y=2.
const BANK_Y = 2;
const CANAL_HALF = 7;
// Jembatan lengkung baru: bentang x ∈ [-9, 9], tinggi puncak 1,2 di atas tanah.
const ARCH_HALF = 9;
const ARCH_RISE = 1.2;

// Tinggi permukaan jalan di atas lengkung (deck top) pada posisi x.
function archDeckTop(x: number): number {
  const t = Math.max(-1, Math.min(1, x / ARCH_HALF));
  return BANK_Y + 0.3 + ARCH_RISE * (1 - t * t);
}
// Kemiringan deck (dy/dx) pada posisi x.
function archSlope(x: number): number {
  return (-2 * ARCH_RISE * x) / (ARCH_HALF * ARCH_HALF);
}

// Frame jalan di atas jembatan: posisi + quaternion dari basis
// (lateral Z dunia, tegak tegak lurus deck, tangen arah +X).
function bridgeFrame(
  x: number,
  z: number,
  mode: "new" | "old"
): { pos: THREE.Vector3; quat: THREE.Quaternion } {
  const slope = mode === "new" ? archSlope(x) : 0;
  const y = mode === "new" ? archDeckTop(x) : BANK_Y + 0.05;
  const T = new THREE.Vector3(1, slope, 0).normalize();
  const L = new THREE.Vector3(0, 0, -1);
  const U = new THREE.Vector3().crossVectors(T, L).normalize();
  const quat = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(L, U, T)
  );
  return { pos: new THREE.Vector3(x, y, z), quat };
}

// ================= Camera rig (gerak deterministik dari frame) =================
const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
}> = ({ position, target }) => {
  const camera = useThree((state) => state.camera);
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(target[0], target[1], target[2]);
  return null;
};

// ================= Mobil mainan DETAIL (mirip mobil asli, tetap kartun) =================
const WHEEL_POS: [number, number][] = [
  [0.95, 1.15],
  [-0.95, 1.15],
  [0.95, -1.15],
  [-0.95, -1.15],
];

const Car: React.FC<{
  pos: [number, number, number];
  rotY?: number;
  quat?: THREE.Quaternion;
  color?: string;
  scale?: number;
}> = ({ pos, rotY = 0, quat, color = ORANGE, scale = 1 }) => (
  <group position={pos} rotation={quat ? undefined : [0, rotY, 0]} quaternion={quat} scale={[scale, scale, scale]}>
    <mesh position={[0, 0.72, 0]}>
      <boxGeometry args={[1.9, 0.62, 3.4]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
    <mesh position={[0, 0.42, 0]}>
      <boxGeometry args={[1.94, 0.18, 3.44]} />
      <meshStandardMaterial color="#E66A00" roughness={0.7} />
    </mesh>
    {/* kabin kaca BIRU-ABU (bukan hitam pekat) */}
    <mesh position={[0, 1.32, -0.2]}>
      <boxGeometry args={[1.6, 0.55, 1.7]} />
      <meshStandardMaterial color={GLASS} roughness={0.2} metalness={0.15} />
    </mesh>
    <mesh position={[0, 1.34, 1.02]} rotation={[0.28, 0, 0]}>
      <boxGeometry args={[1.5, 0.42, 0.08]} />
      <meshStandardMaterial color={GLASS_LIGHT} roughness={0.15} metalness={0.2} />
    </mesh>
    <mesh position={[0, 1.63, -0.2]}>
      <boxGeometry args={[1.55, 0.08, 1.6]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
    {[-0.6, 0.6].map((x) => (
      <mesh key={`tail-${x}`} position={[x, 0.85, -1.72]}>
        <boxGeometry args={[0.36, 0.18, 0.06]} />
        <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={0.55} roughness={0.4} />
      </mesh>
    ))}
    {[-0.6, 0.6].map((x) => (
      <mesh key={`head-${x}`} position={[x, 0.85, 1.72]}>
        <boxGeometry args={[0.36, 0.18, 0.06]} />
        <meshStandardMaterial color={HEADLIGHT} emissive={HEADLIGHT} emissiveIntensity={0.45} roughness={0.4} />
      </mesh>
    ))}
    {WHEEL_POS.map(([x, z], i) => (
      <group key={i}>
        <mesh position={[x, 0.38, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.38, 0.38, 0.32, 20]} />
          <meshStandardMaterial color={TIRE} roughness={0.9} />
        </mesh>
        <mesh position={[x, 0.38, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.34, 16]} />
          <meshStandardMaterial color={HUB} roughness={0.35} metalness={0.3} />
        </mesh>
      </group>
    ))}
    <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.15, 1.95, 1]}>
      <circleGeometry args={[1, 24]} />
      <meshStandardMaterial color="#000000" transparent opacity={0.28} roughness={1} />
    </mesh>
  </group>
);

// ================= Perahu wisata (kayu beratap + penumpang, DI DALAM air) =================
const PASSENGERS: { x: number; z: number; color: string }[] = [
  { x: -0.55, z: -1.1, color: RED },
  { x: 0.55, z: -1.1, color: TEAL },
  { x: -0.55, z: 0.1, color: AMBER },
  { x: 0.55, z: 0.1, color: "#3B82F6" },
  { x: -0.55, z: 1.2, color: "#7C3AED" },
  { x: 0.55, z: 1.2, color: "#EC4899" },
];

const Boat: React.FC<{ z: number; passengers: boolean }> = ({ z, passengers }) => (
  // Perahu bergerak ke arah -z, jadi haluan (kerucut) diputar menghadap -z
  <group position={[0, 0, z]} rotation={[0, Math.PI, 0]}>
    {/* lambung kayu */}
    <mesh position={[0, 0.15, 0]}>
      <boxGeometry args={[2.2, 0.7, 4.5]} />
      <meshStandardMaterial color={WOOD} roughness={0.85} />
    </mesh>
    {/* bibir lambung */}
    <mesh position={[0, 0.52, 0]}>
      <boxGeometry args={[2.4, 0.14, 4.7]} />
      <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
    </mesh>
    {/* haluan runcing (kerucut 4 sisi, menghadap +z, dipipihkan) */}
    <mesh position={[0, 0.15, 2.85]} rotation={[Math.PI / 2, 0, Math.PI / 4]} scale={[1, 1, 0.45]}>
      <coneGeometry args={[1.05, 1.3, 4]} />
      <meshStandardMaterial color={WOOD} roughness={0.85} />
    </mesh>
    {/* 4 tiang atap */}
    {[
      [-0.95, -1.6],
      [0.95, -1.6],
      [-0.95, 1.6],
      [0.95, 1.6],
    ].map(([x, bz], i) => (
      <mesh key={`post-${i}`} position={[x, 1.2, bz]}>
        <cylinderGeometry args={[0.07, 0.07, 1.4, 8]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>
    ))}
    {/* atap kanopi krem — puncak atap y=2.0 (lebih tinggi dari bawah deck jembatan lama 1,2 → mentok) */}
    <mesh position={[0, 1.95, 0]}>
      <boxGeometry args={[2.3, 0.1, 3.9]} />
      <meshStandardMaterial color={CREAM} roughness={0.8} />
    </mesh>
    {/* penumpang duduk (siluet sederhana, tanpa wajah) */}
    {passengers &&
      PASSENGERS.map((p, i) => (
        <group key={`pax-${i}`} position={[p.x, 0.55, p.z]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.22, 0.26, 0.6, 10]} />
            <meshStandardMaterial color={p.color} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <sphereGeometry args={[0.17, 12, 10]} />
            <meshStandardMaterial color="#E8C39E" roughness={0.9} />
          </mesh>
        </group>
      ))}
    {/* bayangan di air */}
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.35, 2.9, 1]}>
      <circleGeometry args={[1, 24]} />
      <meshStandardMaterial color="#000000" transparent opacity={0.18} roughness={1} />
    </mesh>
  </group>
);

// ================= Pohon =================
const TREES: { x: number; z: number; s: number }[] = [
  { x: -18, z: 28, s: 1.0 },
  { x: -22, z: 8, s: 1.2 },
  { x: -18, z: -14, s: 0.9 },
  { x: -23, z: -34, s: 1.1 },
  { x: -18, z: -52, s: 1.0 },
  { x: -24, z: -68, s: 1.3 },
  { x: 20, z: 8, s: 1.1 },
  { x: 22, z: -2, s: 1.0 },
  { x: 18, z: -26, s: 1.2 },
  { x: 23, z: -48, s: 1.0 },
  { x: 18, z: -64, s: 1.1 },
  { x: 28, z: 55, s: 0.9 },
  { x: -19, z: -80, s: 1.2 },
  { x: 20, z: -82, s: 1.2 },
];

const Tree: React.FC<{ x: number; z: number; s: number }> = ({ x, z, s }) => (
  <group position={[x, BANK_Y, z]} scale={[s, s, s]}>
    <mesh position={[0, 0.6, 0]}>
      <cylinderGeometry args={[0.22, 0.3, 1.2, 10]} />
      <meshStandardMaterial color={TRUNK} roughness={1} />
    </mesh>
    <mesh position={[0, 2.0, 0]}>
      <coneGeometry args={[1.25, 2.6, 12]} />
      <meshStandardMaterial color={LEAF} roughness={1} />
    </mesh>
    <mesh position={[0, 3.3, 0]}>
      <sphereGeometry args={[0.95, 16, 12]} />
      <meshStandardMaterial color={LEAF_LIGHT} roughness={1} />
    </mesh>
  </group>
);

// ================= Awan (tepi, bukan tengah atas) =================
const CLOUDS: { pos: [number, number, number]; scale: number }[] = [
  { pos: [-55, 38, -90], scale: 1.0 },
  { pos: [52, 42, -75], scale: 1.25 },
  { pos: [-28, 40, -120], scale: 0.85 },
  { pos: [72, 36, -105], scale: 1.05 },
];

const Cloud: React.FC<{ position: [number, number, number]; scale: number }> = ({
  position,
  scale,
}) => (
  <group position={position} scale={[scale, scale, scale]}>
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

// ================= Bukit 2 lapis =================
const HILLS: {
  pos: [number, number, number];
  scale: [number, number, number];
  color: string;
}[] = [
  { pos: [-60, -1, -118], scale: [55, 13, 30], color: HILL_FAR },
  { pos: [62, -1, -122], scale: [60, 15, 32], color: HILL_FAR },
  { pos: [-45, -1, -88], scale: [35, 7, 22], color: HILL_NEAR },
  { pos: [50, -1, -92], scale: [38, 8, 24], color: HILL_NEAR },
];

// ================= Bangunan (kotak + jendela, jauh dari kanal) =================
const BUILDINGS: {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
}[] = [
  { x: -44, z: 18, w: 10, h: 12, d: 10, color: "#E8DCC8" },
  { x: -42, z: -12, w: 9, h: 8, d: 9, color: "#C8D4DE" },
  { x: -46, z: -42, w: 11, h: 15, d: 10, color: "#D8E4C8" },
  { x: -43, z: -66, w: 9, h: 10, d: 9, color: "#E8DCC8" },
  { x: 40, z: 30, w: 10, h: 9, d: 10, color: "#C8D4DE" },
  { x: 42, z: -8, w: 9, h: 13, d: 9, color: "#E8DCC8" },
  { x: 38, z: -38, w: 11, h: 8, d: 10, color: "#D8E4C8" },
  { x: 44, z: -62, w: 10, h: 11, d: 10, color: "#C8D4DE" },
  { x: 40, z: -84, w: 9, h: 7, d: 9, color: "#E8DCC8" },
  { x: -45, z: -88, w: 10, h: 9, d: 10, color: "#D8E4C8" },
];

const Building: React.FC<{
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
}> = ({ x, z, w, h, d, color }) => {
  const faceX = x < 0 ? 1 : -1; // sisi menghadap kanal
  return (
    <group position={[x, BANK_Y, z]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh position={[0, h + 0.25, 0]}>
        <boxGeometry args={[w + 0.4, 0.5, d + 0.4]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.95} />
      </mesh>
      {/* jendela di sisi menghadap kanal */}
      {[0.25, 0.55, 0.8].map((fy, i) => (
        <mesh key={`win-${i}`} position={[faceX * (w / 2 + 0.05), h * fy, 0]}>
          <boxGeometry args={[0.08, h * 0.14, d * 0.55]} />
          <meshStandardMaterial color={GLASS} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

// ================= Orang siluet (tanpa wajah detail) =================
const PEOPLE: { x: number; z: number; color: string; s: number }[] = [
  { x: -8.4, z: 26, color: RED, s: 1 },
  { x: -8.4, z: 20, color: AMBER, s: 1.05 },
  { x: 8.4, z: -18, color: "#3B82F6", s: 0.95 },
  { x: -8.4, z: -14, color: TEAL, s: 1 },
  { x: 8.4, z: -24, color: "#7C3AED", s: 0.9 },
  { x: -8.4, z: -22, color: "#EC4899", s: 1 },
];

const Person: React.FC<{ x: number; z: number; color: string; s: number }> = ({
  x,
  z,
  color,
  s,
}) => (
  <group position={[x, BANK_Y, z]} scale={[s, s, s]}>
    <mesh position={[0, 0.55, 0]}>
      <cylinderGeometry args={[0.24, 0.28, 1.1, 10]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
    <mesh position={[0, 1.32, 0]}>
      <sphereGeometry args={[0.2, 12, 10]} />
      <meshStandardMaterial color="#E8C39E" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.45, 16]} />
      <meshStandardMaterial color="#000000" transparent opacity={0.2} roughness={1} />
    </mesh>
  </group>
);

// ================= Jembatan lengkung baru (mirip Jembatan Lengkung Kalimalang) =================
// Deck mengikuti busur: ujung y=2,3, puncak y=3,5. Bawah deck di tengah y=3,1
// → jarak bebas air (y=0) ke bawah deck ≈ 3,1 m (badge: 2,5–3 m).
const ARCH_SEGMENTS: number[] = [];
for (let i = 0; i < 18; i++) ARCH_SEGMENTS.push(-8.5 + i);

const ArchBridge: React.FC<{ z: number; ghost?: boolean }> = ({ z, ghost }) => {
  const ribGeo = useMemo(() => {
    const mkRib = (zz: number) => {
      const pts: THREE.Vector3[] = [];
      for (let x = -9; x <= 9; x += 1.5) {
        pts.push(new THREE.Vector3(x, archDeckTop(x) - 0.7, zz));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      return new THREE.TubeGeometry(curve, 24, 0.32, 10, false);
    };
    return { front: mkRib(2.9), back: mkRib(-2.9) };
  }, []);

  const mat = ghost
    ? { color: "#C8D8E8", transparent: true, opacity: 0.45, roughness: 0.8 }
    : { color: ARCH_WHITE, roughness: 0.8 };
  const roadMat = ghost
    ? { color: ASPHALT, transparent: true, opacity: 0.45, roughness: 0.9 }
    : { color: ASPHALT, roughness: 0.9 };

  return (
    <group position={[0, 0, z]}>
      {/* rusuk lengkung (tube) di kedua sisi deck */}
      <mesh geometry={ribGeo.front}>
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh geometry={ribGeo.back}>
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* segmen deck mengikuti busur */}
      {ARCH_SEGMENTS.map((x) => {
        const rot = Math.atan(archSlope(x));
        return (
          <group key={`seg-${x}`}>
            <mesh position={[x, archDeckTop(x) - 0.2, 0]} rotation={[0, 0, rot]}>
              <boxGeometry args={[1.05, 0.4, 7]} />
              <meshStandardMaterial {...mat} />
            </mesh>
            {/* lajur aspal */}
            <mesh position={[x, archDeckTop(x) + 0.03, 0]} rotation={[0, 0, rot]}>
              <boxGeometry args={[1.05, 0.06, 4.6]} />
              <meshStandardMaterial {...roadMat} />
            </mesh>
            {/* trotoar kiri-kanan */}
            <mesh position={[x, archDeckTop(x) + 0.06, 2.95]} rotation={[0, 0, rot]}>
              <boxGeometry args={[1.05, 0.12, 1.1]} />
              <meshStandardMaterial color={CONCRETE_LIGHT} roughness={0.9} transparent={ghost} opacity={ghost ? 0.45 : 1} />
            </mesh>
            <mesh position={[x, archDeckTop(x) + 0.06, -2.95]} rotation={[0, 0, rot]}>
              <boxGeometry args={[1.05, 0.12, 1.1]} />
              <meshStandardMaterial color={CONCRETE_LIGHT} roughness={0.9} transparent={ghost} opacity={ghost ? 0.45 : 1} />
            </mesh>
            {/* pagar besi */}
            <mesh position={[x, archDeckTop(x) + 0.45, 3.42]} rotation={[0, 0, rot]}>
              <boxGeometry args={[1.05, 0.08, 0.08]} />
              <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} transparent={ghost} opacity={ghost ? 0.45 : 1} />
            </mesh>
            <mesh position={[x, archDeckTop(x) + 0.45, -3.42]} rotation={[0, 0, rot]}>
              <boxGeometry args={[1.05, 0.08, 0.08]} />
              <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} transparent={ghost} opacity={ghost ? 0.45 : 1} />
            </mesh>
            {/* marka tengah putus-putus */}
            {Math.round(x) % 2 === 0 && (
              <mesh position={[x, archDeckTop(x) + 0.07, 0]} rotation={[0, 0, rot]}>
                <boxGeometry args={[0.18, 0.03, 1.6]} />
                <meshStandardMaterial color={ROAD_EDGE} roughness={0.9} transparent={ghost} opacity={ghost ? 0.45 : 1} />
              </mesh>
            )}
          </group>
        );
      })}
      {/* lampu hias di atas jembatan */}
      {!ghost &&
        [-6, -2, 2, 6].map((x) =>
          [3.42, -3.42].map((zz) => (
            <group key={`lamp-${x}-${zz}`}>
              <mesh position={[x, archDeckTop(x) + 0.8, zz]}>
                <cylinderGeometry args={[0.07, 0.09, 1.6, 8]} />
                <meshStandardMaterial color="#4A4A4A" roughness={0.6} metalness={0.3} />
              </mesh>
              <mesh position={[x, archDeckTop(x) + 1.65, zz]}>
                <sphereGeometry args={[0.17, 12, 10]} />
                <meshStandardMaterial color="#FFE9A8" emissive="#FFE9A8" emissiveIntensity={0.7} roughness={0.4} />
              </mesh>
            </group>
          ))
        )}
    </group>
  );
};

// ================= Jembatan lama RENDAH (deck bawah y=1,2 — perahu atap 2,0 mentok) =================
const FlatBridge: React.FC<{ z: number; small?: boolean }> = ({ z, small }) => {
  const w = small ? 10 : 18;
  const d = small ? 4 : 5.5;
  return (
    <group position={[0, 0, z]}>
      {/* deck datar: atas y=2,0 (rata jalan), bawah y=1,2 */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[w, 0.8, d]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.03, 0]}>
        <boxGeometry args={[w, 0.06, 4.6]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.9} />
      </mesh>
      {/* 2 pilar di dalam air */}
      {!small &&
        [-3.5, 3.5].map((x) => (
          <mesh key={`pillar-${x}`} position={[x, 0.6, 0]}>
            <boxGeometry args={[1.2, 1.2, 4.5]} />
            <meshStandardMaterial color={CONCRETE_DARK} roughness={0.95} />
          </mesh>
        ))}
      {/* pagar besi */}
      <mesh position={[0, 2.45, d / 2 - 0.15]}>
        <boxGeometry args={[w, 0.08, 0.08]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.45, -d / 2 + 0.15]}>
        <boxGeometry args={[w, 0.08, 0.08]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* marka tengah */}
      {[-6, -2, 2, 6].map((x) => (
        <mesh key={`dash-${x}`} position={[x, 2.07, 0]}>
          <boxGeometry args={[0.18, 0.03, 1.6]} />
          <meshStandardMaterial color={ROAD_EDGE} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

// ================= Sampah / puing mengambang =================
const DEBRIS_STUCK: { x: number; z: number; r: number }[] = [
  { x: -4.4, z: 24.5, r: 0.4 },
  { x: -3.2, z: 25.2, r: -0.3 },
  { x: 3.8, z: 24.8, r: 0.9 },
  { x: 4.6, z: 25.5, r: 0.2 },
  { x: -2.6, z: 25.8, r: 0.7 },
];

const Debris: React.FC<{ x: number; z: number; r: number; y?: number }> = ({ x, z, r, y = 0.15 }) => (
  <mesh position={[x, y, z]} rotation={[0, r, 0]}>
    <boxGeometry args={[0.7, 0.3, 0.9]} />
    <meshStandardMaterial color="#7A5C3E" roughness={1} />
  </mesh>
);

// ================= Tol Becakayu (jalan layang beton di latar, x=-28) =================
const TOLL_PILLARS: number[] = [];
for (let z = -90; z <= 60; z += 15) TOLL_PILLARS.push(z);

const TollRoad: React.FC<{ frame: number }> = ({ frame }) => {
  // 2 mobil kecil di atas tol, bergerak pelan sepanjang z
  const car1Z = 40 - ((frame * 0.22) % 140);
  const car2Z = -60 + ((frame * 0.18) % 140);
  return (
    <group>
      {TOLL_PILLARS.map((z) => (
        <mesh key={`tp-${z}`} position={[-28, 4, z]}>
          <boxGeometry args={[1.6, 8, 1.6]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.95} />
        </mesh>
      ))}
      {/* deck layang */}
      <mesh position={[-28, 8.4, -15]}>
        <boxGeometry args={[8, 0.8, 150]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.95} />
      </mesh>
      <mesh position={[-28, 8.83, -15]}>
        <boxGeometry args={[6.5, 0.06, 150]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.9} />
      </mesh>
      {/* guardrail tol */}
      <mesh position={[-24.1, 9.3, -15]}>
        <boxGeometry args={[0.12, 0.7, 150]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[-31.9, 9.3, -15]}>
        <boxGeometry args={[0.12, 0.7, 150]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* mobil kecil di tol */}
      <Car pos={[-26.5, 8.9, car1Z]} rotY={Math.PI} color={ORANGE} scale={0.8} />
      <Car pos={[-29.5, 8.9, car2Z]} rotY={0} color="#FFFFFF" scale={0.8} />
    </group>
  );
};

// ================= Dermaga + kontainer UMKM (scene wisata) =================
const DockAndStalls: React.FC = () => (
  <group>
    {/* dermaga kayu di tepi kanal */}
    <mesh position={[8.6, 2.1, -14]}>
      <boxGeometry args={[2.6, 0.3, 6]} />
      <meshStandardMaterial color={WOOD} roughness={0.9} />
    </mesh>
    {[
      [7.6, -11.5],
      [9.6, -11.5],
      [7.6, -16.5],
      [9.6, -16.5],
    ].map(([x, z], i) => (
      <mesh key={`dockpost-${i}`} position={[x, 1.1, z]}>
        <cylinderGeometry args={[0.12, 0.12, 2, 8]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>
    ))}
    {/* kontainer UMKM warna-warni */}
    {[
      { z: -10, color: RED },
      { z: -16.5, color: AMBER },
      { z: -23, color: TEAL },
    ].map((c, i) => (
      <group key={`stall-${i}`}>
        <mesh position={[14.5, 3.3, c.z]}>
          <boxGeometry args={[3, 2.6, 5]} />
          <meshStandardMaterial color={c.color} roughness={0.8} />
        </mesh>
        <mesh position={[14.5, 4.75, c.z]}>
          <boxGeometry args={[3.4, 0.15, 5.4]} />
          <meshStandardMaterial color={CREAM} roughness={0.8} />
        </mesh>
      </group>
    ))}
  </group>
);

// ================= Scene 3D =================
export type BridgeMode = "old" | "new" | "both" | "ghost5";

const Scene: React.FC<{
  frame: number;
  bridge: BridgeMode;
  boatZ: number;
  boat2Z: number | null;
  boatPassengers: boolean;
  flood: boolean;
  crossCars: { x: number; lane: number; color: string }[];
  jam: boolean;
  showDock: boolean;
}> = ({ frame, bridge, boatZ, boat2Z, boatPassengers, flood, crossCars, jam, showDock }) => {
  // Garis aliran air (bergerak deterministik mengikuti frame)
  const flowStripes = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const z = ((i * 9 + frame * 0.14) % 150) - 75;
      out.push({ x: -5 + (i % 5) * 2.5, z });
    }
    return out;
  }, [frame]);

  const oldBridgeZ = bridge === "both" ? 22 : 0;

  return (
    <>
      <color attach="background" args={[SKY]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[30, 50, 20]} intensity={1.25} />
      <directionalLight position={[-20, 30, -30]} intensity={0.35} />

      {/* tanah di kedua sisi kanal */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-33.8, 1.8, -15]}>
        <planeGeometry args={[52, 150]} />
        <meshStandardMaterial color={GROUND} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[33.8, 1.8, -15]}>
        <planeGeometry args={[52, 150]} />
        <meshStandardMaterial color={GROUND} roughness={1} />
      </mesh>

      {/* bukit 2 lapis + awan */}
      {HILLS.map((h, i) => (
        <mesh key={`hill-${i}`} position={h.pos} scale={h.scale}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color={h.color} roughness={1} />
        </mesh>
      ))}
      {CLOUDS.map((c, i) => (
        <Cloud key={`cloud-${i}`} position={c.pos} scale={c.scale} />
      ))}

      {/* AIR KALI MALANG — hijau kecoklatan, permukaan y=0 */}
      <mesh position={[0, -0.15, -15]}>
        <boxGeometry args={[14.4, 0.3, 150]} />
        <meshStandardMaterial color={WATER} roughness={0.9} />
      </mesh>
      {/* air naik di hulu jembatan lama saat banjir (scene 5) */}
      {flood && (
        <mesh position={[0, 0.55, 41]}>
          <boxGeometry args={[14.4, 0.3, 38]} />
          <meshStandardMaterial color={WATER_DARK} roughness={0.9} />
        </mesh>
      )}
      {/* garis aliran air bergerak */}
      {flowStripes.map((s, i) => (
        <mesh key={`flow-${i}`} position={[s.x, 0.06, s.z]}>
          <boxGeometry args={[0.3, 0.02, 2]} />
          <meshStandardMaterial color="#FFFFFF" transparent opacity={0.22} roughness={1} />
        </mesh>
      ))}

      {/* turap beton di kedua tepi kanal */}
      <mesh position={[-7.4, 0.9, -15]}>
        <boxGeometry args={[0.8, 2.2, 150]} />
        <meshStandardMaterial color={CONCRETE_LIGHT} roughness={0.95} />
      </mesh>
      <mesh position={[7.4, 0.9, -15]}>
        <boxGeometry args={[0.8, 2.2, 150]} />
        <meshStandardMaterial color={CONCRETE_LIGHT} roughness={0.95} />
      </mesh>

      {/* jalan di tepi kanal (Jl KH Nur Ali sisi selatan + utara) */}
      <mesh position={[-12, 2.02, -15]}>
        <boxGeometry args={[6, 0.06, 150]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.9} />
      </mesh>
      <mesh position={[12, 2.02, -15]}>
        <boxGeometry args={[6, 0.06, 150]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.9} />
      </mesh>
      {/* marka jalan tepi kanal */}
      {Array.from({ length: 30 }, (_, i) => -70 + i * 5).map((z) => (
        <group key={`mark-${z}`}>
          <mesh position={[-12, 2.06, z]}>
            <boxGeometry args={[0.18, 0.03, 2.4]} />
            <meshStandardMaterial color={ROAD_EDGE} roughness={0.9} />
          </mesh>
          <mesh position={[12, 2.06, z]}>
            <boxGeometry args={[0.18, 0.03, 2.4]} />
            <meshStandardMaterial color={ROAD_EDGE} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* trotoar */}
      <mesh position={[-8.4, 2.04, -15]}>
        <boxGeometry args={[2.2, 0.08, 150]} />
        <meshStandardMaterial color={CONCRETE_LIGHT} roughness={0.9} />
      </mesh>
      <mesh position={[8.4, 2.04, -15]}>
        <boxGeometry args={[2.2, 0.08, 150]} />
        <meshStandardMaterial color={CONCRETE_LIGHT} roughness={0.9} />
      </mesh>
      {/* jalan melintas (sumbu X, z=0) — penghubung kedua sisi kanal */}
      <mesh position={[-34.5, 2.02, 0]}>
        <boxGeometry args={[51, 0.06, 6]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.9} />
      </mesh>
      <mesh position={[34.5, 2.02, 0]}>
        <boxGeometry args={[51, 0.06, 6]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.9} />
      </mesh>

      {/* pohon, bangunan, orang, Tol Becakayu */}
      {TREES.map((t, i) => (
        <Tree key={`tree-${i}`} x={t.x} z={t.z} s={t.s} />
      ))}
      {BUILDINGS.map((b, i) => (
        <Building key={`bld-${i}`} {...b} />
      ))}
      {PEOPLE.map((p, i) => (
        <Person key={`person-${i}`} {...p} />
      ))}
      <TollRoad frame={frame} />
      {showDock && <DockAndStalls />}

      {/* ======== JEMBATAN ======== */}
      {(bridge === "old" || bridge === "both") && <FlatBridge z={oldBridgeZ} />}
      {(bridge === "new" || bridge === "both") && <ArchBridge z={0} />}
      {bridge === "ghost5" && (
        <>
          <ArchBridge z={0} />
          <ArchBridge z={-25} ghost />
          <ArchBridge z={-45} ghost />
          <ArchBridge z={-65} ghost />
          <ArchBridge z={-85} ghost />
          <FlatBridge z={-12} small />
          <FlatBridge z={-35} small />
          <FlatBridge z={-55} small />
          <FlatBridge z={-75} small />
          <FlatBridge z={-95} small />
        </>
      )}

      {/* sampah nyangkut di pilar jembatan lama (scene banjir) */}
      {flood &&
        DEBRIS_STUCK.map((d, i) => <Debris key={`deb-${i}`} x={d.x} z={d.z} r={d.r} y={0.85} />)}

      {/* ======== PERAHU ======== */}
      <Boat z={boatZ} passengers={boatPassengers} />
      {boat2Z !== null && <Boat z={boat2Z} passengers={false} />}

      {/* ======== MOBIL ======== */}
      {/* mobil di jalan melintas (sumbu X) — mengikuti lengkung kalau jembatan baru */}
      {crossCars.map((c, i) => {
        const mode = bridge === "old" ? "old" : "new";
        const f = bridgeFrame(c.x, c.lane, mode);
        // di luar bentang jembatan (|x|>9), mobil rata di jalan y=2,05
        const pos: [number, number, number] =
          Math.abs(c.x) > 9
            ? [c.x, BANK_Y + 0.05, c.lane]
            : [f.pos.x, f.pos.y, f.pos.z];
        const quat = Math.abs(c.x) > 9 ? undefined : f.quat;
        return <Car key={`xc-${i}`} pos={pos} quat={quat} rotY={Math.PI / 2} color={c.color} />;
      })}
      {/* mobil macet antre di jembatan lama (scene 1) */}
      {jam && (
        <>
          <Car pos={[-14, BANK_Y + 0.05, 1.2]} rotY={Math.PI / 2} color={ORANGE} />
          <Car pos={[-9.5, BANK_Y + 0.05, -1.2]} rotY={Math.PI / 2} color="#FFFFFF" />
          <Car pos={[-5, BANK_Y + 0.05, 1.2]} rotY={Math.PI / 2} color="#3B82F6" />
          <Car pos={[0, BANK_Y + 0.05, -1.2]} rotY={Math.PI / 2} color={RED} />
        </>
      )}
      {/* mobil di jalan tepi kanal (bergerak sepanjang z) */}
      <Car
        pos={[12, BANK_Y + 0.05, 30 - ((frame * 0.25 + 60) % 130)]}
        rotY={Math.PI}
        color="#FFFFFF"
      />
      <Car
        pos={[-12, BANK_Y + 0.05, -55 + ((frame * 0.22) % 130)]}
        rotY={0}
        color={TEAL}
      />
    </>
  );
};

// ================= Lapisan teks — MELAYANG bebas, TANPA kotak/kartu gelap =================
const STRONG_SHADOW = "0 2px 8px rgba(0,0,0,0.9), 0 4px 14px rgba(0,0,0,0.85)";

const FloatingTitle: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 150,
      left: 70,
      right: 70,
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontFamily: FONT,
        fontSize: 56,
        fontWeight: 800,
        color: "#FFFFFF",
        lineHeight: 1.15,
        textShadow: STRONG_SHADOW,
      }}
    >
      Kenapa Jembatan Kali Malang Dibikin Tinggi Banget?
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 44,
        fontWeight: 800,
        color: AMBER,
        lineHeight: 1.2,
        marginTop: 10,
        textShadow: STRONG_SHADOW,
      }}
    >
      Jembatan lamanya sampai dibongkar.
    </div>
  </div>
);

// Subtitle: 2 baris eksplisit, tiap baris ≤47 karakter supaya tidak wrap jadi 3 baris.
const SUBTITLES: { lines: [string, string?]; highlight: string }[] = [
  {
    lines: ["Jembatan Kali Malang kok dibikin", "tinggi banget? Sampai dibongkar?"],
    highlight: "tinggi",
  },
  {
    lines: ["Soalnya jembatan lama terlalu rendah,", "perahu nggak bisa lewat di bawahnya."],
    highlight: "rendah",
  },
  {
    lines: ["Makanya dibangun jembatan lengkung", "yang baru. Jarak air 2,5–3 meter."],
    highlight: "lengkung",
  },
  {
    lines: ["Ini jembatan lengkung pertama.", "Nantinya ada 5, gantiin 15 jembatan."],
    highlight: "lima",
  },
  {
    lines: ["Jembatan tinggi juga bikin aliran air", "lebih lancar pas banjir."],
    highlight: "lancar",
  },
  {
    lines: ["Diresmikan November 2026,", "dananya Rp123 miliar."],
    highlight: "miliar",
  },
  {
    lines: ["Titik macet 13 tinggal 5,", "lampu merah 13 jadi 3."],
    highlight: "lima",
  },
  {
    lines: ["Bukan gaya-gayaan. Biar perahu lewat,", "air lancar, jalanan nggak macet."],
    highlight: "lewat",
  },
  {
    lines: ["Lo udah pernah naik perahu", "di Kali Malang belum?"],
    highlight: "belum",
  },
];

const Subtitle: React.FC<{ scene: number; local: number }> = ({ scene, local }) => {
  const { lines, highlight } = SUBTITLES[scene];
  const line1 = lines[0].split(" ");
  const line2 = lines[1] ? lines[1].split(" ") : [];
  const all = [...line1, ...line2];
  const renderWord = (w: string, i: number) => {
    const clean = w.toLowerCase().replace(/[^a-z0-9,]/g, "");
    const isMatch = clean === highlight || clean.startsWith(highlight);
    const opacity = interpolate(local, [i * 3, i * 3 + 8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <span key={i} style={{ opacity, color: isMatch ? AMBER : "#FFFFFF" }}>
        {w}
        {i < all.length - 1 ? " " : ""}
      </span>
    );
  };
  return (
    <div
      style={{
        position: "absolute",
        bottom: 380,
        left: 70,
        right: 70,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 42,
        fontWeight: 800,
        lineHeight: 1.35,
        color: "#FFFFFF",
        textShadow: STRONG_SHADOW,
      }}
    >
      {line1.map((w, i) => renderWord(w, i))}
      {line2.length > 0 && (
        <>
          <br />
          {line2.map((w, j) => renderWord(w, line1.length + j))}
        </>
      )}
    </div>
  );
};

// Badge angka besar (scene 3: "2,5–3 m"; scene 4: "5 ganti 15"; scene 6: "Rp123 M").
const NumberBadge: React.FC<{ local: number; fps: number; big: string; small: string; top?: number }> = ({
  local,
  fps,
  big,
  small,
  top = 560,
}) => {
  const pop = spring({ frame: local, fps, config: { damping: 12, stiffness: 120 } });
  const scale = interpolate(pop, [0, 1], [0.7, 1]);
  const opacity = interpolate(local, [0, 12], [0, 1], {
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
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 140,
          fontWeight: 900,
          color: ORANGE,
          lineHeight: 1,
          textShadow: STRONG_SHADOW,
        }}
      >
        {big}
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 38,
          fontWeight: 800,
          color: "#FFFFFF",
          lineHeight: 1.2,
          marginTop: 14,
          textShadow: STRONG_SHADOW,
        }}
      >
        {small}
      </div>
    </div>
  );
};

// Badge angka scene 6: "Rp123 M" + "13 → 5 titik macet" + "13 → 3 lampu merah".
const AngkaBadges: React.FC<{ local: number; fps: number }> = ({ local, fps }) => {
  const pop = spring({ frame: local, fps, config: { damping: 12, stiffness: 120 } });
  const scale = interpolate(pop, [0, 1], [0.7, 1]);
  const opacity = interpolate(local, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 520,
        left: 70,
        right: 70,
        textAlign: "center",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 150,
          fontWeight: 900,
          color: ORANGE,
          lineHeight: 1,
          textShadow: STRONG_SHADOW,
        }}
      >
        Rp123 M
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 54,
          fontWeight: 900,
          color: AMBER,
          lineHeight: 1.15,
          marginTop: 18,
          textShadow: STRONG_SHADOW,
        }}
      >
        13 → 5 titik macet
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 54,
          fontWeight: 900,
          color: AMBER,
          lineHeight: 1.15,
          marginTop: 6,
          textShadow: STRONG_SHADOW,
        }}
      >
        13 → 3 lampu merah
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 30,
          fontWeight: 800,
          color: "#FFFFFF",
          marginTop: 16,
          textShadow: STRONG_SHADOW,
        }}
      >
        Dana perencanaan wisata air Kalimalang
      </div>
    </div>
  );
};

// Label split-screen (scene 8): kiri jembatan lama vs kanan jembatan baru.
const SplitLabels: React.FC = () => (
  <>
    <div
      style={{
        position: "absolute",
        top: 300,
        left: 0,
        width: 540,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 800,
          color: "#FFFFFF",
          textShadow: STRONG_SHADOW,
        }}
      >
        JEMBATAN LAMA
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 32,
          fontWeight: 800,
          color: "#FF6B6B",
          marginTop: 6,
          textShadow: STRONG_SHADOW,
        }}
      >
        perahu mentok, jalan macet
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        top: 300,
        right: 0,
        width: 540,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 800,
          color: "#FFFFFF",
          textShadow: STRONG_SHADOW,
        }}
      >
        JEMBATAN BARU
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 32,
          fontWeight: 800,
          color: "#4ADE80",
          marginTop: 6,
          textShadow: STRONG_SHADOW,
        }}
      >
        perahu lewat, air lancar
      </div>
    </div>
  </>
);

// Label hairline tipis: teks + garis 1px + titik jangkar.
const HairlineLabel: React.FC<{
  x: number;
  y: number;
  lineW: number;
  flip?: boolean;
  text: string;
  color: string;
}> = ({ x, y, lineW, flip, text, color }) => (
  <div style={{ position: "absolute", left: x, top: y }}>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: STRONG_SHADOW,
        whiteSpace: "nowrap",
        transform: flip ? "translateX(-100%)" : undefined,
      }}
    >
      {text}
    </div>
    <div
      style={{
        position: "absolute",
        top: 34,
        left: flip ? -lineW : 0,
        width: lineW,
        height: 2,
        backgroundColor: color,
        boxShadow: "0 1px 4px rgba(0,0,0,0.8)",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 29,
        left: (flip ? -lineW : lineW) - 5,
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: color,
        border: "2px solid #FFFFFF",
        boxShadow: "0 1px 4px rgba(0,0,0,0.8)",
      }}
    />
  </div>
);

// Sumber kecil melayang (scene akhir).
const SourceText: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 300,
      left: 70,
      right: 70,
      textAlign: "center",
      fontFamily: FONT,
      fontSize: 28,
      fontWeight: 700,
      color: "#FFFFFF",
      textShadow: STRONG_SHADOW,
    }}
  >
    Sumber: Pemkot Bekasi / Pemprov Jabar (2025–2026)
  </div>
);

// Watermark "Nur Maya" pojok kanan ATAS.
const Watermark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 70,
      right: 70,
      fontFamily: FONT,
      fontSize: 26,
      fontWeight: 800,
      color: "#FFFFFF",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: "8px 18px",
      borderRadius: 999,
      textShadow: "0 1px 4px rgba(0,0,0,0.8)",
    }}
  >
    Nur Maya
  </div>
);

// ================= Komposisi utama =================
const SCENE_LEN = 150;

export const KaliMalangExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = Math.min(8, Math.floor(frame / SCENE_LEN));
  const local = frame - scene * SCENE_LEN;

  // ----- Posisi perahu per scene (z, kanal di x=0, air y=0) -----
  let boatZ = 0;
  let boat2Z: number | null = null;
  let boatPassengers = false;
  if (scene === 0) {
    // HOOK: perahu mendekat ke jembatan lama lalu MENTOK berhenti (z 24 → 6)
    boatZ = interpolate(local, [0, 120], [24, 6], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (scene === 1) {
    boatZ = 6; // mentok di depan jembatan lama
  } else if (scene === 2) {
    boatZ = interpolate(local, [0, SCENE_LEN - 1], [18, -18]);
    boatPassengers = true;
  } else if (scene === 3) {
    boatZ = interpolate(local, [0, SCENE_LEN - 1], [-8, -12]);
    boatPassengers = true;
  } else if (scene === 4) {
    // BANJIR: perahu kedua melintas bebas di bawah jembatan baru
    boatZ = 28; // perahu pertama mentok di jembatan lama (z=22)
    boat2Z = interpolate(local, [0, SCENE_LEN - 1], [14, -14]);
    boatPassengers = true;
  } else if (scene === 5) {
    boatZ = 0; // top-down, perahu di bawah jembatan lengkung
    boatPassengers = true;
  } else if (scene === 6) {
    boatZ = interpolate(local, [0, SCENE_LEN - 1], [16, -16]);
    boatPassengers = true;
  } else if (scene === 7) {
    boatZ = interpolate(local, [0, SCENE_LEN - 1], [14, -14]);
    boatPassengers = true;
  } else {
    boatZ = interpolate(local, [0, SCENE_LEN - 1], [-14, -30]);
    boatPassengers = true;
  }

  // ----- Jembatan per scene -----
  const bridge: BridgeMode =
    scene === 0 || scene === 1 ? "old" : scene === 3 ? "ghost5" : scene === 4 ? "both" : "new";

  // ----- Mobil di jalan melintas (sumbu X) -----
  const crossCars: { x: number; lane: number; color: string }[] = [];
  if (scene === 2 || scene === 6 || scene === 8) {
    // mobil melintas di atas jembatan lengkung (mengikuti busur)
    const cx = interpolate(local, [0, SCENE_LEN - 1], [-16, 16]);
    crossCars.push({ x: cx, lane: 1.2, color: ORANGE });
    crossCars.push({ x: cx - 9, lane: -1.2, color: "#FFFFFF" });
  } else if (scene === 3) {
    const cx = interpolate(local, [0, SCENE_LEN - 1], [-12, 12]);
    crossCars.push({ x: cx, lane: 1.2, color: ORANGE });
  }
  const jam = scene === 0; // antrean macet di jembatan lama

  // ----- Kamera per scene -----
  let camPos: [number, number, number];
  let camTarget: [number, number, number];
  if (scene === 0) {
    // HOOK: follow dari belakang-samping, perahu mendekat — kamera di ATAS
    // trotoar (bukan di atas jalan) supaya mobil jalan tepi tidak menutup frame
    const px = interpolate(local, [0, SCENE_LEN - 1], [9, 7.5]);
    const py = interpolate(local, [0, SCENE_LEN - 1], [6.5, 5.5]);
    const pz = interpolate(local, [0, SCENE_LEN - 1], [34, 28]);
    camPos = [px, py, pz];
    camTarget = [0, 1.5, 10];
  } else if (scene === 1) {
    // PROBLEM: close-up agak mundur — atap perahu (y=2,0) vs bawah deck lama (y=1,2)
    const px = interpolate(local, [0, SCENE_LEN - 1], [9, 8]);
    const py = interpolate(local, [0, SCENE_LEN - 1], [4.5, 3.8]);
    const pz = interpolate(local, [0, SCENE_LEN - 1], [20, 17]);
    camPos = [px, py, pz];
    camTarget = [0, 1.3, 4];
  } else if (scene === 2) {
    // SOLUSI: side view jembatan lengkung, perahu lewat di bawah
    camPos = [16, 4, 10];
    camTarget = [0, 2.5, 0];
  } else if (scene === 3) {
    // SKALA: tinggi menyusuri kanal — kanal + 5 lengkung mengisi frame
    const px = interpolate(local, [0, SCENE_LEN - 1], [26, 24]);
    const py = interpolate(local, [0, SCENE_LEN - 1], [13, 11]);
    const pz = interpolate(local, [0, SCENE_LEN - 1], [36, 30]);
    camPos = [px, py, pz];
    camTarget = [0, 1.5, -35];
  } else if (scene === 4) {
    // BANJIR: high 3/4 — kedua jembatan dalam satu frame:
    // kiri jembatan lama (air naik, sampah nyangkut), kanan jembatan baru (air lancar)
    camPos = [24, 30, 38];
    camTarget = [0, 1, 10];
  } else if (scene === 5) {
    // ANGKA: top-down atas kanal + jembatan
    camPos = [0, 46, 8];
    camTarget = [0, 0, 0];
  } else if (scene === 6) {
    // WISATA: mundur + lebar — perahu + dermaga + kontainer UMKM dalam satu frame
    const px = interpolate(local, [0, SCENE_LEN - 1], [18, 15]);
    const py = interpolate(local, [0, SCENE_LEN - 1], [6, 5]);
    const pz = interpolate(local, [0, SCENE_LEN - 1], [24, 18]);
    camPos = [px, py, pz];
    camTarget = [0, 1.5, -8];
  } else if (scene === 7) {
    // PERBANDINGAN: split-screen (kamera diatur per panel di bawah)
    camPos = [14, 5, 22];
    camTarget = [0, 1.8, 3];
  } else {
    // CLOSE: pull-back dari sisi TIMUR — kanal + lengkung + Tol Becakayu di latar
    const px = interpolate(local, [0, SCENE_LEN - 1], [18, 26]);
    const py = interpolate(local, [0, SCENE_LEN - 1], [10, 20]);
    const pz = interpolate(local, [0, SCENE_LEN - 1], [30, 42]);
    camPos = [px, py, pz];
    camTarget = [0, 2, -5];
  }

  const sceneProps = {
    frame,
    bridge,
    boatZ,
    boat2Z,
    boatPassengers,
    flood: scene === 4,
    crossCars,
    jam,
    showDock: scene === 6,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      {scene === 7 ? (
        <div style={{ display: "flex", width: "100%", height: "100%" }}>
          {/* kiri: jembatan LAMA — perahu mentok + macet */}
          <div style={{ width: 540, height: 1920 }}>
            <ThreeCanvas
              width={540}
              height={1920}
              camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
            >
              <Scene
                {...sceneProps}
                bridge="old"
                boatZ={6}
                boat2Z={null}
                boatPassengers={false}
                flood={false}
                crossCars={[]}
                jam
                showDock={false}
              />
              <CameraRig position={[14, 5, 22]} target={[0, 1.8, 3]} />
            </ThreeCanvas>
          </div>
          {/* kanan: jembatan BARU — perahu lewat + lancar */}
          <div style={{ width: 540, height: 1920 }}>
            <ThreeCanvas
              width={540}
              height={1920}
              camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
            >
              <Scene
                {...sceneProps}
                bridge="new"
                boatZ={boatZ}
                boat2Z={null}
                boatPassengers
                flood={false}
                crossCars={crossCars}
                jam={false}
                showDock={false}
              />
              <CameraRig position={[17, 5, 18]} target={[0, 2, 0]} />
            </ThreeCanvas>
          </div>
        </div>
      ) : (
        <ThreeCanvas
          width={1080}
          height={1920}
          camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
        >
          <Scene {...sceneProps} />
          <CameraRig position={camPos} target={camTarget} />
        </ThreeCanvas>
      )}

      {/* ======== Lapisan teks (melayang bebas, TANPA kotak gelap) ======== */}
      {scene === 0 && <FloatingTitle />}
      <Subtitle scene={scene} local={local} />
      <Watermark />
      {scene === 2 && (
        <>
          <NumberBadge local={local} fps={fps} big="2,5–3 m" small="Jarak air ke bawah jembatan lengkung" top={470} />
          <HairlineLabel x={620} y={900} lineW={100} text="Jembatan lengkung" color={AMBER} />
          <HairlineLabel x={120} y={1200} lineW={110} text="Jarak bebas 2,5–3 m" color={AMBER} />
        </>
      )}
      {scene === 3 && (
        <>
          <NumberBadge local={local} fps={fps} big="5 ganti 15" small="Jembatan lengkung ganti jembatan lama" top={470} />
          <HairlineLabel x={700} y={900} lineW={90} text="5 jembatan lengkung" color={AMBER} />
          <HairlineLabel x={120} y={1180} lineW={110} text="15 jembatan lama" color={AMBER} />
        </>
      )}
      {scene === 4 && (
        <>
          <HairlineLabel x={300} y={700} lineW={100} text="Sampah nyangkut" color={RED} />
          <HairlineLabel x={550} y={1150} lineW={110} text="Air mengalir lancar" color="#4ADE80" />
        </>
      )}
      {scene === 5 && <AngkaBadges local={local} fps={fps} />}
      {scene === 6 && (
        <HairlineLabel x={600} y={950} lineW={90} text="Perahu wisata" color={AMBER} />
      )}
      {scene === 7 && <SplitLabels />}
      {scene === 8 && <SourceText />}

      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      {/* VO Sami 44.96s, mulai frame 0, volume penuh */}
      <Audio src={staticFile("audio/kali-malang/vo_sami.mp3")} volume={1} />
      {/* BGM chill 230.56s > durasi video 44.96s — diputar dari frame 0, tanpa loop */}
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {/* Whoosh 0.5s (15 frame) di tiap hard cut: awal tiap scene (9 scene x 150 frame) */}
      {[0, 150, 300, 450, 600, 750, 900, 1050, 1200].map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {/* Chirp 0.15s (5 frame) saat badge "Rp123 M" muncul — scene 5, frame 750 */}
      <Sequence from={750} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
