import { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ================= Palette (terang, siang cerah / mendung banjir) =================
const SKY_DAY = "#BFE3F2";
const SKY_FLOOD = "#A9C6D8";
const CREAM = "#F5EFE0";
const GREEN = "#8FBF7A";
const GREEN_DARK = "#6FA85E";
const GREEN_LIGHT = "#A8D095";
const BANK = "#A88A63";
const CONCRETE = "#B8B8B0";
const CONCRETE_DARK = "#9A9A92";
const CONCRETE_OLD = "#A8A8A0";
const ASPHALT = "#6E6E6E";
const STEEL = "#7E93A6";
const STEEL_DARK = "#5F7484";
const STEEL_LIGHT = "#A8B8C4";
const ORANGE = "#FF7A00";
const AMBER = "#FFB300";
const GLASS = "#7A9AB0";
const TIRE = "#2E2E2E";
const HUB = "#C8C8C8";
const WATER = "#6E5F36";
const WATER_LIGHT = "#C9B184";
const WATER_FLOOD = "#64542E";
const BANK_GRASS = "#7DA45C";
const GLINT = "#BFD9E8";
const TRUNK = "#8A6B4A";
const RED = "#E02020";
const HEADLIGHT = "#FFF6C8";
const PLASTIC_BLUE = "#3A7BD5";
const PLASTIC_RED = "#D53A3A";

const FONT = "Inter, Arial, sans-serif";
const SHADOW = "0 4px 14px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.7)";

const NEW_DECK_TOP = 3.4;
const OLD_DECK_TOP = 1.5;
const FLOOD_WATER_Y = 1.9;
const RIVER_HALF = 22; // sungai z -22..22
const DECK_W = 7;

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

// ================= Mobil mainan (hero, kaca biru-abu, lampu, bayangan jelas) =================
const WHEEL_POS: [number, number][] = [
  [0.98, 1.15],
  [-0.98, 1.15],
  [0.98, -1.15],
  [-0.98, -1.15],
];

const Car: React.FC<{ deckTop: number; z: number }> = ({ deckTop, z }) => (
  <group position={[0, deckTop, z]}>
    <mesh position={[0, 0.75, 0]}>
      <boxGeometry args={[2.0, 0.7, 3.6]} />
      <meshStandardMaterial color={ORANGE} roughness={0.7} />
    </mesh>
    <mesh position={[0, 0.45, -1.82]}>
      <boxGeometry args={[1.9, 0.3, 0.12]} />
      <meshStandardMaterial color={STEEL_DARK} roughness={0.6} />
    </mesh>
    <mesh position={[0, 1.32, -0.2]}>
      <boxGeometry args={[1.7, 0.55, 1.8]} />
      <meshStandardMaterial color={GLASS} roughness={0.25} metalness={0.15} />
    </mesh>
    <mesh position={[0, 1.3, -1.12]}>
      <boxGeometry args={[1.5, 0.45, 0.08]} />
      <meshStandardMaterial color="#A8C4D4" roughness={0.2} metalness={0.1} />
    </mesh>
    {[-1.06, 1.06].map((x) => (
      <mesh key={x} position={[x, 1.15, 0.55]}>
        <boxGeometry args={[0.12, 0.18, 0.3]} />
        <meshStandardMaterial color={ORANGE} roughness={0.7} />
      </mesh>
    ))}
    {[-0.65, 0.65].map((x) => (
      <mesh key={x} position={[x, 0.82, -1.82]}>
        <boxGeometry args={[0.36, 0.18, 0.08]} />
        <meshStandardMaterial
          color={HEADLIGHT}
          roughness={0.3}
          emissive={HEADLIGHT}
          emissiveIntensity={0.35}
        />
      </mesh>
    ))}
    {[-0.65, 0.65].map((x) => (
      <mesh key={x} position={[x, 0.82, 1.82]}>
        <boxGeometry args={[0.36, 0.18, 0.08]} />
        <meshStandardMaterial color={RED} roughness={0.3} emissive={RED} emissiveIntensity={0.3} />
      </mesh>
    ))}
    {WHEEL_POS.map(([x, zz], i) => (
      <group key={i}>
        <mesh position={[x, 0.38, zz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.38, 0.38, 0.32, 20]} />
          <meshStandardMaterial color={TIRE} roughness={0.9} />
        </mesh>
        <mesh position={[x + (x > 0 ? 0.17 : -0.17), 0.38, zz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.34, 16]} />
          <meshStandardMaterial color={HUB} roughness={0.4} metalness={0.4} />
        </mesh>
      </group>
    ))}
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.15, 2.0, 1]}>
      <circleGeometry args={[1, 24]} />
      <meshStandardMaterial color="#000000" transparent opacity={0.22} roughness={1} />
    </mesh>
  </group>
);

// ================= Retakan (garis zigzag dari kotak tipis gelap) =================
const CrackLine: React.FC<{
  points: [number, number][];
  width?: number;
  y?: number;
}> = ({ points, width = 0.12, y = 0.06 }) => {
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, z1] = points[i];
    const [x2, z2] = points[i + 1];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    segs.push(
      <mesh
        key={i}
        position={[(x1 + x2) / 2, y, (z1 + z2) / 2]}
        rotation={[0, angle, 0]}
      >
        <boxGeometry args={[width, 0.03, len + 0.12]} />
        <meshStandardMaterial color="#232323" roughness={1} />
      </mesh>
    );
  }
  return <>{segs}</>;
};

const CRACK_OLD: [number, number][] = [
  [-3.2, 5],
  [-1.0, 10],
  [1.0, 7],
  [3.2, 12],
  [1.6, 16],
];

// ================= Jembatan BARU: steel box girder 78 m tanpa pilar =================
const NewBridge: React.FC = () => {
  const dashes = useMemo(() => {
    const out: number[] = [];
    for (let z = -56; z < 58; z += 6) out.push(z);
    return out;
  }, []);
  const posts = useMemo(() => {
    const out: number[] = [];
    for (let z = -57; z < 58; z += 6) out.push(z);
    return out;
  }, []);
  const lamps = useMemo(() => [-48, -30, -12, 12, 30, 48], []);

  return (
    <group>
      {/* box girder baja biru-abu (satu bentang utuh, tanpa pilar) */}
      <mesh position={[0, NEW_DECK_TOP - 0.76, 0]}>
        <boxGeometry args={[7.6, 1.4, 120]} />
        <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.45} />
      </mesh>
      {/* flens bawah girder (lebih gelap) */}
      <mesh position={[0, NEW_DECK_TOP - 1.5, 0]}>
        <boxGeometry args={[8.0, 0.18, 120]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* permukaan jalan aspal */}
      <mesh position={[0, NEW_DECK_TOP - 0.03, 0]}>
        <boxGeometry args={[DECK_W, 0.06, 120]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.95} />
      </mesh>
      {/* marka tengah putus-putus */}
      {dashes.map((z) => (
        <mesh key={z} position={[0, NEW_DECK_TOP + 0.01, z]}>
          <boxGeometry args={[0.18, 0.02, 2.6]} />
          <meshStandardMaterial color="#F5F5F5" roughness={0.8} />
        </mesh>
      ))}
      {/* garis tepi kuning */}
      {[-3.2, 3.2].map((x) => (
        <mesh key={x} position={[x, NEW_DECK_TOP + 0.01, 0]}>
          <boxGeometry args={[0.14, 0.02, 120]} />
          <meshStandardMaterial color="#F5E6A8" roughness={0.8} />
        </mesh>
      ))}
      {/* railing baja (tiang + 2 rel) */}
      {[-3.45, 3.45].map((x) => (
        <group key={x}>
          {posts.map((z) => (
            <mesh key={z} position={[x, NEW_DECK_TOP + 0.55, z]}>
              <boxGeometry args={[0.14, 1.1, 0.14]} />
              <meshStandardMaterial color={STEEL_LIGHT} roughness={0.5} metalness={0.3} />
            </mesh>
          ))}
          <mesh position={[x, NEW_DECK_TOP + 1.1, 0]}>
            <boxGeometry args={[0.13, 0.13, 120]} />
            <meshStandardMaterial color={STEEL_LIGHT} roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[x, NEW_DECK_TOP + 0.6, 0]}>
            <boxGeometry args={[0.09, 0.09, 120]} />
            <meshStandardMaterial color={STEEL_LIGHT} roughness={0.5} metalness={0.3} />
          </mesh>
        </group>
      ))}
      {/* tiang lampu di atas dek */}
      {lamps.map((z) =>
        [-3.2, 3.2].map((x) => (
          <group key={`${x}-${z}`} position={[x, NEW_DECK_TOP, z]}>
            <mesh position={[0, 1.1, 0]}>
              <cylinderGeometry args={[0.07, 0.09, 2.2, 8]} />
              <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.4} />
            </mesh>
            <mesh position={[x > 0 ? -0.35 : 0.35, 2.2, 0]}>
              <boxGeometry args={[0.7, 0.12, 0.3]} />
              <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.4} />
            </mesh>
            <mesh position={[x > 0 ? -0.6 : 0.6, 2.12, 0]}>
              <boxGeometry args={[0.28, 0.1, 0.24]} />
              <meshStandardMaterial
                color={HEADLIGHT}
                roughness={0.3}
                emissive={HEADLIGHT}
                emissiveIntensity={0.25}
              />
            </mesh>
          </group>
        )),
      )}
      {/* abutmen beton di tepi sungai */}
      {[-24, 24].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[9.5, 2.4, 4]} />
            <meshStandardMaterial color={CONCRETE} roughness={0.95} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[10, 0.3, 4.4]} />
            <meshStandardMaterial color={CONCRETE_DARK} roughness={0.95} />
          </mesh>
        </group>
      ))}
      {/* oprit: tanjakan beton turun ke jalan darat */}
      {[
        { z: 76, rot: 0.106 },
        { z: -76, rot: -0.106 },
      ].map(({ z, rot }) => (
        <group key={z} position={[0, 1.7, z]} rotation={[rot, 0, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[DECK_W, 0.5, 34]} />
            <meshStandardMaterial color={CONCRETE} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[DECK_W - 0.4, 0.06, 34]} />
            <meshStandardMaterial color={ASPHALT} roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ================= Jembatan LAMA: beton rendah + 2 pilar di sungai =================
const PILLAR_Z = [-10, 10];

const OldBridge: React.FC<{ tilt: number; sink: number; crack: boolean }> = ({
  tilt,
  sink,
  crack,
}) => {
  const dashes = useMemo(() => {
    const out: number[] = [];
    for (let z = -52; z < 54; z += 6) out.push(z);
    return out;
  }, []);
  const lamps = useMemo(() => [-40, -20, 20, 40], []);

  return (
    <group>
      {/* 2 pilar di tengah sungai (berdiri di dasar sungai, tidak ikut miring) */}
      {PILLAR_Z.map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[4.5, 1.4, 4.4]} />
            <meshStandardMaterial color={CONCRETE_DARK} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[4, 1.1, 3.6]} />
            <meshStandardMaterial color={CONCRETE_OLD} roughness={0.95} />
          </mesh>
        </group>
      ))}
      {/* dek lama: grup berporos di ujung -Z, bisa miring (roboh) */}
      <group position={[0, OLD_DECK_TOP + sink, -55]} rotation={[tilt, 0, 0]}>
        {/* pelat beton */}
        <mesh position={[0, -0.4, 55]}>
          <boxGeometry args={[DECK_W, 0.8, 110]} />
          <meshStandardMaterial color={CONCRETE_OLD} roughness={0.95} />
        </mesh>
        {/* aspal pudar */}
        <mesh position={[0, 0.03, 55]}>
          <boxGeometry args={[DECK_W - 0.4, 0.06, 110]} />
          <meshStandardMaterial color="#7A7A72" roughness={0.95} />
        </mesh>
        {/* marka tengah pudar */}
        {dashes.map((z) => (
          <mesh key={z} position={[0, 0.07, z + 55]}>
            <boxGeometry args={[0.16, 0.02, 2.2]} />
            <meshStandardMaterial color="#D8D8D0" roughness={0.9} />
          </mesh>
        ))}
        {/* parapet beton rendah (bukan railing baja) */}
        {[-3.3, 3.3].map((x) => (
          <mesh key={x} position={[x, 0.3, 55]}>
            <boxGeometry args={[0.35, 0.6, 110]} />
            <meshStandardMaterial color={CONCRETE} roughness={0.95} />
          </mesh>
        ))}
        {/* retak besar (scene roboh) */}
        {crack && <CrackLine points={CRACK_OLD} width={0.28} y={0.07} />}
        {/* tiang lampu pendek */}
        {lamps.map((z) =>
          [-3.0, 3.0].map((x) => (
            <mesh
              key={`${x}-${z}`}
              position={[x, 0.9, z + 55]}
            >
              <cylinderGeometry args={[0.07, 0.09, 1.8, 8]} />
              <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.4} />
            </mesh>
          )),
        )}
      </group>
      {/* oprit pendek turun ke jalan darat */}
      {[
        { z: 63, rot: 0.1 },
        { z: -63, rot: -0.1 },
      ].map(({ z, rot }) => (
        <mesh key={z} position={[0, 0.75, z]} rotation={[rot, 0, 0]}>
          <boxGeometry args={[DECK_W, 0.5, 16]} />
          <meshStandardMaterial color={CONCRETE} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

// ================= Sampah: hamparan (debris mat) di permukaan air hulu jembatan =================
// Di banjir nyata, sampah menumpuk jadi hamparan lebar di permukaan air di sisi hulu
// jembatan — bukan tumpukan kecil tersembunyi di bawah dek.
const MAT_PIECES: {
  pos: [number, number, number];
  size: [number, number, number];
  rot: number;
  color: string;
}[] = [
  { pos: [-6, 0.12, 6], size: [1.6, 0.3, 0.5], rot: 0.4, color: "#6B4A2A" },
  { pos: [-9, 0.12, 9], size: [1.3, 0.28, 0.4], rot: -0.5, color: "#5A4632" },
  { pos: [-12, 0.12, 12], size: [1.8, 0.3, 0.45], rot: 0.2, color: "#7A5A34" },
  { pos: [-15, 0.12, 8], size: [1.1, 0.26, 0.35], rot: 0.9, color: "#6B4A2A" },
  { pos: [-8, 0.12, 14], size: [1.4, 0.28, 0.4], rot: -0.3, color: "#4A3A28" },
  { pos: [-18, 0.12, 11], size: [1.2, 0.26, 0.4], rot: 0.6, color: "#6B4A2A" },
  { pos: [-5, 0.12, 16], size: [0.7, 0.45, 0.55], rot: 0.1, color: PLASTIC_BLUE },
  { pos: [-11, 0.12, 5], size: [0.6, 0.4, 0.5], rot: 0.6, color: PLASTIC_RED },
  { pos: [-16, 0.12, 15], size: [0.9, 0.24, 0.7], rot: -0.8, color: "#8A8A82" },
  { pos: [-7, 0.12, 11], size: [0.8, 0.24, 0.32], rot: 0.3, color: "#5A4632" },
  { pos: [-13, 0.12, 17], size: [1.2, 0.26, 0.38], rot: 0.7, color: "#6B4A2A" },
  { pos: [-19, 0.12, 6], size: [1.0, 0.24, 0.4], rot: -0.4, color: "#7A5A34" },
  { pos: [-10, 0.12, 16], size: [0.9, 0.24, 0.42], rot: 0.15, color: "#4A3A28" },
  { pos: [-4.5, 0.12, 9], size: [1.0, 0.3, 0.45], rot: 0.5, color: "#6B4A2A" },
  { pos: [-14, 0.12, 4], size: [0.8, 0.24, 0.38], rot: -0.6, color: PLASTIC_BLUE },
  { pos: [-17, 0.12, 13], size: [0.7, 0.22, 0.35], rot: 0.8, color: "#5A4632" },
];

const DebrisMat: React.FC<{ waterY: number }> = ({ waterY }) => (
  <group position={[0, waterY, 0]}>
    {MAT_PIECES.map((p, i) => (
      <mesh key={i} position={p.pos} rotation={[0, p.rot, 0]}>
        <boxGeometry args={p.size} />
        <meshStandardMaterial color={p.color} roughness={1} />
      </mesh>
    ))}
    {/* ranting panjang menyandar di tepi dek */}
    <mesh position={[-4.8, 0.5, 10.5]} rotation={[0.3, 0, 0.9]}>
      <boxGeometry args={[0.18, 2.6, 0.18]} />
      <meshStandardMaterial color="#4A3520" roughness={1} />
    </mesh>
    <mesh position={[-4.5, 0.4, 13]} rotation={[-0.2, 0, 1.1]}>
      <boxGeometry args={[0.16, 2.2, 0.16]} />
      <meshStandardMaterial color="#5A4028" roughness={1} />
    </mesh>
  </group>
);

// Potongan sampah mengambang (statis di S2, hanyut di S6)
const FLOAT_PIECES: {
  x0: number;
  z: number;
  size: [number, number, number];
  color: string;
  speed: number;
}[] = [
  { x0: -40, z: 6, size: [1.7, 0.35, 0.75], color: "#A8845A", speed: 0.32 },
  { x0: -70, z: -8, size: [1.2, 0.32, 0.6], color: "#C49A6C", speed: 0.38 },
  { x0: -20, z: 14, size: [1.4, 0.35, 0.65], color: PLASTIC_BLUE, speed: 0.3 },
  { x0: -95, z: 2, size: [2.0, 0.4, 0.75], color: "#B08A5A", speed: 0.36 },
  { x0: -55, z: -14, size: [1.1, 0.32, 0.6], color: PLASTIC_RED, speed: 0.4 },
  { x0: -110, z: 10, size: [1.5, 0.35, 0.65], color: "#8A8A82", speed: 0.33 },
  { x0: -30, z: -4, size: [0.9, 0.3, 0.5], color: "#A8845A", speed: 0.42 },
  { x0: -85, z: -18, size: [1.4, 0.34, 0.6], color: "#C49A6C", speed: 0.35 },
];

const FloatingTrash: React.FC<{ waterY: number; local: number; flow: boolean }> = ({
  waterY,
  local,
  flow,
}) => (
  <>
    {FLOAT_PIECES.map((p, i) => {
      const x = flow ? (((p.x0 + local * p.speed + 130) % 260) - 130) : p.x0;
      return (
        <mesh key={i} position={[x, waterY + 0.12, p.z]} rotation={[0, (i * 0.7) % 1.2, 0]}>
          <boxGeometry args={p.size} />
          <meshStandardMaterial color={p.color} roughness={1} />
        </mesh>
      );
    })}
  </>
);

// ================= Lingkungan: tanah, sungai, bantaran, rumah, pohon, bukit, awan =================
const TREES: [number, number][] = [
  [-16, 28],
  [40, 34],
  [-22, -28],
  [20, -30],
  [-30, 34],
  [28, -34],
  [-36, -28],
  [46, 24],
  [-14, 58],
  [16, -58],
  [-44, 40],
  [42, -40],
  [-52, 33],
  [56, 36],
];

// Semak di bantaran dekat + jauh (di luar jalur jembatan & mobil)
const BUSHES: [number, number][] = [
  [-40, 29],
  [-24, 30],
  [34, 29],
  [48, 30],
  [-36, -31],
  [-10, -30],
  [20, -32],
  [44, -31],
];

// Tiang listrik di bantaran
const POLES: [number, number][] = [
  [-48, 33],
  [-28, 33],
  [46, 33],
  [-38, -33],
  [28, -33],
];

const HOUSES: { pos: [number, number]; body: string; roof: string }[] = [
  { pos: [-18, 40], body: "#F2E6C9", roof: "#C05A3C" },
  { pos: [18, 38], body: "#B7D4E8", roof: "#5A7A9A" },
  { pos: [-28, -40], body: "#BFE3C0", roof: "#7A9A5A" },
  { pos: [24, -44], body: "#F5CFA8", roof: "#C05A3C" },
  { pos: [-38, 36], body: "#E8D8F0", roof: "#5A7A9A" },
  { pos: [36, 44], body: "#F2E6C9", roof: "#7A9A5A" },
  { pos: [-16, -48], body: "#B7D4E8", roof: "#C05A3C" },
  { pos: [14, 48], body: "#F5CFA8", roof: "#5A7A9A" },
  { pos: [-55, 40], body: "#F2E6C9", roof: "#C05A3C" },
];

const CLOUDS: { pos: [number, number, number]; s: number }[] = [
  { pos: [-48, 26, -70], s: 0.9 },
  { pos: [42, 28, -55], s: 1.1 },
  { pos: [-22, 24, -95], s: 0.8 },
  { pos: [58, 26, -75], s: 0.9 },
];

const WAVE_STRIPS: [number, number][] = [
  [-60, -12],
  [-30, 8],
  [0, -6],
  [30, 12],
  [-80, 4],
  [60, -14],
  [-10, -16],
  [45, 16],
  [-100, -10],
  [90, 6],
  [-45, 16],
  [15, -14],
  [-70, 14],
  [75, -6],
  [-15, 18],
  [20, 10],
  [55, 18],
  [-50, -4],
  [10, 18],
  [-85, -16],
  [100, -12],
  [-20, -10],
  [70, 14],
  [-95, 10],
  [35, -16],
  [-5, 14],
];

// Garis arus panjang searah aliran sungai (sumbu x)
const CURRENT_LINES: [number, number][] = [
  [-40, -18],
  [10, 4],
  [60, -8],
  [-90, 12],
  [30, -12],
  [-10, 16],
];

// Kilau pantulan langit di permukaan air
const GLINTS: [number, number][] = [
  [-45, 6],
  [25, -10],
  [70, 8],
  [-75, -8],
  [5, 12],
];

const Cloud: React.FC<{ position: [number, number, number]; scale: number }> = ({
  position,
  scale,
}) => (
  <group position={position} scale={[scale, scale, scale]}>
    <mesh position={[0, 0, 0]} scale={[1, 0.45, 1]}>
      <sphereGeometry args={[6, 20, 16]} />
      <meshStandardMaterial color="#FFFFFF" roughness={0.9} emissive="#FFFFFF" emissiveIntensity={0.25} />
    </mesh>
    <mesh position={[5, 0.5, 0]} scale={[1, 0.45, 1]}>
      <sphereGeometry args={[4.5, 20, 16]} />
      <meshStandardMaterial color="#FFFFFF" roughness={0.9} emissive="#FFFFFF" emissiveIntensity={0.25} />
    </mesh>
    <mesh position={[-5, 0.5, 0]} scale={[1, 0.45, 1]}>
      <sphereGeometry args={[4, 20, 16]} />
      <meshStandardMaterial color="#FFFFFF" roughness={0.9} emissive="#FFFFFF" emissiveIntensity={0.25} />
    </mesh>
  </group>
);

const House: React.FC<{ pos: [number, number]; body: string; roof: string }> = ({
  pos,
  body,
  roof,
}) => (
  <group position={[pos[0], 0, pos[1]]}>
    {/* badan rumah */}
    <mesh position={[0, 1.5, 0]}>
      <boxGeometry args={[5.5, 3, 4.5]} />
      <meshStandardMaterial color={body} roughness={0.95} />
    </mesh>
    {/* atap prisma segitiga */}
    <mesh position={[0, 3.9, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[2.6, 2.6, 5.8, 3, 1]} />
      <meshStandardMaterial color={roof} roughness={0.9} />
    </mesh>
    {/* jendela */}
    {[-1.4, 1.4].map((x) => (
      <mesh key={x} position={[x, 1.6, 2.28]}>
        <boxGeometry args={[1.1, 1.0, 0.08]} />
        <meshStandardMaterial color={GLASS} roughness={0.3} />
      </mesh>
    ))}
    {/* pintu */}
    <mesh position={[0, 1.0, 2.28]}>
      <boxGeometry args={[1.0, 2.0, 0.08]} />
      <meshStandardMaterial color="#6B4A2A" roughness={0.9} />
    </mesh>
  </group>
);

const Environment: React.FC<{ waterY: number; flood: boolean }> = ({ waterY, flood }) => (
  <>
    {/* tanah hijau */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]}>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color={GREEN} roughness={1} />
    </mesh>
    {/* bantaran rumput hijau di tepi sungai */}
    {[-26, 26].map((z) => (
      <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, z]}>
        <planeGeometry args={[260, 8]} />
        <meshStandardMaterial color={BANK_GRASS} roughness={1} />
      </mesh>
    ))}
    {/* garis lumpur coklat di tepi air (garis pantai sungai) */}
    {[-22.8, 22.8].map((z) => (
      <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, z]}>
        <planeGeometry args={[260, 1.6]} />
        <meshStandardMaterial color={BANK} roughness={1} />
      </mesh>
    ))}
    {/* sungai Kali Bekasi (air coklat kehijauan, agak mengkilap); saat banjir melebar
        menutupi bantaran. Air banjir semi-transparan supaya dek/pilar yang terendam
        tetap terbaca. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, waterY + 0.06, 0]}>
      <planeGeometry args={[260, flood ? 60 : 44]} />
      <meshStandardMaterial
        color={flood ? WATER_FLOOD : WATER}
        roughness={0.35}
        metalness={0.08}
        transparent={flood}
        opacity={flood ? 0.82 : 1}
      />
    </mesh>
    {/* riak air: garis arus terang yang besar + garis arus panjang + kilau langit */}
    {WAVE_STRIPS.map(([x, z], i) => (
      <mesh
        key={i}
        rotation={[-Math.PI / 2, 0, (i % 3 - 1) * 0.07]}
        position={[x, waterY + 0.09, z]}
      >
        <planeGeometry args={[20, 1.4]} />
        <meshStandardMaterial color={WATER_LIGHT} roughness={0.5} />
      </mesh>
    ))}
    {CURRENT_LINES.map(([x, z], i) => (
      <mesh key={`c${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, waterY + 0.09, z]}>
        <planeGeometry args={[64, 0.55]} />
        <meshStandardMaterial color={WATER_LIGHT} roughness={0.5} />
      </mesh>
    ))}
    {GLINTS.map(([x, z], i) => (
      <mesh key={`g${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, waterY + 0.1, z]}>
        <planeGeometry args={[16, 1.0]} />
        <meshStandardMaterial color={GLINT} roughness={0.3} transparent opacity={0.45} />
      </mesh>
    ))}
    {/* pohon di tepi sungai / halaman rumah (JAUH dari jalan & sungai) */}
    {TREES.map(([x, z], i) => (
      <group key={i} position={[x, 0, z]}>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.25, 0.35, 1.6, 8]} />
          <meshStandardMaterial color={TRUNK} roughness={1} />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[1.6, 16, 12]} />
          <meshStandardMaterial color={GREEN_DARK} roughness={1} />
        </mesh>
        <mesh position={[0.9, 2.0, 0.3]}>
          <sphereGeometry args={[1.1, 16, 12]} />
          <meshStandardMaterial color={GREEN} roughness={1} />
        </mesh>
      </group>
    ))}
    {/* rumah warga Rawalumbu */}
    {HOUSES.map((h, i) => (
      <House key={i} pos={h.pos} body={h.body} roof={h.roof} />
    ))}
    {/* semak di bantaran (dekat + jauh) */}
    {BUSHES.map(([x, z], i) => (
      <group key={i} position={[x, 0, z]} scale={[1 + (i % 3) * 0.15, 1, 1 + (i % 2) * 0.2]}>
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.95, 12, 10]} />
          <meshStandardMaterial color={GREEN_DARK} roughness={1} />
        </mesh>
        <mesh position={[0.7, 0.55, 0.2]}>
          <sphereGeometry args={[0.6, 12, 10]} />
          <meshStandardMaterial color={GREEN} roughness={1} />
        </mesh>
      </group>
    ))}
    {/* tiang listrik di bantaran */}
    {POLES.map(([x, z], i) => (
      <group key={i} position={[x, 0, z]}>
        <mesh position={[0, 3.2, 0]}>
          <cylinderGeometry args={[0.12, 0.16, 6.4, 8]} />
          <meshStandardMaterial color="#5A4A3A" roughness={1} />
        </mesh>
        <mesh position={[0, 5.9, 0]}>
          <boxGeometry args={[2.4, 0.18, 0.18]} />
          <meshStandardMaterial color="#5A4A3A" roughness={1} />
        </mesh>
      </group>
    ))}
    {/* bukit 2 lapis, 2 nada hijau */}
    <mesh position={[-45, -3, -110]} scale={[1, 0.28, 1]}>
      <sphereGeometry args={[48, 24, 16]} />
      <meshStandardMaterial color={GREEN_DARK} roughness={1} />
    </mesh>
    <mesh position={[50, -4, -125]} scale={[1, 0.24, 1]}>
      <sphereGeometry args={[58, 24, 16]} />
      <meshStandardMaterial color={GREEN_LIGHT} roughness={1} />
    </mesh>
    {/* awan */}
    {CLOUDS.map((c, i) => (
      <Cloud key={i} position={c.pos} scale={c.s} />
    ))}
    {/* matahari */}
    <mesh position={[35, 42, -70]}>
      <sphereGeometry args={[3.2, 20, 16]} />
      <meshStandardMaterial color="#FFDF6B" roughness={0.5} emissive="#FFE9A8" emissiveIntensity={0.7} />
    </mesh>
  </>
);

// ================= Dunia 3D per mode =================
type WorldProps = {
  mode: "new" | "old";
  waterY: number;
  flood: boolean;
  carZ: number | null;
  tilt: number;
  sink: number;
  crack: boolean;
  local: number;
  trashFlow: boolean;
  showArrows: boolean;
  scatteredTrash: boolean;
};

const World: React.FC<WorldProps> = ({
  mode,
  waterY,
  flood,
  carZ,
  tilt,
  sink,
  crack,
  local,
  trashFlow,
  showArrows,
  scatteredTrash,
}) => {
  const sky = flood ? SKY_FLOOD : SKY_DAY;

  return (
    <>
      <color attach="background" args={[sky]} />
      <ambientLight intensity={flood ? 0.85 : 0.9} color={flood ? "#D8E4EC" : "#FFFFFF"} />
      <directionalLight
        position={[30, 55, 20]}
        intensity={flood ? 0.9 : 1.15}
        color="#FFF5DC"
      />
      <Environment waterY={waterY} flood={flood} />
      {mode === "new" ? (
        <>
          <NewBridge />
          {carZ !== null && <Car deckTop={NEW_DECK_TOP} z={carZ} />}
        </>
      ) : (
        <>
          <OldBridge tilt={tilt} sink={sink} crack={crack} />
          {carZ !== null && <Car deckTop={OLD_DECK_TOP} z={carZ} />}
        </>
      )}
      {/* hamparan sampah di permukaan air hulu jembatan lama (banjir) */}
      {mode === "old" && <DebrisMat waterY={waterY} />}
      {/* sampah mengambang: statis (S2) atau hanyut (S6) */}
      {scatteredTrash && <FloatingTrash waterY={waterY} local={local} flow={false} />}
      {trashFlow && <FloatingTrash waterY={waterY} local={local} flow />}
      {/* pusaran gerusan gelap di permukaan air, tepat di atas kaki pilar (S3) */}
      {showArrows && (
        <mesh position={[0, waterY + 0.1, 10]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.0, 1.6, 1]}>
          <circleGeometry args={[1, 20]} />
          <meshStandardMaterial color="#4A3520" roughness={1} />
        </mesh>
      )}
    </>
  );
};

// ================= Lapisan teks (MELAYANG, tanpa kotak/kartu/header band) =================
const Headline: React.FC = () => (
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
        lineHeight: 1.25,
        textShadow: SHADOW,
      }}
    >
      Kenapa Jembatan Ini Dibangun Tanpa Pilar?
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 40,
        fontWeight: 800,
        color: AMBER,
        lineHeight: 1.25,
        marginTop: 10,
        textShadow: SHADOW,
      }}
    >
      Padahal pilar itu penyangga.
    </div>
  </div>
);

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "Maret 2025, Jembatan Kemang Pratama ambruk diterjang banjir.", highlight: "ambruk" },
  { text: "Sampah kebawa banjir nyangkut di pilar jembatan.", highlight: "nyangkut" },
  { text: "Air ketahan, muka air naik, kaki pilar kegerus.", highlight: "kegerus" },
  { text: "Akhirnya jembatannya roboh.", highlight: "roboh" },
  { text: "Jembatan baru dibangun tanpa pilar di tengah sungai.", highlight: "tanpa" },
  { text: "Banjir mengalir bebas, sampah lewat tanpa nyangkut.", highlight: "bebas" },
  { text: "Debit banjir naik dua kali lipat, jadi 475 m³/s.", highlight: "475" },
  { text: "Tanpa pilar, banjir nggak bisa ngerobohin jembatan lagi.", highlight: "nggak" },
  { text: "Menurut lo, jembatan di daerah lo aman dari banjir nggak?", highlight: "aman" },
];

const Subtitle: React.FC<{ shot: number; local: number }> = ({ shot, local }) => {
  const { text, highlight } = SUBTITLES[shot];
  const words = text.split(" ");
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
        textShadow: SHADOW,
      }}
    >
      {words.map((w, i) => {
        const clean = w.toLowerCase().replace(/[^a-z0-9]/g, "");
        const isMatch = clean === highlight || clean.startsWith(highlight);
        const opacity = interpolate(local, [i * 3, i * 3 + 8], [0, 1], {
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
    </div>
  );
};

// Angka besar melayang (tanpa kotak): "78 m"
const BigBadge: React.FC<{ text: string; sub: string }> = ({ text, sub }) => (
  <div
    style={{
      position: "absolute",
      right: 70,
      top: 540,
      textAlign: "right",
    }}
  >
    <div
      style={{
        fontFamily: FONT,
        fontSize: 110,
        fontWeight: 800,
        color: AMBER,
        lineHeight: 1,
        textShadow: "0 6px 20px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.7)",
      }}
    >
      {text}
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: 800,
        color: "#FFFFFF",
        marginTop: 10,
        textShadow: SHADOW,
      }}
    >
      {sub}
    </div>
  </div>
);

// Panel angka S7: Rp60,48 M + 300 hari + 475 m³/s
const NumbersPanel: React.FC = () => (
  <div
    style={{
      position: "absolute",
      right: 70,
      top: 540,
      textAlign: "right",
    }}
  >
    <div
      style={{
        fontFamily: FONT,
        fontSize: 96,
        fontWeight: 800,
        color: AMBER,
        lineHeight: 1,
        textShadow: "0 6px 20px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.7)",
      }}
    >
      Rp60,48 M
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: 800,
        color: "#FFFFFF",
        marginTop: 10,
        textShadow: SHADOW,
      }}
    >
      anggaran Inpres Jalan Daerah
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 56,
        fontWeight: 800,
        color: "#FFFFFF",
        marginTop: 34,
        textShadow: SHADOW,
      }}
    >
      300 hari
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: 800,
        color: "#FFFFFF",
        marginTop: 6,
        textShadow: SHADOW,
      }}
    >
      dikerjakan
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 56,
        fontWeight: 800,
        color: AMBER,
        marginTop: 34,
        textShadow: SHADOW,
      }}
    >
      475 m³/s
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: 800,
        color: "#FFFFFF",
        marginTop: 6,
        textShadow: SHADOW,
      }}
    >
      debit banjir 2025
    </div>
  </div>
);

// Label teknis hairline tipis (teks + garis 2px + titik jangkar)
const HairlineLabel: React.FC<{
  text: string;
  top: number;
  left: number;
  lineLen?: number;
}> = ({ text, top, left, lineLen = 90 }) => (
  <div
    style={{
      position: "absolute",
      top,
      left,
      display: "flex",
      alignItems: "center",
    }}
  >
    <span
      style={{
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: "0 3px 10px rgba(0,0,0,0.9)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
    <div
      style={{
        width: lineLen,
        height: 2,
        backgroundColor: "#FFFFFF",
        marginLeft: 14,
        boxShadow: "0 2px 6px rgba(0,0,0,0.8)",
      }}
    />
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: "#FFFFFF",
        border: "2px solid rgba(0,0,0,0.6)",
        marginLeft: -2,
      }}
    />
  </div>
);

// Judul panel split-screen S8
const PanelTitle: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      top: 150,
      left: 0,
      right: 0,
      textAlign: "center",
      fontFamily: FONT,
      fontSize: 34,
      fontWeight: 800,
      color: "#FFFFFF",
      textShadow: SHADOW,
    }}
  >
    {text}
  </div>
);

// Sumber di akhir (teks kecil melayang)
const SourceLine: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 250,
      left: 70,
      right: 70,
      textAlign: "center",
      fontFamily: FONT,
      fontSize: 24,
      fontWeight: 700,
      color: "#FFFFFF",
      textShadow: "0 3px 10px rgba(0,0,0,0.9)",
    }}
  >
    Sumber: Kementerian PU / Inpres Jalan Daerah 2025–2026
  </div>
);

// Watermark pill pojok kanan ATAS
const Watermark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 36,
      right: 70,
      fontFamily: FONT,
      fontSize: 26,
      fontWeight: 800,
      color: "#FFFFFF",
      backgroundColor: "rgba(0,0,0,0.35)",
      borderRadius: 999,
      padding: "8px 20px",
      textShadow: "0 2px 8px rgba(0,0,0,0.8)",
    }}
  >
    Nur Maya
  </div>
);

// ================= Durasi scene (total 1499 frame = 49.96 dtk, ikut VO Sami) =================
// 9 scene x ~167 frame (rescale dari 1740 frame ke durasi VO 49.96 dtk)
const SCENE_START = [0, 167, 333, 500, 666, 833, 999, 1166, 1332, 1499];
const SCENE_COUNT = 9;

function shotAndLocal(frame: number): { shot: number; local: number; len: number } {
  for (let s = 0; s < SCENE_COUNT; s++) {
    if (frame < SCENE_START[s + 1]) {
      return { shot: s, local: frame - SCENE_START[s], len: SCENE_START[s + 1] - SCENE_START[s] };
    }
  }
  return { shot: 8, local: frame - SCENE_START[8], len: SCENE_START[9] - SCENE_START[8] };
}

// ================= Logika per scene =================
function waterYForShot(shot: number, local: number, len: number): number {
  if (shot === 1) {
    // S2: air naik selama scene (0.2 -> 1.9)
    return interpolate(local, [0, len - 1], [0.2, FLOOD_WATER_Y]);
  }
  if (shot === 2 || shot === 5) {
    // S3 mekanisme; S6 banjir di bawah jembatan baru
    return FLOOD_WATER_Y;
  }
  if (shot === 3) {
    // S4 roboh: air tinggi tapi dek masih terbaca (di bawah puncak dek 1.5)
    return 1.35;
  }
  return 0;
}

function carZForShot(shot: number, local: number, len: number): number | null {
  if (shot === 0) return interpolate(local, [0, len - 1], [30, -10]);
  if (shot === 4) return interpolate(local, [0, len - 1], [25, -25]);
  if (shot === 5) return interpolate(local, [0, len - 1], [20, 8]);
  if (shot === 6) return 0;
  if (shot === 8) return interpolate(local, [0, len - 1], [-20, -38]);
  return null;
}

// ================= Komposisi utama =================
export const KemangPratamaExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { shot, local, len } = shotAndLocal(frame);
  const end = len - 1;

  const waterY = waterYForShot(shot, local, len);
  const carZ = carZForShot(shot, local, len);
  const floodSky = shot === 1 || shot === 2 || shot === 3;
  const tilt = shot === 3 ? interpolate(local, [0, end], [0, 0.018]) : 0;
  const sink = shot === 3 ? interpolate(local, [0, end], [0, 0.3]) : 0;

  // ---- Kamera per scene (ganti sudut tiap ~6 detik) ----
  let camPos: [number, number, number];
  let camTarget: [number, number, number];
  if (shot === 0) {
    // S1 HOOK: side-tracking, ngikutin mobil di jembatan baru (kamera lebih tinggi, sungai kelihatan)
    camPos = [22, 10.5, (carZ ?? 10) + 12];
    camTarget = [0, 3, (carZ ?? 10) - 6];
  } else if (shot === 1) {
    // S2 FLASHBACK: dari sisi hulu (-X), lebih tinggi — hamparan sampah + dek + sungai terbaca
    camPos = [
      interpolate(local, [0, end], [-26, -22]),
      interpolate(local, [0, end], [11, 9]),
      interpolate(local, [0, end], [26, 22]),
    ];
    camTarget = [-3, 1.2, 8];
  } else if (shot === 2) {
    // S3 MEKANISME: medium shot dari atas-sisi hulu — hamparan + dek + 3 panah terbaca
    camPos = [
      interpolate(local, [0, end], [-20, -17]),
      interpolate(local, [0, end], [13, 11]),
      interpolate(local, [0, end], [28, 25]),
    ];
    camTarget = [-2, 1.2, 8];
  } else if (shot === 3) {
    // S4 ROBOH: high 3/4 view, dek miring + retak + air di sekitar dek
    camPos = [
      interpolate(local, [0, end], [26, 22]),
      interpolate(local, [0, end], [9, 7.5]),
      interpolate(local, [0, end], [24, 20]),
    ];
    camTarget = [0, 1.2, -5];
  } else if (shot === 4) {
    // S5 SOLUSI: wide side view, satu bentang penuh tanpa pilar
    camPos = [
      interpolate(local, [0, end], [32, 28]),
      interpolate(local, [0, end], [10, 9]),
      interpolate(local, [0, end], [32, 28]),
    ];
    camTarget = [0, 3, 0];
  } else if (shot === 5) {
    // S6 AIR LANCAR: 3/4 atas dari ujung jembatan — mobil + air banjir + sampah hanyut terbaca
    camPos = [22, 10, 38];
    camTarget = [0, 2, 6];
  } else if (shot === 6) {
    // S7 ANGKA: high angle, slow drift
    camPos = [interpolate(local, [0, end], [-8, 8]), 36, 26];
    camTarget = [0, 2.5, 0];
  } else if (shot === 7) {
    // S8 PERBANDINGAN: split-screen (kamera statis per panel)
    camPos = [18, 6, 18];
    camTarget = [0, 2, 0];
  } else {
    // S9 CLOSE: kamera naik + pull-back
    camPos = [
      0,
      interpolate(local, [0, end], [12, 30]),
      interpolate(local, [0, end], [38, 62]),
    ];
    camTarget = [0, 2.5, -5];
  }

  const sky = floodSky ? SKY_FLOOD : SKY_DAY;

  return (
    <AbsoluteFill style={{ backgroundColor: sky }}>
      {shot === 7 ? (
        // ======== S8 SPLIT-SCREEN: kiri lama vs kanan baru ========
        <div style={{ display: "flex", width: "100%", height: "100%" }}>
          <div style={{ width: 540, height: 1920, position: "relative" }}>
            <ThreeCanvas
              width={540}
              height={1920}
              camera={{ fov: 60, near: 0.1, far: 600, position: [30, 10, 30] }}
            >
              <World
                mode="old"
                waterY={1.35}
                flood
                carZ={null}
                tilt={0}
                sink={0}
                crack={false}
                local={local}
                trashFlow={false}
                showArrows={false}
                scatteredTrash={false}
              />
              <CameraRig position={[30, 10, 30]} target={[0, 1.5, 0]} />
            </ThreeCanvas>
            <PanelTitle text="JEMBATAN LAMA" />
          </div>
          <div style={{ width: 540, height: 1920, position: "relative" }}>
            <ThreeCanvas
              width={540}
              height={1920}
              camera={{ fov: 60, near: 0.1, far: 600, position: [30, 10, 30] }}
            >
              <World
                mode="new"
                waterY={0}
                flood={false}
                carZ={0}
                tilt={0}
                sink={0}
                crack={false}
                local={local}
                trashFlow={false}
                showArrows={false}
                scatteredTrash={false}
              />
              <CameraRig position={[30, 10, 30]} target={[0, 2.8, 0]} />
            </ThreeCanvas>
            <PanelTitle text="JEMBATAN BARU" />
          </div>
        </div>
      ) : (
        <ThreeCanvas
          width={1080}
          height={1920}
          camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
        >
          <World
            mode={shot >= 1 && shot <= 3 ? "old" : "new"}
            waterY={waterY}
            flood={floodSky || shot === 5}
            carZ={carZ}
            tilt={tilt}
            sink={sink}
            crack={shot === 3}
            local={local}
            trashFlow={shot === 5}
            showArrows={shot === 2}
            scatteredTrash={shot === 1}
          />
          <CameraRig position={camPos} target={camTarget} />
        </ThreeCanvas>
      )}

      {/* ======== Lapisan teks (melayang, tanpa kotak) ======== */}
      <Watermark />
      {shot === 0 && <Headline />}
      <Subtitle shot={shot} local={local} />

      {/* Angka besar */}
      {shot === 4 && <BigBadge text="78 m" sub="satu bentang baja tanpa pilar" />}
      {shot === 6 && <NumbersPanel />}

      {/* Label hairline teknis */}
      {shot === 1 && <HairlineLabel text="Sampah nyangkut" top={1050} left={70} lineLen={120} />}
      {shot === 2 && (
        <>
          <HairlineLabel text="Sampah nyangkut" top={950} left={70} lineLen={110} />
          <HairlineLabel text="Kaki pilar kegerus" top={840} left={70} lineLen={400} />
        </>
      )}
      {shot === 3 && <HairlineLabel text="Freeboard −0,4 m" top={950} left={70} lineLen={150} />}
      {shot === 4 && <HairlineLabel text="Tanpa pilar tengah" top={1020} left={70} lineLen={200} />}
      {shot === 5 && (
        <HairlineLabel text="Sampah lewat tanpa nyangkut" top={1100} left={70} lineLen={200} />
      )}

      {/* Sumber di akhir */}
      {shot === 8 && <SourceLine />}

      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      {/* VO Sami 49.96s, mulai frame 0, volume penuh */}
      <Audio src={staticFile("audio/kemang-pratama/vo_sami.mp3")} volume={1} />
      {/* BGM chill 230.56s > durasi video 49.96s — diputar dari frame 0, tanpa loop */}
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {/* Whoosh 0.5s (15 frame) di tiap hard cut: awal tiap scene (9 scene x ~167 frame) */}
      {[0, 167, 333, 500, 666, 833, 999, 1166, 1332].map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {/* Chirp 0.15s (5 frame) saat panel angka "Rp60,48 M / 300 hari / 475 m³/s" muncul — scene 6, frame 999 */}
      <Sequence from={999} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
